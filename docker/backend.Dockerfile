# ============================================================
# CivicPulse Backend — Multi-stage Dockerfile
# ============================================================

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++

# ── Dependencies ─────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
RUN npm ci --workspace=apps/backend --workspace=packages/shared

# ── Build ────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend
COPY tsconfig.base.json ./
WORKDIR /app/apps/backend
RUN npm run build

# ── Production ───────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 civicpulse && \
    adduser --system --uid 1001 civicpulse

COPY --from=build --chown=civicpulse:civicpulse /app/apps/backend/dist ./dist
COPY --from=build --chown=civicpulse:civicpulse /app/apps/backend/package.json ./
COPY --from=deps --chown=civicpulse:civicpulse /app/apps/backend/node_modules ./node_modules

USER civicpulse

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
