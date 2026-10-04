// docs-10022026-Maurice: validate the approved CSV as a deterministic traceability gate.
import { appendFileSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { tmpdir } from "node:os"

const csvPath = resolve(process.cwd(), "docs/test-cases/ecommerce-p0.csv")
const tracePath = process.env.P0_TRACE_FILE ?? `${tmpdir()}/ecommerce/ecommerce-ticket12-csv-trace.jsonl`
const emit = (event, fields = {}) => {
const record = { event, component: "csv-traceability", correlation_id: process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}-${process.pid}` : `local-${process.pid}-${Date.now()}`, ...fields }
  appendFileSync(tracePath, `${JSON.stringify(record)}\n`)
  process.stdout.write(`${JSON.stringify(record)}\n`)
}

function parseCsv(source) {
  const rows = []; let row = []; let field = ""; let quoted = false
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') { if (quoted && source[index + 1] === '"') { field += '"'; index += 1 } else quoted = !quoted }
    else if (character === "," && !quoted) { row.push(field); field = "" }
    else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && source[index + 1] === "\n") index += 1; row.push(field); rows.push(row); row = []; field = "" }
    else field += character
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows
}

const rows = parseCsv(readFileSync(csvPath, "utf8"))
const headers = rows.shift()
const idIndex = headers.indexOf("Test Case ID")
const traceIndex = headers.indexOf("Automated Test Ref")
if (idIndex < 0 || traceIndex < 0) throw new Error("CSV must contain Test Case ID and Automated Test Ref columns")
const cases = rows.filter((row) => row.length > idIndex).map((row) => ({ id: row[idIndex], trace: row[traceIndex] ?? "" }))
// infra-10022026-Maurice: the approved matrix now includes the Docker
// extension (TC-281..TC-420) in the same traceability gate.
const expected = Array.from({ length: 420 }, (_, index) => `TC-${String(index + 1).padStart(3, "0")}`)
const actual = cases.map((entry) => entry.id)
const missing = expected.filter((id) => !actual.includes(id)); const duplicates = actual.filter((id, index) => actual.indexOf(id) !== index)
if (cases.length !== expected.length || missing.length || duplicates.length || cases.some((entry) => !entry.trace.includes("tests/"))) {
  emit("csv.invalid", { case_count: cases.length, missing, duplicates })
  throw new Error("P0 CSV traceability validation failed")
}
emit("csv.valid", { case_count: cases.length, first: actual[0], last: actual.at(-1) })
