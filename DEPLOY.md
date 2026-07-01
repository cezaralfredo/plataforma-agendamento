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
- **Via API:** `POST /api/tenants` (requer token admin)
- **Seed inicial:** o slug padrao é definido em `DEFAULT_TENANT_SLUG`

Ao criar um tenant, copie o `instanceId` e use-o no Evolution para conectar o WhatsApp daquele estabelecimento.

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
