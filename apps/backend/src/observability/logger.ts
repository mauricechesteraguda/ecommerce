// setup-10022026-Maurice: structured logging with conservative redaction.
import pino from "pino"

// logging-10042026-Maurice: sanitize at the logger boundary so nested provider
// errors cannot bypass redact paths and request payloads never become log fields.
const PRIVATE = /password|token|secret|authorization|bearer|cookie|signature|raw.?payload|payload|body|email|phone|address|card|payment.?intent|client.?secret|access.?key|refresh.?key|oidc|query|url/i
const PRIVATE_TEXT = /(?:bearer\s+|basic\s+)[^\s,;}]+|\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b|(?:authorization|cookie|set-cookie|x-[\w-]*signature|password|token|secret|access[_-]?key|refresh[_-]?token|client[_-]?secret|payment[_-]?(?:method|intent)|card(?:[_-]?number)?|email|phone|address|body|query|kubeconfig)\s*[:=]\s*["']?(?:bearer|basic)?\s*[^,;}\s"']+|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const ABSOLUTE_PATH = /(?:\/(?:Users|home|private|tmp|var|opt|workspace|workspaces|root|srv|run|mnt|Volumes|System|Applications)\/[^\s"'`,;)}\]]+)|(?:[A-Z]:\\[^\s"'`,;)}\]]+)/gi
const text = (value: unknown) => String(value ?? "").replace(PRIVATE_TEXT, "[REDACTED]").replace(PRIVATE_TEXT, "[REDACTED]").replace(ABSOLUTE_PATH, "[PATH]").replace(/\s+/g, " ").slice(0, 500)
// modification-10042026-Maurice: arbitrary home, temporary, and workspace paths are bounded.
// modification-10042026-Maurice: sanitize nested values before logger serialization.
export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]"
  if (value instanceof Error) return { class: value.constructor?.name || "Error", code: typeof (value as Error & { code?: unknown }).code === "string" ? text((value as Error & { code?: unknown }).code) : undefined, message: text(value.message), stack: text(value.stack) }
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return typeof value === "string" ? text(value) : value
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeLogValue(item, depth + 1))
  if (typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([key, item]) => [key, PRIVATE.test(key) ? "[REDACTED]" : sanitizeLogValue(item, depth + 1)]))
  return typeof value
}
// modification-10042026-Maurice: error values use the same runtime redaction boundary.
export const safeError = (error: unknown) => sanitizeLogValue(error)

// modification-10042026-Maurice: logger runtime arguments are sanitized before pino formatting.
// modification-10042026-Maurice: all runtime logger destinations share one redaction hook.
export const createLogger = (destination?: pino.DestinationStream) => pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: { paths: ["password", "token", "access_token", "refresh_token", "authorization", "cookie", "set-cookie", "secret", "signature", "stripe-signature", "rawBody", "raw_payload", "card", "clientSecret", "*.email", "*.address", "*.phone", "req.headers", "res.headers"], censor: "[REDACTED]" },
  base: { service: "ecommerce-backend" },
  // modification-10042026-Maurice: sanitize object-first, string-first, and later interpolation args.
  hooks: { logMethod(inputArgs, method) {
    const format = typeof inputArgs[0] === "string" ? inputArgs[0] : ""
    const sensitiveFormat = /password|token|secret|authorization|cookie|signature|email|phone|address|payload|body|query|key/i.test(format)
    method.apply(this, inputArgs.map((argument, index) => sensitiveFormat && index > 0 ? "[REDACTED]" : sanitizeLogValue(argument)) as never)
  } },
}, destination)
export const logger = createLogger()
