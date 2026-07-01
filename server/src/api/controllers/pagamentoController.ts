import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { getTenantId, verifyToken } from '../middleware/auth';
import { PixService, getPixServiceForTenant } from '../../services/pixService';

const router = Router();

const gerarPixSchema = z.object({
  agendamentoId: z.string().uuid('ID do agendamento inválido'),
});

router.post('/gerar-pix', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agendamentoId } = gerarPixSchema.parse(req.body);
    const tenantId = getTenantId(req);

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, tenantId },
      include: {
        pagamento: true,
        cliente: true,
        servico: true,
      },
    });

    if (!agendamento) {
      res.status(404).json({ erro: 'Agendamento não encontrado' });
      return;
    }

    if (agendamento.pagamento?.status === 'PAGO') {
      res.status(400).json({ erro: 'Este agendamento já foi pago' });
      return;
    }

    if (agendamento.pagamento?.status === 'AGUARDANDO' && agendamento.pagamento.txidPix) {
      res.json({
        pagamento: agendamento.pagamento,
        mensagem: 'Pagamento já foi gerado anteriormente',
      });
      return;
    }

    const pixService = await getPixServiceForTenant(tenantId);

    if (!pixService.hasValidConfig()) {
      res.status(400).json({ erro: 'Pagamento PIX não configurado para este estabelecimento' });
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
      where: { agendamentoId },
      create: {
        tenantId,
        agendamentoId,
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

    res.status(201).json({
      pagamento,
      expiraEm: expiracao,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    const event = body?.event;
    const payment = body?.payment;

    if (!event || !payment?.id) {
      res.status(200).json({ mensagem: 'Evento ignorado' });
      return;
    }

    const asaasPaymentId = payment.id;
    const externalReference = payment.externalReference;

    let agendamentoId = externalReference || '';

    if (!agendamentoId) {
      const pagamento = await prisma.pagamento.findUnique({
        where: { txidPix: asaasPaymentId },
      });
      if (pagamento) {
        agendamentoId = pagamento.agendamentoId;
      }
    }

    if (!agendamentoId) {
      res.status(200).json({ mensagem: 'Agendamento não encontrado para este pagamento' });
      return;
    }

    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      select: { tenantId: true },
    });

    if (!agendamento) {
      res.status(200).json({ mensagem: 'Agendamento nÃ£o encontrado para este pagamento' });
      return;
    }

    const existingPagamento = await prisma.pagamento.findUnique({
      where: { agendamentoId },
    });

    if (!existingPagamento) {
      await prisma.pagamento.create({
        data: {
          tenantId: agendamento.tenantId,
          agendamentoId,
          txidPix: asaasPaymentId,
          valor: payment.value || 0,
          status: 'AGUARDANDO',
        },
      });
    }

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await prisma.$transaction(async (tx) => {
          await tx.pagamento.update({
            where: { agendamentoId },
            data: {
              status: 'PAGO',
              pagoEm: new Date(),
            },
          });

          await tx.agendamento.update({
            where: { id: agendamentoId },
            data: { status: 'CONFIRMADO' },
          });
        });
        break;

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_PARTIALLY_REFUNDED':
        await prisma.pagamento.update({
          where: { agendamentoId },
          data: { status: 'REEMBOLSADO' },
        });
        break;

      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
        await prisma.pagamento.update({
          where: { agendamentoId },
          data: { status: 'EXPIRADO' },
        });
        break;
    }

    res.json({ mensagem: 'Webhook processado com sucesso' });
  } catch (error) {
    next(error);
  }
});

router.get('/:txid', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { txid } = req.params;
    const tenantId = getTenantId(req);

    const pagamento = await prisma.pagamento.findFirst({
      where: { txidPix: txid, tenantId },
      include: {
        agendamento: {
          select: {
            id: true,
            codigoUnico: true,
            dataHora: true,
            status: true,
            cliente: { select: { id: true, nome: true } },
            profissional: { select: { id: true, nome: true } },
            servico: { select: { id: true, nome: true, valor: true } },
          },
        },
      },
    });

    if (!pagamento) {
      res.status(404).json({ erro: 'Pagamento não encontrado' });
      return;
    }

    res.json(pagamento);
  } catch (error) {
    next(error);
  }
});

router.get('/agendamento/:agendamentoId', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agendamentoId } = req.params;
    const tenantId = getTenantId(req);

    const pagamento = await prisma.pagamento.findFirst({
      where: { agendamentoId, tenantId },
      include: {
        agendamento: {
          select: {
            id: true,
            codigoUnico: true,
            dataHora: true,
            status: true,
            valorPago: true,
          },
        },
      },
    });

    if (!pagamento) {
      res.status(404).json({ erro: 'Nenhum pagamento encontrado para este agendamento' });
      return;
    }

    res.json(pagamento);
  } catch (error) {
    next(error);
  }
});

export default router;
