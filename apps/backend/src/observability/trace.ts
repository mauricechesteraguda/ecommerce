// setup-10022026-Maurice: session-scoped trace utility; traces stay outside the repository.
import { appendFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { createHash } from "node:crypto"

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
const tracePath = join(process.env.HOME ?? "/tmp", ".cache", "agent-trace", repoHash, `${process.env.AGENT_SESSION_ID ?? "ses_f0634da39ffe8ofx4L3RTe3Mm8-ticket11"}.jsonl`)

function writeTrace(event: string, data: Record<string, unknown>): void {
  mkdirSync(dirname(tracePath), { recursive: true })
  appendFileSync(tracePath, `${JSON.stringify({ timestamp: new Date().toISOString(), correlation_id: process.env.AGENT_SESSION_ID ?? "ses_f0634da39ffe8ofx4L3RTe3Mm8-ticket11", event, ...data })}\n`)
}

export async function trace<T>(name: string, operation: () => Promise<T>): Promise<T> {
  writeTrace("enter", { name })
  try {
    const value = await operation()
    writeTrace("exit", { name })
    return value
  } catch (error) {
    writeTrace("exception", { name, error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

export function traceSync<T>(name: string, operation: () => T): T {
  writeTrace("enter", { name })
  try {
    const value = operation()
    writeTrace("exit", { name })
    return value
  } catch (error) {
    writeTrace("exception", { name, error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

export function tracePathForSession(): string { return tracePath }
