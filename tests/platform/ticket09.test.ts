// ticket09-10042026: durable-data, provider-boundary, and governance contracts.
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, test } from "vitest"
import { trace, traced } from "./trace"

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

describe("Ticket 09 platform contracts", () => {
  test("documents recovery boundaries without claiming execution", () => traced("ticket09.recovery", () => {
    const source = read("platform/recovery/README.md") + read("platform/recovery/restore-evidence-template.md")
    expect(source).toContain("RPO 15")
    expect(source).toContain("RTO 4")
    expect(source).toMatch(/not executed/i)
    expect(source).toContain("Velero")
    trace("ticket09.recovery.valid", { restoreExecuted: false, rpoMinutes: 15, rtoHours: 4 })
  }))

  test("keeps production provider access external and fail-closed", () => traced("ticket09.providers", () => {
    const template = read("platform/charts/aguda-deskworks/templates/externalsecrets.yaml")
    const staging = read("platform/charts/aguda-deskworks/values-staging.yaml")
    expect(template).toContain("providerVaultKeys is required in staging/prod")
    expect(template).toContain("PAYMENT_PROVIDER_MODE=stripe")
    expect(staging).toContain("EMAIL_PROVIDER_MODE: resend")
    expect(template).not.toContain("sk_live")
    trace("ticket09.providers.valid", { productionCredentials: "external-secret", liveKeysCommitted: false })
  }))

  test("publishes dated costs, ownership, and no-automerge governance", () => traced("ticket09.governance", () => {
    expect(read("platform/cost/README.md")).toContain("2026-10-04")
    expect(read("platform/recovery/README.md")).toContain("Retention")
    expect(read("renovate.json")).toContain('"automerge": false')
    expect(read(".github/CODEOWNERS")).toContain("@mauricechesteraguda")
    trace("ticket09.governance.valid", { costDate: "2026-10-04", automerge: false, owner: "mauricechesteraguda" })
  }))
})
