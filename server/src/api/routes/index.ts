import { Router } from 'express';
import jwt from 'jsonwebtoken';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from '../../config';

import authController from '../controllers/authController';
import tenantController from '../controllers/tenantController';
import clienteController from '../controllers/clienteController';
import profissionalController from '../controllers/profissionalController';
import servicoController from '../controllers/servicoController';
import agendamentoController from '../controllers/agendamentoController';
import pagamentoController from '../controllers/pagamentoController';
import dashboardController from '../controllers/dashboardController';
import configuracoesController from '../controllers/configuracoesController';

const router = Router();

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Plataforma de Agendamento - API',
      version: '1.0.0',
      description: 'API REST para plataforma de agendamento de salão & barbearia',
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Servidor de desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [],
});

router.use('/docs', (req: any, res: any, next: any) => {
  if (config.nodeEnv === 'production') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ erro: 'Documentação protegida em produção' });
      return;
    }
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], config.jwt.secret);
      req.usuario = decoded;
    } catch {
      res.status(401).json({ erro: 'Token inválido' });
      return;
    }
  }
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

router.use('/auth', authController);
router.use('/tenants', tenantController);
router.use('/clientes', clienteController);
router.use('/profissionais', profissionalController);
router.use('/servicos', servicoController);
router.use('/agendamentos', agendamentoController);
router.use('/pagamentos', pagamentoController);
router.use('/dashboard', dashboardController);
router.use('/configuracoes', configuracoesController);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
