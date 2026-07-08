# syntax=docker/dockerfile:1.7
#
# Build context MUST be the repository root (pnpm workspace), e.g.:
#   docker build -f apps/front/Dockerfile .
# The provided docker-compose.yml already sets this up.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/front/package.json ./apps/front/package.json
COPY apps/api/package.json ./apps/api/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY apps/front ./apps/front
ARG VITE_API_URL=http://localhost:3002
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter front run build-only

# ---- runtime image: static files served by nginx ----
FROM nginx:1.27-alpine AS runtime
COPY apps/front/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/front/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
