# Multi-stage build for BOLT AI Trading System
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Production runtime
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy necessary files
COPY --from=builder /app/config ./config

# Create data directory with proper permissions
RUN mkdir -p /app/data /app/data/logs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Environment variables (defaults, override with .env or docker-compose)
ENV NODE_ENV=production \
    PORT=8001 \
    DATABASE_PATH=/app/data/bolt.db \
    REDIS_HOST=redis \
    REDIS_PORT=6379

# Start application
CMD ["node", "dist/index.js"]
