# infra-10022026-Maurice: pinned multi-stage Next image, running without root.
FROM node:22.14.0-bookworm-slim AS deps
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json
RUN pnpm install --frozen-lockfile
FROM deps AS build
COPY . .
# infra-10022026-Maurice: Docker Desktop resolves the host gateway from the
# standalone Next server as well as from a browser. Deployments may override
# this build arg with their public backend origin.
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://host.docker.internal:9000
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL
RUN pnpm --filter @ecommerce/storefront build
FROM node:22.14.0-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8000 HOSTNAME=0.0.0.0
WORKDIR /app
RUN groupadd --system --gid 1001 storefront && useradd --system --uid 1001 --gid storefront storefront
COPY --from=build --chown=storefront:storefront /workspace/apps/storefront/.next/standalone ./
COPY --from=build --chown=storefront:storefront /workspace/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=build --chown=storefront:storefront /workspace/apps/storefront/public ./apps/storefront/public
COPY --from=build --chown=storefront:storefront /workspace/apps/storefront/docker-entrypoint.sh ./apps/storefront/docker-entrypoint.sh
USER storefront
ENTRYPOINT ["/app/apps/storefront/docker-entrypoint.sh"]
CMD ["node", "apps/storefront/server.js"]
