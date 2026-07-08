# syntax=docker/dockerfile:1.7
#
# Build context MUST be the repository root (pnpm workspace), e.g.:
#   docker build -f apps/api/Dockerfile .
# The provided docker-compose.yml already sets this up.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /repo

# ---- install full workspace deps (needed to build) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/front/package.json ./apps/front/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build the api ----
FROM deps AS build
COPY apps/api ./apps/api
RUN pnpm --filter api exec prisma generate
RUN pnpm --filter api run build

# ---- install production-only deps for the api ----
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/api/package.json ./apps/api/package.json
COPY apps/front/package.json ./apps/front/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter=api...

# ---- runtime image ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init openssl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /usr/sbin/nologin appuser
WORKDIR /repo

COPY --from=prod-deps --chown=appuser:appuser /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=appuser:appuser /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps --chown=appuser:appuser /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=appuser:appuser /repo/apps/api/dist ./apps/api/dist
COPY --chown=appuser:appuser apps/api/prisma ./apps/api/prisma
COPY --chown=appuser:appuser apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --chown=appuser:appuser apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /repo/apps/api
USER appuser

EXPOSE 3002
ENTRYPOINT ["dumb-init", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
