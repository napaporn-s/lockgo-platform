# Multi-stage production build for LOCKGO Platform
FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app

# Stage 1: Dependencies
FROM base AS dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Stage 2: Build & Verify
FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN bun run typecheck
RUN bun test

# Stage 3: Production Runner
FROM oven/bun:1.3.14-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
COPY tsconfig.json ./

USER bun
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
