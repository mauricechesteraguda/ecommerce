// feature-10022026-Maurice: auth abuse protection is middleware around Medusa's native auth routes.
import { defineMiddlewares } from "@medusajs/framework/http"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import Redis from "ioredis"
import { createHash, randomUUID } from "node:crypto"
import { env } from "../config/env"
import { logger } from "../observability/logger"
import { trace, traceSync } from "../observability/trace"

const windowSeconds = 15 * 60
const maxAttempts = 5
let redis: Redis | undefined

function redisClient(): Redis {
  return traceSync("auth.rateLimit.redisClient", () => {
    if (!redis) redis = new Redis(env.REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: 1, enableOfflineQueue: false })
    return redis as Redis
  })
}

function digest(value: string): string {
  return traceSync("auth.rateLimit.digest", () => createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 16))
}

function validAuthInput(body: Record<string, unknown>): boolean {
  return traceSync("auth.validation", () => typeof body.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) && typeof body.password === "string" && body.password.length >= 8)
}

async function limitAuthAttempts(req: MedusaRequest, res: MedusaResponse, next: () => void): Promise<void> {
  await trace("auth.rateLimit", async () => {
    const correlationId = String(req.headers["x-correlation-id"] ?? randomUUID())
    const body = (req.body ?? {}) as Record<string, unknown>
    const email = typeof body.email === "string" ? body.email : "unknown"
    const key = `ecommerce:auth:attempts:${digest(`${req.ip ?? "unknown"}:${email}`)}`
    res.setHeader("x-correlation-id", correlationId)
    if (!validAuthInput(body)) {
      logger.info({ event: "auth.validation.rejected", correlation_id: correlationId }, "invalid authentication input")
      res.status(400).json({ type: "invalid_data", message: "Invalid authentication details.", correlation_id: correlationId })
      return
    }
    logger.info({ event: "auth.rate_limit.entry", correlation_id: correlationId, operation: req.path, subject: digest(email) }, "auth attempt")
    try {
      const client = redisClient()
      await trace("auth.rateLimit.redis.ready", async () => {
        if (client.status !== "ready") await new Promise<void>((resolve, reject) => { client.once("ready", () => resolve()); client.once("error", reject) })
      })
      await trace("auth.rateLimit.redis.ping", async () => { await client.ping() })
      const count = await client.incr(key)
      if (count === 1) await client.expire(key, windowSeconds)
      if (count > maxAttempts) {
        logger.warn({ event: "auth.rate_limit.denied", correlation_id: correlationId, operation: req.path }, "auth rate limit exceeded")
        res.setHeader("Retry-After", String(windowSeconds))
        res.status(429).json({ type: "rate_limit", message: "Too many authentication attempts. Try again later.", correlation_id: correlationId })
        return
      }
      logger.info({ event: "auth.rate_limit.exit", correlation_id: correlationId }, "auth attempt accepted")
      next()
    } catch (error) {
      logger.error({ event: "auth.rate_limit.external_failure", correlation_id: correlationId, error }, "auth rate limiter unavailable")
      res.status(503).json({ type: "temporarily_unavailable", message: "Authentication is temporarily unavailable.", correlation_id: correlationId })
    }
  })
}

// feature-10022026-Maurice: native Medusa admin routes remain the authorization boundary;
// audit only opaque actor/operation metadata without duplicating routes.
async function auditAdmin(req: MedusaRequest, res: MedusaResponse, next: () => void): Promise<void> {
  const correlationId = String(req.headers["x-correlation-id"] ?? randomUUID())
  res.setHeader("x-correlation-id", correlationId)
  const actor = (req as MedusaRequest & { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  logger.info({ event: "admin.operation.entry", correlation_id: correlationId, operation: req.method, resource: req.path, actor_id: actor ? digest(actor) : undefined }, "native admin operation")
  await trace("admin.operation", async () => next())
}

// feature-10022026-Maurice: local admin uploads enforce the demo's image boundary
// before the native file provider persists bytes; no file metadata is logged.
async function validateAdminUpload(req: MedusaRequest, res: MedusaResponse, next: () => void): Promise<void> {
  await trace("admin.upload.validation", async () => {
    const files = (req as MedusaRequest & { files?: Array<{ mimetype?: string; size?: number }> }).files ?? []
    const valid = files.length > 0 && files.every((file) => file.mimetype?.startsWith("image/") && (file.size ?? Number.MAX_SAFE_INTEGER) <= 10 * 1024 * 1024)
    if (!valid) {
      logger.warn({ event: "admin.upload.rejected" }, "admin upload rejected")
      res.status(400).json({ type: "invalid_data", message: "Only image files up to 10 MB are accepted." })
      return
    }
    next()
  })
}

export default defineMiddlewares({
  routes: [
    { matcher: "/auth/customer/emailpass", method: ["POST"], middlewares: [limitAuthAttempts] },
    { matcher: "/auth/customer/emailpass/register", method: ["POST"], middlewares: [limitAuthAttempts] },
    { matcher: "/auth/customer/emailpass/reset-password", method: ["POST"], middlewares: [limitAuthAttempts] },
    { matcher: "/admin/*", middlewares: [auditAdmin] },
    { matcher: "/admin/uploads", method: ["POST"], middlewares: [validateAdminUpload] },
  ],
})
