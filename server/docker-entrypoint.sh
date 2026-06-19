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

echo "🔍 Verificando se seed já foi executado..."
SEED_DONE=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM usuarios WHERE email = 'admin@salaobarbearia.com';" 2>/dev/null | tail -1 || echo "0")
SEED_DONE=$(echo "$SEED_DONE" | tr -d '[:space:]')

if [ "$SEED_DONE" = "0" ] || [ -z "$SEED_DONE" ]; then
  echo "🌱 Executando seed..."
  npx ts-node --transpile-only prisma/seed.ts
  echo "✅ Seed concluído!"
else
  echo "⏭️ Seed já executado anteriormente, pulando..."
fi

echo "🚀 Iniciando servidor..."
exec node dist/server.js
