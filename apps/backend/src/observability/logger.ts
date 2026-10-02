// setup-10022026-Maurice: structured logging with conservative redaction.
import pino from "pino"

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: { paths: ["password", "token", "access_token", "refresh_token", "authorization", "cookie", "set-cookie", "secret", "signature", "stripe-signature", "rawBody", "raw_payload", "card", "clientSecret", "*.email", "*.address", "*.phone", "req.headers", "res.headers"], censor: "[REDACTED]" },
  base: { service: "ecommerce-backend" },
})
