// setup-10022026-Maurice: structured logging with conservative redaction.
import pino from "pino"

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: { paths: ["password", "token", "authorization", "cookie", "secret", "signature", "rawBody", "raw_payload", "card", "*.email", "*.address", "*.phone"], censor: "[REDACTED]" },
  base: { service: "ecommerce-backend" },
})
