import { Router, Request, Response, NextFunction } from 'express';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO, format } from 'date-fns';
import prisma from '../../services/prisma';
import { getTenantId, verifyToken, requireSuperAdmin } from '../middleware/auth';
import { transformAgendamentoList } from '../../utils/transformers';

const router = Router();

router.get('/resumo', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hoje = new Date();
    const inicioHoje = startOfDay(hoje);
    const fimHoje = endOfDay(hoje);
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);
    const tenantId = getTenantId(req);

    const [
      agendamentosHojeCount,
      agendamentosConfirmadosCount,
      faturamentoHojeValor,
      totalClientes,
      faturamentoSemanalData,
    ] = await Promise.all([
      prisma.agendamento.count({
        where: {
          tenantId,
          dataHora: { gte: inicioHoje, lte: fimHoje },
          status: { in: ['PENDENTE', 'CONFIRMADO', 'CONCLUIDO'] },
        },
      }),
      prisma.agendamento.count({
        where: {
          tenantId,
          status: 'CONFIRMADO',
        },
      }),
      prisma.agendamento.aggregate({
        where: {
          tenantId,
          dataHora: { gte: inicioHoje, lte: fimHoje },
          status: 'CONCLUIDO',
        },
        _sum: { valorPago: true },
      }),
      prisma.cliente.count({ where: { tenantId } }),
      prisma.agendamento.findMany({
        where: {
          tenantId,
          dataHora: { gte: inicioSemana, lte: fimSemana },
          status: 'CONCLUIDO',
        },
        select: { dataHora: true, valorPago: true },
        orderBy: { dataHora: 'asc' },
      }),
    ]);

    const faturamentoSemanal: { dia: string; valor: number }[] = [];
    const diaMap: Record<string, number> = {};
    faturamentoSemanalData.forEach((a) => {
      const dia = format(a.dataHora, 'yyyy-MM-dd');
      diaMap[dia] = (diaMap[dia] || 0) + a.valorPago;
    });
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicioSemana);
      d.setDate(d.getDate() + i);
      const diaKey = format(d, 'yyyy-MM-dd');
      faturamentoSemanal.push({ dia: diaKey, valor: diaMap[diaKey] || 0 });
    }

    res.json({
      agendamentosHoje: agendamentosHojeCount,
      agendamentosConfirmados: agendamentosConfirmadosCount,
      faturamentoHoje: faturamentoHojeValor._sum.valorPago || 0,
      clientesTotal: totalClientes,
      faturamentoSemanal,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/faturamento', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dataInicio, dataFim, periodo } = req.query;
    const tenantId = getTenantId(req);

    let inicio: Date;
    let fim: Date;

    if (dataInicio && dataFim) {
      inicio = startOfDay(parseISO(dataInicio as string));
      fim = endOfDay(parseISO(dataFim as string));
    } else if (periodo === 'semanal') {
      const now = new Date();
      inicio = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      fim = endOfDay(now);
    } else if (periodo === 'mensal') {
      const now = new Date();
      inicio = startOfMonth(now);
      fim = endOfMonth(now);
    } else if (periodo === 'anual') {
      const now = new Date();
      inicio = new Date(now.getFullYear(), 0, 1);
      fim = new Date(now.getFullYear(), 11, 31);
    } else {
      const now = new Date();
      inicio = startOfMonth(now);
      fim = endOfMonth(now);
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        dataHora: { gte: inicio, lte: fim },
        status: 'CONCLUIDO',
      },
      orderBy: { dataHora: 'asc' },
      select: {
        dataHora: true,
        valorPago: true,
        servico: {
          select: { nome: true, categoria: true },
        },
        profissional: {
          select: { nome: true },
        },
      },
    });

    const faturamentoTotal = agendamentos.reduce((sum, a) => sum + a.valorPago, 0);

    const agendamentosPorDia: Record<string, { quantidade: number; valor: number }> = {};
    agendamentos.forEach((a) => {
      const dia = a.dataHora.toISOString().split('T')[0];
      if (!agendamentosPorDia[dia]) {
        agendamentosPorDia[dia] = { quantidade: 0, valor: 0 };
      }
      agendamentosPorDia[dia].quantidade++;
      agendamentosPorDia[dia].valor += a.valorPago;
    });

    const faturamentoPorServico: Record<string, { quantidade: number; valor: number }> = {};
    agendamentos.forEach((a) => {
      const nome = a.servico.nome;
      if (!faturamentoPorServico[nome]) {
        faturamentoPorServico[nome] = { quantidade: 0, valor: 0 };
      }
      faturamentoPorServico[nome].quantidade++;
      faturamentoPorServico[nome].valor += a.valorPago;
    });

    const faturamentoPorProfissional: Record<string, { quantidade: number; valor: number }> = {};
    agendamentos.forEach((a) => {
      const nome = a.profissional.nome;
      if (!faturamentoPorProfissional[nome]) {
        faturamentoPorProfissional[nome] = { quantidade: 0, valor: 0 };
      }
      faturamentoPorProfissional[nome].quantidade++;
      faturamentoPorProfissional[nome].valor += a.valorPago;
    });

    res.json({
      periodo: { inicio, fim },
      faturamentoTotal,
      totalAgendamentos: agendamentos.length,
      agendamentosPorDia,
      faturamentoPorServico,
      faturamentoPorProfissional,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/proximos-agendamentos', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        dataHora: { gte: new Date() },
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
      },
      take: 10,
      orderBy: { dataHora: 'asc' },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true },
        },
        profissional: {
          select: { id: true, nome: true },
        },
        servico: {
          select: { id: true, nome: true, valor: true, duracaoMinutos: true },
        },
        pagamento: {
          select: { status: true },
        },
      },
    });

    res.json(agendamentos);
  } catch (error) {
    next(error);
  }
});

export default router;
