import { Request, Response } from 'express';
import { WhatsAppService } from './services/whatsappService';
import { SessionManager } from './services/sessionManager';
import { parseEvolutionMensagem } from '../utils/helpers';
import { config } from '../config';
import prisma from '../services/prisma';
import { BotResponse } from './types';
import { boasVindas } from './flows/boasVindas';
import { menuServicos } from './flows/menuServicos';
import { escolhaProfissional } from './flows/escolhaProfissional';
import { escolhaHorario } from './flows/escolhaHorario';
import { confirmacao } from './flows/confirmacao';
import { pagamentoPIX } from './flows/pagamentoPIX';
import { cancelamento } from './flows/cancelamento';
import { adminGestao } from './flows/adminGestao';

const whatsapp = new WhatsAppService();
const sessionManager = new SessionManager();

export async function processarMensagem(req: Request, res: Response): Promise<void> {
  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok' });
    return;
  }

  const parsed = parseEvolutionMensagem(req.body);
  if (!parsed) {
    res.sendStatus(200);
    return;
  }

  const { from: telefone, message: mensagem } = parsed;

  try {
    let cliente = await prisma.cliente.findUnique({ where: { telefone } });
    if (!cliente) {
      cliente = await prisma.cliente.create({ data: { telefone, nome: 'Cliente' } });
    }

    let session = await sessionManager.getSession(telefone);
    if (!session) {
      session = await sessionManager.createSession(cliente.id, telefone);
    }

    let response: BotResponse;

    if (session.dados?.adminStep) {
      response = await adminGestao(telefone, mensagem, session);
    } else {
      switch (session.etapa) {
        case 'SAUDACAO':
        case 'NOME':
          response = await boasVindas(telefone, mensagem, session);
          break;

        case 'MENU_SERVICOS':
        case 'ESCOLHA_SERVICO':
          response = await menuServicos(telefone, mensagem, session);
          break;

        case 'ESCOLHA_PROFISSIONAL':
          response = await escolhaProfissional(telefone, mensagem, session);
          break;

        case 'ESCOLHA_DATA':
        case 'ESCOLHA_HORARIO':
          response = await escolhaHorario(telefone, mensagem, session);
          break;

        case 'CONFIRMACAO':
          response = await confirmacao(telefone, mensagem, session);
          if (response.text === '__ROUTE_PAGAMENTO__') {
            session = await sessionManager.getSession(telefone) || session;
            response = await pagamentoPIX(telefone, '', session);
          }
          break;

        case 'PAGAMENTO':
          response = await pagamentoPIX(telefone, mensagem, session);
          break;

        case 'AGENDADO':
          response = await pagamentoPIX(telefone, mensagem, session);
          break;

        case 'CANCELAMENTO':
        case 'REMARCACAO':
          response = await cancelamento(telefone, mensagem, session);
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
        telefone,
        mensagem: `Msg: ${mensagem.substring(0, 200)} | Resp: ${response.text.substring(0, 200)}`,
        tipo: session.etapa,
      },
    });

    switch (response.type) {
      case 'buttons':
        await whatsapp.sendButtons(telefone, response.text, response.buttons || []);
        break;
      case 'list':
        await whatsapp.sendList(telefone, response.text, response.listItems || []);
        break;
      default:
        await whatsapp.sendMessage(telefone, response.text);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('[Bot] Error processing message:', error);
    try {
      await whatsapp.sendMessage(
        telefone,
        'Desculpe, ocorreu um erro inesperado. Por favor, tente novamente em alguns instantes.'
      );
    } catch { }
    res.sendStatus(200);
  }
}
