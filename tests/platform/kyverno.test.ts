// security-10042026-Maurice: executable Kyverno action-mode contracts.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "vitest"

const root = process.cwd()

test("Kyverno bootstrap redownloads a corrupt cache and bounds every attempt", () => {
  const source = readFileSync(join(root, "scripts/bootstrap-platform-tools.mjs"), "utf8")
  expect(source).toContain("AbortSignal.timeout(timeout)")
  expect(source).toContain("for (let attempt = 0; attempt < retries; attempt += 1)")
  expect(source).toContain("if (existsSync(metadataPath)) prior = JSON.parse")
  expect(source).toContain(".staging-")
  expect(source).toContain(".invalid-")
})

test("Kyverno bootstrap only reuses an official verified binary path", () => {
  const source = readFileSync(join(root, "scripts/bootstrap-platform-tools.mjs"), "utf8")
  expect(source).toContain("cached.path")
  expect(source).toContain("cached?.checksum_source")
  expect(source).toContain("execFileSync(cached.path, versionArgs[name]")
})

test("platform RED contracts are clean-cache safe and never require a session executable", () => {
  const runner = readFileSync(join(root, "scripts/run-platform-red.mjs"), "utf8")
  expect(runner).toContain("tests/platform")
  expect(runner).not.toContain("verified-tools.json")
  expect(readFileSync(join(root, "tests/platform/kyverno.test.ts"), "utf8")).not.toMatch(/spawnSync\(kyverno,\s*\["apply"/)
})

test("Kyverno cache is shared by tool/version/architecture, locked atomically, and corruption is rejected", () => {
  const source = readFileSync(join(root, "scripts/bootstrap-platform-tools.mjs"), "utf8")
  expect(source).toContain('"Library", "Caches", "ecommerce-platform-tools"')
  expect(source).toContain('"v3", `${platformName}-${architecture}`')
  expect(source).toContain("mkdirSync(lockPath)")
  expect(source).toContain("sha256(readFileSync(cached.path)) === cached.sha256")
  expect(source).toContain(".staging-")
})

test("Kyverno container fallback pins and verifies the official immutable digest", () => {
  const source = readFileSync(join(root, "scripts/bootstrap-platform-tools.mjs"), "utf8")
  expect(source).toContain("ghcr.io/kyverno/kyverno-cli:v${version}")
  expect(source).toContain("[\"pull\", image]")
  expect(source).toContain("docker\", [\"image\", \"inspect\"")
  expect(source).toContain("ghcr\\.io\\/kyverno\\/kyverno-cli@sha256:[a-f0-9]{64}")
  expect(source).toContain("docker\", [\"run\", \"--rm\", \"--entrypoint\", \"kyverno\", pinned, \"version\"")
})

test("Kyverno container fallback rejects digest mismatch and unavailable Docker", () => {
  const source = readFileSync(join(root, "scripts/bootstrap-platform-tools.mjs"), "utf8")
  expect(source).toContain("did not provide an immutable ghcr.io digest")
  expect(source).toContain("Docker is unavailable for official container fallback")
  expect(source).toContain("tool.bootstrap.container-fallback.start")
})

// RED: TC-PLAT-0168 validates bounded, classified, remediation-oriented tool diagnostics.
test("TC-PLAT-0168 redacts paths, secrets, and PII from bootstrap error logs", () => {
  const fixture = mkdtempSync(`${tmpdir()}/platform-bootstrap-log-`)
  const preload = `${fixture}/inject-error.mjs`
  writeFileSync(preload, `globalThis.fetch = async () => { const error = new Error("/Users/alice/project/.env /tmp/download.tar bearer super-secret query?token=query-secret email=alice@example.com"); error.code = "E_INJECTED"; throw error }\n`)
  const result = spawnSync(process.execPath, ["--import", preload, "scripts/bootstrap-platform-tools.mjs", "tflint"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PLATFORM_SESSION: "tc-plat-0168-redaction", PLATFORM_TOOL_CACHE: `${fixture}/cache`, PLATFORM_TOOL_RETRIES: "1" },
  })
  const output = `${result.stdout}\n${result.stderr}`
  rmSync(fixture, { recursive: true, force: true })
  expect(output).toContain('"class":"Error"')
  expect(output).toContain('"code":"E_INJECTED"')
  expect(output).toContain('"operation":"download-tool-artifact"')
  expect(output).toContain('"run_id":"tc-plat-0168-redaction"')
  expect(output).toContain("remediation")
  expect(output).toContain("[PATH]")
  expect(output).toContain("[REDACTED]")
  expect(output).not.toContain("/Users/alice")
  expect(output).not.toContain("/tmp/download.tar")
  expect(output).not.toContain("super-secret")
  expect(output).not.toContain("query-secret")
  expect(output).not.toContain("alice@example.com")
})

test("Kyverno policy artifacts retain audit and enforce contracts", () => {
  const policies = readFileSync(join(root, "platform/supply-chain/validation-policies.yaml"), "utf8")
  expect(policies).toContain("validationFailureAction: Enforce")
  expect(readFileSync(join(root, "platform/supply-chain/overlays/dev/kustomization.yaml"), "utf8")).toContain("value: Audit")
  expect(policies).toContain("sha256")
})
