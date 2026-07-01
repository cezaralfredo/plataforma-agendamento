#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until nc -z "${POSTGRES_HOST:-postgres}" "${POSTGRES_PORT:-5432}" 2>/dev/null; do
  sleep 2
done
echo "PostgreSQL is available."

echo "Waiting for Redis..."
until nc -z "${REDIS_HOST:-redis}" "${REDIS_PORT:-6379}" 2>/dev/null; do
  sleep 2
done
echo "Redis is available."

echo "Applying database migrations..."
npx prisma migrate deploy 2>/dev/null || {
  echo "No migrations found — running db push instead..."
  npx prisma db push --skip-generate
}
echo "Schema synchronized."

if [ "$RUN_SEED" = "true" ]; then
  echo "Running idempotent seed..."
  TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' npx ts-node --transpile-only prisma/seed.ts
  echo "Seed finished."
fi

echo "Starting server..."
exec node dist/server.js
