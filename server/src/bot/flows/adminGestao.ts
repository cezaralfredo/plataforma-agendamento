import prisma from '../../services/prisma';
import { config } from '../../config';
import { SessionManager } from '../services/sessionManager';
import { BotResponse, SessaoBot } from '../types';
import { format, startOfDay, endOfDay } from 'date-fns';

const sessionManager = new SessionManager();

export async function adminGestao(telefone: string, mensagem: string, session: SessaoBot): Promise<BotResponse> {
  if (telefone !== config.evolution.adminNumber) {
    return {
      type: 'text',
      text: 'Acesso restrito a administradores.',
    };
  }

  const msg = mensagem.trim().toLowerCase();
  const dados = JSON.parse(JSON.stringify((session.dados || {}) as any));

  if (msg === 'voltar' || msg === '0' || msg === 'menu' || msg === 'sair') {
    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'buttons',
      text: 'Voltando ao menu principal.',
      buttons: [
        { id: 'agendar', title: '📅 Agendar' },
        { id: 'cancelar', title: '❌ Cancelar' },
      ],
    };
  }

  if (msg === 'nao') {
    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'buttons',
      text: 'Ação cancelada. Escolha outra opção:',
      buttons: [
        { id: 'visao_geral', title: '📋 Visão geral' },
        { id: 'bloquear', title: '🔒 Bloquear data' },
        { id: 'estatisticas', title: '📊 Estatísticas' },
      ],
    };
  }

  if (!dados.adminStep) {
    if (msg === 'visao_geral') {
      dados.adminStep = 'visao_geral';
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', dados);
    } else if (msg === 'bloquear') {
      dados.adminStep = 'bloquear_data';
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', dados);
    } else if (msg === 'estatisticas') {
      dados.adminStep = 'estatisticas';
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', dados);
    } else {
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
      return {
        type: 'buttons',
        text: '⚙️ *Painel Administrativo*\n\nEscolha uma opção:',
        buttons: [
          { id: 'visao_geral', title: '📋 Visão geral' },
          { id: 'bloquear', title: '🔒 Bloquear data' },
          { id: 'estatisticas', title: '📊 Estatísticas' },
        ],
      };
    }
  }

  if (dados.adminStep === 'confirmar_bloqueio') {
    const profissionalId = dados.bloqueioProfissionalId;
    const dataStr = dados.bloqueioData;
    const motivo = dados.bloqueioMotivo || 'Bloqueio administrativo';

    if (msg === 'sim' || msg === '✅ sim') {
      if (profissionalId && dataStr) {
        await prisma.bloqueioAgenda.create({
          data: {
            profissionalId,
            data: new Date(dataStr),
            motivo,
          },
        });
      }
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
      return {
        type: 'text',
        text: `✅ Data ${dataStr ? format(new Date(dataStr), 'dd/MM/yyyy') : ''} bloqueada com sucesso!`,
      };
    }
  }

  if (dados.adminStep === 'bloquear_data') {
    if (msg.startsWith('prof_')) {
      const profissionalId = msg.replace('prof_', '');
      dados.adminStep = 'bloquear_data_data';
      dados.bloqueioProfissionalId = profissionalId;
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', dados);

      return {
        type: 'text',
        text: 'Informe a data para bloquear (formato DD/MM/AAAA, ex: 25/12/2024):',
      };
    }

    const profissionais = await prisma.profissional.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });

    return {
      type: 'list',
      text: 'Selecione o profissional para bloquear:',
      listItems: profissionais.map(p => ({
        id: `prof_${p.id}`,
        title: p.nome,
      })),
    };
  }

  if (dados.adminStep === 'bloquear_data_data') {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = msg.match(dateRegex);

    if (!match) {
      return {
        type: 'text',
        text: 'Formato inválido. Use DD/MM/AAAA (ex: 25/12/2024).',
      };
    }

    const dataStr = `${match[3]}-${match[2]}-${match[1]}`;
    dados.adminStep = 'confirmar_bloqueio';
    dados.bloqueioData = dataStr;
    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', dados);

    const profissional = await prisma.profissional.findUnique({
      where: { id: dados.bloqueioProfissionalId },
    });

    return {
      type: 'buttons',
      text: [
        `Confirmar bloqueio para ${profissional?.nome || 'Profissional'}`,
        `Data: ${match[1]}/${match[2]}/${match[3]}`,
        '',
        'Deseja realmente bloquear?',
      ].join('\n'),
      buttons: [
        { id: 'sim', title: '✅ Sim' },
        { id: 'nao', title: '❌ Não' },
      ],
    };
  }

  if (dados.adminStep === 'visao_geral') {
    const hoje = new Date();
    const inicio = startOfDay(hoje);
    const fim = endOfDay(hoje);

    const agendamentosHoje = await prisma.agendamento.findMany({
      where: {
        dataHora: { gte: inicio, lte: fim },
        status: { notIn: ['CANCELADO'] },
      },
      include: {
        profissional: true,
        servico: true,
        cliente: true,
      },
      orderBy: { dataHora: 'asc' },
    });

    const profissionaisAtivos = await prisma.profissional.count({ where: { ativo: true } });
    const agendamentosPendentes = await prisma.agendamento.count({
      where: { status: 'PENDENTE' },
    });
    const faturamentoHoje = agendamentosHoje
      .filter(a => a.status === 'CONFIRMADO' || a.status === 'CONCLUIDO')
      .reduce((sum, a) => sum + a.valorPago, 0);

    const linhas: string[] = [
      '📊 *Resumo do Dia*',
      '',
      `Hoje: ${agendamentosHoje.length} agendamento(s)`,
      `Profissionais ativos: ${profissionaisAtivos}`,
      `Agendamentos pendentes: ${agendamentosPendentes}`,
      `Faturamento hoje: R$ ${faturamentoHoje.toFixed(2)}`,
      '',
    ];

    if (agendamentosHoje.length > 0) {
      linhas.push('*Agendamentos de hoje:*');
      for (const ag of agendamentosHoje) {
        linhas.push(`- ${format(ag.dataHora, 'HH:mm')} | ${ag.cliente.nome} | ${ag.servico.nome} | ${ag.profissional.nome} | ${ag.status}`);
      }
    }

    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});

    return {
      type: 'buttons',
      text: linhas.join('\n'),
      buttons: [
        { id: 'voltar', title: '🔙 Voltar ao menu' },
      ],
    };
  }

  if (dados.adminStep === 'estatisticas') {
    const totalClientes = await prisma.cliente.count();
    const totalAgendamentos = await prisma.agendamento.count();
    const totalConfirmados = await prisma.agendamento.count({ where: { status: 'CONFIRMADO' } });
    const totalCancelados = await prisma.agendamento.count({ where: { status: 'CANCELADO' } });
    const totalServicos = await prisma.servico.count({ where: { ativo: true } });
    const totalProfissionais = await prisma.profissional.count({ where: { ativo: true } });
    const totalFaturamento = await prisma.agendamento.aggregate({
      where: { status: { in: ['CONFIRMADO', 'CONCLUIDO'] } },
      _sum: { valorPago: true },
    });

    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});

    return {
      type: 'buttons',
      text: [
        '📈 *Estatísticas*',
        '',
        `Total de clientes: ${totalClientes}`,
        `Total de agendamentos: ${totalAgendamentos}`,
        `  - Confirmados: ${totalConfirmados}`,
        `  - Cancelados: ${totalCancelados}`,
        `Serviços ativos: ${totalServicos}`,
        `Profissionais ativos: ${totalProfissionais}`,
        `Faturamento total: R$ ${(totalFaturamento._sum.valorPago || 0).toFixed(2)}`,
      ].join('\n'),
      buttons: [
        { id: 'voltar', title: '🔙 Voltar ao menu' },
      ],
    };
  }

  await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
  return { type: 'text', text: 'Opção inválida no menu administrativo.' };
}
