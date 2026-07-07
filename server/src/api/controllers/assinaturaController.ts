import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';
import { addMonths } from 'date-fns';

const router = Router();

const assignPlanSchema = z.object({
  tenantId: z.string().uuid(),
  planoId: z.string().uuid(),
  ciclo: z.enum(['MENSAL', 'ANUAL']).default('MENSAL'),
  trial: z.boolean().default(false),
  trialDias: z.number().int().min(1).max(90).optional(),
});

const updateAssinaturaSchema = z.object({
  planoId: z.string().uuid().optional(),
  ciclo: z.enum(['MENSAL', 'ANUAL']).optional(),
  status: z.enum(['ATIVA', 'CANCELADA', 'EXPIRADA', 'TENTATIVA_FALHA']).optional(),
  autoRenovar: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Pelo menos um campo deve ser enviado' });

router.get('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, planoId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (planoId) where.planoId = planoId;

    const assinaturas = await prisma.assinatura.findMany({
      where,
      include: {
        tenant: { select: { id: true, nome: true, slug: true, ativo: true } },
        plano: { select: { id: true, nome: true, slug: true, preco: true } },
        _count: { select: { faturas: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });

    res.json(assinaturas);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assinatura = await prisma.assinatura.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: { select: { id: true, nome: true, slug: true, ativo: true } },
        plano: true,
        faturas: { orderBy: { dataVencimento: 'desc' } },
      },
    });

    if (!assinatura) {
      res.status(404).json({ erro: 'Assinatura não encontrada' });
      return;
    }

    res.json(assinatura);
  } catch (error) {
    next(error);
  }
});

router.get('/tenant/:tenantId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assinatura = await prisma.assinatura.findUnique({
      where: { tenantId: req.params.tenantId },
      include: {
        plano: true,
        faturas: { orderBy: { dataVencimento: 'desc' }, take: 12 },
      },
    });

    if (!assinatura) {
      res.status(404).json({ erro: 'Assinatura não encontrada para este tenant' });
      return;
    }

    res.json(assinatura);
  } catch (error) {
    next(error);
  }
});

router.post('/assign', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = assignPlanSchema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { id: data.tenantId } });
    if (!tenant) {
      res.status(404).json({ erro: 'Tenant não encontrado' });
      return;
    }

    const plano = await prisma.plano.findUnique({ where: { id: data.planoId } });
    if (!plano) {
      res.status(404).json({ erro: 'Plano não encontrado' });
      return;
    }

    const existingAssinatura = await prisma.assinatura.findUnique({
      where: { tenantId: data.tenantId },
    });

    if (existingAssinatura) {
      res.status(409).json({ erro: 'Tenant já possui uma assinatura. Use PUT para alterá-la.' });
      return;
    }

    const hoje = new Date();
    let trialTerminaEm: Date | undefined;
    if (data.trial && data.trialDias) {
      trialTerminaEm = new Date(hoje.getTime() + data.trialDias * 24 * 60 * 60 * 1000);
    }

    const assinatura = await prisma.assinatura.create({
      data: {
        tenantId: data.tenantId,
        planoId: data.planoId,
        ciclo: data.ciclo,
        dataInicio: hoje,
        dataProximoCiclo: data.trial && trialTerminaEm ? trialTerminaEm : addMonths(hoje, 1),
        trial: data.trial || false,
        trialTerminaEm,
        status: data.trial ? 'ATIVA' : 'ATIVA',
        autoRenovar: true,
      },
      include: {
        plano: { select: { nome: true, slug: true, preco: true } },
        tenant: { select: { nome: true, slug: true } },
      },
    });

    await prisma.tenant.update({
      where: { id: data.tenantId },
      data: { plano: plano.slug.toUpperCase() },
    });

    await prisma.atividadeTenant.create({
      data: {
        tenantId: data.tenantId,
        tipo: 'ASSINATURA_CRIADA',
        descricao: `Assinatura ${plano.nome} atribuída (${data.ciclo})`,
        metadata: { planoId: plano.id, planoNome: plano.nome, ciclo: data.ciclo, trial: data.trial },
      },
    });

    res.status(201).json(assinatura);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateAssinaturaSchema.parse(req.body);

    const assinatura = await prisma.assinatura.findUnique({
      where: { id: req.params.id },
      include: { tenant: true },
    });

    if (!assinatura) {
      res.status(404).json({ erro: 'Assinatura não encontrada' });
      return;
    }

    const updateData: any = { ...data };

    if (data.planoId) {
      const novoPlano = await prisma.plano.findUnique({ where: { id: data.planoId } });
      if (!novoPlano) {
        res.status(404).json({ erro: 'Plano não encontrado' });
        return;
      }
      await prisma.tenant.update({
        where: { id: assinatura.tenantId },
        data: { plano: novoPlano.slug.toUpperCase() },
      });

      if (data.ciclo || data.planoId) {
        const cicloDuracao = (data.ciclo || assinatura.ciclo) === 'ANUAL' ? 12 : 1;
        updateData.dataProximoCiclo = addMonths(new Date(), cicloDuracao);
      }

      await prisma.atividadeTenant.create({
        data: {
          tenantId: assinatura.tenantId,
          tipo: 'PLANO_ALTERADO',
          descricao: `Plano alterado para ${novoPlano.nome}`,
          metadata: { planoAnteriorId: assinatura.planoId, novoPlanoId: data.planoId, novoPlanoNome: novoPlano.nome },
        },
      });
    }

    if (data.status === 'CANCELADA') {
      updateData.dataCancelamento = new Date();
      await prisma.atividadeTenant.create({
        data: {
          tenantId: assinatura.tenantId,
          tipo: 'ASSINATURA_CANCELADA',
          descricao: 'Assinatura cancelada',
        },
      });
    }

    const updated = await prisma.assinatura.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        plano: true,
        tenant: { select: { nome: true, slug: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/cancelar', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assinatura = await prisma.assinatura.findUnique({
      where: { id: req.params.id },
      include: { tenant: true },
    });

    if (!assinatura) {
      res.status(404).json({ erro: 'Assinatura não encontrada' });
      return;
    }

    if (assinatura.status === 'CANCELADA') {
      res.status(400).json({ erro: 'Assinatura já está cancelada' });
      return;
    }

    const updated = await prisma.assinatura.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELADA',
        dataCancelamento: new Date(),
        autoRenovar: false,
      },
      include: { plano: true },
    });

    await prisma.atividadeTenant.create({
      data: {
        tenantId: assinatura.tenantId,
        tipo: 'ASSINATURA_CANCELADA',
        descricao: `Assinatura ${updated.plano.nome} cancelada`,
        metadata: { motivo: req.body.motivo || '' },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
