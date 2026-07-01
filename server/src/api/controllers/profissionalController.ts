import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  startOfDay,
  endOfDay,
  parseISO,
  isWithinInterval,
  addMinutes,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  format,
} from 'date-fns';
import prisma from '../../services/prisma';
import { getTenantId, verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

const diaSemanaMap: Record<string, number> = {
  DOMINGO: 0, SEGUNDA: 1, TERCA: 2, QUARTA: 3, QUINTA: 4, SEXTA: 5, SABADO: 6,
};

const diasTrabalhoTransform = z.array(
  z.union([
    z.number().min(0).max(6),
    z.string().transform((v) => diaSemanaMap[v.toUpperCase()] ?? parseInt(v)),
  ])
).transform((arr) => arr.filter((v): v is number => !isNaN(v)));

const createProfissionalSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  especialidades: z.array(z.string()).optional().default([]),
  diasTrabalho: diasTrabalhoTransform.optional().default([1, 2, 3, 4, 5, 6]),
  horarioInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm').optional().default('08:00'),
  horarioFim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm').optional().default('18:00'),
});

const updateProfissionalSchema = z.object({
  nome: z.string().min(2).optional(),
  especialidades: z.array(z.string()).optional(),
  diasTrabalho: diasTrabalhoTransform.optional(),
  horarioInicio: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  horarioFim: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  ativo: z.boolean().optional(),
});

const bloqueioSchema = z.object({
  data: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
  motivo: z.string().optional(),
});

router.get('/', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apenasAtivos = req.query.ativos !== 'false';
    const servicoId = req.query.servicoId ? parseInt(req.query.servicoId as string) : undefined;
    const tenantId = getTenantId(req);

    const where: any = { tenantId };

    if (apenasAtivos) {
      where.ativo = true;
    }

    if (servicoId) {
      where.especialidades = {
        hasSome: [servicoId.toString()],
      };
    }

    const profissionais = await prisma.profissional.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: {
        _count: {
          select: { agendamentos: true },
        },
      },
    });

    res.json(profissionais);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const profissional = await prisma.profissional.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        _count: {
          select: { agendamentos: true },
        },
      },
    });

    if (!profissional) {
      res.status(404).json({ erro: 'Profissional não encontrado' });
      return;
    }

    res.json(profissional);
  } catch (error) {
    next(error);
  }
});

router.post('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProfissionalSchema.parse(req.body);
    const tenantId = getTenantId(req);

    const profissional = await prisma.profissional.create({
      data: {
        tenantId,
        nome: data.nome,
        especialidades: data.especialidades,
        diasTrabalho: data.diasTrabalho,
        horarioInicio: data.horarioInicio,
        horarioFim: data.horarioFim,
      },
    });

    res.status(201).json(profissional);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProfissionalSchema.parse(req.body);
    const tenantId = getTenantId(req);

    const profissional = await prisma.profissional.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!profissional) {
      res.status(404).json({ erro: 'Profissional não encontrado' });
      return;
    }

    const atualizado = await prisma.profissional.update({
      where: { id: req.params.id },
      data,
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/ativo', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const profissional = await prisma.profissional.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!profissional) {
      res.status(404).json({ erro: 'Profissional não encontrado' });
      return;
    }

    const { ativo } = z.object({ ativo: z.boolean() }).parse(req.body);

    const atualizado = await prisma.profissional.update({
      where: { id: req.params.id },
      data: { ativo },
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);

    const profissional = await prisma.profissional.findFirst({
      where: { id: req.params.id, tenantId },
    });

    if (!profissional) {
      res.status(404).json({ erro: 'Profissional não encontrado' });
      return;
    }

    const agendamentosFuturos = await prisma.agendamento.findFirst({
      where: {
        tenantId,
        profissionalId: req.params.id,
        dataHora: { gte: new Date() },
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
      },
    });

    if (agendamentosFuturos) {
      res.status(400).json({
        erro: 'Profissional possui agendamentos futuros. Remova-os antes de desativar.',
      });
      return;
    }

    const atualizado = await prisma.profissional.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/agendamentos', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { dataInicio, dataFim, status } = req.query;
    const tenantId = getTenantId(req);

    const profissional = await prisma.profissional.findFirst({
      where: { id, tenantId },
    });

    if (!profissional) {
      res.status(404).json({ erro: 'Profissional não encontrado' });
      return;
    }

    const inicio = dataInicio ? startOfDay(parseISO(dataInicio as string)) : startOfDay(new Date());
    const fim = dataFim ? endOfDay(parseISO(dataFim as string)) : endOfDay(new Date());

    const where: any = {
      tenantId,
      profissionalId: id,
      dataHora: { gte: inicio, lte: fim },
    };

    if (status) {
      where.status = status;
    }

    const agendamentos = await prisma.agendamento.findMany({
      where,
      orderBy: { dataHora: 'asc' },
      include: {
        cliente: {
          select: { id: true, nome: true, telefone: true },
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

router.get('/:id/horarios', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { data } = req.query;
    const tenantId = getTenantId(req);

    if (!data) {
      res.status(400).json({ erro: 'Parâmetro data é obrigatório (YYYY-MM-DD)' });
      return;
    }

    const profissional = await prisma.profissional.findFirst({
      where: { id, tenantId },
    });

    if (!profissional) {
      res.status(404).json({ erro: 'Profissional não encontrado' });
      return;
    }

    const dataRef = parseISO(data as string);
    const diaSemana = dataRef.getDay();

    if (!profissional.diasTrabalho.includes(diaSemana)) {
      res.json({ data, horariosDisponiveis: [], diaUtil: false });
      return;
    }

    const servicoId = req.query.servicoId ? parseInt(req.query.servicoId as string) : undefined;
    let duracaoMinutos = 60;

    if (servicoId) {
      const servico = await prisma.servico.findFirst({
        where: { id: servicoId, tenantId },
      });
      if (servico) {
        duracaoMinutos = servico.duracaoMinutos;
      }
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        profissionalId: id,
        dataHora: {
          gte: startOfDay(dataRef),
          lte: endOfDay(dataRef),
        },
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
      },
      select: {
        dataHora: true,
        servico: {
          select: { duracaoMinutos: true },
        },
      },
    });

    const bloqueios = await prisma.bloqueioAgenda.findMany({
      where: {
        tenantId,
        profissionalId: id,
        data: {
          gte: startOfDay(dataRef),
          lte: endOfDay(dataRef),
        },
      },
      select: { data: true },
    });

    const slots: string[] = [];
    const [hInicio, mInicio] = profissional.horarioInicio.split(':').map(Number);
    const [hFim, mFim] = profissional.horarioFim.split(':').map(Number);

    let current = setMinutes(setHours(startOfDay(dataRef), hInicio), mInicio);
    const fimDoDia = setMinutes(setHours(startOfDay(dataRef), hFim), mFim);

    while (isBefore(current, fimDoDia)) {
      const slotFim = addMinutes(current, duracaoMinutos);

      if (!isAfter(slotFim, fimDoDia) && !isBefore(current, new Date())) {
        const conflito = agendamentos.some((ag) => {
          const agFim = addMinutes(ag.dataHora, ag.servico.duracaoMinutos);
          return current < agFim && slotFim > ag.dataHora;
        });

        const bloqueado = bloqueios.some((b) =>
          isWithinInterval(current, {
            start: startOfDay(b.data),
            end: endOfDay(b.data),
          })
        );

        if (!conflito && !bloqueado) {
          slots.push(format(current, 'HH:mm'));
        }
      }

      current = addMinutes(current, 30);
    }

    res.json({
      data,
      horarioInicio: profissional.horarioInicio,
      horarioFim: profissional.horarioFim,
      diaUtil: true,
      horariosDisponiveis: slots,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/bloqueios', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { data, motivo } = bloqueioSchema.parse(req.body);
    const tenantId = getTenantId(req);

    const profissional = await prisma.profissional.findFirst({
      where: { id, tenantId },
    });

    if (!profissional) {
      res.status(404).json({ erro: 'Profissional não encontrado' });
      return;
    }

    const bloqueio = await prisma.bloqueioAgenda.create({
      data: {
        tenantId,
        profissionalId: id,
        data: new Date(data),
        motivo,
      },
    });

    res.status(201).json(bloqueio);
  } catch (error) {
    next(error);
  }
});

export default router;
