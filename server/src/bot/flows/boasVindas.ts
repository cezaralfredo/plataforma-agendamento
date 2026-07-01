import prisma from '../../services/prisma';
import { SessionManager } from '../services/sessionManager';
import { BotResponse, SessaoBot } from '../types';
import { Tenant } from '@prisma/client';

const sessionManager = new SessionManager();

export async function boasVindas(telefone: string, mensagem: string, session: SessaoBot, tenant: Tenant): Promise<BotResponse> {
  const msg = mensagem.trim();
  const tenantId = tenant.id;

  if (session.etapa === 'SAUDACAO') {
    const cliente = await prisma.cliente.findUnique({
      where: { tenantId_telefone: { tenantId, telefone } },
    });

    if (!cliente || !cliente.nome || cliente.nome.trim() === '') {
      await sessionManager.updateSession(session.id, 'NOME', {});
      return {
        type: 'text',
        text: [
          `Olá! Seja bem-vindo(a) ao ${tenant.nome}! 💈`,
          '',
          'Para começarmos, por favor me informe seu nome completo:',
        ].join('\n'),
      };
    }

    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'buttons',
      text: [
        `Olá ${cliente.nome}! Que bom ter você de volta! 🌟`,
        '',
        'Como posso ajudá-lo(a) hoje?',
      ].join('\n'),
      buttons: [
        { id: 'agendar', title: '📅 Agendar' },
        { id: 'cancelar', title: '❌ Cancelar' },
        { id: 'admin', title: '⚙️ Admin' },
      ],
    };
  }

  if (session.etapa === 'NOME') {
    if (msg.length < 2 || !/^[a-zA-ZÀ-ÿ\s]+$/.test(msg)) {
      return {
        type: 'text',
        text: 'Por favor, informe um nome válido (apenas letras, sem números ou caracteres especiais).',
      };
    }

    await prisma.cliente.upsert({
      where: { tenantId_telefone: { tenantId, telefone } },
      update: { nome: msg },
      create: { tenantId, telefone, nome: msg },
    });

    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'buttons',
      text: [
        `Prazer em conhecer você, ${msg}! 😊`,
        '',
        'Como posso ajudá-lo(a) hoje?',
      ].join('\n'),
      buttons: [
        { id: 'agendar', title: '📅 Agendar' },
        { id: 'cancelar', title: '❌ Cancelar' },
        { id: 'admin', title: '⚙️ Admin' },
      ],
    };
  }

  return {
    type: 'text',
    text: 'Não entendi. Envie "menu" para recomeçar.',
  };
}
