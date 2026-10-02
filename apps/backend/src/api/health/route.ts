// setup-10022026-Maurice: liveness and dependency readiness endpoints.
import { Pool } from "pg"
import { Redis } from "ioredis"
import { env } from "../../config/env"
import { logger } from "../../observability/logger"
import { trace } from "../../observability/trace"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 2000, max: 1 })
async function checkRedis(): Promise<void> {
  await trace("health.redis", async () => {
    // hardening-10022026-Maurice: readiness uses a short-lived probe so a
    // failed ioredis connection cannot poison subsequent readiness checks.
    const client = new Redis(env.REDIS_URL, { connectTimeout: 2000, maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: true })
    try { await client.connect(); await client.ping() } finally { await client.quit().catch(() => undefined) }
  })
}

export async function GET(_req: MedusaRequest, res: MedusaResponse): Promise<void> {
  await trace("health.GET", async () => { res.status(200).json({ status: "ok", service: "backend" }) })
}

export async function readiness(_req: MedusaRequest, res: MedusaResponse): Promise<void> {
  return trace("health.readiness", async () => {
    const checks = await Promise.allSettled([pool.query("select 1"), checkRedis()])
    const database = checks[0].status === "fulfilled"; const redisReady = checks[1].status === "fulfilled"
    if (!database || !redisReady) logger.error({ event: "health.readiness.failed", database, redis: redisReady }, "dependency readiness failed")
    res.status(database && redisReady ? 200 : 503).json({ status: database && redisReady ? "ready" : "not_ready", checks: { database, redis: redisReady } })
  })
}
