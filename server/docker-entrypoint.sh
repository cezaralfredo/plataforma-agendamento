#!/bin/sh
set -e

echo "⏳ Aguardando PostgreSQL..."
until nc -z postgres 5432; do
  sleep 2
done
echo "✅ PostgreSQL disponível!"

echo "⏳ Aguardando Redis..."
until nc -z redis 6379; do
  sleep 2
done
echo "✅ Redis disponível!"

echo "📦 Sincronizando esquema do banco de dados..."
npx prisma db push --accept-data-loss
echo "✅ Schema sincronizado!"

echo "🌱 Executando seed..."
npx ts-node prisma/seed.ts
echo "✅ Seed concluído!"

echo "🚀 Iniciando servidor..."
exec node dist/server.js
