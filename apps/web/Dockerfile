# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm globally (project uses pnpm)
RUN npm install -g pnpm

# Copy all package files for dependency resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json turbo.json ./

# Copy all packages and apps
COPY packages/ ./packages/
COPY apps/ ./apps/

# Install all dependencies including workspace packages
RUN pnpm install --frozen-lockfile

# Build workspace dependencies that the web app imports at type-check time
RUN pnpm --filter @openzosma/logger run build && \
    pnpm --filter @openzosma/memory run build && \
    pnpm --filter @openzosma/db run build && \
    pnpm --filter @openzosma/integrations run build && \
    (pnpm --filter @openzosma/skill-reports run build || true) && \
    pnpm --filter @openzosma/agents run build

# Build the web application with standalone output
ARG NEXT_PUBLIC_GATEWAY_URL=http://localhost:4000
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3000
ENV NEXT_PUBLIC_GATEWAY_URL=$NEXT_PUBLIC_GATEWAY_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_CONFIG_OUTPUT=standalone
RUN pnpm --filter @openzosma/web build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nextjs -u 1001

# Copy necessary files from builder
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "apps/web/server.js"]
