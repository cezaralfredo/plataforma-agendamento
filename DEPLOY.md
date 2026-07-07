# Deploy

## Imagens

O workflow `.github/workflows/docker-build.yml` publica:

- `ghcr.io/<owner>/<repo>-server:<tag>`
- `ghcr.io/<owner>/<repo>-web:<tag>`

Para este repositório, o padrão é:

- `ghcr.io/cezaralfredo/plataforma_agendamento-server:latest`
- `ghcr.io/cezaralfredo/plataforma_agendamento-web:latest`

Se o repositório tiver outro owner/nome, ajuste `IMAGE_REPOSITORY` no ambiente.

## Portainer

Use `docker-compose.portainer.yml` quando não houver Traefik/roteador externo.

Variáveis mínimas:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `EVOLUTION_API_KEY`
- `FRONTEND_URL`
- `WEB_PORT` (padrao: `80`)
- `EVOLUTION_PORT` (padrao: `8080`)
- `IMAGE_REPOSITORY`
- `IMAGE_TAG`

Se as imagens GHCR forem privadas, configure credenciais do registry no Portainer.

## Easypanel

Use `docker-compose.prod.yml` com o `easypanel.json`.

Variáveis mínimas:

- `DOMAIN`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `EVOLUTION_API_KEY`
- `EVOLUTION_PUBLIC_URL`
- `IMAGE_REPOSITORY`
- `IMAGE_TAG`

O compose de produção não publica portas diretamente; expõe os serviços via labels do Traefik.

## Multi-tenancy

A aplicação roda em modo multi-tenant. Cada tenant usa um slug único (ex: `meusalao`).

Criacao de tenants:
- **Via API:** `POST /api/tenants/signup` (requer chave de registro ou token admin)
- **Seed inicial:** `docker compose exec api npx ts-node prisma/seed.ts`

Ao criar um tenant, copie o `instanceId` e use-o no Evolution para conectar o WhatsApp daquele estabelecimento.

### Admin Dashboard (SaaS)

Apos o seed, o super admin tem acesso ao painel administrativo da plataforma:

| Rota | Funcionalidade |
|------|---------------|
| `/admin` | Dashboard global (métricas, planos, financeiro) |
| `/admin/estabelecimentos` | Lista completa de tenants com busca e filtros |
| `/admin/estabelecimentos/:id` | Detalhes do tenant, assinatura, faturas, atividades |
| `/admin/planos` | CRUD de planos de assinatura |
| `/admin/faturas` | Faturamento recorrente |

### Planos de Assinatura

O seed cria 3 planos automaticamente:

| Plano | Preço | Profissionais | Serviços | Clientes |
|-------|-------|---------------|----------|----------|
| Basic | Grátis | 2 | 10 | 100 |
| Pro | R$ 97/mês | 5 | 30 | 500 |
| Enterprise | R$ 197/mês | Ilimitado | Ilimitado | Ilimitado |

Para gerenciar planos:
- **Via API:** `GET/POST/PUT /api/planos` (requer token super admin)
- **Via Web:** Acessar `/admin/planos`

### Assinaturas

Cada tenant possui uma assinatura vinculada a um plano. Para alterar:

- **Via API:** `PUT /api/assinaturas/:id` com `{ planoId: "..." }`
- **Via Web:** Acessar `/admin/estabelecimentos/:id` e clicar em "Alterar Plano"

### Faturamento

O sistema gera faturas com base no ciclo da assinatura. Para gerenciar:

- **Via API:** `POST /api/faturas/gerar` para criar manualmente
- **Via API:** `POST /api/faturas/gerar-ciclo` para gerar faturas de todos os ciclos vencidos
- **Via Web:** Acessar `/admin/faturas`

## Healthchecks

- Web: porta interna `80`
- API: `GET /health` na porta interna `3000`
- Evolution: raiz `/` na porta interna `8080`
- PostgreSQL/Redis: healthchecks nativos

## Primeiro acesso

Usuario seed:

- Email: `admin@salaobarbearia.com`
- Senha: `admin123`

Troque a senha após o primeiro login.
