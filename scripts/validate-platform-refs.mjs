// test-10042026-Maurice: deterministic external validation of the 280 platform test references.
// validation-10042026-Maurice: traceable CSV integrity gate.
import { appendFileSync, mkdirSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { tmpdir } from "node:os"

const session = process.env.PLATFORM_SESSION ?? "validation-10042026-Maurice"
const tracePath = process.env.PLATFORM_TRACE_FILE ?? `${tmpdir()}/ecommerce/${session}-platform-refs.jsonl`
mkdirSync(dirname(tracePath), { recursive: true })
const emit = (event, fields = {}) => { const record = { event, component: "platform-ref-validator", session, ...fields }; appendFileSync(tracePath, `${JSON.stringify(record)}\n`); process.stdout.write(`${JSON.stringify(record)}\n`) }

function parseCsv(source) {
  emit("function.enter", { name: "parseCsv" })
  const rows = []; let row = []; let field = ""; let quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') { if (quoted && source[index + 1] === '"') { field += '"'; index += 1 } else quoted = !quoted }
    else if (character === "," && !quoted) { row.push(field); field = "" }
    else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && source[index + 1] === "\n") index += 1; row.push(field); rows.push(row); row = []; field = "" }
    else field += character
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  const headers = rows.shift() ?? []
  const result = rows.filter((candidate) => candidate.length > 1).map((candidate) => Object.fromEntries(headers.map((header, index) => [header, candidate[index] ?? ""])))
  emit("function.exit", { name: "parseCsv", row_count: result.length })
  return result
}

function validate() {
  emit("function.enter", { name: "validate" })
  const cases = parseCsv(readFileSync(resolve("docs/test-cases/platform-devsecops.csv"), "utf8"))
  const expected = Array.from({ length: 280 }, (_, index) => `TC-PLAT-${String(index + 1).padStart(4, "0")}`)
  const actual = cases.map((current) => current["Test Case ID"])
  const missing = expected.filter((id) => !actual.includes(id))
  const duplicate = actual.filter((id, index) => actual.indexOf(id) !== index)
  const expectedRef = (current) => current["Test Case ID"] === "TC-PLAT-0168"
    ? "tests/platform/kyverno.test.ts#TC-PLAT-0168 redacts paths, secrets, and PII from bootstrap error logs (vitest)"
    : `tests/platform/platform-red.test.ts#${current["Test Case ID"]} (vitest)`
  const badRefs = cases.filter((current) => current["Automated Test Ref"] !== expectedRef(current))
  const malformed = cases.filter((current) => current.Status !== "Not Run" || current.Priority !== "P0" || !current.Scenario || !current.Steps || !current["Expected Result"].includes(current["Requirement ID"]))
  if (cases.length !== 280 || missing.length || duplicate.length || badRefs.length || malformed.length) {
    emit("platform.refs.invalid", { case_count: cases.length, missing, duplicate, malformed: malformed.map((current) => current["Test Case ID"]), bad_refs: badRefs.map((current) => current["Test Case ID"]) })
    process.exitCode = 1
    emit("function.exit", { name: "validate", valid: false })
    return
  }
  emit("platform.refs.valid", { case_count: 280, unique_ids: true, mapped_once: true, behavior_fields_present: true })
  emit("function.exit", { name: "validate", valid: true })
}

validate()
