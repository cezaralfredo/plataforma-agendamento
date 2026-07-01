import prisma from '../../services/prisma';
import { SessionManager } from '../services/sessionManager';
import { BotResponse, SessaoBot } from '../types';
import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { horariosDisponiveis } from '../../utils/helpers';
import { Tenant } from '@prisma/client';

const sessionManager = new SessionManager();

function formatDateBR(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}

function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export async function escolhaHorario(telefone: string, mensagem: string, session: SessaoBot, tenant: Tenant): Promise<BotResponse> {
  const msg = mensagem.trim().toLowerCase();
  const dados = (session.dados || {}) as any;
  const tenantId = tenant.id;

  if (msg === 'voltar' || msg === '0') {
    if (session.etapa === 'ESCOLHA_HORARIO') {
      await sessionManager.updateSession(session.id, 'ESCOLHA_DATA', {
        ...dados,
        data: undefined,
      });
      const dias = gerarDiasDisponiveis(dados);
      return {
        type: 'list',
        text: 'Escolha uma nova data:',
        listItems: dias,
      };
    }
    const profissionais = await prisma.profissional.findMany({
      where: { ativo: true, tenantId },
      orderBy: { nome: 'asc' },
    });
    await sessionManager.updateSession(session.id, 'ESCOLHA_PROFISSIONAL', { ...dados, data: undefined });
    return {
      type: 'list',
      text: 'Voltando. Escolha o profissional:',
      listItems: profissionais.map(p => ({
        id: `prof_${p.id}`,
        title: p.nome,
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

  if (session.etapa === 'ESCOLHA_DATA') {
    if (msg.startsWith('data_')) {
      const dataStr = msg.replace('data_', '');
      const dataSelecionada = parseISO(dataStr);
      const hoje = startOfDay(new Date());

      if (dataSelecionada < hoje) {
        const dias = gerarDiasDisponiveis(dados);
        return {
          type: 'list',
          text: 'Data inválida (já passou). Escolha outra data:',
          listItems: dias,
        };
      }

      await sessionManager.updateSession(session.id, 'ESCOLHA_HORARIO', {
        ...dados,
        data: dataStr,
      });

      return {
        type: 'text',
        text: [
          `Data escolhida: ${formatDateBR(dataSelecionada)}`,
          '',
          'Agora vamos escolher o horário...',
        ].join('\n'),
      };
    }

    const dias = gerarDiasDisponiveis(dados);
    return {
      type: 'list',
      text: 'Escolha a data desejada:',
      listItems: dias,
    };
  }

  if (session.etapa === 'ESCOLHA_HORARIO') {
    if (msg.startsWith('hor_')) {
      const horario = msg.replace('hor_', '');
      const dataStr = dados.data;
      if (!dataStr) {
        await sessionManager.updateSession(session.id, 'ESCOLHA_DATA', { ...dados });
        return { type: 'text', text: 'Data não encontrada. Escolha novamente.' };
      }

      await sessionManager.updateSession(session.id, 'CONFIRMACAO', {
        ...dados,
        horario,
      });

      const servicoNome = dados.servicoNome || 'Serviço';
      const profissionalNome = dados.profissionalNome || 'Profissional';
      const valor = dados.servicoValor || 0;
      const dataObj = parseISO(dataStr);

      return {
        type: 'buttons',
        text: [
          '📋 *Resumo do Agendamento*',
          '',
          `Serviço: ${servicoNome}`,
          `Profissional: ${profissionalNome}`,
          `Data: ${formatDateBR(dataObj)}`,
          `Horário: ${horario}`,
          `Valor: R$ ${valor.toFixed(2)}`,
          '',
          'Deseja confirmar?',
        ].join('\n'),
        buttons: [
          { id: 'confirmar', title: '✅ Confirmar' },
          { id: 'cancelar', title: '❌ Cancelar' },
        ],
      };
    }

    if (msg.startsWith('data_')) {
      const dataStr = msg.replace('data_', '');
      await sessionManager.updateSession(session.id, 'ESCOLHA_HORARIO', {
        ...dados,
        data: dataStr,
      });
    }

    const profissionalId = dados.profissionalId;
    const servicoDuracao = dados.servicoDuracao || 60;

    if (!profissionalId || !dados.data) {
      await sessionManager.updateSession(session.id, 'ESCOLHA_DATA', { ...dados });
      const dias = gerarDiasDisponiveis(dados);
      return {
        type: 'list',
        text: 'Dados incompletos. Escolha a data novamente:',
        listItems: dias,
      };
    }

    const profissional = await prisma.profissional.findUnique({ where: { id: profissionalId } });
    if (!profissional) {
      return { type: 'text', text: 'Profissional não encontrado. Tente novamente.' };
    }

    const dataRef = parseISO(dados.data);
    const diaSemana = dataRef.getDay();
    const diaSemanaDb = diaSemana === 0 ? 7 : diaSemana;

    if (!profissional.diasTrabalho.includes(diaSemanaDb)) {
      const dias = gerarDiasDisponiveis(dados);
      return {
        type: 'list',
        text: 'Este profissional não trabalha nesta data. Escolha outra data:',
        listItems: dias.filter(d => {
          const dDate = parseISO(d.id.replace('data_', ''));
          const dDay = dDate.getDay();
          const dDayDb = dDay === 0 ? 7 : dDay;
          return profissional!.diasTrabalho.includes(dDayDb);
        }),
      };
    }

    const startOfSelectedDate = startOfDay(dataRef);
    const endOfSelectedDate = new Date(startOfSelectedDate.getTime() + 86400000);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        profissionalId,
        dataHora: {
          gte: startOfSelectedDate,
          lt: endOfSelectedDate,
        },
        status: { notIn: ['CANCELADO'] },
      },
      select: { dataHora: true, servico: { select: { duracaoMinutos: true } } },
    });

    const bloqueios = await prisma.bloqueioAgenda.findMany({
      where: {
        tenantId,
        profissionalId,
        data: {
          gte: startOfSelectedDate,
          lt: endOfSelectedDate,
        },
      },
      select: { data: true },
    });

    const slots = horariosDisponiveis(
      dataRef,
      profissional.horarioInicio,
      profissional.horarioFim,
      servicoDuracao,
      agendamentos.map(a => ({ dataHora: a.dataHora, duracao: a.servico.duracaoMinutos })),
      bloqueios
    );

    if (slots.length === 0) {
      const dias = gerarDiasDisponiveis(dados);
      return {
        type: 'list',
        text: 'Não há horários disponíveis nesta data. Escolha outra data:',
        listItems: dias,
      };
    }

    return {
      type: 'list',
      text: `Horários disponíveis para ${formatDateBR(dataRef)}:`,
      listItems: slots.map(h => ({
        id: `hor_${h}`,
        title: h,
      })),
    };
  }

  return { type: 'text', text: 'Não entendi. Envie "menu" para recomeçar.' };
}

function gerarDiasDisponiveis(dados: any): Array<{ id: string; title: string; description?: string }> {
  const dias: Array<{ id: string; title: string; description?: string }> = [];
  const hoje = new Date();

  for (let i = 1; i <= 14; i++) {
    const data = addDays(hoje, i);
    const diaSem = data.getDay();
    const nomeDia = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'][diaSem];
    dias.push({
      id: `data_${formatDateKey(data)}`,
      title: `${formatDateBR(data)}`,
      description: nomeDia,
    });
  }

  return dias;
}
