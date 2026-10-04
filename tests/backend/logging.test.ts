// logging-10042026-Maurice: RED->GREEN coverage for TC-PLAT-0157/0163 and P0 error boundaries.
import { describe, expect, test } from "vitest"
import { PassThrough } from "node:stream"
import { createLogger, safeError, sanitizeLogValue } from "../../apps/backend/src/observability/logger"

describe("safe logging boundaries", () => {
  test("TC-PLAT-0157 recursively sanitizes nested provider errors and sensitive fields", () => {
    const error = new Error("provider failed")
    ;(error as Error & { code?: string }).code = "E_PROVIDER"
    const value = sanitizeLogValue({ error, nested: { token: "secret", message: "bounded message" } }) as Record<string, unknown>
    expect(value.error).toMatchObject({ class: "Error", code: "E_PROVIDER", message: "provider failed" })
    expect((value.nested as Record<string, unknown>).token).toBe("[REDACTED]")
  })

  test("TC-PLAT-0163 emits safe error context without request payloads", () => {
    const value = safeError({ name: "ProviderError", context: { payload: { email: "person@example.test" }, operation: "charge" } }) as Record<string, unknown>
    expect(value).toMatchObject({ name: "ProviderError", context: { payload: "[REDACTED]", operation: "charge" } })
  })

  test("logging-10042026-Maurice redacts secret-bearing text while retaining diagnostic class/code", () => {
    const error = Object.assign(new Error("authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret.signature; email=person@example.test"), { code: "E_PROVIDER" })
    const value = safeError(error) as Record<string, unknown>
    expect(value).toMatchObject({ class: "Error", code: "E_PROVIDER" })
    expect(String(value.message)).not.toMatch(/Bearer|eyJ|person@example\.test/i)
    expect(String(value.stack)).not.toMatch(/Bearer|eyJ|person@example\.test/i)
  })

  test("modification-10042026-Maurice sanitizes logger argument forms and arbitrary absolute paths", () => {
    expect(sanitizeLogValue("/Users/alice/workspace/app/.env /home/alice/tmp/token.txt /var/folders/x" )).not.toMatch(/\/Users|\/home|\/var\/folders/)
    expect(sanitizeLogValue({ message: "authorization: Bearer secret-value", stack: "/private/var/tmp/app.js" })).toMatchObject({ message: "[REDACTED]", stack: "[PATH]" })
  })

  test("modification-10042026-Maurice redacts object-first, string-first, interpolation, and later arguments at runtime", () => {
    const stream = new PassThrough(); let output = ""; stream.on("data", (chunk) => { output += chunk.toString() })
    const runtimeLogger = createLogger(stream)
    runtimeLogger.info({ token: "object-secret" }, "object-first")
    runtimeLogger.info("authorization: Bearer string-secret")
    runtimeLogger.info("token=%s", "interpolated-secret")
    runtimeLogger.info("message", "later-secret")
    expect(output).not.toMatch(/object-secret|string-secret|interpolated-secret|later-secret/)
  })
})
