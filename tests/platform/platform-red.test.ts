// test-10042026-Maurice: executable contracts for every approved platform matrix row.
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "vitest"
import { trace, traced } from "./trace"
import { assertCheckovScan } from "../../scripts/checkov-kubernetes.mjs"
import { getStaticPolicyInventory, scanStaticPolicies } from "../../scripts/validate-platform.mjs"

// TC-PLAT-0103: Checkov exit 0 is not evidence when its selected framework has
// no runner. This stays RED until the native scan guard is implemented.
test("TC-PLAT-0103 rejects a zero-runner Checkov false green", () => {
  expect(() => assertCheckovScan('{"summary": {"passed": 0, "failed": 0, "skipped": 0}}\nThere are no runners to run', 0)).toThrow(/no runners|zero scanned resources/i)
})

// TC-PLAT-0269: static policy scans must use the prospective Git source set,
// not ignored temp/debug artifacts, while still catching non-ignored additions.
test("TC-PLAT-0269 scopes static scans to prospective source files", () => {
  const root = process.cwd()
  const ignored = resolve(root, "temp/validation-scope-ignored.mjs")
  const prospective = resolve(root, "validation-scope-prospective.mjs")
  const credential = `AKIA${"0".repeat(16)}`
  try {
    writeFileSync(ignored, `const ignored = ${JSON.stringify(credential)}\n`)
    writeFileSync(prospective, `const prospective = ${JSON.stringify(credential)}\n`)
    const before = getStaticPolicyInventory(root)
    expect(before.files).not.toContain("temp/validation-scope-ignored.mjs")
    expect(before.files).toContain("validation-scope-prospective.mjs")
    expect(() => scanStaticPolicies(root)).toThrow(/secret scan/)
    rmSync(prospective, { force: true })
    expect(() => scanStaticPolicies(root)).not.toThrow()
  } finally {
    rmSync(ignored, { force: true })
    rmSync(prospective, { force: true })
  }
})

type CsvCase = Record<string, string>
type Contract = (current: CsvCase, root: string) => void

// modification-10042026-Maurice: matrix parsing traces process-unique lifecycle records.
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
    const headers = rows.shift() ?? []
    return rows.filter((candidate) => candidate.length > 1).map((candidate) => Object.fromEntries(headers.map((header, index) => [header, candidate[index] ?? ""])))
  })
}

function file(root: string, relative: string, id: string): string {
  const path = resolve(root, relative)
  expect(existsSync(path), `${id}: required ${relative} contract is absent`).toBe(true)
  return readFileSync(path, "utf8")
}

function contains(text: string, needle: string, id: string): void {
  expect(text, `${id}: observable contract is missing ${needle}`).toContain(needle)
}

function helmContract(current: CsvCase, root: string): void {
  const id = current["Test Case ID"]
  const chart = file(root, "platform/charts/aguda-deskworks/Chart.yaml", id)
  const workload = file(root, "platform/charts/aguda-deskworks/templates/deployments.yaml", id)
  const values = file(root, "platform/charts/aguda-deskworks/values.yaml", id)
  const library = file(root, "platform/charts/platform-library/Chart.yaml", id)
  contains(chart, "file://../platform-library", id); contains(library, "name: platform-library", id)
  const type = current["Test Type"]
  // Each matrix type observes a different Helm behavior; none is a chart-root check.
  if (type === "Positive" || type === "Alternate") {
    contains(workload, "securityContext:", id); contains(workload, "livenessProbe:", id); contains(workload, "resources:", id)
  } else if (type === "Negative") {
    contains(workload, "automountServiceAccountToken: false", id); contains(values, "externalSecrets: []", id)
  } else if (type === "Boundary") {
    contains(chart, "kubeVersion:", id); contains(values, "replicaCount:", id)
  } else if (type === "Validation") {
    contains(workload, "readinessProbe:", id); contains(workload, "startupProbe:", id)
  } else if (type === "Permission") {
    contains(workload, "serviceAccountName:", id); contains(workload, "automountServiceAccountToken: false", id)
  } else if (type === "State") {
    contains(values, "environment:", id); contains(workload, "checksum/config", id)
  } else if (type === "Correction") {
    contains(workload, "topologySpreadConstraints:", id); contains(workload, "emptyDir: { medium: Memory", id)
  } else if (type === "Integrity") {
    contains(workload, "app.kubernetes.io/instance", id); contains(workload, "podAntiAffinity:", id)
  } else if (type === "Error") {
    contains(workload, "failureThreshold:", id); contains(values, "resources:", id)
  } else if (type === "Empty") {
    contains(values, "images:", id); contains(values, "probes:", id)
  } else if (type === "Integration") {
    contains(chart, "dependencies:", id); contains(workload, "envFrom:", id)
  } else if (type === "Security") {
    contains(workload, "containerSecurityContext", id); contains(workload, "emptyDir: { medium: Memory", id)
  } else if (type === "Regression") {
    contains(workload, "checksum/config", id); contains(workload, "topologySpreadConstraints:", id)
  } else expect.fail(`${id}: unsupported Helm test type ${type}`)
}

function metricsContract(current: CsvCase, root: string): void {
  const id = current["Test Case ID"]
  const metrics = file(root, "apps/backend/src/observability/metrics.ts", id)
  const type = current["Test Type"]
  // These are source-level observables for the implemented application SLO seam.
  if (type === "Positive" || type === "Alternate") contains(metrics, "ecommerce_http_requests_total", id)
  else if (type === "Negative") contains(metrics, '"OTHER"', id)
  else if (type === "Boundary") contains(metrics, "const buckets =", id)
  else if (type === "Validation") contains(metrics, "renderMetrics", id)
  else if (type === "Permission") {
    const route = root === "" ? "" : file(root, "apps/backend/src/api/metrics/route.ts", id)
    contains(route, "authorization", id); contains(route, "Bearer ", id); contains(route, "x-metrics-token", id); contains(route, "status(404)", id)
  }
  else if (type === "State") contains(metrics, "durations", id)
  else if (type === "Correction") contains(metrics, "status_class", id)
  else if (type === "Integrity") contains(metrics, "routeGroup", id)
  else if (type === "Error") contains(metrics, "statusCode", id)
  else if (type === "Empty") contains(metrics, "return `${lines.join", id)
  else if (type === "Integration") contains(metrics, "recordRequest", id)
  else if (type === "Security") { expect(metrics, `${id}: metrics must not expose request identifiers`).not.toMatch(/cart_id|email|token|signature/) ; contains(metrics, "routeGroup", id) }
  else if (type === "Regression") contains(metrics, "ecommerce_checkout_outcomes_total", id)
  else expect.fail(`${id}: unsupported metrics test type ${type}`)
}

function hetznerNonproductionContract(current: CsvCase, root: string): void {
  const id = current["Test Case ID"]
  const directory = resolve(root, "platform/terraform/hetzner")
  const main = file(root, "platform/terraform/hetzner/main.tf", id)
  const versions = file(root, "platform/terraform/hetzner/versions.tf", id)
  const variables = file(root, "platform/terraform/hetzner/variables.tf", id)
  const outputs = file(root, "platform/terraform/hetzner/outputs.tf", id)
  const readme = file(root, "platform/terraform/hetzner/README.md", id)
  expect(existsSync(directory), `${id}: dedicated Hetzner subtree is absent`).toBe(true)
  contains(versions, "hetznercloud/hcloud", id); contains(versions, "= 1.49.1", id)
  contains(main, "hcloud_server", id); contains(main, "hcloud_firewall", id); contains(main, "hcloud_network", id)
  contains(main, "Production use is prohibited", id); contains(variables, "Only nonproduction", id)
  contains(outputs, "output \"kubeconfig\"", id); contains(outputs, "sensitive   = true", id)
  contains(readme, "nonproduction-only", id); contains(readme, "terraform destroy", id)
  expect(`${main}\n${versions}\n${variables}`, `${id}: cloud provider scope must stay Hetzner-only`).not.toMatch(/aws|google|azurerm/i)
}

const missingContracts: Record<string, string> = {
  "REQ-PLAT-01": "platform/terraform/hetzner",
  "REQ-PLAT-02": "platform/terraform/modules",
  "REQ-PLAT-03": "platform/terraform/state",
  "REQ-PLAT-05": "platform/argo",
  "REQ-PLAT-06": "platform/environments",
  "REQ-PLAT-07": "platform/registry",
  "REQ-PLAT-08": "platform/supply-chain",
  "REQ-PLAT-09": "platform/secrets",
  "REQ-PLAT-10": "platform/edge",
  "REQ-PLAT-11": "platform/admin",
  "REQ-PLAT-12": "platform/observability",
  "REQ-PLAT-14": "platform/data",
  "REQ-PLAT-15": "platform/recovery",
  "REQ-PLAT-16": "platform/cost",
  "REQ-PLAT-17": "renovate.json",
  "REQ-PLAT-18": "CODEOWNERS",
  "REQ-PLAT-19": "platform/provider-doubles",
  "REQ-PLAT-20": "platform/validation",
}

const contracts: Record<string, Contract> = {
  "REQ-PLAT-04": helmContract,
  "REQ-PLAT-13": metricsContract,
}
for (const [requirement, relative] of Object.entries(missingContracts)) {
  contracts[requirement] = requirement === "REQ-PLAT-01" ? hetznerNonproductionContract : (current, root) => {
    const id = current["Test Case ID"]
    trace("contract.missing-observable", { id, requirement, artifact: relative, type: current["Test Type"] })
    expect(existsSync(resolve(root, relative)), `${id}: ${requirement} requires observable ${relative}`).toBe(true)
  }
}

function assertPlatformContract(current: CsvCase): void {
  traced(`assertPlatformContract.${current["Test Case ID"]}`, () => {
    const id = current["Test Case ID"]; const root = process.cwd(); const requirement = current["Requirement ID"]
    trace("contract.observe", { id, requirement, type: current["Test Type"], scenario: current.Scenario, expected: current["Expected Result"] })
    expect(current["Expected Result"], `${id}: CSV expected result must be present`).toContain(requirement)
    const contract = contracts[requirement]
    expect(contract, `${id}: no contract registered for ${requirement}`).toBeDefined()
    contract(current, root)
  })
}

const platformCases = parseCsv(readFileSync(resolve(process.cwd(), "docs/test-cases/platform-devsecops.csv"), "utf8"))
for (const current of platformCases) test(`${current["Test Case ID"]} ${current.Scenario}`, () => assertPlatformContract(current))
