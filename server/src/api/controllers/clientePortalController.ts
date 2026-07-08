import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { startOfDay, endOfDay, parseISO, format, addMinutes, setHours, setMinutes, isBefore, isAfter, isWithinInterval } from 'date-fns';
import prisma from '../../services/prisma';
import { config } from '../../config';
import { verifyToken } from '../middleware/auth';
import { getPixServiceForTenant } from '../../services/pixService';

const router = Router();

const diaSemanaMap: Record<string, number> = {
  DOMINGO: 0, SEGUNDA: 1, TERCA: 2, QUARTA: 3, QUINTA: 4, SEXTA: 5, SABADO: 6,
};

const HORAS_ANTECEDENCIA = 2;

declare global {
  namespace Express {
    interface Request {
      clienteSessao?: { clienteId: string; tenantId: string };
    }
  }
}

function authCliente(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    if (decoded.tipo !== 'cliente') {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }
    req.clienteSessao = { clienteId: decoded.clienteId, tenantId: decoded.tenantId };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

router.post('/acesso', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      telefone: z.string().min(8, 'Telefone inválido'),
      tenantSlug: z.string().min(1, 'Slug do estabelecimento é obrigatório'),
    });

    const { telefone, tenantSlug } = schema.parse(req.body);

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || !tenant.ativo) {
      res.status(404).json({ error: 'Estabelecimento não encontrado.' });
      return;
    }

    let cliente = await prisma.cliente.findUnique({
      where: { tenantId_telefone: { tenantId: tenant.id, telefone } },
    });

    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: { tenantId: tenant.id, nome: 'Cliente', telefone },
      });
    }

    const token = jwt.sign(
      { tipo: 'cliente', clienteId: cliente.id, tenantId: cliente.tenantId },
      config.jwt.secret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      cliente: { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone, email: cliente.email, saldoCredito: cliente.saldoCredito },
      tenant: { id: tenant.id, nome: tenant.nome, slug: tenant.slug },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    next(error);
  }
});

router.get('/dashboard', authCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, tenantId } = req.clienteSessao!;

    const hoje = new Date();
    const inicioHoje = startOfDay(hoje);
    const fimHoje = endOfDay(hoje);

    const [agendamentosHoje, proximosAgendamentos, totalAgendamentos, creditos] = await Promise.all([
      prisma.agendamento.count({
        where: { clienteId, tenantId, dataHora: { gte: inicioHoje, lte: fimHoje }, status: { in: ['PENDENTE', 'CONFIRMADO', 'CONCLUIDO'] } },
      }),
      prisma.agendamento.findMany({
        where: { clienteId, tenantId, dataHora: { gte: new Date() }, status: { in: ['PENDENTE', 'CONFIRMADO'] } },
        orderBy: { dataHora: 'asc' },
        take: 5,
        include: {
          servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } },
          profissional: { select: { id: true, nome: true } },
          servicosAgendamento: {
            include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } } },
          },
        },
      }),
      prisma.agendamento.count({ where: { clienteId, tenantId } }),
      prisma.credito.findMany({
        where: { clienteId, tenantId },
        orderBy: { criadoEm: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      agendamentosHoje,
      proximosAgendamentos,
      totalAgendamentos,
      creditosRecentes: creditos.map(c => ({
        id: c.id,
        valor: c.valor,
        descricao: c.origem,
        tipo: c.utilizado ? 'SAIDA' : 'ENTRADA',
        criadoEm: c.criadoEm,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/agendamentos', authCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, tenantId } = req.clienteSessao!;
    const { status, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    const where: any = { clienteId, tenantId };
    if (status) where.status = status;

    const [agendamentos, total] = await Promise.all([
      prisma.agendamento.findMany({
        where,
        orderBy: { dataHora: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } },
          profissional: { select: { id: true, nome: true } },
          servicosAgendamento: {
            include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } } },
          },
        },
      }),
      prisma.agendamento.count({ where }),
    ]);

    res.json({ agendamentos, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (error) {
    next(error);
  }
});

router.post('/agendamentos', authCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, tenantId } = req.clienteSessao!;

    const schema = z.object({
      servicoIds: z.array(z.number().int().positive()).min(1, 'Selecione ao menos um serviço'),
      profissionalId: z.string().uuid(),
      dataHora: z.string().refine((v) => !isNaN(Date.parse(v)), 'Data/hora inválida'),
    });

    const { servicoIds, profissionalId, dataHora } = schema.parse(req.body);
    const dataRef = parseISO(dataHora);

    const servicos = await prisma.servico.findMany({
      where: { id: { in: servicoIds }, tenantId, ativo: true },
    });

    if (servicos.length !== servicoIds.length) {
      res.status(404).json({ error: 'Um ou mais serviços não encontrados.' });
      return;
    }

    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId, ativo: true },
    });

    if (!profissional) { res.status(404).json({ error: 'Profissional não encontrado.' }); return; }

    const diaSemana = dataRef.getDay();
    if (!profissional.diasTrabalho.includes(diaSemana)) {
      res.status(400).json({ error: 'Profissional não trabalha neste dia.' });
      return;
    }

    const [hInicio, mInicio] = profissional.horarioInicio.split(':').map(Number);
    const [hFim, mFim] = profissional.horarioFim.split(':').map(Number);
    const inicioDia = setMinutes(setHours(startOfDay(dataRef), hInicio), mInicio);
    const fimDia = setMinutes(setHours(startOfDay(dataRef), hFim), mFim);

    const duracaoTotal = servicos.reduce((sum, s) => sum + s.duracaoMinutos, 0);
    const valorTotal = servicos.reduce((sum, s) => sum + s.valor, 0);

    if (isBefore(dataRef, inicioDia) || isAfter(addMinutes(dataRef, duracaoTotal), fimDia)) {
      res.status(400).json({ error: 'Horário fora do expediente do profissional.' });
      return;
    }

    if (isBefore(dataRef, addMinutes(new Date(), HORAS_ANTECEDENCIA * 60))) {
      res.status(400).json({ error: `Agendamento deve ter no mínimo ${HORAS_ANTECEDENCIA}h de antecedência.` });
      return;
    }

    const conflitos = await prisma.agendamento.findMany({
      where: {
        tenantId,
        profissionalId,
        dataHora: { gte: startOfDay(dataRef), lte: endOfDay(dataRef) },
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
      },
      include: { servicosAgendamento: { include: { servico: { select: { duracaoMinutos: true } } } } },
    });

    const novoFim = addMinutes(dataRef, duracaoTotal);
    for (const ag of conflitos) {
      const dur = ag.servicosAgendamento.reduce((s, sa) => s + (sa.servico?.duracaoMinutos || 30), 0) || 30;
      const agFim = addMinutes(ag.dataHora, dur);
      if (dataRef < agFim && novoFim > ag.dataHora) {
        res.status(400).json({ error: 'Já existe um agendamento neste horário.' });
        return;
      }
    }

    const primeiroServico = servicos[0];

    const agendamento = await prisma.agendamento.create({
      data: {
        tenantId,
        clienteId,
        profissionalId,
        servicoId: primeiroServico.id,
        dataHora: dataRef,
        valorPago: valorTotal,
        servicosAgendamento: {
          create: servicos.map(s => ({
            tenantId,
            servicoId: s.id,
            valor: s.valor,
          })),
        },
      },
      include: {
        servicosAgendamento: {
          include: { servico: { select: { id: true, nome: true, valor: true, duracaoMinutos: true } } },
        },
        profissional: { select: { nome: true } },
      },
    });

    res.status(201).json(agendamento);
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.errors[0].message }); return; }
    next(error);
  }
});

router.put('/agendamentos/:id/cancelar', authCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, tenantId } = req.clienteSessao!;

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: req.params.id, clienteId, tenantId },
    });

    if (!agendamento) {
      res.status(404).json({ error: 'Agendamento não encontrado.' });
      return;
    }

    if (!['PENDENTE', 'CONFIRMADO'].includes(agendamento.status)) {
      res.status(400).json({ error: 'Este agendamento não pode mais ser cancelado.' });
      return;
    }

    if (isBefore(agendamento.dataHora, new Date())) {
      res.status(400).json({ error: 'Não é possível cancelar um agendamento passado.' });
      return;
    }

    const atualizado = await prisma.agendamento.update({
      where: { id: req.params.id },
      data: { status: 'CANCELADO' },
    });

    const servico = await prisma.servico.findUnique({ where: { id: agendamento.servicoId } });
    if (servico) {
      const valorCredito = Math.round(servico.valor * 0.9 * 100) / 100;
      await prisma.credito.create({
        data: {
          tenantId,
          clienteId,
          origem: 'CANCELAMENTO',
          valor: valorCredito,
        },
      });

      await prisma.cliente.update({
        where: { id: clienteId },
        data: { saldoCredito: { increment: valorCredito } },
      });
    }

    res.json({ mensagem: 'Agendamento cancelado com sucesso. 90% do valor foi creditado.', agendamento: atualizado });
  } catch (error) {
    next(error);
  }
});

router.get('/creditos', authCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, tenantId } = req.clienteSessao!;
    const { page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));

    const [creditos, total] = await Promise.all([
      prisma.credito.findMany({
        where: { clienteId, tenantId },
        orderBy: { criadoEm: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.credito.count({ where: { clienteId, tenantId } }),
    ]);

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { saldoCredito: true },
    });

    res.json({
      creditos: creditos.map(c => ({
        id: c.id,
        valor: c.valor,
        descricao: c.origem,
        tipo: c.utilizado ? 'SAIDA' : 'ENTRADA',
        criadoEm: c.criadoEm,
      })),
      saldoCredito: cliente?.saldoCredito || 0,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/perfil', authCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, tenantId } = req.clienteSessao!;
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) { res.status(404).json({ error: 'Cliente não encontrado.' }); return; }
    res.json(cliente);
  } catch (error) {
    next(error);
  }
});

router.put('/perfil', authCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, tenantId } = req.clienteSessao!;

    const schema = z.object({
      nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
      email: z.string().email('Email inválido').optional().nullable(),
    });

    const data = schema.parse(req.body);

    const atualizado = await prisma.cliente.update({
      where: { id: clienteId },
      data,
    });

    res.json(atualizado);
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.errors[0].message }); return; }
    next(error);
  }
});

router.get('/servicos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.query.slug as string;
    if (!tenantSlug) { res.status(400).json({ error: 'slug é obrigatório' }); return; }

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) { res.status(404).json({ error: 'Estabelecimento não encontrado.' }); return; }

    const servicos = await prisma.servico.findMany({
      where: { tenantId: tenant.id, ativo: true },
      orderBy: { nome: 'asc' },
    });

    res.json(servicos);
  } catch (error) {
    next(error);
  }
});

router.get('/profissionais', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantSlug = req.query.slug as string;
    if (!tenantSlug) { res.status(400).json({ error: 'slug é obrigatório' }); return; }

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) { res.status(404).json({ error: 'Estabelecimento não encontrado.' }); return; }

    const servicoIdsStr = (req.query.servicoIds as string) || (req.query.servicoId as string);
    const servicoIds = servicoIdsStr?.split(',').map(Number).filter(n => !isNaN(n));

    const where: any = { tenantId: tenant.id, ativo: true };
    if (servicoIds && servicoIds.length > 0) {
      const servicos = await prisma.servico.findMany({
        where: { id: { in: servicoIds }, tenantId: tenant.id },
        select: { nome: true },
      });
      const nomesServicos = servicos.map(s => s.nome);
      if (nomesServicos.length > 0) {
        where.especialidades = { hasSome: nomesServicos };
      }
    }

    const profissionais = await prisma.profissional.findMany({
      where,
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, especialidades: true, diasTrabalho: true, horarioInicio: true, horarioFim: true },
    });

    res.json(profissionais);
  } catch (error) {
    next(error);
  }
});

router.get('/horarios', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug, profissionalId, servicoId, servicoIds, data } = req.query;

    if (!slug || !profissionalId || !data) {
      res.status(400).json({ error: 'slug, profissionalId e data são obrigatórios.' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: slug as string } });
    if (!tenant) { res.status(404).json({ error: 'Estabelecimento não encontrado.' }); return; }

    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId as string, tenantId: tenant.id, ativo: true },
    });
    if (!profissional) { res.status(404).json({ error: 'Profissional não encontrado.' }); return; }

    let servicoIdsArray: number[];
    if (servicoIds) {
      servicoIdsArray = (servicoIds as string).split(',').map(Number);
    } else if (servicoId) {
      servicoIdsArray = [parseInt(servicoId as string)];
    } else {
      res.status(400).json({ error: 'servicoId ou servicoIds é obrigatório.' });
      return;
    }

    const servicos = await prisma.servico.findMany({
      where: { id: { in: servicoIdsArray }, tenantId: tenant.id, ativo: true },
    });

    if (servicos.length !== servicoIdsArray.length) {
      res.status(404).json({ error: 'Um ou mais serviços não encontrados.' });
      return;
    }

    const duracaoTotal = servicos.reduce((sum, s) => sum + s.duracaoMinutos, 0);

    const dataRef = parseISO(data as string);
    const diaSemana = dataRef.getDay();

    if (!profissional.diasTrabalho.includes(diaSemana)) {
      res.json({ data, horariosDisponiveis: [], diaUtil: false });
      return;
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        tenantId: tenant.id,
        profissionalId: profissionalId as string,
        dataHora: { gte: startOfDay(dataRef), lte: endOfDay(dataRef) },
        status: { in: ['PENDENTE', 'CONFIRMADO'] },
      },
      include: {
        servicosAgendamento: {
          include: { servico: { select: { duracaoMinutos: true } } },
        },
      },
    });

    const bloqueios = await prisma.bloqueioAgenda.findMany({
      where: { tenantId: tenant.id, profissionalId: profissionalId as string, data: { gte: startOfDay(dataRef), lte: endOfDay(dataRef) } },
    });

    const slots: string[] = [];
    const [hInicio, mInicio] = profissional.horarioInicio.split(':').map(Number);
    const [hFim, mFim] = profissional.horarioFim.split(':').map(Number);

    let current = setMinutes(setHours(startOfDay(dataRef), hInicio), mInicio);
    const fimDoDia = setMinutes(setHours(startOfDay(dataRef), hFim), mFim);

    while (isBefore(current, fimDoDia)) {
      const slotFim = addMinutes(current, duracaoTotal);

      if (!isAfter(slotFim, fimDoDia)) {
        const temConflito = agendamentos.some((ag) => {
          const dur = ag.servicosAgendamento.reduce((s, sa) => s + (sa.servico?.duracaoMinutos || 30), 0) || 30;
          const agFim = addMinutes(ag.dataHora, dur);
          return current < agFim && slotFim > ag.dataHora;
        });

        const temBloqueio = bloqueios.some((b) =>
          isWithinInterval(current, { start: startOfDay(b.data), end: endOfDay(b.data) })
        );

        if (!temConflito && !temBloqueio) {
          slots.push(format(current, 'HH:mm'));
        }
      }

      current = addMinutes(current, 30);
    }

    res.json({ data, horarioInicio: profissional.horarioInicio, horarioFim: profissional.horarioFim, diaUtil: true, horariosDisponiveis: slots });
  } catch (error) {
    next(error);
  }
});

router.post('/agendamentos/:id/gerar-pix', authCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, tenantId } = req.clienteSessao!;
    const { id } = req.params;

    const agendamento = await prisma.agendamento.findFirst({
      where: { id, clienteId, tenantId },
      include: {
        pagamento: true,
        cliente: { select: { nome: true, telefone: true } },
        servicosAgendamento: { include: { servico: { select: { nome: true, valor: true } } } },
      },
    });

    if (!agendamento) {
      res.status(404).json({ error: 'Agendamento não encontrado.' });
      return;
    }

    if (agendamento.status === 'CONFIRMADO') {
      res.status(400).json({ error: 'Este agendamento já foi confirmado.' });
      return;
    }

    if (agendamento.status === 'CANCELADO') {
      res.status(400).json({ error: 'Este agendamento foi cancelado.' });
      return;
    }

    if (agendamento.status === 'CONCLUIDO') {
      res.status(400).json({ error: 'Este agendamento já foi concluído.' });
      return;
    }

    if (agendamento.pagamento?.status === 'PAGO') {
      res.status(400).json({ error: 'Este agendamento já foi pago.' });
      return;
    }

    if (agendamento.pagamento?.status === 'AGUARDANDO' && agendamento.pagamento.txidPix) {
      res.json({ pagamento: agendamento.pagamento, expiraEm: agendamento.pagamento.expiradoEm });
      return;
    }

    const pixService = await getPixServiceForTenant(tenantId);

    if (!pixService.hasValidConfig()) {
      res.status(400).json({ error: 'Pagamento PIX não configurado para este estabelecimento.' });
      return;
    }

    const { qrCode, copiaECola, asaasPaymentId } = await pixService.gerarCobranca(
      agendamento.valorPago,
      agendamento.cliente.nome,
      agendamento.cliente.telefone,
      agendamento.id,
    );

    const expiracao = new Date(Date.now() + 15 * 60 * 1000);

    const pagamento = await prisma.pagamento.upsert({
      where: { agendamentoId: id },
      create: {
        tenantId,
        agendamentoId: id,
        txidPix: asaasPaymentId,
        valor: agendamento.valorPago,
        qrCode,
        copiaECola,
        expiradoEm: expiracao,
      },
      update: {
        txidPix: asaasPaymentId,
        valor: agendamento.valorPago,
        qrCode,
        copiaECola,
        status: 'AGUARDANDO',
        expiradoEm: expiracao,
        pagoEm: null,
      },
    });

    res.status(201).json({ pagamento, expiraEm: expiracao });
  } catch (error) {
    next(error);
  }
});

router.get('/pagamentos/:agendamentoId', authCliente, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clienteId, tenantId } = req.clienteSessao!;
    const { agendamentoId } = req.params;

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, clienteId, tenantId },
      include: {
        pagamento: true,
        profissional: { select: { nome: true } },
        servicosAgendamento: { include: { servico: { select: { nome: true, valor: true } } } },
      },
    });

    if (!agendamento) {
      res.status(404).json({ error: 'Agendamento não encontrado.' });
      return;
    }

    res.json({ agendamento, pagamento: agendamento.pagamento });
  } catch (error) {
    next(error);
  }
});

export default router;
