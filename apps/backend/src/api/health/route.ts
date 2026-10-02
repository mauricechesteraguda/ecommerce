// setup-10022026-Maurice: liveness and dependency readiness endpoints.
import { Pool } from "pg"
import { Redis } from "ioredis"
import { env } from "../../config/env"
import { logger } from "../../observability/logger"
import { trace } from "../../observability/trace"

const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 2000, max: 1 })
const redis = new Redis(env.REDIS_URL, { connectTimeout: 2000, lazyConnect: true, maxRetriesPerRequest: 1 })

export async function GET(): Promise<Response> {
  return trace("health.GET", async () => new Response(JSON.stringify({ status: "ok", service: "backend" }), { headers: { "content-type": "application/json" } }))
}

export async function readiness(): Promise<Response> {
  return trace("health.readiness", async () => {
    const checks = await Promise.allSettled([pool.query("select 1"), redis.connect().then(() => redis.ping())])
    const database = checks[0].status === "fulfilled"; const redisReady = checks[1].status === "fulfilled"
    if (!database || !redisReady) logger.error({ event: "health.readiness.failed", database, redis: redisReady }, "dependency readiness failed")
    return new Response(JSON.stringify({ status: database && redisReady ? "ready" : "not_ready", checks: { database, redis: redisReady } }), { status: database && redisReady ? 200 : 503, headers: { "content-type": "application/json" } })
  })
}
