// feature-10022026-Maurice: Next 16 uses flat ESLint configuration instead of `next lint`.
import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

export default defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "next-env.d.ts"]),
])
