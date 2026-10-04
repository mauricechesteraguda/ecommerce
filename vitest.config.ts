// hardening-10022026-Maurice: coverage is limited to custom backend business logic.
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/backend/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "apps/backend/src/hardening/policies.ts",
        "apps/backend/src/checkout/service.ts",
        "apps/backend/src/orders/status.ts",
        "apps/backend/src/observability/metrics.ts",
      ],
      exclude: ["**/medusa-config.ts", "**/config/env.ts", "**/observability/trace.ts", "**/observability/logger.ts"],
      thresholds: { statements: 70, branches: 70, functions: 70, lines: 70 },
    },
  },
})
