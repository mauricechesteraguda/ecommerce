# infra-10022026-Maurice: pinned multi-stage production image.
FROM node:22.14.0-bookworm-slim AS deps
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN pnpm install --frozen-lockfile
FROM deps AS build
COPY . .
ENV DATABASE_URL=postgres://postgres:postgres@postgres:5432/medusa REDIS_URL=redis://redis:6379 PAYMENT_PROVIDER_MODE=test-double
RUN pnpm --filter @ecommerce/backend build
FROM node:22.14.0-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=9000 HOME=/home/medusa COREPACK_HOME=/opt/corepack
WORKDIR /app
RUN mkdir -p "$COREPACK_HOME" && corepack enable && corepack prepare pnpm@10.17.1 --activate && chmod -R a+rX "$COREPACK_HOME"
RUN groupadd --system --gid 1001 medusa && useradd --system --uid 1001 --gid medusa --create-home medusa && mkdir -p /home/medusa/.config /home/medusa/.cache && chown -R medusa:medusa /home/medusa
COPY --from=deps --chown=medusa:medusa /workspace/node_modules ./node_modules
COPY --from=deps --chown=medusa:medusa /workspace/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build --chown=medusa:medusa /workspace/apps/backend ./apps/backend
COPY --from=build --chown=medusa:medusa /workspace/package.json ./package.json
COPY --from=build --chown=medusa:medusa /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
USER medusa
WORKDIR /app/apps/backend
ENTRYPOINT ["/app/apps/backend/docker-entrypoint.sh"]
CMD ["pnpm", "start"]
