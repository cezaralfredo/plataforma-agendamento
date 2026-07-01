import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { getTenantId, verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

const updateConfigSchema = z.record(z.string(), z.string());

router.get('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    const configs = await prisma.configuracao.findMany({ where: { tenantId } });
    const configObj: Record<string, string> = {};
    for (const c of configs) {
      configObj[c.chave] = c.valor;
    }
    res.json(configObj);
  } catch (error) {
    next(error);
  }
});

router.put('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateConfigSchema.parse(req.body);
    const tenantId = getTenantId(req);

    const updates = Object.entries(data).map(([chave, valor]) =>
      prisma.configuracao.upsert({
        where: { tenantId_chave: { tenantId, chave } },
        update: { valor },
        create: { tenantId, chave, valor },
      })
    );

    await prisma.$transaction(updates);

    const configs = await prisma.configuracao.findMany({ where: { tenantId } });
    const configObj: Record<string, string> = {};
    for (const c of configs) {
      configObj[c.chave] = c.valor;
    }

    res.json(configObj);
  } catch (error) {
    next(error);
  }
});

export default router;
