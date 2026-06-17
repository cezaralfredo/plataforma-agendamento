import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

const createServicoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  categoria: z.enum(['SALAO', 'BARBEARIA']),
  valor: z.number().positive('Valor deve ser positivo'),
  duracaoMinutos: z.number().int().positive('Duração deve ser positiva'),
});

const updateServicoSchema = z.object({
  nome: z.string().min(2).optional(),
  categoria: z.enum(['SALAO', 'BARBEARIA']).optional(),
  valor: z.number().positive().optional(),
  duracaoMinutos: z.number().int().positive().optional(),
  ativo: z.boolean().optional(),
});

router.get('/', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoria } = req.query;
    const apenasAtivos = req.query.ativos !== 'false';

    const where: any = {};

    if (apenasAtivos) {
      where.ativo = true;
    }

    if (categoria) {
      where.categoria = categoria;
    }

    const servicos = await prisma.servico.findMany({
      where,
      orderBy: { nome: 'asc' },
    });

    res.json(servicos);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ erro: 'ID inválido' });
      return;
    }

    const servico = await prisma.servico.findUnique({
      where: { id },
    });

    if (!servico) {
      res.status(404).json({ erro: 'Serviço não encontrado' });
      return;
    }

    res.json(servico);
  } catch (error) {
    next(error);
  }
});

router.post('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createServicoSchema.parse(req.body);

    const servico = await prisma.servico.create({
      data,
    });

    res.status(201).json(servico);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ erro: 'ID inválido' });
      return;
    }

    const data = updateServicoSchema.parse(req.body);

    const servico = await prisma.servico.findUnique({
      where: { id },
    });

    if (!servico) {
      res.status(404).json({ erro: 'Serviço não encontrado' });
      return;
    }

    const atualizado = await prisma.servico.update({
      where: { id },
      data,
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/ativo', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ erro: 'ID inválido' });
      return;
    }

    const { ativo } = z.object({ ativo: z.boolean() }).parse(req.body);

    const servico = await prisma.servico.findUnique({ where: { id } });

    if (!servico) {
      res.status(404).json({ erro: 'Serviço não encontrado' });
      return;
    }

    const atualizado = await prisma.servico.update({
      where: { id },
      data: { ativo },
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ erro: 'ID inválido' });
      return;
    }

    const servico = await prisma.servico.findUnique({
      where: { id },
    });

    if (!servico) {
      res.status(404).json({ erro: 'Serviço não encontrado' });
      return;
    }

    const atualizado = await prisma.servico.update({
      where: { id },
      data: { ativo: !servico.ativo },
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

export default router;
