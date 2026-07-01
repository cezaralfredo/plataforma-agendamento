import app from './app';
import { config } from './config';
import { EvolutionInitializer } from './bot/services/evolutionInitializer';
import axios from 'axios';

function formatStartupWarning(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.response?.message || error.response?.data?.message || error.message;
    return Array.isArray(message) ? message.join('; ') : String(message);
  }

  return error instanceof Error ? error.message : String(error);
}

const startServer = async () => {
  try {
    const initializer = new EvolutionInitializer();
    await Promise.race([
      initializer.init(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Evolution init timeout')), 10000)
      ),
    ]);
  } catch (error) {
    console.warn('[Server] Evolution init warning (non-fatal):', formatStartupWarning(error));
  }

  app.listen(config.port, () => {
    console.log(`🚀 Servidor rodando na porta ${config.port}`);
    console.log(`📖 Documentação Swagger: http://localhost:${config.port}/api/docs`);
    console.log(`🔧 Ambiente: ${config.nodeEnv}`);
    console.log(`🤖 Evolution Go: ${config.evolution.apiUrl}`);
    console.log(`📱 Instância padrão: ${config.evolution.instanceName}`);
    console.log(`🏪 Modo multi-tenant ativo`);
  });
};

startServer();
