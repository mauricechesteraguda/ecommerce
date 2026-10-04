// setup-10022026-Maurice: session-scoped trace utility; traces stay outside the repository.
import { appendFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { createHash, randomUUID } from "node:crypto"
import { sanitizeLogValue } from "./logger"

function repositoryRoot(): string {
  let current = process.cwd()
  while (current !== "/") {
    if (existsSync(join(current, ".git"))) return current
    current = join(current, "..")
  }
  return process.cwd()
}

const repoHash = createHash("sha256").update(repositoryRoot()).digest("hex").slice(0, 16)
// hardening-10022026-Maurice: Ticket 11 traces remain outside the repository and are session scoped.
// logging-10042026-Maurice: never share a fallback trace between processes.
// modification-10042026-Maurice: a shared parent session still gets a unique process/run trace.
const sessionId = `${process.env.AGENT_SESSION_ID || "session"}-proc-${process.pid}-${randomUUID()}`.replace(/[^A-Za-z0-9._-]/g, "_")
const tracePath = join(process.env.HOME ?? "/tmp", ".cache", "agent-trace", repoHash, `${sessionId}.jsonl`)

// modification-10042026-Maurice: trace payloads inherit bounded log/path sanitization.
function safe(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[TRUNCATED]"
  return sanitizeLogValue(value, depth)
}
// modification-10042026-Maurice: trace exceptions retain diagnostic shape without secrets.
export function safeTraceError(error: unknown, context?: unknown): Record<string, unknown> { return { error: safe(error), context: context === undefined ? undefined : safe(context) } }

// modification-10042026-Maurice: each trace record carries its unique correlation ID.
function writeTrace(event: string, data: Record<string, unknown>): void {
  mkdirSync(dirname(tracePath), { recursive: true })
  appendFileSync(tracePath, `${JSON.stringify({ timestamp: new Date().toISOString(), correlation_id: sessionId, event, ...safe(data) as Record<string, unknown> })}\n`)
}

// modification-10042026-Maurice: async trace lifecycle preserves failures and rethrows.
export async function trace<T>(name: string, operation: () => Promise<T>): Promise<T> {
  writeTrace("enter", { name })
  try {
    const value = await operation()
    writeTrace("exit", { name })
    return value
  } catch (error) {
    writeTrace("exception", { name, ...safeTraceError(error) })
    throw error
  }
}

// modification-10042026-Maurice: sync trace lifecycle preserves failures and rethrows.
export function traceSync<T>(name: string, operation: () => T): T {
  writeTrace("enter", { name })
  try {
    const value = operation()
    writeTrace("exit", { name })
    return value
  } catch (error) {
    writeTrace("exception", { name, ...safeTraceError(error) })
    throw error
  }
}

export function tracePathForSession(): string { return tracePath }
