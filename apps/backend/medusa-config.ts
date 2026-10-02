// setup-10022026-Maurice: official Medusa v2 platform configuration.
import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import { env } from "./src/config/env"

loadEnv(process.env.NODE_ENV ?? "development", process.cwd())

export default defineConfig({
  modules: [{ resolve: "@medusajs/payment", options: { providers: [{ resolve: "@medusajs/payment-stripe", id: "stripe", options: { apiKey: env.STRIPE_SECRET_KEY ?? "test-double-key", webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? "test-double-webhook" } }] } }],
  projectConfig: {
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    http: {
      storeCors: env.STORE_CORS,
      adminCors: env.ADMIN_CORS,
      authCors: env.AUTH_CORS,
      jwtSecret: env.JWT_SECRET,
      cookieSecret: env.COOKIE_SECRET,
    },
  },
})
