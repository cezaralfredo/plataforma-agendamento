# Prompt de Desenvolvimento — Sistema de Agendamento para Salão & Barbearia via WhatsApp

---

## 🎯 Visão Geral do Produto

Desenvolva uma plataforma completa de agendamento online para um estabelecimento que opera como **salão de beleza e barbearia simultaneamente**. O atendimento ao cliente ocorre inteiramente via **WhatsApp Business API**, com confirmação de agendamento condicionada ao **pagamento via PIX automático**. O estabelecimento conta com **múltiplos profissionais**, cada um com sua própria agenda. A gestão é feita tanto por **painel web (dashboard)** quanto por **WhatsApp do administrador**.

---

## 🏗️ Arquitetura Geral

### Componentes principais:
1. **Bot WhatsApp** — Interface de atendimento ao cliente (via WhatsApp Business Cloud API ou Twilio)
2. **Backend API** — Servidor central (Node.js/Python) com regras de negócio
3. **Banco de Dados** — Armazenamento de agendamentos, clientes, profissionais e serviços
4. **Gateway PIX** — Integração com API de pagamento (ex: Mercado Pago, PagSeguro, EfiBank/Gerencianet)
5. **Dashboard Web** — Painel administrativo para gestão da agenda e dos profissionais
6. **Serviço de Notificações** — Envio de lembretes automáticos via WhatsApp

---

## 💬 Fluxo do Bot WhatsApp (Cliente)

### Etapa 1 — Boas-vindas e identificação
- O bot envia uma mensagem de boas-vindas ao cliente.
- Pergunta o nome do cliente para personalizar o atendimento.
- Identifica se é um cliente novo ou recorrente (por número de telefone).

### Etapa 2 — Exibição do menu de serviços
- O bot exibe a **tabela de serviços**, organizada por **número identificador**, tipo de serviço e valor.
- A tabela deve estar separada por categoria:

```
===== SALÃO DE BELEZA =====
[01] Corte Feminino ........... R$ XX,00
[02] Escova ................... R$ XX,00
[03] Coloração ................ R$ XX,00
[04] Progressiva .............. R$ XX,00
[05] Manicure ................. R$ XX,00
[06] Pedicure ................. R$ XX,00

===== BARBEARIA =====
[07] Corte Masculino .......... R$ XX,00
[08] Barba .................... R$ XX,00
[09] Corte + Barba ............ R$ XX,00
[10] Hidratação Capilar ........ R$ XX,00
```

- O cliente digita o **número do serviço** desejado.
- O sistema confirma o serviço selecionado e informa a duração estimada.

### Etapa 3 — Escolha do profissional
- O bot pergunta se o cliente deseja:
  - **[1] Escolher um profissional** — lista os profissionais disponíveis para aquele serviço com nome e especialidade.
  - **[2] Qualquer profissional disponível** — o sistema aloca automaticamente o profissional com horário livre mais próximo.

### Etapa 4 — Escolha de data e horário
- O bot apresenta os **próximos dias disponíveis** (ex: próximos 7 dias úteis).
- Após o cliente escolher a data, exibe os **horários disponíveis** somente do profissional selecionado (ou de todos, se alocação automática).
- O cliente seleciona o horário desejado.
- O sistema reserva o horário temporariamente por **15 minutos** (bloqueio provisório aguardando pagamento).

### Etapa 5 — Confirmação e pagamento via PIX
- O bot exibe um resumo do agendamento:
  ```
  📋 RESUMO DO AGENDAMENTO
  Serviço: [Nome do serviço]
  Profissional: [Nome]
  Data: [DD/MM/AAAA]
  Horário: [HH:MM]
  Valor: R$ XX,00
  ```
- Gera automaticamente uma **chave PIX** (QR Code + código copia-e-cola) com prazo de expiração de 15 minutos.
- O bot instrui o cliente a realizar o pagamento e aguarda a confirmação.

### Etapa 6 — Confirmação automática do pagamento
- O sistema monitora o webhook do gateway de pagamento.
- Ao detectar o pagamento confirmado:
  - O horário é **confirmado definitivamente** na agenda.
  - O bot envia uma **mensagem de confirmação** ao cliente com todos os detalhes do agendamento.
  - Um **comprovante** com código único do agendamento é gerado e enviado.
- Caso o pagamento **não seja realizado** em 15 minutos:
  - O bloqueio temporário é removido.
  - O bot informa que o horário foi liberado e oferece nova tentativa.

### Etapa 7 — Lembretes automáticos
- **24 horas antes**: O bot envia mensagem lembrando do agendamento com data, hora e profissional.
- **1 hora antes**: O bot envia um segundo lembrete com o endereço do estabelecimento.
- Ambos os lembretes incluem opção de **remarcar** digitando uma palavra-chave (ex: "REMARCAR").

---

## 🔄 Cancelamento e Remarcação

### Regras:
- O cliente pode cancelar ou remarcar **até X horas antes** do agendamento (definir política).
- **Não há reembolso em dinheiro**: o valor é convertido em **crédito na conta do cliente**.
- O crédito fica armazenado no sistema e pode ser utilizado no próximo agendamento.
- O bot informa o saldo de crédito disponível durante o fluxo de pagamento.
- Se o saldo cobre o valor total, nenhum PIX é gerado. Se cobre parcialmente, o PIX é gerado pelo valor restante.

### Fluxo de remarcação:
1. Cliente envia "REMARCAR" ou acessa a opção no menu.
2. Bot exibe o agendamento atual.
3. Cliente escolhe nova data e horário.
4. Sistema confirma a remarcação sem novo pagamento (usando o crédito existente).

---

## 🖥️ Dashboard Web — Painel Administrativo

### Autenticação:
- Login com e-mail e senha para administrador e profissionais.
- Perfis de acesso: **Super Admin** (dono) e **Profissional** (acesso restrito à própria agenda).

### Funcionalidades do Super Admin:
- **Visão geral da agenda**: calendário com todos os agendamentos do dia/semana/mês por profissional.
- **Gestão de profissionais**: cadastrar, editar e desativar profissionais; definir horários de trabalho e dias de folga.
- **Gestão de serviços**: cadastrar, editar, ativar/desativar serviços da tabela; atualizar valores e duração.
- **Gestão de clientes**: histórico de agendamentos, saldo de crédito, dados de contato.
- **Gestão financeira**: relatório de pagamentos PIX recebidos, créditos pendentes, faturamento por período.
- **Configurações do bot**: mensagens personalizadas, horários de funcionamento, tempo de bloqueio provisório.
- **Notificações manuais**: envio de mensagens em massa para clientes via WhatsApp.

### Funcionalidades do Profissional:
- Visualizar a própria agenda do dia/semana.
- Marcar ausências ou bloqueios de horário.
- Visualizar dados básicos dos clientes agendados.

---

## 📱 Gestão via WhatsApp do Administrador

- Número exclusivo do admin para comandos de gestão.
- Comandos via palavras-chave ou menu interativo:
  - `AGENDA HOJE` — lista todos os agendamentos do dia.
  - `AGENDA [NOME DO PROFISSIONAL]` — agenda específica de um profissional.
  - `BLOQUEAR [DATA] [HORA] [PROFISSIONAL]` — bloqueia um horário manualmente.
  - `CANCELAR [CÓDIGO]` — cancela um agendamento pelo código único.
  - `CREDITO [NÚMERO DO CLIENTE]` — verifica saldo de crédito de um cliente.
  - `FATURAMENTO HOJE` — exibe o total recebido no dia.

---

## 🗄️ Modelo de Dados (Entidades Principais)

### `Cliente`
- id, nome, telefone (WhatsApp), email (opcional), saldo_credito, criado_em

### `Profissional`
- id, nome, especialidades[], horario_trabalho (dias e horários), ativo

### `Serviço`
- id (número identificador), nome, categoria (salão/barbearia), valor, duracao_minutos, ativo

### `Agendamento`
- id, codigo_unico, cliente_id, profissional_id, servico_id, data_hora, status (pendente/confirmado/cancelado/concluído), valor_pago, credito_utilizado

### `Pagamento`
- id, agendamento_id, txid_pix, valor, status (aguardando/pago/expirado), criado_em, pago_em

### `Crédito`
- id, cliente_id, valor, origem (cancelamento/remarcação), utilizado, criado_em

---

## 🔔 Regras de Negócio Críticas

1. **Nenhum horário é confirmado sem pagamento**: o bloqueio provisório expira em 15 minutos.
2. **Um horário só pode ter um agendamento confirmado** por profissional.
3. **Créditos não expiram** (ou definir política de expiração com prazo).
4. **Créditos são pessoais e intransferíveis** (vinculados ao número de telefone).
5. **O bot deve tratar erros de digitação** e entradas inválidas com mensagens amigáveis e reapresentação do menu.
6. **Horários de funcionamento** devem bloquear agendamentos fora do expediente.
7. **Profissional inativo** não aparece como opção de escolha.

---

## 🔌 Integrações Necessárias

| Integração | Finalidade | Sugestão de Serviço |
|---|---|---|
| WhatsApp Business API | Envio e recebimento de mensagens | Meta Cloud API / Twilio |
| Gateway PIX | Geração de cobranças e webhook de confirmação | EfiBank / Mercado Pago / PagSeguro |
| Banco de Dados | Persistência de dados | PostgreSQL / MySQL |
| Hospedagem Backend | API e serviços | Railway / Render / AWS |
| Hospedagem Frontend | Dashboard web | Vercel / Netlify |
| Agendador de Tarefas | Lembretes automáticos e expiração de bloqueios | Bull/BullMQ (Node) / Celery (Python) |

---

## 🛡️ Requisitos Não Funcionais

- **Segurança**: dados de clientes e pagamentos devem trafegar via HTTPS; chaves PIX não devem ser expostas publicamente.
- **Disponibilidade**: o bot deve responder em menos de 3 segundos.
- **Escalabilidade**: o sistema deve suportar múltiplos atendimentos simultâneos sem conflito de agenda.
- **Logs**: registrar todas as interações do bot e transações financeiras para auditoria.
- **LGPD**: informar ao cliente sobre o uso de seus dados e permitir exclusão sob solicitação.

---

## 📦 Entregáveis Esperados

1. Código-fonte do bot WhatsApp com fluxo completo de agendamento.
2. API backend com endpoints documentados (Swagger/OpenAPI).
3. Dashboard web responsivo (desktop e mobile).
4. Scripts de migração do banco de dados.
5. Documentação de configuração das integrações (WhatsApp API e PIX).
6. Instruções de deploy e variáveis de ambiente necessárias.

---

*Prompt gerado para desenvolvimento full-stack de plataforma de agendamento — Salão & Barbearia.*
