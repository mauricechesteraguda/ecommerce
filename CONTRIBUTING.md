# Contributing

1. Copy `.env.example` to `.env` and use the deterministic provider double.
2. Run `corepack pnpm install`.
3. Run `corepack pnpm validate:env`, `corepack pnpm validate:csv`, lint, typecheck,
   backend coverage, build, and the relevant Playwright range.
4. Keep secrets, customer data, generated build output, and local traces out of git.
5. Add or update CSV traceability for new P0 behavior and preserve fail-fast tests.

Pull requests should describe the user-facing change, test commands and results,
provider-double limitations, and any migration or seed impact.
