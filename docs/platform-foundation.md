# Platform foundation

## Local services

Ticket 02 uses PostgreSQL as the only durable store and Redis for Medusa runtime, event, cache, and queue concerns. Both services are expected to run locally; Docker configuration is intentionally not included.

Copy `.env.example` to `.env`, replace both secrets with random values of at least 32 characters, and start local PostgreSQL and Redis using the operator's preferred installation method.

## Commands

```sh
corepack pnpm install
corepack pnpm dev
corepack pnpm validate:env
corepack pnpm health
corepack pnpm build
```

The backend liveness endpoint is `GET /health`; dependency readiness is `GET /health/ready`. Readiness returns `503` when either PostgreSQL or Redis is unavailable and never includes connection strings or credentials.

## Versions

The scaffold pins the registry-supported Medusa v2 and Medusa CLI `2.21.2`, Next.js `16.3.8`, React `19.2.0`, and pnpm `10.17.1`. No dependency installation is represented as complete until `pnpm install` succeeds and produces the lockfile.
