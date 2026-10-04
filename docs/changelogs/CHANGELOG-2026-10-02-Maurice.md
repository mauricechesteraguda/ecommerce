# Changelog — 2026-10-02

## AGUDA Deskworks demo through Ticket 08

### Delivered

- Established the Medusa v2 + Next.js workspace with PostgreSQL and Redis
  configuration, environment validation, liveness/readiness checks, and
  structured redacted logging.
- Added native Medusa catalog seeding for three AGUDA Deskworks products with
  PHP/USD prices, inventory, collections, sales-channel links, and idempotent
  repair behavior.
- Added the shopper catalog experience with search, category filtering,
  pagination, currency selection, availability, product detail, and safe empty
  or unavailable states.
- Added native cart workflows and an accessible storefront cart with server-
  authoritative totals and inventory state.
- Added customer registration, sign-in/sign-out, session boundaries, Redis
  auth-attempt limiting, and customer-owned paginated order history/detail
  pages with derived status presentation.
- Added authenticated checkout preparation for PH/US shipping, address and
  postal-code validation, zero-tax calculation, native payment collections,
  raw-body Stripe webhook verification, idempotent payment events, native cart
  completion, and order-paid email event handling.
- Added deterministic Stripe and Resend test doubles so the demo can exercise
  checkout boundaries without live provider delivery.
- Preserved the 280-case P0 CSV and executable fail-fast Playwright contract
  harness.

### Limitations

- This changelog records the delivered demo scope through Ticket 08; it does
  not claim full P0 completion.
- Stripe test mode and Resend require user-supplied credentials and external
  provider setup; local test doubles do not prove live delivery.
- Checkout currently supports only the implemented PH/US shipping options and
  zero tax. The order-paid confirmation is the only email lifecycle delivered.
- Production deployment and additional provider operations are deferred; Docker
  Compose is delivered as a local demo.

## Ticket 09–10 — local administration and storefront experience

### Delivered

- Added local admin bootstrap documentation and native Medusa dashboard access,
  including product CRUD, publishing, category/price/inventory maintenance,
  local image uploads, and order fulfillment transitions.
- Added the storefront/admin route boundary and documented publishable API-key
  handling without exposing credentials; publishable keys remain browser-visible
  and are distinct from provider secrets.
- Completed the Ticket 10 storefront experience across catalog, product detail,
  account, cart, checkout, confirmation, and order states with shared accessible
  UI patterns, responsive behavior, and reduced-motion support.
- Completed the local verification ranges TC-001–TC-140 and TC-197–TC-210,
  totaling 154 tests, with fail-fast isolated-port execution.

### Limitations

- Live Stripe payment and Resend delivery still require user-supplied
  credentials, verified provider setup, and external callbacks; deterministic
  local doubles do not prove live provider delivery.
- Tax remains zero, shipping remains limited to the implemented PH/US options,
  and production deployment remains deferred; Docker Compose is delivered as a local demo.

## Ticket 11 — reliability and security hardening

### Delivered

- Added conservative security headers, input and upload validation, bounded
  pagination, correlation-safe logging, and safer health/readiness boundaries.
- Hardened checkout and webhook seams with deterministic provider doubles,
  timestamped signature checks, idempotent contracts, and outage-safe status
  projection without claiming live provider delivery.
- Corrected local environment loading so shell values remain authoritative and
  only the non-secret publishable browser key may be read from ignored env files.
- Added dynamic isolated-port fail-fast verification for TC-001–TC-224,
  passing 224/224 cases, plus backend business-logic coverage of 88.88%
  statements, 86.79% branches, 100% functions, and 91.66% lines.
- Kept the storefront admin entry point routed through the configured backend
  destination and documented the migration, seed, health, quality, and security
  checks.

### Limitations

- Coverage is limited to custom backend business logic and deterministic local
  seams; it does not prove live Stripe, Resend, database-provider, or external
  callback behavior. Docker Compose is delivered as a deterministic local demo;
  production deployment remains deferred.

## Ticket 12 — CI, traceability, and handoff documentation

### Delivered

- Added PostgreSQL/Redis GitHub Actions services, pnpm dependency caching,
  deterministic provider-double environment, migration/seed, quality gates,
  Playwright browser installation, fail-fast E2E execution, and failure artifact
  upload without secrets.
- Added a structured CSV traceability validator for TC-001–TC-280 and the
  `test:p0:all` command for isolated full-range verification.
- Added MIT licensing, contribution guidance, a non-duplicating PRD link,
  complete environment placeholders, and current setup/testing documentation.
- Added fresh seeded-catalog desktop and mobile screenshots with README
  references and descriptive alt text.

### Limitations

- CI proves deterministic local seams, not live Stripe/Resend delivery.
- Screenshots are representative local captures, not evidence of live provider
  delivery; Docker Compose is delivered as a deterministic local demo.

## Docker Compose runnable demo

- Added pinned multi-stage backend/storefront images, non-root runtime users,
  dependency-aware setup, named persistent volumes, health checks, bounded
  resources, and project-scoped reset guidance.
- Added deterministic provider defaults, optional provider configuration, redacted
  JSON container startup/setup logs, and Docker environment documentation.

### Verification and final delivery

- Provisioned the native `manual_manual` fulfillment relationship for the
  default warehouse, PH/US zones, shipping profile, and shipping options; the
  obsolete shipping blocker is resolved.
- Captured deterministic payment sessions through native Medusa workflows,
  completed the signed webhook lifecycle, and corrected order status mapping
  for captured/completed payments.
- Fixed the production admin static root and safe SPA fallback, and retained the
  session/cart publishable-key loading fixes.
- Live Docker proof verified catalog, checkout, deterministic payment/email
  idempotency, fulfillment transitions, persistence, and dependency recovery.
- Fresh Docker builds require registry access to the exact pinned Node base image
  (`node:22.14.0-bookworm-slim`); an already cached pinned image is acceptable
  when the registry is unavailable.
- README documents the one-command demo, ports, admin credentials, reset,
  deterministic provider behavior, registry requirement, and optional harmless
  Medusa Cloud `/cloud/auth` probe. GitHub CI remains disabled manually
  server-side; the workflow file is preserved.

## Team 1 platform DevSecOps documentation milestone

- Added the multicloud DevSecOps logical specification with explicit functional
  decomposition, ownership, invariants, decision tables, state transitions,
  I/O contracts, constraints, acceptance criteria, dependency graph, and
  confirmed diagrams.
- Added the not-run platform test-case inventory for REQ-PLAT-01 through
  REQ-PLAT-20, covering Hetzner k3s, AWS/GCP/Azure, GitOps, supply chain,
  secrets, private operations, observability, recovery, governance, and the
  single top-level validation seam.
- No implementation, automated test, or sealed MVP document was modified;
  live provider delivery and URL claims remain explicitly unproven.

Author Name: Aguda, Maurice
