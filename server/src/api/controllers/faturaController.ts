import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';
import { addMonths } from 'date-fns';

const router = Router();

const generateInvoiceSchema = z.object({
  assinaturaId: z.string().uuid(),
  valor: z.number().min(0),
  descricao: z.string().optional(),
  dataVencimento: z.string().refine(val => !isNaN(Date.parse(val)), { message: 'Data inválida' }),
});

const updateFaturaSchema = z.object({
  status: z.enum(['PENDENTE', 'PAGA', 'ATRASADA', 'CANCELADA', 'REEMBOLSADA']).optional(),
  dataPagamento: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), { message: 'Data inválida' }),
  metodoPagamento: z.string().optional(),
  asaasPaymentId: z.string().optional(),
});

function gerarNumeroFatura(): string {
  const ano = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `INV-${ano}-${rand}`;
}

router.get('/', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, tenantId, assinaturaId, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (tenantId) where.tenantId = tenantId;
    if (assinaturaId) where.assinaturaId = assinaturaId;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [faturas, total] = await Promise.all([
      prisma.fatura.findMany({
        where,
        include: {
          tenant: { select: { id: true, nome: true, slug: true } },
          assinatura: { select: { id: true, ciclo: true, status: true, plano: { select: { nome: true } } } },
        },
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.fatura.count({ where }),
    ]);

    res.json({
      faturas,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fatura = await prisma.fatura.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: { select: { id: true, nome: true, slug: true } },
        assinatura: { include: { plano: true } },
      },
    });

    if (!fatura) {
      res.status(404).json({ erro: 'Fatura não encontrada' });
      return;
    }

    res.json(fatura);
  } catch (error) {
    next(error);
  }
});

router.post('/gerar', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = generateInvoiceSchema.parse(req.body);

    const assinatura = await prisma.assinatura.findUnique({
      where: { id: data.assinaturaId },
      include: { tenant: true, plano: true },
    });

    if (!assinatura) {
      res.status(404).json({ erro: 'Assinatura não encontrada' });
      return;
    }

    if (assinatura.status !== 'ATIVA') {
      res.status(400).json({ erro: 'Assinatura não está ativa' });
      return;
    }

    let numero = gerarNumeroFatura();
    let tentativas = 0;
    while (await prisma.fatura.findUnique({ where: { numero } }) && tentativas < 5) {
      numero = gerarNumeroFatura();
      tentativas++;
    }

    const fatura = await prisma.fatura.create({
      data: {
        assinaturaId: data.assinaturaId,
        tenantId: assinatura.tenantId,
        numero,
        descricao: data.descricao || `Assinatura ${assinatura.plano.nome} - ${assinatura.ciclo}`,
        valor: data.valor,
        dataVencimento: new Date(data.dataVencimento),
        status: 'PENDENTE',
      },
      include: {
        tenant: { select: { nome: true, slug: true } },
        assinatura: { select: { ciclo: true, plano: { select: { nome: true } } } },
      },
    });

    await prisma.atividadeTenant.create({
      data: {
        tenantId: assinatura.tenantId,
        tipo: 'FATURA_GERADA',
        descricao: `Fatura ${numero} gerada - R$ ${data.valor.toFixed(2)}`,
        metadata: { faturaId: fatura.id, valor: data.valor, numero },
      },
    });

    res.status(201).json(fatura);
  } catch (error) {
    next(error);
  }
});

router.post('/gerar-ciclo', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assinaturasAtivas = await prisma.assinatura.findMany({
      where: {
        status: 'ATIVA',
        dataProximoCiclo: { lte: new Date() },
        autoRenovar: true,
      },
      include: { plano: true, tenant: true },
    });

    const faturasCriadas = [];

    for (const assinatura of assinaturasAtivas) {
      if (assinatura.plano.preco <= 0) {
        await prisma.assinatura.update({
          where: { id: assinatura.id },
          data: { dataProximoCiclo: addMonths(new Date(), assinatura.ciclo === 'ANUAL' ? 12 : 1) },
        });
        continue;
      }

      const numero = gerarNumeroFatura();
      const cicloMeses = assinatura.ciclo === 'ANUAL' ? 12 : 1;

      const fatura = await prisma.fatura.create({
        data: {
          assinaturaId: assinatura.id,
          tenantId: assinatura.tenantId,
          numero,
          descricao: `Assinatura ${assinatura.plano.nome} - ${assinatura.ciclo}`,
          valor: assinatura.ciclo === 'ANUAL' ? assinatura.plano.preco * 12 : assinatura.plano.preco,
          dataVencimento: addMonths(new Date(), 0),
          status: 'PENDENTE',
        },
      });

      await prisma.assinatura.update({
        where: { id: assinatura.id },
        data: { dataProximoCiclo: addMonths(new Date(), cicloMeses) },
      });

      faturasCriadas.push(fatura);
    }

    res.json({
      mensagem: `${faturasCriadas.length} faturas geradas`,
      quantidade: faturasCriadas.length,
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateFaturaSchema.parse(req.body);

    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.dataPagamento) updateData.dataPagamento = new Date(data.dataPagamento);
    if (data.metodoPagamento) updateData.metodoPagamento = data.metodoPagamento;
    if (data.asaasPaymentId) updateData.asaasPaymentId = data.asaasPaymentId;

    const fatura = await prisma.fatura.findUnique({
      where: { id: req.params.id },
    });

    if (!fatura) {
      res.status(404).json({ erro: 'Fatura não encontrada' });
      return;
    }

    if (data.status === 'PAGA' && fatura.status !== 'PAGA') {
      updateData.dataPagamento = updateData.dataPagamento || new Date();
      await prisma.atividadeTenant.create({
        data: {
          tenantId: fatura.tenantId,
          tipo: 'FATURA_PAGA',
          descricao: `Fatura ${fatura.numero} paga - R$ ${fatura.valor.toFixed(2)}`,
          metadata: { faturaId: fatura.id, numero: fatura.numero },
        },
      });
    }

    const updated = await prisma.fatura.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        tenant: { select: { nome: true, slug: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get('/resumo/geral', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalFaturas, totalPago, totalPendente, totalAtrasado, receitaMes] = await Promise.all([
      prisma.fatura.count(),
      prisma.fatura.aggregate({ _sum: { valor: true }, where: { status: 'PAGA' } }),
      prisma.fatura.aggregate({ _sum: { valor: true }, where: { status: 'PENDENTE' } }),
      prisma.fatura.aggregate({ _sum: { valor: true }, where: { status: 'ATRASADA' } }),
      prisma.fatura.aggregate({
        _sum: { valor: true },
        where: {
          status: 'PAGA',
          dataPagamento: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);

    res.json({
      totalFaturas,
      totalPago: totalPago._sum.valor || 0,
      totalPendente: totalPendente._sum.valor || 0,
      totalAtrasado: totalAtrasado._sum.valor || 0,
      receitaMes: receitaMes._sum.valor || 0,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
