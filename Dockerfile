# ==============================================================================
# WordChain — Multiplayer Academic Word Arena
# Production Multi-Stage Dockerfile
# ==============================================================================

# STAGE 1: Build & Compile Monorepo
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root manifest and lockfiles
COPY package.json package-lock.json tsconfig.base.json ./

# Copy package manifests for deterministic layer caching
COPY packages/shared/package.json packages/shared/tsconfig.json ./packages/shared/
COPY packages/lexicon/package.json packages/lexicon/tsconfig.json ./packages/lexicon/
COPY apps/server/package.json apps/server/tsconfig.json ./apps/server/
COPY apps/web/package.json apps/web/tsconfig.json ./apps/web/

# Install all dependencies across monorepo workspaces
RUN npm ci

# Copy package and application sources
COPY packages/shared/ ./packages/shared/
COPY packages/lexicon/ ./packages/lexicon/
COPY apps/server/ ./apps/server/
COPY apps/web/ ./apps/web/

# Build all monorepo workspaces
RUN npm run build --workspace=@wordchain/shared && \
    npm run build --workspace=@wordchain/lexicon && \
    npm run build --workspace=@wordchain/web && \
    npm run build --workspace=@wordchain/server

# Prune development dependencies to keep final footprint minimal
RUN npm prune --omit=dev

# ==============================================================================
# STAGE 2: Lightweight Production Runtime
# ==============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV SERVE_STATIC=true

# Install wget for lightweight healthcheck execution
RUN apk add --no-cache wget

# Switch to standard non-root user
USER node

# Copy dependency tree and package definitions
COPY --chown=node:node --from=builder /app/package.json /app/package-lock.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Copy shared library distribution
COPY --chown=node:node --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --chown=node:node --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy lexicon engine distribution & wordlist databases
COPY --chown=node:node --from=builder /app/packages/lexicon/package.json ./packages/lexicon/
COPY --chown=node:node --from=builder /app/packages/lexicon/dist ./packages/lexicon/dist
COPY --chown=node:node --from=builder /app/packages/lexicon/data ./packages/lexicon/data

# Copy pre-rendered static frontend bundle for Express SPA static serving
COPY --chown=node:node --from=builder /app/apps/web/package.json ./apps/web/
COPY --chown=node:node --from=builder /app/apps/web/dist ./apps/web/dist

# Copy authoritative game engine server distribution
COPY --chown=node:node --from=builder /app/apps/server/package.json ./apps/server/
COPY --chown=node:node --from=builder /app/apps/server/dist ./apps/server/dist

# Expose web & real-time WebSocket listening port
EXPOSE 4000

# Authoritative health probe (monitors express API status)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

# Launch authoritative game engine and web application
CMD ["node", "apps/server/dist/index.js"]
