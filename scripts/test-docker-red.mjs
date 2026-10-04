// runner-10022026-team1: fail-fast RED harness; it never tears down unrelated containers.
import { spawnSync } from "node:child_process"
import { appendFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { randomUUID } from "node:crypto"

const tracePath = process.env.DOCKER_RED_TRACE_FILE ?? `${process.env.HOME}/.cache/agent-trace/ecommerce/docker-red-${process.pid}-${randomUUID()}.jsonl`
mkdirSync(dirname(tracePath), { recursive: true })
const session = `${process.env.AGENT_SESSION_ID ?? "test-docker-red"}-${process.pid}-${randomUUID()}`.replace(/[^A-Za-z0-9._-]/g, "_")
const emit = (event, fields = {}) => appendFileSync(tracePath, `${JSON.stringify({ event, helper: "test-docker-red", correlation_id: session, ...fields })}\n`)
const validation = spawnSync("node", ["scripts/validate-docker-red.mjs"], { stdio: "inherit", env: { ...process.env, DOCKER_RED_TRACE_FILE: tracePath } })
if (validation.status !== 0) { emit("harness.validation_failed", { status: validation.status }); process.exit(validation.status ?? 1) }
const run = spawnSync("corepack", ["pnpm", "exec", "vitest", "run", "--config", "vitest.docker.config.ts", "tests/docker/compose-red.test.ts", "--bail=1"], { stdio: "inherit", env: { ...process.env, DOCKER_RED_TRACE_FILE: tracePath } })
emit("harness.red_complete", { status: run.status, expected: "missing Docker implementation artifact" })
process.exit(run.status ?? 1)
