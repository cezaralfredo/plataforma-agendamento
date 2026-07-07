# Plataforma de Agendamento - Salão & Barbearia

Sistema completo de agendamento online multi-tenant para salão de beleza e barbearia com integração via WhatsApp e pagamento via PIX.

## 🚀 Tecnologias

- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Banco de Dados**: PostgreSQL
- **Filas**: Redis + Bull
- **WhatsApp**: Evolution Go API (WhatsApp Web via Baileys)
- **PIX**: Asaas
- **Autenticação**: JWT + bcrypt

## 📋 Funcionalidades

### Bot WhatsApp
- Fluxo completo de agendamento (boas-vindas → serviço → profissional → data → pagamento)
- Pagamento via PIX com QR Code e copia-e-cola
- Confirmação automática via webhook
- Lembretes automáticos (24h e 1h antes)
- Cancelamento e remarcação com crédito
- Gestão administrativa via WhatsApp

### Dashboard Web (Estabelecimento)
- Visão geral da agenda com calendário
- Gestão de profissionais, serviços e clientes
- Relatórios financeiros
- Configurações do sistema
- Perfis: Super Admin e Profissional

### Painel Administrativo (Plataforma SaaS)
- Dashboard global com métricas de todos os estabelecimentos
- Gestão de planos de assinatura (Basic, Pro, Enterprise)
- Gerenciamento de estabelecimentos (criar, ativar/desativar)
- Detalhes do tenant com assinatura, faturas e atividades
- Faturamento recorrente com geração de faturas
- Log de atividades e alterações de plano

## 🛠️ Como Executar

### Pré-requisitos
- Docker e Docker Compose
- Node.js 20+ (para desenvolvimento sem Docker)
- PostgreSQL 16+
- Redis 7+

### Docker (recomendado)

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd plataforma_agendamento

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env se necessário

# Inicie todos os serviços
docker compose up -d

# Execute o seed do banco de dados
docker compose exec api npx prisma db push
docker compose exec api npx ts-node prisma/seed.ts

# Acesse:
# - Dashboard: http://localhost:5173
# - API: http://localhost:3000/api
```

### Desenvolvimento (sem Docker)

```bash
# 1. Configure o banco PostgreSQL e Redis localmente
# 2. Configure o .env com as URLs de conexão

# Backend
cd server
npm install
npx prisma db push
npx ts-node prisma/seed.ts
npm run dev

# Frontend (outro terminal)
cd web
npm install
npm run dev
```

## 🌐 Acessos

### Credenciais Padrão

| Perfil | Email | Senha | Tenant |
|--------|-------|-------|--------|
| Super Admin | admin@salaobarbearia.com | admin123 | demo |

### URLs

| Serviço | URL |
|---------|-----|
| Dashboard Web | http://localhost:5173 |
| API | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |
| Evolution API | http://localhost:8080 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## 🖥️ Navegação no Dashboard

### Menu Principal (estabelecimento)
- **Dashboard** — Visão geral com métricas, gráfico de faturamento e agendamentos
- **Agendamentos** — Gerenciar agendamentos (tabela/calendário)
- **Profissionais** — Cadastro e edição de profissionais
- **Serviços** — Catálogo de serviços (Salão/Barbearia)
- **Clientes** — Histórico de clientes e créditos
- **Financeiro** — Relatórios de receita
- **Configurações** — Regras do sistema e mensagens do bot

### Menu Administrativo (SaaS) — visível apenas para Super Admin
- **Plataforma** — Dashboard global com métricas agregadas de todos os estabelecimentos, distribuição de planos, atividades recentes e resumo financeiro
- **Estabelecimentos** — Lista completa com busca, filtros por status/plano e detalhes de cada tenant
- **Planos** — CRUD de planos de assinatura (nome, preço, limites, features)
- **Faturamento** — Gerenciamento de faturas, geração manual, marcar como paga, resumo financeiro

### Detalhes do Estabelecimento
- Informações cadastrais e configurações
- Assinatura atual com opção de alterar plano
- Últimas faturas geradas
- Agendamentos por status e faturamento total
- Atividades recentes (log de auditoria)

## 📦 Planos de Assinatura

| Recurso | Basic | Pro | Enterprise |
|---------|-------|-----|------------|
| Preço | Grátis | R$ 97/mês | R$ 197/mês |
| Profissionais | 2 | 5 | Ilimitado |
| Serviços | 10 | 30 | Ilimitado |
| Clientes | 100 | 500 | Ilimitado |
| Agendamentos/mês | 200 | 1.000 | Ilimitado |
| WhatsApp API | ✅ | ✅ | ✅ |
| Multi-profissional | ✅ | ✅ | ✅ |
| Relatórios Financeiros | ❌ | ✅ | ✅ |
| Domínio Personalizado | ❌ | ✅ | ✅ |
| Evolution API | ❌ | ✅ | ✅ |

## 🔌 Integrações

### Evolution Go (WhatsApp API)
O Evolution Go é uma API open-source para WhatsApp que utiliza a biblioteca Baileys (WhatsApp Web). Ela substitui a Meta Cloud API, não requer aprovação do Facebook e funciona com qualquer número de WhatsApp.

#### Configuração via Docker
O Evolution Go já está configurado no `docker-compose.yml`. Para conectar seu WhatsApp:

1. Acesse o endpoint de conexão:
   ```
   GET http://localhost:8080/instance/connect/agendamento-bot
   ```
   (Autenticação: header `apikey: evo-api-key-agendamento`)

2. Escaneie o QR Code exibido com o WhatsApp do estabelecimento

3. Verifique o status da conexão:
   ```
   GET http://localhost:8080/instance/connectionState/agendamento-bot
   ```

#### Webhook
O Evolution Go já está configurado para enviar eventos ao nosso backend:
- URL: `http://api:3000/webhook/whatsapp`
- Eventos: `messages.upsert`

#### Endpoints disponíveis da Evolution Go API
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/message/sendText/{instance}` | Enviar texto |
| POST | `/message/sendButtons/{instance}` | Enviar botões |
| POST | `/message/sendList/{instance}` | Enviar lista |
| GET | `/instance/connect/{instance}` | Obter QR Code |
| GET | `/instance/connectionState/{instance}` | Status da conexão |
| GET | `/instance/logout/{instance}` | Desconectar |

### Asaas (PIX e Pagamentos)
1. Crie uma conta em [asaas.com](https://asaas.com)
2. Gere um **Access Token** em: Configurações → Integrações → API
3. Obtenha um token do tipo **Produção** (ou **Sandbox** para testes)
4. Configure `ASAAS_API_KEY` e `ASAAS_SANDBOX` no `.env`

#### Webhook Asaas
Para receber notificações de pagamento em tempo real, configure um Webhook no Asaas:
1. Acesse: Configurações → Integrações → Webhook
2. URL: `https://seu-dominio.com/api/pagamentos/webhook`
3. Ative os eventos de **Pagamentos** (especialmente `PAYMENT_RECEIVED`)
4. O token de autenticação `asaas-access-token` será validado automaticamente

> **Para desenvolvimento local**, use [ngrok](https://ngrok.com) para expor seu servidor:
> ```bash
> ngrok http 3000
> ```
> E configure a URL gerada como webhook no Asaas.

## 🔧 Variáveis de Ambiente

### Banco de Dados
| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | URL de conexão PostgreSQL | `postgresql://agendamento:agendamento123@localhost:5432/plataforma_agendamento` |
| `REDIS_URL` | URL de conexão Redis | `redis://localhost:6379` |

### Autenticação
| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `JWT_SECRET` | Chave secreta para JWT | gerado automaticamente |
| `JWT_EXPIRES_IN` | Tempo de expiração do token | `7d` |

### WhatsApp
| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PROVEDOR_MENSAGERIA_PADRAO` | Provedor (EVOLUTION/META/TELEGRAM) | `EVOLUTION` |
| `EVOLUTION_API_URL` | URL da Evolution API | `http://localhost:8080` |
| `EVOLUTION_API_KEY` | API Key da Evolution | `evo-api-key-agendamento` |
| `WHATSAPP_ADMIN_NUMBER` | Número do admin para gestão via WhatsApp | - |

### Pagamentos (Asaas)
| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `ASAAS_API_KEY` | Access Token do Asaas | - |
| `ASAAS_API_URL` | URL customizada da API | - |
| `ASAAS_SANDBOX` | Modo sandbox (true/false) | `true` |
| `ASAAS_WEBHOOK_TOKEN` | Token para validação de webhook | - |

### Regras de Negócio
| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `TEMPO_BLOQUEIO_PROVISORIO_MINUTOS` | Tempo de bloqueio provisório | `15` |
| `TEMPO_EXPIRACAO_PIX_MINUTOS` | Tempo para expiração do PIX | `15` |
| `HORAS_ANTECEDENCIA_CANCELAMENTO` | Antecedência mínima para cancelar | `2` |
| `PRAZO_EXPIRACAO_CREDITO_DIAS` | Prazo de validade dos créditos | `365` |

### Multi-tenant
| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `SIGNUP_SECRET_KEY` | Chave secreta para criar novos tenants | - |
| `DISABLE_SIGNUP` | Desabilitar criação de contas | `false` |
| `DEFAULT_TENANT_SLUG` | Slug do tenant padrão | `demo` |

## 📁 Estrutura do Projeto

```
plataforma_agendamento/
├── server/                         # Backend API + Bot WhatsApp
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/        # Controladores REST
│   │   │   │   ├── authController.ts
│   │   │   │   ├── tenantController.ts
│   │   │   │   ├── adminController.ts        # Dashboard global e gestão de tenants
│   │   │   │   ├── planoController.ts        # CRUD de planos
│   │   │   │   ├── assinaturaController.ts   # Assinaturas dos tenants
│   │   │   │   ├── faturaController.ts       # Faturamento recorrente
│   │   │   │   ├── clienteController.ts
│   │   │   │   ├── profissionalController.ts
│   │   │   │   ├── servicoController.ts
│   │   │   │   ├── agendamentoController.ts
│   │   │   │   ├── pagamentoController.ts
│   │   │   │   ├── dashboardController.ts
│   │   │   │   └── configuracoesController.ts
│   │   │   ├── middleware/          # Autenticação, autorização, erros
│   │   │   └── routes/             # Agregador de rotas
│   │   ├── bot/                    # Bot WhatsApp (flows, serviços, tipos)
│   │   ├── services/               # Prisma, PIX, crédito, notificações
│   │   ├── jobs/                   # Bull queues (lembretes, expiração)
│   │   ├── config/                 # Configurações do sistema
│   │   └── utils/                  # Helpers e transformers
│   ├── prisma/
│   │   ├── schema.prisma           # Modelo de dados
│   │   ├── migrations/             # Migrations do banco
│   │   └── seed.ts                 # Dados iniciais
│   └── package.json
├── web/                            # Dashboard React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Admin/              # Painel administrativo SaaS
│   │   │   │   ├── DashboardPage.tsx       # Métricas globais
│   │   │   │   ├── EstabelecimentosPage.tsx# Lista de tenants
│   │   │   │   ├── TenantDetailPage.tsx    # Detalhes do tenant
│   │   │   │   ├── PlanosPage.tsx          # CRUD de planos
│   │   │   │   └── FaturasPage.tsx         # Faturamento
│   │   │   ├── Dashboard/          # Dashboard do estabelecimento
│   │   │   ├── Agendamentos/
│   │   │   ├── Profissionais/
│   │   │   ├── Servicos/
│   │   │   ├── Clientes/
│   │   │   ├── Financeiro/
│   │   │   ├── Configuracoes/
│   │   │   ├── Login/
│   │   │   └── Tenants/
│   │   ├── components/             # Componentes reutilizáveis
│   │   ├── contexts/               # Contextos (Auth)
│   │   ├── services/               # API client (Axios)
│   │   └── hooks/                  # Custom hooks
│   └── package.json
├── docker-compose.yml              # Orquestração Docker
├── .env.example                    # Exemplo de variáveis de ambiente
└── DEPLOY.md                       # Instruções de deploy
```

## 🗄️ Modelo de Dados

### Entidades Principais
- **Tenant** — Estabelecimento (multi-tenant)
- **Plano** — Planos de assinatura com limites e features
- **Assinatura** — Associação tenant-plano com ciclo e status
- **Fatura** — Cobranças recorrentes
- **AtividadeTenant** — Log de auditoria
- **Cliente** — Cliente do estabelecimento
- **Profissional** — Profissional com especialidades e horários
- **Serviço** — Serviço com categoria (Salão/Barbearia), valor e duração
- **Agendamento** — Agendamento com status e valores
- **Pagamento** — Pagamento PIX via Asaas
- **Crédito** — Créditos de cancelamento

## 📄 Licença

Este projeto é privado e de uso exclusivo do estabelecimento.
