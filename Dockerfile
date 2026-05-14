# FiveM logging stack: ingest backend (Express) + Next.js dashboard.
# Aligns with docs/SETUP.md (Node 22+, npm install, npm run build, npm start).
# MySQL and Elasticsearch are provided via docker-compose.yml (see docs).

FROM node:22-bookworm-slim AS dashboard-builder

WORKDIR /build/dashboard

COPY dashboard/package.json dashboard/package-lock.json ./
# package-lock.json can lag package.json (npm ci requires a perfect match); install reconciles in the image.
RUN npm install --no-audit --no-fund

COPY dashboard/ ./

# NEXT_PUBLIC_* is inlined at build time for client bundles.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build && npm prune --omit=dev


FROM node:22-bookworm-slim AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/ ./

WORKDIR /app/dashboard

COPY --from=dashboard-builder /build/dashboard/package.json /build/dashboard/package-lock.json ./
COPY --from=dashboard-builder /build/dashboard/node_modules ./node_modules
COPY --from=dashboard-builder /build/dashboard/.next ./.next
COPY --from=dashboard-builder /build/dashboard/next.config.js ./
COPY --from=dashboard-builder /build/dashboard/jsconfig.json ./
COPY --from=dashboard-builder /build/dashboard/postcss.config.js ./
COPY --from=dashboard-builder /build/dashboard/tailwind.config.js ./
COPY --from=dashboard-builder /build/dashboard/components.json ./

WORKDIR /app

COPY docker/docker-entrypoint.sh docker/wait-for.js /app/docker/
RUN chmod +x /app/docker/docker-entrypoint.sh

ENV NODE_ENV=production

# Backend (PORT) and dashboard (DASHBOARD_PORT, default 3001 per docs/SETUP.md).
EXPOSE 3000 3001

ENTRYPOINT ["/app/docker/docker-entrypoint.sh"]
