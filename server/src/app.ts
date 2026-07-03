import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './api/middleware/errorHandler';
import apiRouter from './api/routes';
import { processarMensagem } from './bot';

const app = express();

const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "blob:"],
  connectSrc: ["'self'"],
  fontSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: [],
};

app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? { directives: cspDirectives } : false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
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

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Muitas requisições de webhook.' },
});
app.use('/api/pagamentos/webhook', webhookLimiter);
app.use('/webhook', webhookLimiter);

app.use('/api', apiRouter);

app.use('/webhook/whatsapp', processarMensagem);
app.use('/webhook/whatsapp/:tenantSlug', processarMensagem);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.disable('x-powered-by');

app.use(errorHandler);

export default app;
