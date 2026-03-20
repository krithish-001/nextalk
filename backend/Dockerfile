# ── Stage 1: Dependencies ──────────────────────────────────────────────────────
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

# Create logs directory
RUN mkdir -p logs && chown nodeuser:nodejs logs

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nodeuser:nodejs . .

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "src/server.js"]
