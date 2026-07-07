import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

const createPlanoSchema = z.object({
  nome: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  descricao: z.string().optional(),
  preco: z.number().min(0),
  moeda: z.string().default('BRL'),
  maxProfissionais: z.number().int().min(1).default(2),
  maxServicos: z.number().int().min(1).default(10),
  maxClientes: z.number().int().min(1).default(100),
  maxAgendamentosMes: z.number().int().min(1).default(200),
  relatoriosFinanceiros: z.boolean().default(false),
  apiWhatsApp: z.boolean().default(false),
  multiProfissional: z.boolean().default(false),
  customDomain: z.boolean().default(false),
  evolucaoApi: z.boolean().default(false),
  destaque: z.boolean().default(false),
  ordem: z.number().int().default(0),
  ativo: z.boolean().default(true),
});

const updatePlanoSchema = createPlanoSchema.partial();

router.get('/', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planos = await prisma.plano.findMany({
      orderBy: { ordem: 'asc' },
      include: {
        _count: { select: { assinaturas: true } },
      },
    });
    res.json(planos);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plano = await prisma.plano.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { assinaturas: true } },
      },
    });
    if (!plano) {
      res.status(404).json({ erro: 'Plano não encontrado' });
      return;
    }
    res.json(plano);
  } catch (error) {
    next(error);
  }
});

router.post('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createPlanoSchema.parse(req.body);

    const slugExistente = await prisma.plano.findUnique({ where: { slug: data.slug } });
    if (slugExistente) {
      res.status(409).json({ erro: 'Slug já está em uso' });
      return;
    }

    const plano = await prisma.plano.create({ data });
    res.status(201).json(plano);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updatePlanoSchema.parse(req.body);

    if (data.slug) {
      const existente = await prisma.plano.findFirst({
        where: { slug: data.slug, id: { not: req.params.id } },
      });
      if (existente) {
        res.status(409).json({ erro: 'Slug já está em uso' });
        return;
      }
    }

    const plano = await prisma.plano.update({
      where: { id: req.params.id },
      data,
    });

    res.json(plano);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assinaturasCount = await prisma.assinatura.count({
      where: { planoId: req.params.id, status: 'ATIVA' },
    });
    if (assinaturasCount > 0) {
      res.status(400).json({ erro: 'Plano possui assinaturas ativas. Desative-o em vez de excluí-lo.' });
      return;
    }

    await prisma.plano.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });

    res.json({ mensagem: 'Plano desativado com sucesso' });
  } catch (error) {
    next(error);
  }
});

export default router;
