// config-10022026-team1: isolated Docker RED discovery; backend coverage config remains unchanged.
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/docker/**/*.test.ts"],
    reporters: ["default"],
  },
})
