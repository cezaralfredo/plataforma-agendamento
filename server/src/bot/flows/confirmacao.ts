import prisma from '../../services/prisma';
import { SessionManager } from '../services/sessionManager';
import { BotResponse, SessaoBot } from '../types';
import { gerarCodigoUnico, gerarTxidPix } from '../../utils/helpers';
import { addMinutes } from 'date-fns';

const sessionManager = new SessionManager();

export async function confirmacao(telefone: string, mensagem: string, session: SessaoBot): Promise<BotResponse> {
  const msg = mensagem.trim().toLowerCase();
  const dados = (session.dados || {}) as any;

  if (msg === 'voltar' || msg === '0') {
    await sessionManager.updateSession(session.id, 'ESCOLHA_DATA', { ...dados });
    return { type: 'text', text: 'Vamos escolher uma nova data.' };
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

  if (msg === 'confirmar' || msg === '✅ confirmar') {
    const servicoId = dados.servicoId;
    const profissionalId = dados.profissionalId;
    const dataStr = dados.data;
    const horario = dados.horario;

    if (!servicoId || !profissionalId || !dataStr || !horario) {
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
      return {
        type: 'text',
        text: 'Dados incompletos do agendamento. Vamos recomeçar.',
      };
    }

    const cliente = await prisma.cliente.findUnique({ where: { telefone } });
    if (!cliente) {
      return { type: 'text', text: 'Cliente não encontrado. Envie "menu" para recomeçar.' };
    }

    const dataHora = new Date(`${dataStr}T${horario}:00`);
    const servico = await prisma.servico.findUnique({ where: { id: servicoId } });
    if (!servico) {
      return { type: 'text', text: 'Serviço não encontrado.' };
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        codigoUnico: gerarCodigoUnico(),
        clienteId: cliente.id,
        profissionalId,
        servicoId,
        dataHora,
        status: 'PENDENTE',
        valorPago: servico.valor,
      },
    });

    const txidPix = gerarTxidPix();
    const pagamento = await prisma.pagamento.create({
      data: {
        agendamentoId: agendamento.id,
        txidPix,
        valor: servico.valor,
        status: 'AGUARDANDO',
        expiradoEm: addMinutes(new Date(), 15),
      },
    });

    await sessionManager.updateSession(session.id, 'PAGAMENTO', {
      ...dados,
      agendamentoId: agendamento.id,
      agendamentoCodigo: agendamento.codigoUnico,
      pagamentoId: pagamento.id,
      txidPix,
    });

    return {
      type: 'text',
      text: `__ROUTE_PAGAMENTO__`,
    };
  }

  if (msg === 'cancelar' || msg === '❌ cancelar') {
    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'buttons',
      text: 'Agendamento cancelado. Deseja fazer algo mais?',
      buttons: [
        { id: 'agendar', title: '📅 Agendar' },
        { id: 'cancelar', title: '❌ Cancelar' },
      ],
    };
  }

  return {
    type: 'buttons',
    text: [
      'Por favor, confirme ou cancele o agendamento:',
      '',
      `📍 ${dados.servicoNome || 'Serviço'}`,
      `👤 ${dados.profissionalNome || 'Profissional'}`,
      `📅 ${dados.data || 'Data'}`,
      `⏰ ${dados.horario || 'Horário'}`,
      `💰 R$ ${(dados.servicoValor || 0).toFixed(2)}`,
    ].join('\n'),
    buttons: [
      { id: 'confirmar', title: '✅ Confirmar' },
      { id: 'cancelar', title: '❌ Cancelar' },
    ],
  };
}
