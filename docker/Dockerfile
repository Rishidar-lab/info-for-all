# IFA — container image.
# Simple, reproducible, "just runs": builds the app, then on start migrates and
# seeds a SQLite database and serves it. See docs/ARCHITECTURE.md for the
# standalone-output optimisation (deferred for the MVP).

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- dependencies (with build toolchain for better-sqlite3) ----
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Full install — platform-specific native packages (lightningcss, swc,
# better-sqlite3 prebuilds) are transitive optionalDependencies and are required.
RUN npm ci

# ---- build ----
FROM deps AS build
COPY . .
RUN npm run db:generate && npm run build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/ifa.db
ENV IFA_DEMO_MODE=true
RUN groupadd --system --gid 1001 ifa \
  && useradd --system --uid 1001 --gid ifa ifa \
  && mkdir /data && chown ifa:ifa /data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER ifa
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "start"]
