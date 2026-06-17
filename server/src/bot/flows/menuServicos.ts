import prisma from '../../services/prisma';
import { config } from '../../config';
import { SessionManager } from '../services/sessionManager';
import { BotResponse, SessaoBot } from '../types';
import { adminGestao } from './adminGestao';

const sessionManager = new SessionManager();

export async function menuServicos(telefone: string, mensagem: string, session: SessaoBot): Promise<BotResponse> {
  const msg = mensagem.trim().toLowerCase();
  const dados = (session.dados || {}) as any;

  if (dados.adminStep) {
    return await adminGestao(telefone, mensagem, session);
  }

  if (msg === 'voltar' || msg === '0' || msg === 'menu') {
    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'buttons',
      text: 'Menu principal:',
      buttons: [
        { id: 'agendar', title: '📅 Agendar' },
        { id: 'cancelar', title: '❌ Cancelar' },
        { id: 'admin', title: '⚙️ Admin' },
      ],
    };
  }

  if (session.etapa === 'MENU_SERVICOS') {
    if (msg === 'cancelar' || msg === '❌ cancelar') {
      await sessionManager.updateSession(session.id, 'CANCELAMENTO', {});
      return {
        type: 'text',
        text: 'Vou buscar seus agendamentos ativos. Um momento...',
      };
    }

    if (msg === 'admin' || msg === '⚙️ admin') {
      if (telefone !== config.evolution.adminNumber) {
        return {
          type: 'text',
          text: 'Desculpe, apenas administradores podem acessar esta função.',
        };
      }
      const result = await adminGestao(telefone, msg, session);
      return result;
    }

    const categorias = await prisma.servico.findMany({
      where: { ativo: true },
      select: { categoria: true },
      distinct: ['categoria'],
    });

    if (categorias.length === 0) {
      return {
        type: 'text',
        text: 'No momento não há serviços disponíveis. Tente novamente mais tarde.',
      };
    }

    if (categorias.length === 1) {
      const servicos = await prisma.servico.findMany({
        where: { ativo: true, categoria: categorias[0].categoria },
        orderBy: { nome: 'asc' },
      });

      if (servicos.length === 0) {
        return { type: 'text', text: 'Nenhum serviço disponível no momento.' };
      }

      await sessionManager.updateSession(session.id, 'ESCOLHA_SERVICO', {
        servicos: servicos.map(s => ({
          id: s.id,
          nome: s.nome,
          valor: s.valor,
          duracaoMinutos: s.duracaoMinutos,
        })),
      });

      return {
        type: 'list',
        text: 'Escolha o serviço desejado:',
        listItems: servicos.map(s => ({
          id: `serv_${s.id}`,
          title: s.nome,
          description: `R$ ${s.valor.toFixed(2)} • ${s.duracaoMinutos} min`,
        })),
      };
    }

    await sessionManager.updateSession(session.id, 'ESCOLHA_SERVICO', {
      categorias: categorias.map(c => c.categoria),
    });

    return {
      type: 'buttons',
      text: 'Escolha a categoria:',
      buttons: categorias.map(c => ({
        id: `cat_${c.categoria}`,
        title: c.categoria === 'SALAO' ? '💇 Salão' : '💈 Barbearia',
      })),
    };
  }

  if (session.etapa === 'ESCOLHA_SERVICO') {
    if (msg.startsWith('cat_')) {
      const categoria = msg.replace('cat_', '') as 'SALAO' | 'BARBEARIA';
      const servicos = await prisma.servico.findMany({
        where: { ativo: true, categoria },
        orderBy: { nome: 'asc' },
      });

      if (servicos.length === 0) {
        return { type: 'text', text: 'Nenhum serviço disponível nesta categoria.' };
      }

      await sessionManager.updateSession(session.id, 'ESCOLHA_SERVICO', {
        servicos: servicos.map(s => ({
          id: s.id,
          nome: s.nome,
          valor: s.valor,
          duracaoMinutos: s.duracaoMinutos,
        })),
      });

      return {
        type: 'list',
        text: 'Escolha o serviço desejado:',
        listItems: servicos.map(s => ({
          id: `serv_${s.id}`,
          title: s.nome,
          description: `R$ ${s.valor.toFixed(2)} • ${s.duracaoMinutos} min`,
        })),
      };
    }

    if (msg.startsWith('serv_')) {
      const servicoId = parseInt(msg.replace('serv_', ''), 10);
      const servico = await prisma.servico.findUnique({ where: { id: servicoId } });

      if (!servico || !servico.ativo) {
        return { type: 'text', text: 'Serviço não encontrado. Tente novamente.' };
      }

      await sessionManager.updateSession(session.id, 'ESCOLHA_PROFISSIONAL', {
        servicoId: servico.id,
        servicoNome: servico.nome,
        servicoValor: servico.valor,
        servicoDuracao: servico.duracaoMinutos,
      });

      return {
        type: 'text',
        text: [
          `Ótima escolha! ${servico.nome}`,
          `Valor: R$ ${servico.valor.toFixed(2)}`,
          `Duração: ${servico.duracaoMinutos} minutos`,
          '',
          'Agora vamos escolher o profissional...',
        ].join('\n'),
      };
    }

    if (dados.servicos && Array.isArray(dados.servicos)) {
      return {
        type: 'list',
        text: 'Opção inválida. Escolha um dos serviços abaixo:',
        listItems: dados.servicos.map((s: any) => ({
          id: `serv_${s.id}`,
          title: s.nome,
          description: `R$ ${s.valor.toFixed(2)}`,
        })),
      };
    }

    if (dados.categorias && Array.isArray(dados.categorias)) {
      return {
        type: 'buttons',
        text: 'Opção inválida. Escolha a categoria:',
        buttons: dados.categorias.map((c: string) => ({
          id: `cat_${c}`,
          title: c === 'SALAO' ? '💇 Salão' : '💈 Barbearia',
        })),
      };
    }

    return { type: 'text', text: 'Opção inválida. Por favor, tente novamente.' };
  }

  return { type: 'text', text: 'Não entendi. Envie "menu" para recomeçar.' };
}
