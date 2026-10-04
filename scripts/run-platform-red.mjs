// validation-10042026-Maurice: structured fail-fast runner for the executable platform suite.
import { spawnSync } from "node:child_process"
import { appendFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { tmpdir } from "node:os"
import { randomUUID } from "node:crypto"

const session = (process.env.PLATFORM_SESSION ?? `validation-${process.pid}-${randomUUID()}`).replace(/[^A-Za-z0-9._-]/g, "_")
const tracePath = process.env.PLATFORM_TRACE_FILE ?? `${tmpdir()}/ecommerce/${session}-platform-suite.jsonl`
mkdirSync(dirname(tracePath), { recursive: true })
const sanitize = (value) => String(value ?? "unknown")
  .replace(/(?:bearer\s+|basic\s+)[^\s,;}]+|(?:authorization|cookie|set-cookie|token|secret|password|access[_-]?key|refresh[_-]?token|client[_-]?secret|email|phone|address|body|query|kubeconfig)\s*[:=]\s*[^\s,;}]+/gi, "[REDACTED]")
  .replace(/(?:\/Users|\/home|\/private|\/tmp|\/var|\/opt)\/[^\s)]+|[A-Z]:\\[^\s)]+/g, "[PATH]")
  .replace(/\s+/g, " ").slice(0, 400)
const emit = (event, fields = {}) => { const record = { event, component: "platform-suite-runner", session, ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, typeof value === "string" ? sanitize(value) : value])) }; appendFileSync(tracePath, `${JSON.stringify(record)}\n`); process.stdout.write(`${JSON.stringify(record)}\n`) }

emit("platform.red.start", { bail: 1 })
const result = spawnSync("corepack", ["pnpm", "exec", "vitest", "run", "--config=vitest.platform.config.ts", "tests/platform", "--bail=1"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 8 * 1024 * 1024, env: { ...process.env, PLATFORM_SESSION: session, PLATFORM_TRACE_FILE: tracePath } })
emit("platform.red.finish", { exit_code: result.status ?? 1, stdout: sanitize(result.stdout), stderr: sanitize(result.stderr), diagnostic: result.status === 0 ? undefined : sanitize(result.error?.message || "unknown") })
process.exitCode = result.status ?? 1
