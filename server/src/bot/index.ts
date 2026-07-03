import { Request, Response } from 'express';
import { IMessagingService, createMessagingService } from './services/messagingInterface';
import { parseEvolutionMensagem } from '../utils/helpers';
import { parseMetaWebhook, verifyMetaWebhook } from './services/metaWhatsAppService';
import { parseTelegramWebhook } from './services/telegramService';
import { config } from '../config';
import prisma from '../services/prisma';
import { BotResponse, BotTenantInfo } from './types';
import { boasVindas } from './flows/boasVindas';
import { menuServicos } from './flows/menuServicos';
import { escolhaProfissional } from './flows/escolhaProfissional';
import { escolhaHorario } from './flows/escolhaHorario';
import { confirmacao } from './flows/confirmacao';
import { pagamentoPIX } from './flows/pagamentoPIX';
import { cancelamento } from './flows/cancelamento';
import { adminGestao } from './flows/adminGestao';
import { SessionManager } from './services/sessionManager';

const sessionManager = new SessionManager();

async function getTenantFromSlug(slug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || !tenant.ativo) return null;
  return tenant as unknown as BotTenantInfo;
}

async function processConversation(
  identificador: string,
  mensagem: string,
  tenant: BotTenantInfo,
  messenger: IMessagingService
): Promise<void> {
  const tenantId = tenant.id;

  let cliente = await prisma.cliente.findUnique({
    where: { tenantId_telefone: { tenantId, telefone: identificador } },
  });

  if (!cliente) {
    cliente = await prisma.cliente.create({
      data: { tenantId, telefone: identificador, nome: 'Cliente' },
    });
  }

  let session = await sessionManager.getSession(cliente.id, tenantId);
  if (!session) {
    session = await sessionManager.createSession(cliente.id, tenantId, identificador);
  }

  let response: BotResponse;

  if (session.dados?.adminStep) {
    response = await adminGestao(identificador, mensagem, session, tenant as any);
  } else {
    switch (session.etapa) {
      case 'SAUDACAO':
      case 'NOME':
        response = await boasVindas(identificador, mensagem, session, tenant as any);
        break;

      case 'MENU_SERVICOS':
      case 'ESCOLHA_SERVICO':
        response = await menuServicos(identificador, mensagem, session, tenant as any);
        break;

      case 'ESCOLHA_PROFISSIONAL':
        response = await escolhaProfissional(identificador, mensagem, session, tenant as any);
        break;

      case 'ESCOLHA_DATA':
      case 'ESCOLHA_HORARIO':
        response = await escolhaHorario(identificador, mensagem, session, tenant as any);
        break;

      case 'CONFIRMACAO':
        response = await confirmacao(identificador, mensagem, session, tenant as any);
        if (response.text === '__ROUTE_PAGAMENTO__') {
          session = await sessionManager.getSession(cliente.id, tenantId) || session;
          response = await pagamentoPIX(identificador, '', session, tenant as any);
        }
        break;

      case 'PAGAMENTO':
        response = await pagamentoPIX(identificador, mensagem, session, tenant as any);
        break;

      case 'AGENDADO':
        response = await pagamentoPIX(identificador, mensagem, session, tenant as any);
        break;

      case 'CANCELAMENTO':
      case 'REMARCACAO':
        response = await cancelamento(identificador, mensagem, session, tenant as any);
        break;

      default:
        await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
        response = {
          type: 'text',
          text: 'Não entendi. Vamos recomeçar! Envie "menu" para o menu principal.',
        };
    }
  }

  await prisma.logBot.create({
    data: {
      tenantId,
      telefone: identificador,
      mensagem: `Msg: ${mensagem.substring(0, 200)} | Resp: ${response.text.substring(0, 200)}`,
      tipo: session.etapa,
    },
  });

  switch (response.type) {
    case 'buttons':
      await messenger.sendButtons(identificador, response.text, response.buttons || []);
      break;
    case 'list':
      await messenger.sendList(identificador, response.text, response.listItems || []);
      break;
    default:
      await messenger.sendMessage(identificador, response.text);
  }
}

export async function processarMensagemEvolution(req: Request, res: Response): Promise<void> {
  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok' });
    return;
  }

  const apiKeyHeader = req.headers['apikey'] as string;
  if (config.evolution.apiKey) {
    if (!apiKeyHeader || apiKeyHeader !== config.evolution.apiKey) {
      console.warn('[Bot Evolution] API key ausente ou inválida');
      res.sendStatus(200);
      return;
    }
  }

  const tenantSlug = req.params.tenantSlug || 'default';
  const tenant = await getTenantFromSlug(tenantSlug);
  if (!tenant) {
    console.warn(`[Bot Evolution] Tenant não encontrado: ${tenantSlug}`);
    res.sendStatus(200);
    return;
  }

  const parsed = parseEvolutionMensagem(req.body);
  if (!parsed) {
    res.sendStatus(200);
    return;
  }

  const { from, message } = parsed;
  const messenger = createMessagingService(tenant);

  try {
    await processConversation(from, message, tenant, messenger);
    res.sendStatus(200);
  } catch (error) {
    console.error('[Bot Evolution] Error:', error);
    try {
      await messenger.sendMessage(from, 'Desculpe, ocorreu um erro. Tente novamente.');
    } catch { }
    res.sendStatus(200);
  }
}

export async function processarMensagemMeta(req: Request, res: Response): Promise<void> {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    if (!config.meta.verifyToken || verifyMetaWebhook(mode, token, config.meta.verifyToken)) {
      if (challenge) {
        res.status(200).send(challenge);
        return;
      }
      res.status(200).json({ status: 'ok' });
      return;
    }
    res.status(403).send('Verificação falhou');
    return;
  }

  const parsed = parseMetaWebhook(req.body);
  if (!parsed) {
    res.sendStatus(200);
    return;
  }

  const { from: telefone, message } = parsed;
  const tenantSlug = req.params.tenantSlug || 'default';
  const tenant = await getTenantFromSlug(tenantSlug);

  if (!tenant) {
    console.warn(`[Bot Meta] Tenant não encontrado: ${tenantSlug}`);
    res.sendStatus(200);
    return;
  }

  const messenger = createMessagingService(tenant);

  try {
    await processConversation(telefone, message, tenant, messenger);
    res.sendStatus(200);
  } catch (error) {
    console.error('[Bot Meta] Error:', error);
    try {
      await messenger.sendMessage(telefone, 'Desculpe, ocorreu um erro. Tente novamente.');
    } catch { }
    res.sendStatus(200);
  }
}

export async function processarMensagemTelegram(req: Request, res: Response): Promise<void> {
  const parsed = parseTelegramWebhook(req.body);
  if (!parsed) {
    res.sendStatus(200);
    return;
  }

  const { from: chatId, message } = parsed;
  const tenantSlug = req.params.tenantSlug || 'default';
  const tenant = await getTenantFromSlug(tenantSlug);

  if (!tenant) {
    console.warn(`[Bot Telegram] Tenant não encontrado: ${tenantSlug}`);
    res.sendStatus(200);
    return;
  }

  const messenger = createMessagingService(tenant);

  try {
    await processConversation(chatId, message, tenant, messenger);
    res.sendStatus(200);
  } catch (error) {
    console.error('[Bot Telegram] Error:', error);
    try {
      await messenger.sendMessage(chatId, 'Desculpe, ocorreu um erro. Tente novamente.');
    } catch { }
    res.sendStatus(200);
  }
}
