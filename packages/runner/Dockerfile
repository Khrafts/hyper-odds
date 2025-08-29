# Multi-stage build for optimized production image
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml* ./
COPY packages/runner/package.json ./packages/runner/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Development stage
FROM base AS development

# Copy source code
COPY packages/runner/ ./packages/runner/
COPY packages/shared/ ./packages/shared/

# Set working directory to runner
WORKDIR /app/packages/runner

# Expose ports
EXPOSE 3000 3001 3002

# Start development server
CMD ["pnpm", "dev"]

# Build stage
FROM base AS build

# Copy source code
COPY packages/runner/ ./packages/runner/
COPY packages/shared/ ./packages/shared/

# Set working directory to runner
WORKDIR /app/packages/runner

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml* ./
COPY packages/runner/package.json ./packages/runner/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=build --chown=nextjs:nodejs /app/packages/runner/dist ./packages/runner/dist
COPY --from=build --chown=nextjs:nodejs /app/packages/shared/dist ./packages/shared/dist

# Set working directory to runner
WORKDIR /app/packages/runner

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/index.js"]