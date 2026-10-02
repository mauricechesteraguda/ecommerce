# Ecommerce MVP: Product Requirements Document

**Owner:** AGUDATECH IT Solutions
**Status:** Draft v0.1
**Repo:** `mauricechesteraguda/ecommerce`

---

## 1. Overview

A small, production-style online store built end to end: storefront, cart, checkout, and an admin dashboard. It doubles as a public showcase of how AGUDATECH designs, builds, tests, and ships software.

**One-line pitch:** a clean, fast, well-documented ecommerce MVP a small business could launch with.

## 2. Goals

1. Ship a working store a real shopper can complete a purchase on (test mode).
2. Show engineering quality: clean architecture, tests, CI/CD, docs.
3. Give prospective clients something concrete to click through.

**Non-goals (MVP):** multi-vendor marketplace, inventory sync with third-party systems, mobile app, complex promotions, international tax and shipping.

## 3. Target Users

| User | Need |
|---|---|
| **Shopper** | Find products, add to cart, pay, see order status |
| **Store admin** | Manage products, view and fulfil orders |
| **Prospective client** (indirect) | See a live demo and readable code |

## 4. MVP Scope

### Must have (P0)

**Storefront**
- Product listing with pagination
- Search and category filter
- Product detail page (images, price, stock, description)
- Cart (add, update quantity, remove), persisted per user

**Accounts**
- Register, login, logout (email + password, JWT or session)
- Order history

**Checkout and orders**
- Shipping address form
- Payment via sandbox gateway (PayMongo test mode, or Stripe test mode)
- Order confirmation page and email
- Order statuses: `pending`, `paid`, `shipped`, `delivered`, `cancelled`

**Admin**
- Role-protected dashboard
- Product CRUD with image upload
- Order list with status updates

### Should have (P1)
- Stock decrement on payment, "out of stock" handling
- Basic sales summary (orders today, revenue, top products)
- Guest checkout
- Cash on delivery option

### Nice to have (P2)
- AI-assisted product description generator (admin)
- Natural-language product search
- Wishlist, product reviews
- Discount codes

## 5. User Stories (core)

- As a shopper, I can search for a product so I can find it quickly.
- As a shopper, I can pay securely and get a confirmation so I know the order went through.
- As an admin, I can add a product with photos so it appears in the store immediately.
- As an admin, I can mark an order as shipped so the customer sees the update.

## 6. Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Products have name, slug, description, price, stock, images, category | P0 |
| FR-2 | Cart totals computed server-side, never trusted from the client | P0 |
| FR-3 | Payment confirmed by gateway webhook, not just the redirect | P0 |
| FR-4 | Admin routes require the `admin` role | P0 |
| FR-5 | Order creation is atomic (no paid order without stock reserved) | P1 |
| FR-6 | Transactional emails on order placed and shipped | P1 |

## 7. Non-Functional Requirements

- **Performance:** listing page loads under 2s on a mid-range connection
- **Security:** hashed passwords (argon2/bcrypt), input validation, rate-limited auth routes, no card data stored (gateway handles it)
- **Reliability:** idempotent webhook handling
- **Quality:** 70%+ test coverage on backend business logic
- **Accessibility:** keyboard navigable, semantic HTML, sensible contrast

## 8. Suggested Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + Tailwind |
| Backend | FastAPI (Python) |
| Database | PostgreSQL + SQLAlchemy/Alembic |
| Payments | PayMongo or Stripe (test mode) |
| Storage | S3-compatible bucket for images |
| Infra | Docker Compose locally; AWS (or a small VPS) for the demo |
| CI/CD | GitHub Actions: lint, test, build, deploy |

Swap freely: the PRD is stack-agnostic. Pick what you want to demo to clients.

## 9. Data Model (high level)

`users` → `orders` → `order_items` → `products` → `categories`
`carts` → `cart_items` → `products`
`payments` linked to `orders`

## 10. Key Flows

1. **Browse → Cart → Checkout → Pay → Confirmation**
2. **Payment webhook → mark order paid → decrement stock → send email**
3. **Admin: create product → publish → appears on storefront**

## 11. Success Criteria

- A stranger can open the live demo and place a test order with no help
- `docker compose up` brings the whole app up from a fresh clone
- README includes screenshots, architecture diagram, and setup steps
- CI is green on `main`

## 12. Milestones

| Week | Deliverable |
|---|---|
| 1 | Repo setup, schema, auth, product API, CI skeleton |
| 2 | Storefront: listing, detail, search, cart |
| 3 | Checkout, payments, webhooks, order history |
| 4 | Admin dashboard, emails, tests, polish |
| 5 | Deploy live demo, README, screenshots, short demo video |

## 13. Risks

| Risk | Mitigation |
|---|---|
| Scope creep | Hold P1/P2 until P0 ships |
| Payment edge cases | Test mode only, idempotent webhooks, log everything |
| Looks unfinished | Seed data with good product photos, consistent design |

## 14. Open Questions

- Which gateway to demo first: PayMongo (local methods like GCash) or Stripe?
- Single-store demo, or multi-tenant "store per client" later?
- Where will the live demo be hosted?

---

## Repo Checklist (for GitHub polish)

- [ ] `README.md` with pitch, screenshots, live demo link, architecture diagram
- [ ] `PRD.md` (this file) in `/docs`
- [ ] `docker-compose.yml` and `.env.example`
- [ ] GitHub Actions badge for CI
- [ ] Issues and a Project board mapped to the milestones above
- [ ] Seed script for demo data
- [ ] `LICENSE` and `CONTRIBUTING.md`