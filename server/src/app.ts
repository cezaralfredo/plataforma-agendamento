import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './api/middleware/errorHandler';
import {
  validateEvolutionWebhook,
  validateMetaWebhook,
  validateTelegramWebhook,
} from './api/middleware/webhookAuth';
import apiRouter from './api/routes';
import {
  processarMensagemEvolution,
  processarMensagemMeta,
  processarMensagemTelegram,
} from './bot';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}));

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

function parseRawBody(req: express.Request, _res: express.Response, buf: Buffer): void {
  (req as any).rawBody = buf.toString();
}

app.use('/webhook', express.json({ verify: parseRawBody, limit: '100kb' }));
app.use('/api/pagamentos/webhook', express.json({ verify: parseRawBody, limit: '100kb' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    skip: (req) => req.path === '/health',
  }));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente mais tarde.' },
});
app.use('/api/auth/login', authLimiter);

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Muitas tentativas de registro. Tente novamente mais tarde.' },
});
app.use('/api/tenants/signup', signupLimiter);

const clienteAcessoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' },
});
app.use('/api/cliente-portal/acesso', clienteAcessoLimiter);

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Muitas requisições de webhook.' },
});
app.use('/api/pagamentos/webhook', webhookLimiter);
app.use('/webhook', webhookLimiter);

app.use('/api', apiRouter);

app.use('/webhook/evolution', validateEvolutionWebhook, processarMensagemEvolution);
app.use('/webhook/evolution/:tenantSlug', validateEvolutionWebhook, processarMensagemEvolution);

app.use('/webhook/meta', validateMetaWebhook, processarMensagemMeta);
app.use('/webhook/meta/:tenantSlug', validateMetaWebhook, processarMensagemMeta);

app.use('/webhook/telegram', validateTelegramWebhook, processarMensagemTelegram);
app.use('/webhook/telegram/:tenantSlug', validateTelegramWebhook, processarMensagemTelegram);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.disable('x-powered-by');

app.use(errorHandler);

export default app;
