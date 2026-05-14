# ── Stage 1: deps ─────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# --ignore-scripts prevents lifecycle scripts in deps from running during install
RUN npm ci --only=production --ignore-scripts

# ── Stage 2: production ───────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# dumb-init: proper PID 1 — forwards signals (SIGTERM/SIGINT) to Node correctly
RUN apk add --no-cache dumb-init wget

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S smartshop -u 1001

COPY --from=deps --chown=smartshop:nodejs /app/node_modules ./node_modules
COPY --chown=smartshop:nodejs . .

RUN mkdir -p logs && chown smartshop:nodejs logs

ENV NODE_ENV=production
ENV PORT=4000

USER smartshop
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

# dumb-init wraps node so signals propagate correctly (graceful shutdown works)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
