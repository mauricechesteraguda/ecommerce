// validation-10042026-Maurice: session-scoped structured tracing for platform tests.
import { appendFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { tmpdir } from "node:os"
import { randomUUID } from "node:crypto"

const session = (process.env.PLATFORM_SESSION ?? `validation-${process.pid}-${randomUUID()}`).replace(/[^A-Za-z0-9._-]/g, "_")
const tracePath = process.env.PLATFORM_TRACE_FILE ?? `${tmpdir()}/ecommerce/${session}-platform-tests.jsonl`

// modification-10042026-Maurice: sanitize arbitrary home/temp/workspace paths in traces.
function safe(value: unknown): unknown {
  return String(value).replaceAll(/(secret|token|password|key)=?[^\s,}]*/gi, "$1=[REDACTED]").replaceAll(/(?:\/(?:Users|home|private|tmp|var|opt|workspace|workspaces|root|srv|run|mnt|Volumes)\/[^\s,}]+)/gi, "[PATH]").replaceAll(process.cwd(), "[REPO]")
}

// modification-10042026-Maurice: every trace helper uses a process/run-unique session.
export function trace(event: string, fields: Record<string, unknown> = {}): void {
  mkdirSync(dirname(tracePath), { recursive: true })
  appendFileSync(tracePath, `${JSON.stringify({ event, component: "platform-tests", session, ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, safe(value)])) })}\n`)
}

export function traced<T>(name: string, operation: () => T): T {
  trace("function.enter", { name })
  try {
    const result = operation()
    trace("function.exit", { name })
    return result
  } catch (error) {
    trace("function.exception", { name, error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}
