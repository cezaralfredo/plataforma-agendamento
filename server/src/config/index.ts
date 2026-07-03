import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

const requiredInProduction = (key: string, value: string | undefined): string => {
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error(`Variável de ambiente obrigatória: ${key}`);
  }
  return value || '';
};

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  jwt: {
    secret: (() => {
      const envSecret = process.env.JWT_SECRET;
      if (envSecret && envSecret !== 'default-secret-change-me' && envSecret !== 'jwt-secret-plataforma-agendamento-2024') {
        return envSecret;
      }
      if (process.env.NODE_ENV === 'production' && !envSecret) {
        throw new Error('JWT_SECRET deve ser configurada em produção');
      }
      if (!envSecret || envSecret === 'default-secret-change-me' || envSecret === 'jwt-secret-plataforma-agendamento-2024') {
        console.warn('[WARN] JWT_SECRET fraco em uso. Configure uma chave segura via variável de ambiente.');
        if (!envSecret) {
          return crypto.randomBytes(32).toString('hex');
        }
      }
      return envSecret;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'agendamento-bot',
    adminNumber: process.env.WHATSAPP_ADMIN_NUMBER || '',
  },

  meta: {
    accessToken: process.env.META_ACCESS_TOKEN || '',
    phoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.META_VERIFY_TOKEN || '',
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },

  mensageria: {
    provedorPadrao: (process.env.PROVEDOR_MENSAGERIA_PADRAO || 'EVOLUTION') as 'EVOLUTION' | 'META' | 'TELEGRAM',
  },

  asaas: {
    apiKey: process.env.ASAAS_API_KEY || '',
    apiUrl: process.env.ASAAS_API_URL || '',
    sandbox: process.env.ASAAS_SANDBOX !== 'false',
    webhookToken: process.env.ASAAS_WEBHOOK_TOKEN || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  signup: {
    secretKey: process.env.SIGNUP_SECRET_KEY || '',
    disabled: process.env.DISABLE_SIGNUP === 'true',
  },

  regras: {
    tempoBloqueioProvisorioMinutos: parseInt(process.env.TEMPO_BLOQUEIO_PROVISORIO_MINUTOS || '15', 10),
    tempoExpiracaoPixMinutos: parseInt(process.env.TEMPO_EXPIRACAO_PIX_MINUTOS || '15', 10),
    horasAntecedenciaCancelamento: parseInt(process.env.HORAS_ANTECEDENCIA_CANCELAMENTO || '2', 10),
    prazoExpiracaoCreditoDias: parseInt(process.env.PRAZO_EXPIRACAO_CREDITO_DIAS || '365', 10),
  },
};
