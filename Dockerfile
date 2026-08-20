# Multi-stage production Dockerfile for Cloud Run
# Stage 1: Build Frontend and Server bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build Vite frontend assets and bundle server.cjs with esbuild (without sourcemaps)
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production Minimal Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Run as non-root user for container security
USER node

# Copy package descriptors and install only production dependencies
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled frontend and bundled server from builder stage
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/public ./public

# Default Cloud Run container port is 8080 (Cloud Run injects PORT environment variable automatically)
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Health check using non-root wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-8080}/health || exit 1

# Start bundled Node.js server
CMD ["node", "dist/server.cjs"]
