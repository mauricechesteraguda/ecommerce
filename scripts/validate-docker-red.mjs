// docs-10022026-team1: deterministic external validator for the Docker RED matrix.
import { appendFileSync, mkdirSync, readFileSync } from "node:fs"
import { dirname } from "node:path"
import { resolve } from "node:path"

const tracePath = process.env.DOCKER_RED_TRACE_FILE ?? `${process.env.HOME}/.cache/agent-trace/ecommerce/ses_f0634da39ffe8ofx4L3RTe3Mm8-docker-red.jsonl`
mkdirSync(dirname(tracePath), { recursive: true })
const emit = (event, fields = {}) => appendFileSync(tracePath, `${JSON.stringify({ event, helper: "validate-docker-red", session: "ses_f0634da39ffe8ofx4L3RTe3Mm8", ...fields })}\n`)
const csv = readFileSync(resolve("docs/test-cases/ecommerce-p0.csv"), "utf8")
const source = readFileSync(resolve("tests/docker/compose-red.test.ts"), "utf8")
const rows = []; let row = []; let field = ""; let quoted = false
for (let index = 0; index < csv.length; index += 1) {
  const character = csv[index]
  if (character === '"') { if (quoted && csv[index + 1] === '"') { field += '"'; index += 1 } else quoted = !quoted }
  else if (character === "," && !quoted) { row.push(field); field = "" }
  else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && csv[index + 1] === "\n") index += 1; row.push(field); rows.push(row); row = []; field = "" }
  else field += character
}
if (field || row.length) { row.push(field); rows.push(row) }
const headers = rows.shift(); const id = headers.indexOf("Test Case ID"); const ref = headers.indexOf("Automated Test Ref"); const type = headers.indexOf("Test Type")
const all = rows.map((values) => ({ id: values[id], ref: values[ref] ?? "", type: values[type] ?? "" }))
const allExpected = Array.from({ length: 420 }, (_, index) => `TC-${String(index + 1).padStart(3, "0")}`)
const allIds = all.map((entry) => entry.id)
const allMissing = allExpected.filter((entry) => !allIds.includes(entry))
const allDuplicate = allIds.filter((entry, index) => allIds.indexOf(entry) !== index)
const allBadRefs = all.filter((entry) => !entry.ref.startsWith("tests/"))
const docker = rows.map((values) => ({ id: values[id], ref: values[ref] ?? "" })).filter((entry) => /^TC-(?:28[1-9]|29[0-9]|3[0-9][0-9]|4(?:0[0-9]|1[0-9]|20))$/.test(entry.id))
const expected = Array.from({ length: 140 }, (_, index) => `TC-${index + 281}`)
const actual = docker.map((entry) => entry.id)
const allowedTypes = new Set(["Positive", "Negative", "Boundary", "Permission", "Regression", "Security", "Integration"])
const types = all.map((entry) => entry.type)
const missing = expected.filter((entry) => !actual.includes(entry))
const duplicate = actual.filter((entry, index) => actual.indexOf(entry) !== index)
const badRef = docker.filter((entry) => entry.ref !== `tests/docker/compose-red.test.ts#${entry.id} (vitest)`)
const forbidden = /\b(skip|todo|test\.fails|\.fails|unconditional|throw new Error\(["']always)/i.test(source)
if (all.length !== 420 || allMissing.length || allDuplicate.length || allBadRefs.length || docker.length !== 140 || missing.length || duplicate.length || badRef.length || types.some((entry) => !allowedTypes.has(entry)) || forbidden || !/test\(`\$\{current\["Test Case ID"\]\}/.test(source)) {
  emit("validator.failed", { case_count: all.length, all_missing: allMissing, all_duplicate: allDuplicate, all_bad_refs: allBadRefs.map((entry) => entry.id), docker_count: docker.length, missing, duplicate, bad_refs: badRef.map((entry) => entry.id), forbidden })
  process.exitCode = 1
} else emit("validator.passed", { case_count: 420, unique_ids: true, refs: "complete", allowed_types: true, docker_count: 140 })
