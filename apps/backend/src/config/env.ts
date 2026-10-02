// setup-10022026-Maurice: fail-fast environment contract for local PostgreSQL and Redis.
import { z } from "zod"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { logger } from "../observability/logger"
import { trace, traceSync } from "../observability/trace"

// hardening-10022026-Maurice: CLI validation loads the same ignored dotenv files
// that Medusa/Next load, while explicit shell variables remain authoritative.
function loadLocalEnvironment(): void {
  traceSync("environment.loadDotenv", () => {
    const shellKeys = new Set(Object.keys(process.env))
    const files = [resolve(process.cwd(), ".env"), resolve(process.cwd(), ".env.local"), resolve(process.cwd(), "apps/backend/.env.local"), resolve(process.cwd(), "../../.env"), resolve(__dirname, "../../../.env"), resolve(__dirname, "../../.env.local")]
    for (const file of [...new Set(files)]) {
      if (!existsSync(file)) continue
      for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
        if (!match || shellKeys.has(match[1])) continue
        process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2").replace(/\s+#.*$/, "")
      }
    }
  })
}

loadLocalEnvironment()

const schema = z.object({
  DATABASE_URL: z.string().url().refine((value) => value.startsWith("postgres"), "DATABASE_URL must use PostgreSQL"),
  REDIS_URL: z.string().url().refine((value) => value.startsWith("redis"), "REDIS_URL must use Redis"),
  STORE_CORS: z.string().min(1), ADMIN_CORS: z.string().min(1), AUTH_CORS: z.string().min(1),
  JWT_SECRET: z.string().min(32), COOKIE_SECRET: z.string().min(32),
  PAYMENT_PROVIDER_MODE: z.enum(["test-double", "stripe"]).default("test-double"),
  STRIPE_SECRET_KEY: z.string().optional(), STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(), RESEND_API_KEY: z.string().optional(), RESEND_FROM: z.string().email().optional(), RESEND_TEST_DOUBLE_FAILURE: z.enum(["0", "1"]).default("0"),
})

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL, REDIS_URL: process.env.REDIS_URL,
  STORE_CORS: process.env.STORE_CORS ?? "http://localhost:8000", ADMIN_CORS: process.env.ADMIN_CORS ?? "http://localhost:9000",
  AUTH_CORS: process.env.AUTH_CORS ?? "http://localhost:8000,http://localhost:9000",
  JWT_SECRET: process.env.JWT_SECRET ?? (process.env.PAYMENT_PROVIDER_MODE === "stripe" ? undefined : "local-test-double-jwt-secret-0123456789012345"),
  COOKIE_SECRET: process.env.COOKIE_SECRET ?? (process.env.PAYMENT_PROVIDER_MODE === "stripe" ? undefined : "local-test-double-cookie-secret-0123456789012345"),
  PAYMENT_PROVIDER_MODE: process.env.PAYMENT_PROVIDER_MODE ?? "test-double",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY, RESEND_API_KEY: process.env.RESEND_API_KEY, RESEND_FROM: process.env.RESEND_FROM,
  RESEND_TEST_DOUBLE_FAILURE: process.env.RESEND_TEST_DOUBLE_FAILURE ?? "0",
})

if (env.PAYMENT_PROVIDER_MODE === "stripe" && (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_PUBLISHABLE_KEY)) {
  throw new Error("PAYMENT_PROVIDER_MODE=stripe requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PUBLISHABLE_KEY")
}

export async function validateEnvironment(): Promise<void> {
  await trace("validateEnvironment", async () => { schema.parse(env); logger.info({ event: "environment.valid" }, "environment validated") })
}

if (process.argv[1]?.endsWith("env.ts")) void validateEnvironment()
