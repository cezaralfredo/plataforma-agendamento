import prisma from './prisma';
import { config } from '../config';
import { StatusAgendamento, Agendamento } from '@prisma/client';
import Redis from 'ioredis';
import {
  addMinutes,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
} from 'date-fns';

export interface CreateAgendamentoInput {
  tenantId: string;
  clienteId: string;
  profissionalId: string;
  servicoId: number;
  dataHora: string | Date;
  usarCredito?: boolean;
}

interface AgendamentoCompleto extends Agendamento {
  servico: { nome: string; duracaoMinutos: number; valor: number };
  cliente: { nome: string; telefone: string };
  profissional: { nome: string };
}

export class AgendamentoService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    });
  }

  private async conectarRedis(): Promise<void> {
    if (this.redis.status !== 'ready') {
      try {
        await this.redis.connect();
      } catch {
      }
    }
  }

  private get tempoBloqueioMinutos(): number {
    return config.regras.tempoBloqueioProvisorioMinutos;
  }

  private gerarChaveBloqueio(profissionalId: string, dataHora: Date): string {
    const timestamp = dataHora.getTime();
    return `bloqueio:${profissionalId}:${timestamp}`;
  }

  async criarAgendamento(data: CreateAgendamentoInput): Promise<Agendamento> {
    const dataHora = typeof data.dataHora === 'string' ? parseISO(data.dataHora) : data.dataHora;

    if (isNaN(dataHora.getTime())) {
      throw new Error('Data/hora inválida');
    }

    if (isBefore(dataHora, new Date())) {
      throw new Error('Não é possível agendar em data/hora passada');
    }

    const [cliente, profissional, servico] = await Promise.all([
      prisma.cliente.findUnique({ where: { id: data.clienteId } }),
      prisma.profissional.findUnique({ where: { id: data.profissionalId } }),
      prisma.servico.findUnique({ where: { id: data.servicoId } }),
    ]);

    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    if (!profissional) {
      throw new Error('Profissional não encontrado');
    }

    if (!profissional.ativo) {
      throw new Error('Profissional não está ativo');
    }

    if (!servico) {
      throw new Error('Serviço não encontrado');
    }

    if (!servico.ativo) {
      throw new Error('Serviço não está ativo');
    }

    const dataFim = addMinutes(dataHora, servico.duracaoMinutos);

    this.validarHorarioComercial(dataHora, dataFim, profissional.horarioInicio, profissional.horarioFim);

    const disponivel = await this.verificarDisponibilidade(data.profissionalId, dataHora, data.servicoId);
    if (!disponivel) {
      throw new Error('Horário indisponível para este profissional');
    }

    const codigoUnico = this.gerarCodigoAgendamento();

    let valorPago = servico.valor;
    let creditoUtilizado = 0;

    if (data.usarCredito) {
      const { CreditoService } = await import('./creditoService');
      const creditoService = new CreditoService();
      const creditoUsado = await creditoService.utilizarCredito(data.clienteId, servico.valor);
      creditoUtilizado = creditoUsado;
      valorPago = servico.valor - creditoUsado;
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId: data.tenantId,
        clienteId: data.clienteId,
        profissionalId: data.profissionalId,
        servicoId: data.servicoId,
        dataHora,
        codigoUnico,
        status: 'PENDENTE',
        valorPago,
        creditoUtilizado,
      },
    });

    await this.bloquearTemporariamente(agendamento.id);

    return agendamento;
  }

  async confirmarAgendamento(agendamentoId: string): Promise<Agendamento> {
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
    });

    if (!agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    if (agendamento.status !== 'PENDENTE') {
      throw new Error('Apenas agendamentos pendentes podem ser confirmados');
    }

    const atualizado = await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: 'CONFIRMADO' },
    });

    await this.liberarBloqueio(agendamentoId);

    return atualizado;
  }

  async cancelarAgendamento(agendamentoId: string): Promise<{ agendamento: Agendamento; creditoValor: number }> {
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: {
        servico: true,
        pagamento: true,
      },
    });

    if (!agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    if (agendamento.status === 'CANCELADO') {
      throw new Error('Agendamento já está cancelado');
    }

    if (agendamento.status === 'CONCLUIDO') {
      throw new Error('Agendamento já foi concluído e não pode ser cancelado');
    }

    const dataHoraAgendamento = agendamento.dataHora;
    const horasAntecedencia = config.regras.horasAntecedenciaCancelamento;

    const diffMs = dataHoraAgendamento.getTime() - Date.now();
    if (diffMs < horasAntecedencia * 60 * 60 * 1000) {
      throw new Error(`Cancelamento deve ser feito com pelo menos ${horasAntecedencia} horas de antecedência`);
    }

    const valorBase = agendamento.valorPago + agendamento.creditoUtilizado;

    const creditoValor = Math.round(valorBase * 0.9 * 100) / 100;

    await prisma.$transaction(async (tx) => {
      await tx.agendamento.update({
        where: { id: agendamentoId },
        data: { status: 'CANCELADO' },
      });

      if (agendamento.pagamento) {
        await tx.pagamento.update({
          where: { agendamentoId },
          data: { status: 'REEMBOLSADO' },
        });
      }

      if (creditoValor > 0) {
        await tx.credito.create({
          data: {
            tenantId: agendamento.tenantId,
            clienteId: agendamento.clienteId,
            valor: creditoValor,
            origem: `Cancelamento agendamento ${agendamento.codigoUnico}`,
          },
        });

        await tx.cliente.update({
          where: { id: agendamento.clienteId },
          data: {
            saldoCredito: { increment: creditoValor },
          },
        });
      }
    });

    await this.liberarBloqueio(agendamentoId);

    const agendamentoAtualizado = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
    })!;

    return { agendamento: agendamentoAtualizado!, creditoValor };
  }

  async verificarDisponibilidade(profissionalId: string, data: Date, servicoId: number): Promise<boolean> {
    const servico = await prisma.servico.findUnique({
      where: { id: servicoId },
    });

    if (!servico) {
      return false;
    }

    const dataFim = addMinutes(data, servico.duracaoMinutos);

    const profissional = await prisma.profissional.findUnique({
      where: { id: profissionalId },
    });

    if (!profissional || !profissional.ativo) {
      return false;
    }

    if (!this.isHorarioComercial(data, dataFim, profissional.horarioInicio, profissional.horarioFim)) {
      return false;
    }

    if (!this.isDiaTrabalho(data, profissional.diasTrabalho)) {
      return false;
    }

    const conflitos = await prisma.agendamento.findMany({
      where: {
        profissionalId,
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
        dataHora: {
          gte: startOfDay(data),
          lte: endOfDay(data),
        },
      },
      include: {
        servico: { select: { duracaoMinutos: true } },
      },
    });

    for (const conflito of conflitos) {
      const conflitoInicio = conflito.dataHora;
      const conflitoFim = addMinutes(conflitoInicio, conflito.servico.duracaoMinutos);

      const sobrepoe =
        (isWithinInterval(data, { start: conflitoInicio, end: conflitoFim }) &&
          data.getTime() !== conflitoFim.getTime()) ||
        (isWithinInterval(dataFim, { start: conflitoInicio, end: conflitoFim }) &&
          dataFim.getTime() !== conflitoInicio.getTime()) ||
        (isBefore(conflitoInicio, data) && isAfter(conflitoFim, dataFim)) ||
        (data.getTime() === conflitoInicio.getTime());

      if (sobrepoe) {
        return false;
      }
    }

    await this.conectarRedis();
    const chavesRedis = await this.redis.keys(`bloqueio:${profissionalId}:*`);
    for (const chave of chavesRedis) {
      const timestampStr = chave.split(':')[2];
      const timestamp = parseInt(timestampStr, 10);
      if (isNaN(timestamp)) continue;

      const bloqueioInicio = new Date(timestamp);
      const bloqueioFim = addMinutes(bloqueioInicio, servico.duracaoMinutos);

      const sobrepoeBloqueio =
        (isWithinInterval(data, { start: bloqueioInicio, end: bloqueioFim }) &&
          data.getTime() !== bloqueioFim.getTime()) ||
        (isWithinInterval(dataFim, { start: bloqueioInicio, end: bloqueioFim }) &&
          dataFim.getTime() !== bloqueioInicio.getTime()) ||
        (isBefore(bloqueioInicio, data) && isAfter(bloqueioFim, dataFim));

      if (sobrepoeBloqueio) {
        return false;
      }
    }

    return true;
  }

  async bloquearTemporariamente(agendamentoId: string): Promise<void> {
    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      select: { id: true, profissionalId: true, dataHora: true, servicoId: true },
    });

    if (!agendamento) {
      throw new Error('Agendamento não encontrado');
    }

    await this.conectarRedis();

    const chave = this.gerarChaveBloqueio(agendamento.profissionalId, agendamento.dataHora);

    await this.redis.set(
      chave,
      agendamentoId,
      'EX',
      this.tempoBloqueioMinutos * 60
    );
  }

  async liberarBloqueio(agendamentoId: string): Promise<void> {
    const bloqueios = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      select: { profissionalId: true, dataHora: true },
    });

    if (!bloqueios) return;

    await this.conectarRedis();

    const chave = this.gerarChaveBloqueio(bloqueios.profissionalId, bloqueios.dataHora);
    await this.redis.del(chave);
  }

  async listarAgendaDoDia(data: Date): Promise<AgendamentoCompleto[]> {
    const inicio = startOfDay(data);
    const fim = endOfDay(data);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        dataHora: {
          gte: inicio,
          lte: fim,
        },
        status: { in: ['PENDENTE', 'CONFIRMADO', 'CONCLUIDO'] },
      },
      orderBy: { dataHora: 'asc' },
      include: {
        servico: {
          select: { nome: true, duracaoMinutos: true, valor: true },
        },
        cliente: {
          select: { nome: true, telefone: true },
        },
        profissional: {
          select: { nome: true },
        },
      },
    });

    return agendamentos as unknown as AgendamentoCompleto[];
  }

  private validarHorarioComercial(
    dataHora: Date,
    dataFim: Date,
    horarioInicio: string,
    horarioFim: string
  ): void {
    if (!this.isHorarioComercial(dataHora, dataFim, horarioInicio, horarioFim)) {
      throw new Error('Horário fora do horário de funcionamento');
    }
  }

  private isHorarioComercial(
    dataHora: Date,
    dataFim: Date,
    horarioInicio: string,
    horarioFim: string
  ): boolean {
    const [hInicio, mInicio] = horarioInicio.split(':').map(Number);
    const [hFim, mFim] = horarioFim.split(':').map(Number);

    const comercialInicio = setMinutes(setHours(startOfDay(dataHora), hInicio), mInicio);
    const comercialFim = setMinutes(setHours(startOfDay(dataHora), hFim), mFim);

    return (
      (isAfter(dataHora, comercialInicio) || dataHora.getTime() === comercialInicio.getTime()) &&
      (isBefore(dataFim, comercialFim) || dataFim.getTime() === comercialFim.getTime())
    );
  }

  private isDiaTrabalho(data: Date, diasTrabalho: number[]): boolean {
    return diasTrabalho.includes(data.getDay());
  }

  private gerarCodigoAgendamento(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 8; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
  }
}
