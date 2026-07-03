import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../../services/prisma';
import { config } from '../../config';

export function validateAsaasWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['asaas-signature'] as string;

  if (!signature) {
    next();
    return;
  }

  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', config.asaas.webhookToken || '')
    .update(rawBody)
    .digest('hex');

  try {
    const parsed = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    if (!parsed) {
      res.status(401).json({ erro: 'Assinatura do webhook inválida' });
      return;
    }
  } catch {
    if (signature !== expectedSignature) {
      res.status(401).json({ erro: 'Assinatura do webhook inválida' });
      return;
    }
  }

  next();
}

export function requireAsaasWebhookToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-webhook-token'] as string;

  if (config.nodeEnv === 'production' && !config.asaas.webhookToken) {
    res.status(500).json({ erro: 'ASAAS_WEBHOOK_TOKEN não configurado em produção' });
    return;
  }

  if (config.asaas.webhookToken) {
    if (!token || token !== config.asaas.webhookToken) {
      res.status(401).json({ erro: 'Token de webhook inválido' });
      return;
    }
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
