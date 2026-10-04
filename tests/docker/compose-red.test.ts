// test-10022026-team1: RED contract tests for REQ-21..REQ-30; implementation is intentionally absent.
import { expect, test } from "vitest"
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { resolve } from "node:path"

type CsvCase = Record<string, string>
const session = `${process.env.AGENT_SESSION_ID ?? "docker-red"}-${process.pid}-${randomUUID()}`.replace(/[^A-Za-z0-9._-]/g, "_")
const tracePath = process.env.DOCKER_RED_TRACE_FILE ?? `${process.env.HOME}/.cache/agent-trace/ecommerce/${session}.jsonl`

function trace(event: string, helper: string, fields: Record<string, unknown> = {}): void {
  mkdirSync(resolve(tracePath, ".."), { recursive: true })
  appendFileSync(tracePath, `${JSON.stringify({ event, helper, correlation_id: session, ...fields })}\n`)
}

function traced<T>(helper: string, operation: () => T): T {
  trace("enter", helper)
  try {
    const value = operation()
    trace("exit", helper)
    return value
  } catch (error) {
    trace("exception", helper, { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

// modification-10042026-Maurice: CSV tracing is bounded and process-unique.
function parseCsv(source: string): CsvCase[] {
  return traced("parseCsv", () => {
    const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index]
      if (character === '"') { if (quoted && source[index + 1] === '"') { field += '"'; index += 1 } else quoted = !quoted }
      else if (character === "," && !quoted) { row.push(field); field = "" }
      else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && source[index + 1] === "\n") index += 1; row.push(field); rows.push(row); row = []; field = "" }
      else field += character
    }
    if (field || row.length) { row.push(field); rows.push(row) }
    const headers = rows[0] ?? []
    return rows.slice(1).filter((candidate) => candidate.length > 1).map((candidate) => Object.fromEntries(headers.map((header, index) => [header, candidate[index] ?? ""])))
  })
}

function loadDockerCases(): CsvCase[] {
  return traced("loadDockerCases", () => parseCsv(readFileSync(resolve(process.cwd(), "docs/test-cases/ecommerce-p0.csv"), "utf8")).filter((current) => {
    const number = Number(current["Test Case ID"]?.slice(3))
    return number >= 281 && number <= 420
  }))
}

function assertDockerContract(current: CsvCase): void {
  traced(`assertDockerContract.${current["Test Case ID"]}`, () => {
    const id = current["Test Case ID"]
    const expected = current["Expected Result"]
    expect(expected, `${id}: CSV expected result must be present`).toBeTruthy()
    expect(current["Requirement ID"], `${id}: Docker requirement must be present`).toMatch(/^REQ-2[1-9]|REQ-30$/)
    // This is the intentional RED boundary. It must fail for the absent implementation,
    // before any Docker daemon call can turn an unavailable runtime into a false signal.
    expect(existsSync(resolve(process.cwd(), "compose.yaml")) || existsSync(resolve(process.cwd(), "docker-compose.yml")), `${id}: ${expected}`).toBe(true)
  })
}

const dockerCases = loadDockerCases()
for (const current of dockerCases) {
  test(`${current["Test Case ID"]} ${current.Scenario}`, () => assertDockerContract(current))
}
