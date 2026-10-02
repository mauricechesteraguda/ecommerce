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
- Docker Compose, production deployment, and additional provider operations are
  deferred.

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
  and Docker Compose and production deployment remain deferred.

Author Name: Aguda, Maurice
