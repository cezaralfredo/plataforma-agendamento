import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';
import { transformCliente, transformClienteList } from '../../utils/transformers';

const router = Router();

const createClienteSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  telefone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email().nullable().optional(),
});

const updateClienteSchema = z.object({
  nome: z.string().min(2).optional(),
  telefone: z.string().min(10).optional(),
  email: z.string().email().nullable().optional(),
});

router.get('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const where: any = {};

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { telefone: { contains: search } },
      ];
    }

    const [clientes, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { criadoEm: 'desc' },
        include: {
          _count: {
            select: { agendamentos: true },
          },
        },
      }),
      prisma.cliente.count({ where }),
    ]);

    res.json(transformClienteList(clientes));
  } catch (error) {
    next(error);
  }
});

router.post('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createClienteSchema.parse(req.body);

    const telefoneFormatado = data.telefone.replace(/\D/g, '');

    const existente = await prisma.cliente.findUnique({
      where: { telefone: telefoneFormatado },
    });

    if (existente) {
      res.status(409).json({ erro: 'Telefone já cadastrado' });
      return;
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome: data.nome,
        telefone: telefoneFormatado,
        email: data.email || undefined,
      },
    });

    res.status(201).json(cliente);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.id },
    });

    if (!cliente) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
      return;
    }

    res.json(cliente);
  } catch (error) {
    next(error);
  }
});

router.get('/telefone/:telefone', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const telefone = req.params.telefone.replace(/\D/g, '');

    const cliente = await prisma.cliente.findUnique({
      where: { telefone },
    });

    if (!cliente) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
      return;
    }

    res.json(cliente);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateClienteSchema.parse(req.body);

    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.id },
    });

    if (!cliente) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
      return;
    }

    if (data.telefone) {
      const telefoneFormatado = data.telefone.replace(/\D/g, '');
      const existente = await prisma.cliente.findUnique({
        where: { telefone: telefoneFormatado },
      });

      if (existente && existente.id !== req.params.id) {
        res.status(409).json({ erro: 'Telefone já cadastrado para outro cliente' });
        return;
      }

      data.telefone = telefoneFormatado;
    }

    const atualizado = await prisma.cliente.update({
      where: { id: req.params.id },
      data,
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/agendamentos', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const status = req.query.status as string;

    const where: any = { clienteId: id };

    if (status) {
      where.status = status;
    }

    const [agendamentos, total] = await Promise.all([
      prisma.agendamento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dataHora: 'desc' },
        include: {
          servico: {
            select: { id: true, nome: true, valor: true, categoria: true },
          },
          profissional: {
            select: { id: true, nome: true },
          },
          pagamento: {
            select: { status: true, txidPix: true, valor: true },
          },
        },
      }),
      prisma.agendamento.count({ where }),
    ]);

    res.json({
      data: agendamentos,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/creditos', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!cliente) {
      res.status(404).json({ erro: 'Cliente não encontrado' });
      return;
    }

    const creditos = await prisma.credito.findMany({
      where: { clienteId: id },
      orderBy: { criadoEm: 'desc' },
    });

    const creditosDisponiveis = creditos
      .filter((c) => !c.utilizado)
      .reduce((sum, c) => sum + c.valor, 0);

    res.json(creditos.map(c => ({
      id: c.id,
      valor: c.valor,
      descricao: c.origem,
      tipo: c.utilizado ? 'SAIDA' : 'ENTRADA',
      criadoEm: c.criadoEm,
    })));
  } catch (error) {
    next(error);
  }
});

export default router;
