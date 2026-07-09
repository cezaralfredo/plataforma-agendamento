import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../services/prisma';
import { verifyToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.get('/dashboard', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalTenants,
      tenantsAtivos,
      totalUsuarios,
      totalClientes,
      totalAgendamentos,
      totalPlanos,
      planosMaisUsados,
      receitaTotal,
      faturamentoMes,
      faturasPendentes,
      agendamentosMes,
      recentesAtividades,
      distribuicaoPlanos,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { ativo: true } }),
      prisma.usuario.count(),
      prisma.cliente.count(),
      prisma.agendamento.count(),
      prisma.plano.count({ where: { ativo: true } }),
      prisma.plano.findMany({
        orderBy: { assinaturas: { _count: 'desc' } },
        take: 5,
        include: { _count: { select: { assinaturas: true } } },
      }),
      prisma.fatura.aggregate({
        _sum: { valor: true },
        where: { status: 'PAGA' },
      }),
      prisma.fatura.aggregate({
        _sum: { valor: true },
        where: {
          status: 'PAGA',
          dataPagamento: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.fatura.count({ where: { status: 'PENDENTE' } }),
      prisma.agendamento.count({
        where: {
          criadoEm: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.atividadeTenant.findMany({
        orderBy: { criadoEm: 'desc' },
        take: 10,
        include: { tenant: { select: { nome: true, slug: true } } },
      }),
      prisma.plano.findMany({
        select: {
          id: true,
          nome: true,
          slug: true,
          preco: true,
          _count: { select: { assinaturas: true } },
        },
        orderBy: { assinaturas: { _count: 'desc' } },
      }),
    ]);

    const tenantsPorPlano = distribuicaoPlanos.map(p => ({
      plano: p.nome,
      slug: p.slug,
      quantidade: p._count.assinaturas,
    }));

    const agendamentosPorStatus = await prisma.agendamento.groupBy({
      by: ['status'],
      _count: true,
    });

    const agendamentosCount = agendamentosPorStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    const faturasPorStatus = await prisma.fatura.groupBy({
      by: ['status'],
      _count: true,
      _sum: { valor: true },
    });
    const faturasStatus = faturasPorStatus.reduce((acc, curr) => {
      acc[curr.status] = { count: curr._count, valor: curr._sum.valor || 0 };
      return acc;
    }, {} as Record<string, { count: number; valor: number }>);

    res.json({
      tenants: {
        total: totalTenants,
        ativos: tenantsAtivos,
        inativos: totalTenants - tenantsAtivos,
      },
      usuarios: { total: totalUsuarios },
      clientes: { total: totalClientes },
      agendamentos: {
        total: totalAgendamentos,
        mes: agendamentosMes,
        porStatus: agendamentosCount,
      },
      planos: {
        total: totalPlanos,
        maisUsados: planosMaisUsados.map(p => ({
          nome: p.nome,
          slug: p.slug,
          assinaturas: p._count.assinaturas,
        })),
        distribuicao: tenantsPorPlano,
      },
      financeiro: {
        receitaTotal: receitaTotal._sum.valor || 0,
        faturamentoMes: faturamentoMes._sum.valor || 0,
        faturasPendentes,
        faturasPorStatus: faturasStatus,
      },
      atividadesRecentes: recentesAtividades.map(a => ({
        id: a.id,
        tipo: a.tipo,
        descricao: a.descricao,
        tenant: a.tenant,
        criadoEm: a.criadoEm,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tenants', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, ativo, plano, page = '1', limit = '20' } = req.query;

    const where: any = {};
    if (search) {
      const searchStr = String(search).substring(0, 100).replace(/[<>]/g, '');
      where.OR = [
        { nome: { contains: searchStr, mode: 'insensitive' } },
        { slug: { contains: searchStr, mode: 'insensitive' } },
      ];
    }
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (plano) where.plano = (plano as string).toUpperCase();

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          nome: true,
          slug: true,
          plano: true,
          ativo: true,
          criadoEm: true,
          whatsappAdminNumber: true,
          provedorMensageria: true,
          assinatura: {
            select: {
              id: true,
              status: true,
              ciclo: true,
              trial: true,
              dataInicio: true,
              dataProximoCiclo: true,
              dataCancelamento: true,
              plano: { select: { nome: true, slug: true, preco: true } },
            },
          },
          _count: {
            select: {
              usuarios: true,
              clientes: true,
              agendamentos: true,
              profissionais: true,
              servicos: true,
              faturas: true,
            },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      tenants,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tenants/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        nome: true,
        slug: true,
        plano: true,
        ativo: true,
        asaasSandbox: true,
        whatsappAdminNumber: true,
        provedorMensageria: true,
        subdominio: true,
        customDomain: true,
        criadoEm: true,
        atualizadoEm: true,
        assinatura: {
          include: {
            plano: true,
            faturas: {
              orderBy: { dataVencimento: 'desc' },
              take: 12,
            },
          },
        },
        _count: {
          select: {
            usuarios: true,
            clientes: true,
            agendamentos: true,
            profissionais: true,
            servicos: true,
            faturas: true,
            creditos: true,
            sessoes: true,
          },
        },
      },
    });

    if (!tenant) {
      res.status(404).json({ erro: 'Tenant não encontrado' });
      return;
    }

    const [agendamentosPorStatus, atividades, faturamentoTotal, agendamentosMes, agendamentosHoje] = await Promise.all([
      prisma.agendamento.groupBy({
        by: ['status'],
        where: { tenantId: tenant.id },
        _count: true,
      }),
      prisma.atividadeTenant.findMany({
        where: { tenantId: tenant.id },
        orderBy: { criadoEm: 'desc' },
        take: 20,
      }),
      prisma.fatura.aggregate({
        _sum: { valor: true },
        where: { tenantId: tenant.id, status: 'PAGA' },
      }),
      prisma.agendamento.count({
        where: {
          tenantId: tenant.id,
          criadoEm: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      prisma.agendamento.count({
        where: {
          tenantId: tenant.id,
          dataHora: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    const statusCount = agendamentosPorStatus.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      ...tenant,
      agendamentosPorStatus: statusCount,
      agendamentosMes,
      agendamentosHoje,
      faturamentoTotal: faturamentoTotal._sum.valor || 0,
      atividades: atividades.map(a => ({
        id: a.id,
        tipo: a.tipo,
        descricao: a.descricao,
        metadata: a.metadata,
        criadoEm: a.criadoEm,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tenants/:id/atividades', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', tipo } = req.query;

    const where: any = { tenantId: req.params.id };
    if (tipo) where.tipo = tipo;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [atividades, total] = await Promise.all([
      prisma.atividadeTenant.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.atividadeTenant.count({ where }),
    ]);

    res.json({
      atividades,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

router.put('/tenants/:id/status', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ativo } = req.body;

    if (ativo === undefined || typeof ativo !== 'boolean') {
      res.status(400).json({ erro: 'Campo "ativo" (booleano) é obrigatório' });
      return;
    }

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { ativo },
    });

    await prisma.atividadeTenant.create({
      data: {
        tenantId: tenant.id,
        tipo: ativo ? 'TENANT_ATIVADO' : 'TENANT_DESATIVADO',
        descricao: ativo ? 'Estabelecimento reativado' : 'Estabelecimento desativado',
      },
    });

    if (!ativo) {
      await prisma.assinatura.updateMany({
        where: { tenantId: tenant.id, status: 'ATIVA' },
        data: { status: 'CANCELADA', dataCancelamento: new Date() },
      });
    }

    res.json({ mensagem: ativo ? 'Tenant ativado' : 'Tenant desativado', tenant });
  } catch (error) {
    next(error);
  }
});

router.delete('/tenants/:id', verifyToken, requireSuperAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.params.id;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      res.status(404).json({ erro: 'Estabelecimento não encontrado' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.atividadeTenant.deleteMany({ where: { tenantId } });
      await tx.logBot.deleteMany({ where: { tenantId } });
      await tx.fatura.deleteMany({ where: { tenantId } });
      await tx.assinatura.deleteMany({ where: { tenantId } });
      await tx.credito.deleteMany({ where: { tenantId } });
      await tx.sessaoBot.deleteMany({ where: { tenantId } });
      await tx.bloqueioAgenda.deleteMany({ where: { tenantId } });
      await tx.configuracao.deleteMany({ where: { tenantId } });
      await tx.pagamento.deleteMany({ where: { tenantId } });
      await tx.agendamento.deleteMany({ where: { tenantId } });
      await tx.usuario.deleteMany({ where: { tenantId } });
      await tx.profissional.deleteMany({ where: { tenantId } });
      await tx.servico.deleteMany({ where: { tenantId } });
      await tx.cliente.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
    });

    res.json({ mensagem: 'Estabelecimento deletado permanentemente' });
  } catch (error) {
    next(error);
  }
});

export default router;
