// test-10022026-Maurice: fail-fast external-seam configuration; no live provider calls.
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/p0",
  fullyParallel: false,
  workers: 1,
  maxFailures: 1,
  timeout: 15_000,
  reporter: [["line"], ["json", { outputFile: process.env.P0_REPORT_FILE ?? "test-results/p0.json" }]],
  use: { baseURL: process.env.P0_WEB_URL ?? "http://127.0.0.1:8000", trace: "off" },
})
