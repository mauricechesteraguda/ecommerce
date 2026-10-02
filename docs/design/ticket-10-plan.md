# Ticket 10 internal design plan

## Confirmed direction

AGUDA Deskworks is a Filipino desk-goods shop expressed as a Blueprint Workshop: drafting-paper white, deep blueprint indigo, mango yellow, and restrained semantic green/red/amber. The storefront should feel like a working drawing, not a generic commerce dashboard.

## Tokens and type

- `--paper` `#F7F3E8`, `--indigo` `#172A52`, `--mango` `#F4B942`, `--line` `#B8C4D5`, `--ink` `#172A52`.
- Semantic colors: `--success` `#176B4D`, `--danger` `#A43A3A`, `--warning` `#8A5B00`.
- Display: locally safe Georgia for the hand-drafted editorial voice; body: system sans for readable forms; utility: monospace for coordinates, prices, labels, and status chips.

## Layout and reusable patterns

The shell uses a ruled technical grid, compact annotation labels, and one indigo navigation rail/header shared by catalog, product, account, cart, checkout, and order views. Reusable primitives are tokens, `SiteHeader`, `Button`, `Field`, `StatusChip`, `ProductCard`, and `Totals`; page states use the same loading, error, empty, and recovery language.

```text
[skip link]
[AGUDA mark | Catalog  Account  Cart  Menu]
[annotation / page title -----------------------]
[filters or form]          [product / totals / status]
[footer coordinates + admin redirect]
```

## Interaction and proof

All inputs have labels/descriptions, errors use a summary and focus management, focus rings are visible, touch targets are at least 44px, motion is reduced when requested, and mobile navigation collapses without hiding primary actions. Confirmation reads authoritative order status from the backend and polls; redirect parameters never imply payment. Existing tracing is retained for custom functions touched, with Ticket 10 `ui-10022026-Maurice` annotations where appropriate.

## Verification mapping

The CSV accessibility cases are TC-197–TC-210 (REQ-15 Accessibility), while the requested regression run is TC-001–TC-140. Ticket 10 UX checks additionally cover catalog/detail/account/cart/checkout/confirmation/order/admin route states, keyboard-only flow, mobile/desktop layout, no-results/error/recovery, contrast, and listing performance under 2 seconds.
