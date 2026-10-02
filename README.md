# AGUDA Deskworks (ecommerce)

AGUDA Deskworks is a Blueprint Workshop ecommerce demo: a small, deliberately
focused storefront for useful desk companions. It is a demo of the implemented
scope through Ticket 10, not a claim that every P0 requirement is complete or
that external providers have delivered live messages.

## What is implemented

- Medusa v2 catalog backed by an idempotent seed of three published products,
  PHP/USD prices, inventory, search, category filtering, pagination, and empty
  states.
- Native Medusa carts with server-calculated totals, inventory-aware line items,
  and storefront cart states.
- Customer registration/sign-in, sign-out, Redis-backed auth attempt limits,
  and customer-owned paginated order history/detail pages.
- Authenticated checkout preparation with PH/US address validation, shipping
  options, zero tax, native payment collection, and verified Stripe webhook
  completion boundaries.
- Deterministic Stripe and Resend test doubles for local checkout verification,
  including idempotent payment-event and order-paid-email records.
- Accessible Next.js storefront states and redacted structured logging with
  correlation IDs.

The local admin demo uses Medusa's native dashboard. It includes a shell-only
bootstrap command, authenticated dashboard access, product CRUD and publishing,
category/price/inventory editing, local image uploads, and order fulfillment
transitions. Docker Compose is intentionally deferred; local PostgreSQL and
Redis are required.

## Architecture

```mermaid
flowchart LR
  Shopper[Shopper browser] --> Next[Next.js storefront :8000]
  Next -->|Store API / checkout proxy| Medusa[Medusa v2 backend :9000]
  Medusa --> PG[(PostgreSQL)]
  Medusa --> Redis[(Redis)]
  Medusa --> Stripe[Stripe test mode or deterministic test double]
  Medusa --> Resend[Resend or deterministic email record]
```

Happy flow:

```mermaid
sequenceDiagram
  participant S as Shopper
  participant N as Next.js
  participant M as Medusa
  participant P as PostgreSQL/Redis
  participant X as Stripe/Resend seam
  S->>N: Browse, sign in, add to cart
  N->>M: Read catalog and mutate native cart
  M->>P: Authoritative totals and customer order state
  S->>N: Submit validated shipping details
  N->>M: Prepare payment collection
  M->>X: Create payment contract
  X-->>M: Verified webhook or deterministic result
  M->>P: Complete cart and record paid-email event
  M-->>N: Customer order history
```

## Prerequisites

- Node.js with Corepack enabled
- pnpm 10.17.1 (the repository uses Corepack)
- PostgreSQL running locally with a database and role matching `DATABASE_URL`
- Redis running locally

## Local setup

From the repository root:

```sh
corepack enable
corepack pnpm install
cp .env.example .env
```

Edit `.env`. For the deterministic local demo, keep
`PAYMENT_PROVIDER_MODE=test-double`; replace `JWT_SECRET` and `COOKIE_SECRET`
with random values of at least 32 characters. Start PostgreSQL and Redis using
your local installation. Export the file for the command-line tools, then
validate and initialize Medusa:

```sh
set -a; . ./.env; set +a
corepack pnpm validate:env
corepack pnpm --filter @ecommerce/backend exec medusa db:migrate
corepack pnpm --filter @ecommerce/backend seed:catalog
```

`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY` is required by the storefront and is
sent as the browser-visible `x-publishable-api-key` header. Publishable keys are
not secrets; do not put a secret provider token in this variable. The value is
read from the local environment and is never printed or committed. Keep `.env`
and `apps/storefront/.env.local` untracked.

Start both applications in one terminal:

```sh
corepack pnpm dev
```

The storefront is `http://localhost:8000`; the backend is
`http://localhost:9000`. Alternatively, start them independently with
`corepack pnpm --filter @ecommerce/backend dev` and
`corepack pnpm --filter @ecommerce/storefront dev`.

## Checkout provider modes

### Deterministic local test double

With `PAYMENT_PROVIDER_MODE=test-double`, sign in, add a seeded product to a
cart, open checkout, and submit a valid PH or US address. The backend returns a
stable `pi_test_<cart-id>` contract and authorizes the native payment session
without contacting Stripe. Webhook tests use the local signature seam and the
Resend test double records the order-paid lifecycle in PostgreSQL. Set
`RESEND_TEST_DOUBLE_FAILURE=1` to exercise the isolated email-failure path.

### Stripe test mode and Resend

After supplying real test credentials in `.env`, set
`PAYMENT_PROVIDER_MODE=stripe` and provide `STRIPE_SECRET_KEY`,
`STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`. Run the app, expose the
backend to Stripe CLI, and forward signed events to the webhook endpoint:

```sh
stripe listen --forward-to localhost:9000/payments/webhooks/stripe
```

Use Stripe test cards only. To enable live Resend API calls, provide
`RESEND_API_KEY` and a verified `RESEND_FROM` address. The demo currently sends
only the order-paid confirmation; this documentation does not claim provider
delivery.

## Demo limitations

- This is a local demo through Ticket 10, not full P0 completion.
- Tax is currently zero and shipping is limited to the implemented PH/US
  options.
- Checkout requires a signed-in customer.
- Administration uses Medusa's native dashboard and admin APIs at `/app` and
  `/admin`; the storefront `/admin` entry point redirects there. Product CRUD,
  publishing, categories/prices/inventory, local image uploads, and order
  fulfillment transitions are native Medusa operations in the local demo.
- Live Stripe payment and Resend delivery require real credentials, verified
  provider setup, and external callbacks; local doubles only prove the local
  integration boundaries. Production deployment and Docker Compose are also
  deferred.

## Tests and quality checks

### Local admin bootstrap

With PostgreSQL/Redis running and the root `.env` loaded, create a local admin
without committing credentials (the variables are shell-only):

```sh
set -a; . ./.env; set +a
read -r ADMIN_EMAIL
read -rs ADMIN_PASSWORD; echo
ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  corepack pnpm --filter @ecommerce/backend admin:bootstrap
```

Sign in at `http://localhost:9000/app`. Native admin authorization rejects
anonymous and shopper sessions; no email delivery is part of this demo.

The preserved CSV contains TC-001 through TC-280. The current completed
verification runs TC-001–TC-224 (224/224 tests), including the Ticket 10
accessibility/performance range and the native admin surface. The run is
fail-fast and uses isolated local ports. The Ticket 11 backend business-logic
coverage report is 88.88% statements, 86.79% branches, 100% functions, and
91.66% lines; these figures exclude live provider adapters and do not claim
live Stripe or Resend delivery:

```sh
set -a; . ./.env; set +a
P0_API_URL=http://127.0.0.1:19308 P0_WEB_URL=http://127.0.0.1:19307 \
  corepack pnpm exec playwright test --config=playwright.config.ts \
  --max-failures=1 --grep='TC-(00[1-9]|0[1-9][0-9]|1[0-2][0-9]|13[0-9]|140|19[7-9]|20[0-9]|210)'
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
corepack pnpm validate:env
corepack pnpm health
```

`corepack pnpm test:ticket11` loads only the non-secret publishable key from
ignored local env files for the isolated browser run; shell-provided values
remain authoritative. It allocates backend and storefront ports dynamically.
The storefront `/admin` entry point also resolves its admin destination from
the configured backend URL rather than a hard-coded origin.

## Security and logging

Never commit `.env`, provider credentials, card data, passwords, addresses, or
PII. The webhook verifies the raw request body and timestamped signature before
mutating commerce state. Logs are structured and redact sensitive payloads;
correlation IDs are returned on API boundaries. Liveness (`/health`) is
separate from dependency readiness (`/health/ready`), and readiness exposes
only boolean dependency status.

## Project files

- `apps/backend` — Medusa v2 backend, checkout seams, health checks, and seed
- `apps/storefront` — Next.js shopper experience
- `docs/test-cases/ecommerce-p0.csv` — preserved P0 test inventory
- `docs/platform-foundation.md` — local service foundation notes
- `MVP.md` — sealed user-provided product requirements document
