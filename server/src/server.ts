import app from './app';
import { config } from './config';
import { EvolutionInitializer } from './bot/services/evolutionInitializer';

const startServer = async () => {
  try {
    const initializer = new EvolutionInitializer();
    await initializer.init();
  } catch (error) {
    console.warn('[Server] Evolution init warning (non-fatal):', error);
  }

  app.listen(config.port, () => {
    console.log(`🚀 Servidor rodando na porta ${config.port}`);
    console.log(`📖 Documentação Swagger: http://localhost:${config.port}/api/docs`);
    console.log(`🔧 Ambiente: ${config.nodeEnv}`);
    console.log(`🤖 Evolution Go: ${config.evolution.apiUrl}`);
    console.log(`📱 Instância: ${config.evolution.instanceName}`);
  });
};

startServer();
