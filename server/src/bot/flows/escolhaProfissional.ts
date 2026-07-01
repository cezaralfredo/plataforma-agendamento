import prisma from '../../services/prisma';
import { SessionManager } from '../services/sessionManager';
import { BotResponse, SessaoBot } from '../types';
import { Tenant } from '@prisma/client';

const sessionManager = new SessionManager();

export async function escolhaProfissional(telefone: string, mensagem: string, session: SessaoBot, tenant: Tenant): Promise<BotResponse> {
  const msg = mensagem.trim().toLowerCase();
  const dados = (session.dados || {}) as any;
  const tenantId = tenant.id;

  if (msg === 'voltar' || msg === '0') {
    const servicos = await prisma.servico.findMany({
      where: { ativo: true, tenantId },
      orderBy: { nome: 'asc' },
    });

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
      text: 'Voltando aos serviços. Escolha novamente:',
      listItems: servicos.map(s => ({
        id: `serv_${s.id}`,
        title: s.nome,
        description: `R$ ${s.valor.toFixed(2)}`,
      })),
    };
  }

  if (msg === 'menu') {
    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'buttons',
      text: 'Menu principal:',
      buttons: [
        { id: 'agendar', title: '📅 Agendar' },
        { id: 'cancelar', title: '❌ Cancelar' },
      ],
    };
  }

  if (msg.startsWith('prof_')) {
    const profissionalId = msg.replace('prof_', '');
    const profissional = await prisma.profissional.findUnique({ where: { id: profissionalId } });

    if (!profissional || !profissional.ativo || profissional.tenantId !== tenantId) {
      return { type: 'text', text: 'Profissional não encontrado. Tente novamente.' };
    }

    await sessionManager.updateSession(session.id, 'ESCOLHA_DATA', {
      ...dados,
      profissionalId: profissional.id,
      profissionalNome: profissional.nome,
    });

    return {
      type: 'text',
      text: [
        `Ótimo! Você escolheu ${profissional.nome}.`,
        '',
        'Agora vamos escolher a data do agendamento...',
      ].join('\n'),
    };
  }

  const profissionais = await prisma.profissional.findMany({
    where: { ativo: true, tenantId },
    orderBy: { nome: 'asc' },
  });

  if (profissionais.length === 0) {
    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'text',
      text: 'Desculpe, não há profissionais disponíveis no momento. Voltando ao menu principal.',
    };
  }

  if (profissionais.length === 1) {
    const prof = profissionais[0];
    await sessionManager.updateSession(session.id, 'ESCOLHA_DATA', {
      ...dados,
      profissionalId: prof.id,
      profissionalNome: prof.nome,
    });

    return {
      type: 'text',
      text: [
        `Nosso profissional disponível é ${prof.nome}.`,
        '',
        'Agora vamos escolher a data do agendamento...',
      ].join('\n'),
    };
  }

  return {
    type: 'list',
    text: 'Escolha o profissional desejado:',
    listItems: profissionais.map(p => ({
      id: `prof_${p.id}`,
      title: p.nome,
      description: p.especialidades?.length > 0 ? p.especialidades.join(', ') : undefined,
    })),
  };
}
