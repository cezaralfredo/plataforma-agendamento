import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'agendamento-bot',
    adminNumber: process.env.WHATSAPP_ADMIN_NUMBER || '',
  },

  asaas: {
    apiKey: process.env.ASAAS_API_KEY || '',
    apiUrl: process.env.ASAAS_API_URL || '',
    sandbox: process.env.ASAAS_SANDBOX !== 'false',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  regras: {
    tempoBloqueioProvisorioMinutos: parseInt(process.env.TEMPO_BLOQUEIO_PROVISORIO_MINUTOS || '15', 10),
    tempoExpiracaoPixMinutos: parseInt(process.env.TEMPO_EXPIRACAO_PIX_MINUTOS || '15', 10),
    horasAntecedenciaCancelamento: parseInt(process.env.HORAS_ANTECEDENCIA_CANCELAMENTO || '2', 10),
    prazoExpiracaoCreditoDias: parseInt(process.env.PRAZO_EXPIRACAO_CREDITO_DIAS || '365', 10),
  },
};
