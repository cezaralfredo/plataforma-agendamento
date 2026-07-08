import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  startOfDay,
  endOfDay,
  parseISO,
} from 'date-fns';
import prisma from '../../services/prisma';
import { getTenantId, verifyToken } from '../middleware/auth';
import { gerarCodigoUnico } from '../../utils/helpers';
import { transformAgendamento, transformAgendamentoList } from '../../utils/transformers';

const router = Router();

const createAgendamentoSchema = z.object({
  tenantSlug: z.string().optional(),
  clienteId: z.string().min(1, 'ID do cliente é obrigatório'),
  profissionalId: z.string().min(1, 'ID do profissional é obrigatório'),
  servicoId: z.union([z.number().int().positive(), z.string().transform(v => parseInt(v))]),
  dataHora: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data/hora inválida').optional(),
  data: z.string().optional(),
  hora: z.string().optional(),
}).refine((val) => val.dataHora || (val.data && val.hora), {
  message: 'Forneça dataHora ou data + hora',
}).transform((val) => {
  if (val.dataHora) return val;
  return { ...val, dataHora: `${val.data}T${val.hora}:00` };
});

const cancelarSchema = z.object({
  motivo: z.string().optional(),
});

router.get('/', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const { status, profissionalId, data, dataInicio, dataFim, search } = req.query;
    const tenantId = getTenantId(req);

    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    if (profissionalId) {
      where.profissionalId = profissionalId;
    }

    if (data) {
      const dataRef = parseISO(data as string);
      where.dataHora = {
        gte: startOfDay(dataRef),
        lte: endOfDay(dataRef),
      };
    }

    if (dataInicio || dataFim) {
      where.dataHora = {
        ...(dataInicio ? { gte: startOfDay(parseISO(dataInicio as string)) } : {}),
        ...(dataFim ? { lte: endOfDay(parseISO(dataFim as string)) } : {}),
      };
    }

    if (search) {
      where.cliente = {
        nome: { contains: search as string, mode: 'insensitive' },
      };
    }

    const [agendamentos, total] = await Promise.all([
      prisma.agendamento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataHora: 'desc' },
        include: {
          cliente: {
            select: { id: true, nome: true, telefone: true },
          },
          profissional: {
            select: { id: true, nome: true },
          },
          servico: {
            select: { id: true, nome: true, valor: true, duracaoMinutos: true, categoria: true },
          },
          servicosAgendamento: {
            include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true, categoria: true } } },
          },
          pagamento: {
            select: { status: true, txidPix: true, valor: true },
          },
        },
      }),
      prisma.agendamento.count({ where }),
    ]);

    res.json({
      agendamentos: transformAgendamentoList(agendamentos),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/hoje', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hoje = new Date();
    const tenantId = getTenantId(req);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        dataHora: {
          gte: startOfDay(hoje),
          lte: endOfDay(hoje),
        },
        status: { in: ['PENDENTE', 'CONFIRMADO', 'CONCLUIDO'] },
      },
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
        servicosAgendamento: {
          include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } } },
        },
        pagamento: {
          select: { status: true },
        },
      },
    });

    res.json(transformAgendamentoList(agendamentos));
  } catch (error) {
    next(error);
  }
});

router.get('/proximos', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const profissionalId = req.query.profissionalId as string;
    const tenantId = getTenantId(req);

    const where: any = {
      tenantId,
      dataHora: { gte: new Date() },
      status: { in: ['PENDENTE', 'CONFIRMADO'] },
    };

    if (profissionalId) {
      where.profissionalId = profissionalId;
    }

    const agendamentos = await prisma.agendamento.findMany({
      where,
      take: limit,
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
        servicosAgendamento: {
          include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } } },
        },
        pagamento: {
          select: { status: true },
        },
      },
    });

    res.json(transformAgendamentoList(agendamentos));
  } catch (error) {
    next(error);
  }
});

router.get('/:codigoUnico/codigo', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { codigoUnico } = req.params;
    const tenantId = getTenantId(req);

    const agendamento = await prisma.agendamento.findFirst({
      where: { codigoUnico, tenantId },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true },
        },
        profissional: {
          select: { id: true, nome: true },
        },
        servico: {
          select: { id: true, nome: true, valor: true, duracaoMinutos: true, categoria: true },
        },
        servicosAgendamento: {
          include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true, categoria: true } } },
        },
        pagamento: {
          select: { status: true, txidPix: true, valor: true },
        },
      },
    });

    if (!agendamento) {
      res.status(404).json({ erro: 'Agendamento não encontrado' });
      return;
    }

    res.json(transformAgendamento(agendamento));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantId(req);

    const agendamento = await prisma.agendamento.findFirst({
      where: { id, tenantId },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true, email: true },
        },
        profissional: {
          select: { id: true, nome: true },
        },
        servico: {
          select: { id: true, nome: true, valor: true, duracaoMinutos: true, categoria: true },
        },
        servicosAgendamento: {
          include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true, categoria: true } } },
        },
        pagamento: {
          select: { id: true, status: true, txidPix: true, valor: true, qrCode: true, copiaECola: true },
        },
      },
    });

    if (!agendamento) {
      res.status(404).json({ erro: 'Agendamento não encontrado' });
      return;
    }

    res.json(transformAgendamento(agendamento));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createAgendamentoSchema.parse(req.body);
    let tenantId = getTenantId(req);

    if (!tenantId && data.tenantSlug) {
      const tenant = await prisma.tenant.findUnique({ where: { slug: data.tenantSlug } });
      if (tenant?.ativo) tenantId = tenant.id;
    }

    if (!tenantId) {
      res.status(400).json({ erro: 'Tenant não identificado. Informe o slug ou x-tenant-id.' });
      return;
    }

    const [cliente, profissional, servico] = await Promise.all([
      prisma.cliente.findFirst({ where: { id: data.clienteId, tenantId } }),
      prisma.profissional.findFirst({ where: { id: data.profissionalId, tenantId } }),
      prisma.servico.findFirst({ where: { id: data.servicoId, tenantId } }),
    ]);

    if (!cliente) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
      return;
    }

    if (!profissional) {
      res.status(404).json({ erro: 'Profissional não encontrado' });
      return;
    }

    if (!profissional.ativo) {
      res.status(400).json({ erro: 'Profissional não está ativo' });
      return;
    }

    if (!servico) {
      res.status(404).json({ erro: 'Serviço não encontrado' });
      return;
    }

    if (!servico.ativo) {
      res.status(400).json({ erro: 'Serviço não está ativo' });
      return;
    }

    const dataHoraString = data.dataHora!;
    const dataHora = parseISO(dataHoraString);
    const dataFim = new Date(dataHora.getTime() + servico.duracaoMinutos * 60000);

    if (dataHora < new Date()) {
      res.status(400).json({ erro: 'Nao e possivel agendar em data/hora passada' });
      return;
    }

    if (!profissional.diasTrabalho.includes(dataHora.getDay())) {
      res.status(400).json({ erro: 'Profissional nao atende neste dia da semana' });
      return;
    }

    const [hInicio, mInicio] = profissional.horarioInicio.split(':').map(Number);
    const [hFim, mFim] = profissional.horarioFim.split(':').map(Number);
    const inicioExpediente = new Date(dataHora);
    inicioExpediente.setHours(hInicio, mInicio, 0, 0);
    const fimExpediente = new Date(dataHora);
    fimExpediente.setHours(hFim, mFim, 0, 0);

    if (dataHora < inicioExpediente || dataFim > fimExpediente) {
      res.status(400).json({ erro: 'Horario fora do expediente do profissional' });
      return;
    }

    const conflitos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        profissionalId: data.profissionalId,
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
        dataHora: {
          gte: startOfDay(dataHora),
          lte: endOfDay(dataHora),
        },
      },
      include: { servico: { select: { duracaoMinutos: true } } },
    });

    for (const conflito of conflitos) {
      const conflitoInicio = conflito.dataHora;
      const conflitoFim = new Date(conflitoInicio.getTime() + conflito.servico.duracaoMinutos * 60000);

      if (dataHora < conflitoFim && dataFim > conflitoInicio) {
        res.status(409).json({ erro: 'Horário já agendado para este profissional' });
        return;
      }
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId,
        clienteId: data.clienteId,
        profissionalId: data.profissionalId,
        servicoId: data.servicoId,
        dataHora,
        codigoUnico: gerarCodigoUnico(),
        valorPago: servico.valor,
      },
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
        servicosAgendamento: {
          include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } } },
        },
      },
    });

    res.status(201).json(transformAgendamento(agendamento));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancelar', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { motivo } = cancelarSchema.parse(req.body);
    const tenantId = getTenantId(req);

    const agendamento = await prisma.agendamento.findFirst({
      where: { id, tenantId },
      include: {
        servico: true,
        cliente: true,
        pagamento: true,
      },
    });

    if (!agendamento) {
      res.status(404).json({ erro: 'Agendamento não encontrado' });
      return;
    }

    if (agendamento.status === 'CANCELADO') {
      res.status(400).json({ erro: 'Agendamento já está cancelado' });
      return;
    }

    if (agendamento.status === 'CONCLUIDO') {
      res.status(400).json({ erro: 'Agendamento já foi concluído e não pode ser cancelado' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.agendamento.update({
        where: { id },
        data: { status: 'CANCELADO' },
      });

      if (agendamento.pagamento) {
        await tx.pagamento.update({
          where: { agendamentoId: id },
          data: { status: 'REEMBOLSADO' },
        });
      }

      const valorCredito = agendamento.valorPago * 0.9;

      await tx.credito.create({
        data: {
          tenantId,
          clienteId: agendamento.clienteId,
          valor: valorCredito,
          origem: `Cancelamento agendamento ${agendamento.codigoUnico}${motivo ? ` - ${motivo}` : ''}`,
        },
      });

      await tx.cliente.update({
        where: { id: agendamento.clienteId },
        data: {
          saldoCredito: { increment: valorCredito },
        },
      });
    });

    res.json({ mensagem: 'Agendamento cancelado com sucesso', creditoGerado: agendamento.valorPago * 0.9 });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/confirmar', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantId(req);

    const agendamento = await prisma.agendamento.findFirst({
      where: { id, tenantId },
    });

    if (!agendamento) {
      res.status(404).json({ erro: 'Agendamento não encontrado' });
      return;
    }

    if (agendamento.status !== 'PENDENTE') {
      res.status(400).json({ erro: 'Apenas agendamentos pendentes podem ser confirmados' });
      return;
    }

    const atualizado = await prisma.agendamento.update({
      where: { id },
      data: { status: 'CONFIRMADO' },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true },
        },
        profissional: {
          select: { id: true, nome: true },
        },
        servico: {
          select: { id: true, nome: true, valor: true },
        },
        servicosAgendamento: {
          include: { servico: { select: { id: true, nome: true, valor: true } } },
        },
      },
    });

    res.json(transformAgendamento(atualizado));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/concluir', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tenantId = getTenantId(req);

    const agendamento = await prisma.agendamento.findFirst({
      where: { id, tenantId },
    });

    if (!agendamento) {
      res.status(404).json({ erro: 'Agendamento não encontrado' });
      return;
    }

    if (agendamento.status !== 'CONFIRMADO') {
      res.status(400).json({ erro: 'Apenas agendamentos confirmados podem ser concluídos' });
      return;
    }

    const atualizado = await prisma.agendamento.update({
      where: { id },
      data: { status: 'CONCLUIDO' },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true },
        },
        profissional: {
          select: { id: true, nome: true },
        },
        servico: {
          select: { id: true, nome: true, valor: true },
        },
        servicosAgendamento: {
          include: { servico: { select: { id: true, nome: true, valor: true } } },
        },
      },
    });

    res.json(transformAgendamento(atualizado));
  } catch (error) {
    next(error);
  }
});

export default router;
