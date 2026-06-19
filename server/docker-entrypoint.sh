#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until nc -z postgres 5432; do
  sleep 2
done
echo "PostgreSQL is available."

echo "Waiting for Redis..."
until nc -z redis 6379; do
  sleep 2
done
echo "Redis is available."

echo "Synchronizing database schema..."
npx prisma db push --skip-generate
echo "Schema synchronized."

echo "Running idempotent seed..."
TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"Node"}' npx ts-node --transpile-only prisma/seed.ts
echo "Seed finished."

echo "Starting server..."
exec node dist/server.js
