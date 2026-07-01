import prisma from '../../services/prisma';
import { SessionManager } from '../services/sessionManager';
import { BotResponse, SessaoBot } from '../types';
import { format } from 'date-fns';
import { formatarMoeda, formatarDataHora } from '../../utils/helpers';
import { Tenant } from '@prisma/client';

const sessionManager = new SessionManager();

export async function cancelamento(telefone: string, mensagem: string, session: SessaoBot, tenant: Tenant): Promise<BotResponse> {
  const msg = mensagem.trim().toLowerCase();
  const dados = (session.dados || {}) as any;
  const tenantId = tenant.id;

  if (msg === 'voltar' || msg === '0' || msg === 'menu') {
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

  const cliente = await prisma.cliente.findUnique({
    where: { tenantId_telefone: { tenantId, telefone } },
  });
  if (!cliente) {
    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return { type: 'text', text: 'Cliente não encontrado.' };
  }

  const hoje = new Date();

  if (session.etapa === 'CANCELAMENTO') {
    if (msg.startsWith('ag_')) {
      const agendamentoId = msg.replace('ag_', '');
      await sessionManager.updateSession(session.id, 'CANCELAMENTO', {
        ...dados,
        confirmarCancelamentoId: agendamentoId,
        aguardandoConfirmacao: true,
      });

      const agendamento = await prisma.agendamento.findUnique({
        where: { id: agendamentoId },
        include: { servico: true, profissional: true },
      });

      if (!agendamento) {
        return { type: 'text', text: 'Agendamento não encontrado.' };
      }

      return {
        type: 'buttons',
        text: [
          '⚠️ *Confirmar cancelamento*',
          '',
          `Serviço: ${agendamento.servico.nome}`,
          `Profissional: ${agendamento.profissional.nome}`,
          `Data: ${formatarDataHora(agendamento.dataHora)}`,
          `Valor: R$ ${agendamento.valorPago.toFixed(2)}`,
          '',
          'Tem certeza que deseja cancelar este agendamento?',
        ].join('\n'),
        buttons: [
          { id: 'sim_cancelar', title: '✅ Sim, cancelar' },
          { id: 'nao_cancelar', title: '❌ Não, manter' },
        ],
      };
    }

    if (msg === 'sim_cancelar' || msg === '✅ sim, cancelar') {
      const agendamentoId = dados.confirmarCancelamentoId;
      if (!agendamentoId) {
        return { type: 'text', text: 'Nenhum agendamento selecionado.' };
      }

      const agendamento = await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { status: 'CANCELADO' },
        include: { servico: true },
      });

      const valorCredito = agendamento.valorPago * 0.9;
      await prisma.credito.create({
        data: {
          tenantId,
          clienteId: cliente.id,
          valor: valorCredito,
          origem: `Cancelamento ${agendamento.codigoUnico}`,
        },
      });

      await prisma.cliente.update({
        where: { id: cliente.id },
        data: { saldoCredito: { increment: valorCredito } },
      });

      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});

      return {
        type: 'buttons',
        text: [
          '✅ *Agendamento cancelado com sucesso!*',
          '',
          `Um crédito de ${formatarMoeda(valorCredito)} foi adicionado à sua conta.`,
          '',
          'Você pode usar este crédito em um próximo agendamento.',
        ].join('\n'),
        buttons: [
          { id: 'agendar', title: '📅 Agendar novamente' },
          { id: 'menu', title: '🏠 Menu principal' },
        ],
      };
    }

    if (msg === 'nao_cancelar' || msg === '❌ não, manter') {
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
      return {
        type: 'buttons',
        text: 'Cancelamento não realizado. Deseja fazer algo mais?',
        buttons: [
          { id: 'agendar', title: '📅 Agendar' },
          { id: 'cancelar', title: '❌ Cancelar' },
        ],
      };
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        clienteId: cliente.id,
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
        dataHora: { gte: hoje },
      },
      include: {
        servico: true,
        profissional: true,
      },
      orderBy: { dataHora: 'asc' },
    });

    if (agendamentos.length === 0) {
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
      return {
        type: 'buttons',
        text: 'Você não possui agendamentos futuros para cancelar.',
        buttons: [
          { id: 'agendar', title: '📅 Agendar' },
          { id: 'menu', title: '🏠 Menu principal' },
        ],
      };
    }

    if (agendamentos.length === 1) {
      const ag = agendamentos[0];
      await sessionManager.updateSession(session.id, 'CANCELAMENTO', {
        ...dados,
        confirmarCancelamentoId: ag.id,
        aguardandoConfirmacao: true,
      });

      return {
        type: 'buttons',
        text: [
          '⚠️ *Confirmar cancelamento*',
          '',
          `Serviço: ${ag.servico.nome}`,
          `Profissional: ${ag.profissional.nome}`,
          `Data: ${formatarDataHora(ag.dataHora)}`,
          `Valor: R$ ${ag.valorPago.toFixed(2)}`,
          '',
          'Tem certeza que deseja cancelar?',
        ].join('\n'),
        buttons: [
          { id: 'sim_cancelar', title: '✅ Sim, cancelar' },
          { id: 'nao_cancelar', title: '❌ Não, manter' },
        ],
      };
    }

    return {
      type: 'list',
      text: 'Selecione o agendamento que deseja cancelar:',
      listItems: agendamentos.map(ag => ({
        id: `ag_${ag.id}`,
        title: `${format(ag.dataHora, 'dd/MM')} - ${ag.servico.nome}`,
        description: `${ag.profissional.nome} • ${format(ag.dataHora, 'HH:mm')}`,
      })),
    };
  }

  if (session.etapa === 'REMARCACAO') {
    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        clienteId: cliente.id,
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
        dataHora: { gte: hoje },
      },
      include: {
        servico: true,
        profissional: true,
      },
      orderBy: { dataHora: 'asc' },
    });

    if (agendamentos.length === 0) {
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
      return {
        type: 'buttons',
        text: 'Você não possui agendamentos futuros para remarcar.',
        buttons: [
          { id: 'agendar', title: '📅 Agendar' },
          { id: 'menu', title: '🏠 Menu principal' },
        ],
      };
    }

    if (msg.startsWith('ag_')) {
      const agendamentoId = msg.replace('ag_', '');
      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { status: 'CANCELADO' },
      });

      const agendamento = await prisma.agendamento.findUnique({
        where: { id: agendamentoId },
        include: { servico: true },
      });

      if (agendamento) {
        await prisma.credito.create({
          data: {
            tenantId,
            clienteId: cliente.id,
            valor: agendamento.valorPago,
            origem: `Remarcação ${agendamento.codigoUnico}`,
          },
        });

        await prisma.cliente.update({
          where: { id: cliente.id },
          data: { saldoCredito: { increment: agendamento.valorPago } },
        });
      }

      await sessionManager.updateSession(session.id, 'ESCOLHA_SERVICO', {});

      return {
        type: 'text',
        text: 'Agendamento antigo cancelado. Vamos escolher um novo horário!',
      };
    }

    return {
      type: 'list',
      text: 'Selecione o agendamento que deseja remarcar:',
      listItems: agendamentos.map(ag => ({
        id: `ag_${ag.id}`,
        title: `${format(ag.dataHora, 'dd/MM')} - ${ag.servico.nome}`,
        description: `${ag.profissional.nome} • ${format(ag.dataHora, 'HH:mm')}`,
      })),
    };
  }

  return { type: 'text', text: 'Não entendi. Envie "menu" para recomeçar.' };
}
