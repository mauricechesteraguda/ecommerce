# Changelog — 2026-10-02

## AGUDA Deskworks demo through Ticket 08

### Delivered

- Established the Medusa v2 + Next.js workspace with PostgreSQL and Redis
  configuration, environment validation, liveness/readiness checks, structured
  redacted logging, and local tracing seams.
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
- Admin customization is not yet complete.
- Stripe test mode and Resend require user-supplied credentials and external
  provider setup; local test doubles do not prove live delivery.
- Checkout currently supports only the implemented PH/US shipping options and
  zero tax. The order-paid confirmation is the only email lifecycle delivered.
- Docker Compose, production deployment, and additional provider operations are
  deferred.

Author Name: Aguda, Maurice
