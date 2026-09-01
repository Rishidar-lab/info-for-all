#!/bin/sh
set -e

# Provision the database on first boot, then reseed only if it is empty.
if [ ! -f "${DATABASE_URL#file:}" ]; then
  echo "[ifa] no database found — migrating and seeding DEMO DATA"
  npx tsx src/lib/db/migrate.ts
  npx tsx src/lib/db/seed.ts
else
  echo "[ifa] database present — applying any pending migrations"
  npx tsx src/lib/db/migrate.ts
fi

exec "$@"
