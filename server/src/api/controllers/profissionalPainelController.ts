import { Router, Request, Response, NextFunction } from 'express';
import { startOfDay, endOfDay, format } from 'date-fns';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.get('/dashboard', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const hoje = new Date();
    const inicioHoje = startOfDay(hoje);
    const fimHoje = endOfDay(hoje);

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    const [
      agendamentosHoje,
      agendamentosConfirmados,
      totalClientes,
      faturamentoHoje,
      proximosAgendamentos,
    ] = await Promise.all([
      prisma.agendamento.count({
        where: {
          tenantId,
          profissionalId,
          dataHora: { gte: inicioHoje, lte: fimHoje },
          status: { in: ['PENDENTE', 'CONFIRMADO', 'CONCLUIDO'] },
        },
      }),
      prisma.agendamento.count({
        where: {
          tenantId,
          profissionalId,
          status: 'CONFIRMADO',
        },
      }),
      prisma.cliente.count({
        where: {
          tenantId,
          agendamentos: { some: { profissionalId } },
        },
      }),
      prisma.agendamento.aggregate({
        where: {
          tenantId,
          profissionalId,
          dataHora: { gte: inicioHoje, lte: fimHoje },
          status: 'CONCLUIDO',
        },
        _sum: { valorPago: true },
      }),
      prisma.agendamento.findMany({
        where: {
          tenantId,
          profissionalId,
          dataHora: { gte: new Date() },
          status: { in: ['PENDENTE', 'CONFIRMADO'] },
        },
        take: 5,
        orderBy: { dataHora: 'asc' },
        include: {
          cliente: { select: { id: true, nome: true, telefone: true } },
          servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } },
          servicosAgendamento: {
            include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } } },
          },
        },
      }),
    ]);

    res.json({
      agendamentosHoje,
      agendamentosConfirmados,
      clientesAtendidos: totalClientes,
      faturamentoHoje: faturamentoHoje._sum.valorPago || 0,
      proximosAgendamentos,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/meu-perfil', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId || !tenantId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const schema = z.object({
      nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    });

    const data = schema.parse(req.body);

    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
    });

    if (!profissional) {
      res.status(404).json({ error: 'Profissional não encontrado' });
      return;
    }

    const atualizado = await prisma.profissional.update({
      where: { id: profissionalId },
      data: { nome: data.nome },
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

router.get('/minha-agenda', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId || !tenantId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      select: {
        diasTrabalho: true,
        horarioInicio: true,
        horarioFim: true,
      },
    });

    if (!profissional) {
      res.status(404).json({ error: 'Profissional não encontrado' });
      return;
    }

    res.json(profissional);
  } catch (error) {
    next(error);
  }
});

router.put('/minha-agenda', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId || !tenantId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const schema = z.object({
      diasTrabalho: z.array(z.number().min(0).max(6)),
      horarioInicio: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm'),
      horarioFim: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:mm'),
    });

    const data = schema.parse(req.body);

    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
    });

    if (!profissional) {
      res.status(404).json({ error: 'Profissional não encontrado' });
      return;
    }

    const atualizado = await prisma.profissional.update({
      where: { id: profissionalId },
      data: {
        diasTrabalho: data.diasTrabalho,
        horarioInicio: data.horarioInicio,
        horarioFim: data.horarioFim,
      },
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

router.get('/bloqueios', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId || !tenantId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const bloqueios = await prisma.bloqueioAgenda.findMany({
      where: { profissionalId, tenantId },
      orderBy: { data: 'desc' },
    });

    res.json(bloqueios);
  } catch (error) {
    next(error);
  }
});

router.post('/bloqueios', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId || !tenantId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const schema = z.object({
      data: z.string().refine((val) => !isNaN(Date.parse(val)), 'Data inválida'),
      motivo: z.string().optional(),
    });

    const { data, motivo } = schema.parse(req.body);

    const bloqueio = await prisma.bloqueioAgenda.create({
      data: {
        tenantId,
        profissionalId,
        data: new Date(data),
        motivo,
      },
    });

    res.status(201).json(bloqueio);
  } catch (error) {
    next(error);
  }
});

router.delete('/bloqueios/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId || !tenantId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const bloqueio = await prisma.bloqueioAgenda.findFirst({
      where: { id: req.params.id, profissionalId, tenantId },
    });

    if (!bloqueio) {
      res.status(404).json({ error: 'Bloqueio não encontrado' });
      return;
    }

    await prisma.bloqueioAgenda.delete({ where: { id: req.params.id } });

    res.json({ mensagem: 'Bloqueio removido.' });
  } catch (error) {
    next(error);
  }
});

router.get('/clientes', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId || !tenantId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const clientes = await prisma.cliente.findMany({
      where: {
        tenantId,
        agendamentos: { some: { profissionalId } },
      },
      include: {
        _count: { select: { agendamentos: { where: { profissionalId } } } },
        agendamentos: {
          where: { profissionalId },
          orderBy: { dataHora: 'desc' },
          take: 1,
          select: { dataHora: true, status: true, servico: { select: { nome: true } } },
        },
      },
      orderBy: { nome: 'asc' },
    });

    const result = clientes.map((c) => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      email: c.email,
      totalAgendamentos: c._count.agendamentos,
      ultimoAgendamento: c.agendamentos[0] || null,
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/colegas', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId || !tenantId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const colegas = await prisma.profissional.findMany({
      where: { tenantId, ativo: true, id: { not: profissionalId } },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });

    res.json(colegas);
  } catch (error) {
    next(error);
  }
});

router.put('/agendamentos/:id/delegar', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profissionalId = req.usuario?.profissionalId;
    const tenantId = req.usuario?.tenantId;

    if (!profissionalId || !tenantId) {
      res.status(400).json({ error: 'Profissional não vinculado ao usuário' });
      return;
    }

    const schema = z.object({
      novoProfissionalId: z.string().uuid('ID do profissional inválido'),
    });

    const { novoProfissionalId } = schema.parse(req.body);

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: req.params.id, profissionalId, tenantId },
    });

    if (!agendamento) {
      res.status(404).json({ error: 'Agendamento não encontrado' });
      return;
    }

    if (!['PENDENTE', 'CONFIRMADO'].includes(agendamento.status)) {
      res.status(400).json({ error: 'Só é possível delegar agendamentos pendentes ou confirmados.' });
      return;
    }

    const novoProfissional = await prisma.profissional.findFirst({
      where: { id: novoProfissionalId, tenantId, ativo: true },
    });

    if (!novoProfissional) {
      res.status(404).json({ error: 'Profissional de destino não encontrado.' });
      return;
    }

    const atualizado = await prisma.agendamento.update({
      where: { id: req.params.id },
      data: { profissionalId: novoProfissionalId },
      include: {
        cliente: { select: { nome: true } },
        servico: { select: { nome: true } },
        servicosAgendamento: {
          include: { servico: { select: { nome: true, valor: true } } },
        },
      },
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

export default router;
