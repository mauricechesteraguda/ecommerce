// test-10042026-Maurice: direct execution regression for the compose bootstrap entrypoint.
import { mkdtempSync, chmodSync, writeFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { expect, test } from "vitest"

test("modification-10042026-Maurice setup.sh is executable and runs directly", () => {
  const script = join(process.cwd(), "scripts/docker/setup.sh")
  expect(statSync(script).mode & 0o111).toBeGreaterThan(0)
  const bin = mkdtempSync(join(tmpdir(), "setup-direct-"))
  try {
    writeFileSync(join(bin, "node"), "#!/bin/sh\nexit 0\n")
    writeFileSync(join(bin, "pnpm"), "#!/bin/sh\nexit 0\n")
    writeFileSync(join(bin, "sleep"), "#!/bin/sh\nexit 0\n")
    for (const name of ["node", "pnpm", "sleep"]) chmodSync(join(bin, name), 0o755)
    const result = spawnSync(script, [], { cwd: bin, env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ADMIN_BOOTSTRAP_ENABLED: "0" }, encoding: "utf8" })
    expect(result.status, result.stderr).toBe(0)
    expect(result.stdout).toMatch(/setup\.start/)
    expect(result.stdout).toMatch(/setup\.success/)
  } finally {
    rmSync(bin, { recursive: true, force: true })
  }
})
