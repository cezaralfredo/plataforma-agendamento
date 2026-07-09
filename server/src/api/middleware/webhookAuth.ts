import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../../services/prisma';
import { config } from '../../config';

export function validateAsaasWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  const signature = req.headers['asaas-signature'] as string;

  if (!signature) {
    if (config.nodeEnv === 'production' && config.asaas.webhookToken) {
      res.status(401).json({ erro: 'Assinatura do webhook não fornecida' });
      return;
    }
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

export function validateEvolutionWebhook(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET') {
    res.status(200).json({ status: 'ok' });
    return;
  }

  const apiKeyHeader = req.headers['apikey'] as string;

  if (config.evolution.apiKey) {
    if (!apiKeyHeader || apiKeyHeader !== config.evolution.apiKey) {
      res.sendStatus(200);
      return;
    }
  }

  next();
}

export function validateMetaWebhook(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    if (config.meta.verifyToken && (mode !== 'subscribe' || token !== config.meta.verifyToken)) {
      res.status(403).send('Verificação falhou');
      return;
    }

    if (challenge) {
      res.status(200).send(challenge);
      return;
    }

    res.status(200).json({ status: 'ok' });
    return;
  }

  next();
}

export function validateTelegramWebhook(req: Request, res: Response, next: NextFunction): void {
  if (config.telegram.botToken) {
    const token = req.query.token as string || req.headers['x-telegram-bot-api-secret-token'] as string;
    if (!token || token !== config.telegram.botToken) {
      res.status(401).json({ erro: 'Token do Telegram inválido' });
      return;
    }
  }

  next();
}
