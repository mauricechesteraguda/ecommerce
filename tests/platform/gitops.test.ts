// gitops-10042026-Maurice: focused Ticket 05 contracts; rendered validation remains deterministic.
import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, test } from "vitest"
import { trace, traced } from "./trace"

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), "utf8")

describe("Ticket 05 GitOps graph", () => {
  test("generates the ten isolated provider/environment targets from one ApplicationSet", () => traced("gitops.targets", () => {
    const source = read("platform/gitops/applicationsets/targets.yaml")
    expect((source.match(/- \{ provider: /g) ?? []).length).toBe(10)
    expect(source).toContain("shared-nonprod")
    expect(source).toContain("isolation: prod")
    expect(source).toContain("$values/platform/gitops/promotion/{{.environment}}.yaml")
    trace("gitops.targets.valid", { count: 10 })
  }))

  test("keeps non-dev promotion values digest-only", () => traced("gitops.promotion", () => {
    for (const environment of ["staging", "prod"]) {
      const source = read(`platform/gitops/promotion/${environment}.yaml`)
      expect(source).toContain('tag: ""')
      expect((source.match(/sha256:[0-9a-f]{64}/g) ?? []).length).toBe(3)
    }
  }))

  test("documents ordered, disabled future layers", () => {
    const source = read("platform/gitops/layers/apps.yaml")
    for (const [wave, name] of [["0", "crds"], ["10", "controllers"], ["20", "secrets"], ["30", "edge"], ["40", "observability"], ["50", "data"]]) {
      expect(source).toContain(`sync-wave: "${wave}"`)
      expect(source).toContain(`name: platform-${name}`)
    }
    expect(source.match(/enabled: "false"/g)?.length).toBe(6)
    expect(readdirSync(resolve(root, "platform/gitops/environments"))).toHaveLength(10)
  })
})
