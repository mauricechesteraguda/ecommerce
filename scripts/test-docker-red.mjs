// runner-10022026-team1: fail-fast RED harness; it never tears down unrelated containers.
import { spawnSync } from "node:child_process"
import { appendFileSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"

const tracePath = process.env.DOCKER_RED_TRACE_FILE ?? `${process.env.HOME}/.cache/agent-trace/ecommerce/ses_f0634da39ffe8ofx4L3RTe3Mm8-docker-red.jsonl`
mkdirSync(dirname(tracePath), { recursive: true })
const emit = (event, fields = {}) => appendFileSync(tracePath, `${JSON.stringify({ event, helper: "test-docker-red", session: "ses_f0634da39ffe8ofx4L3RTe3Mm8", ...fields })}\n`)
const validation = spawnSync("node", ["scripts/validate-docker-red.mjs"], { stdio: "inherit", env: { ...process.env, DOCKER_RED_TRACE_FILE: tracePath } })
if (validation.status !== 0) { emit("harness.validation_failed", { status: validation.status }); process.exit(validation.status ?? 1) }
const run = spawnSync("corepack", ["pnpm", "exec", "vitest", "run", "--config", "vitest.docker.config.ts", "tests/docker/compose-red.test.ts", "--bail=1"], { stdio: "inherit", env: { ...process.env, DOCKER_RED_TRACE_FILE: tracePath } })
emit("harness.red_complete", { status: run.status, expected: "missing Docker implementation artifact" })
process.exit(run.status ?? 1)
