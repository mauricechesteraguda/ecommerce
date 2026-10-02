// setup-10022026-Maurice: bounded external dependency smoke check.
import { Pool } from "pg"
import { Redis } from "ioredis"
import { env } from "../config/env"
import { logger } from "../observability/logger"
import { trace } from "../observability/trace"

async function smoke(): Promise<void> {
  await trace("health.smoke", async () => {
    const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 1500, max: 1 }); const redis = new Redis(env.REDIS_URL, { connectTimeout: 1500, lazyConnect: true, maxRetriesPerRequest: 1 })
    try { await pool.query("select 1"); await redis.connect(); await redis.ping(); logger.info({ event: "health.smoke.passed" }, "PostgreSQL and Redis available") }
    finally { await redis.quit().catch(() => undefined); await pool.end() }
  })
}
void smoke()
