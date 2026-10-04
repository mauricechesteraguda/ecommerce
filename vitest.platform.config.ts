// test-10042026-Maurice: isolated config keeps the platform RED suite out of existing backend coverage.
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/platform/**/*.test.ts"],
  },
})
