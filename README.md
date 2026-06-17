# Plataforma de Agendamento - Salão & Barbearia

Sistema completo de agendamento online para salão de beleza e barbearia com integração via WhatsApp e pagamento via PIX.

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

### Dashboard Web
- Visão geral da agenda com calendário
- Gestão de profissionais, serviços e clientes
- Relatórios financeiros
- Configurações do sistema
- Perfis: Super Admin e Profissional

## 🛠️ Como Executar

### Pré-requisitos
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### 1. Clone e instale dependências

```bash
# Backend
cd server
npm install

# Frontend
cd ../web
npm install
```

### 2. Configure ambiente

```bash
cp .env.example .env
# Edite o .env com suas configurações
```

### 3. Banco de dados

```bash
cd server
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Execute

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd web
npm run dev
```

### Docker

```bash
docker-compose up -d
```

## 🌐 Acessos

- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3000/api
- **Swagger**: http://localhost:3000/api/docs
- **Admin padrão**: admin@salaobarbearia.com / admin123

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

## 📁 Estrutura do Projeto

```
plataforma_agendamento/
├── server/                 # Backend API + Bot WhatsApp
│   ├── src/
│   │   ├── api/           # API REST controllers, routes, middleware
│   │   ├── bot/           # WhatsApp bot flows e serviços
│   │   ├── services/      # Serviços (PIX, notificações, crédito, etc.)
│   │   ├── jobs/          # Tarefas agendadas (lembretes, expiração)
│   │   ├── config/        # Configurações do sistema
│   │   └── utils/         # Utilitários
│   ├── prisma/            # Schema e migrations
│   └── package.json
├── web/                   # Dashboard React
│   ├── src/
│   │   ├── pages/         # Páginas do dashboard
│   │   ├── components/    # Componentes compartilhados
│   │   ├── contexts/      # Contextos (Auth)
│   │   └── services/      # Serviços (API client)
│   └── package.json
├── docker-compose.yml     # Orquestração Docker
└── .env.example           # Exemplo de variáveis de ambiente
```

## 📄 Licença

Este projeto é privado e de uso exclusivo do estabelecimento.
