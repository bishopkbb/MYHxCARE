# syntax=docker/dockerfile:1

# ------------------------------------------------------------
# Shared base
# ------------------------------------------------------------
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# ------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------
FROM base AS dependencies

# Prevent the prepare script from trying to install Git hooks.
ENV HUSKY=0

COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ------------------------------------------------------------
# Application build
# ------------------------------------------------------------
FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_ENV

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL}"
ENV NEXT_PUBLIC_WS_URL="${NEXT_PUBLIC_WS_URL}"
ENV NEXT_PUBLIC_APP_ENV="${NEXT_PUBLIC_APP_ENV}"

RUN npm run build

# ------------------------------------------------------------
# Production runtime
# ------------------------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup \
      --system \
      --gid 1001 \
      nodejs \
    && adduser \
      --system \
      --uid 1001 \
      --ingroup nodejs \
      nextjs

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/public \
    ./public

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/standalone \
    ./

COPY --from=builder \
    --chown=nextjs:nodejs \
    /app/.next/static \
    ./.next/static

USER nextjs:nodejs

EXPOSE 3000

CMD ["node", "server.js"]