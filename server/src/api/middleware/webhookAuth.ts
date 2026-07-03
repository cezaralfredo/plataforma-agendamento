import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../../services/prisma';
import { config } from '../../config';

export function validateAsaasWebhook(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['asaas-signature'] as string;

  if (!signature) {
    next();
    return;
  }
  next();
}

export function requireAsaasWebhookToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-webhook-token'] as string;
  const expectedToken = config.asaas.webhookToken;

  if (!expectedToken) {
    next();
    return;
  }

  if (!token || token !== expectedToken) {
    res.status(401).json({ erro: 'Token de webhook inválido' });
    return;
  }

  next();
}

export async function validateWebhookTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  const body = req.body;
  const payment = body?.payment;
  const externalReference = payment?.externalReference;

  if (!externalReference && !payment?.id) {
    next();
    return;
  }

  let agendamentoId = externalReference || '';

  if (!agendamentoId) {
    const pagamento = await prisma.pagamento.findUnique({
      where: { txidPix: payment.id },
      select: { agendamentoId: true, tenantId: true },
    });
    if (pagamento) {
      req.tenantId = pagamento.tenantId;
    }
  }

  next();
}
