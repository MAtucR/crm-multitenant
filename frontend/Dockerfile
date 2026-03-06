# ── Stage 1: deps ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# ── Stage 2: builder ────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: runtime ───────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S crm && adduser -S crm -G crm

COPY --from=builder /app/public ./public
COPY --from=builder --chown=crm:crm /app/.next/standalone ./
COPY --from=builder --chown=crm:crm /app/.next/static ./.next/static

USER crm
EXPOSE 3000
CMD ["node", "server.js"]
