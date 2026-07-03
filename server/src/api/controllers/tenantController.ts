import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { config } from '../../config';
import { getTenantId, verifyToken } from '../middleware/auth';
import { EvolutionInitializer } from '../../bot/services/evolutionInitializer';

const router = Router();

const createTenantSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  slug: z.string().min(3, 'Slug deve ter no mínimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  adminNome: z.string().min(2, 'Nome do admin deve ter no mínimo 2 caracteres'),
  adminEmail: z.string().email('Email inválido'),
  adminSenha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  asaasApiKey: z.string().optional().default(''),
  asaasApiUrl: z.string().optional().default(''),
  asaasSandbox: z.boolean().optional().default(true),
  evolutionApiKey: z.string().optional().default(''),
  whatsappAdminNumber: z.string().optional().default(''),
});

const updateTenantSchema = z.object({
  nome: z.string().min(2).optional(),
  plano: z.string().optional(),
  ativo: z.boolean().optional(),
  asaasApiKey: z.string().optional(),
  asaasApiUrl: z.string().optional(),
  asaasSandbox: z.boolean().optional(),
  evolutionApiKey: z.string().optional(),
  whatsappAdminNumber: z.string().optional(),
  subdominio: z.string().optional(),
  customDomain: z.string().optional(),
});

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (config.signup.disabled) {
      res.status(403).json({ erro: 'Criação de novas contas desativada' });
      return;
    }

    if (config.signup.secretKey) {
      const providedKey = req.headers['x-signup-key'] as string;
      if (!providedKey || providedKey !== config.signup.secretKey) {
        res.status(403).json({ erro: 'Chave de registro inválida' });
        return;
      }
    }

    const data = createTenantSchema.parse(req.body);

    const slugExistente = await prisma.tenant.findUnique({
      where: { slug: data.slug },
    });

    if (slugExistente) {
      res.status(409).json({ erro: 'Slug já está em uso' });
      return;
    }

    const emailExistente = await prisma.usuario.findFirst({
      where: { email: data.adminEmail },
    });

    if (emailExistente) {
      res.status(409).json({ erro: 'Email já cadastrado' });
      return;
    }

    const evolutionInstanceName = `agendamento-${data.slug}`;

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nome: data.nome,
          slug: data.slug,
          asaasApiKey: data.asaasApiKey,
          asaasApiUrl: data.asaasApiUrl,
          asaasSandbox: data.asaasSandbox,
          evolutionApiKey: data.evolutionApiKey || config.evolution.apiKey,
          evolutionInstanceName,
          whatsappAdminNumber: data.whatsappAdminNumber,
        },
      });

      const senhaHash = await bcrypt.hash(data.adminSenha, 10);

      const admin = await tx.usuario.create({
        data: {
          tenantId: tenant.id,
          nome: data.adminNome,
          email: data.adminEmail,
          senha: senhaHash,
          perfil: 'SUPER_ADMIN',
        },
        select: {
          id: true,
          nome: true,
          email: true,
          perfil: true,
          tenantId: true,
        },
      });

      await tx.configuracao.createMany({
        data: [
          { tenantId: tenant.id, chave: 'horario_funcionamento_inicio', valor: '08:00' },
          { tenantId: tenant.id, chave: 'horario_funcionamento_fim', valor: '19:00' },
          { tenantId: tenant.id, chave: 'tempo_bloqueio_provisorio', valor: '15' },
          { tenantId: tenant.id, chave: 'horas_antecedencia_cancelamento', valor: '2' },
          { tenantId: tenant.id, chave: 'prazo_expiracao_credito_dias', valor: '365' },
          { tenantId: tenant.id, chave: 'endereco_estabelecimento', valor: '' },
        ],
      });

      return { tenant, admin };
    });

    try {
      const initializer = new EvolutionInitializer(
        result.tenant.id,
        config.evolution.apiUrl,
        data.evolutionApiKey || config.evolution.apiKey,
        evolutionInstanceName,
        process.env.EVOLUTION_WEBHOOK_URL
          ? `${process.env.EVOLUTION_WEBHOOK_URL}/${result.tenant.slug}`
          : `http://api:3000/webhook/whatsapp/${result.tenant.slug}`
      );
      initializer.init().catch((err) => {
        console.warn(`[Tenant] Evolution init warning for ${result.tenant.slug}:`, err.message);
      });
    } catch (err: any) {
      console.warn(`[Tenant] Evolution setup warning for ${result.tenant.slug}:`, err.message);
    }

    res.status(201).json({
      tenant: {
        id: result.tenant.id,
        nome: result.tenant.nome,
        slug: result.tenant.slug,
        plano: result.tenant.plano,
      },
      admin: result.admin,
      mensagem: 'Tenant criado com sucesso! Escaneie o QR Code do WhatsApp para começar.',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.usuario?.perfil !== 'SUPER_ADMIN') {
      res.status(403).json({ erro: 'Acesso restrito' });
      return;
    }

    const tenants = await prisma.tenant.findMany({
      orderBy: { criadoEm: 'desc' },
      select: {
        id: true,
        nome: true,
        slug: true,
        plano: true,
        ativo: true,
        criadoEm: true,
        _count: {
          select: {
            usuarios: true,
            clientes: true,
            agendamentos: true,
          },
        },
      },
    });

    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

router.get('/me', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ erro: 'Tenant não identificado' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        nome: true,
        slug: true,
        plano: true,
        ativo: true,
        asaasSandbox: true,
        whatsappAdminNumber: true,
        subdominio: true,
        customDomain: true,
        criadoEm: true,
      },
    });

    if (!tenant) {
      res.status(404).json({ erro: 'Tenant não encontrado' });
      return;
    }

    res.json(tenant);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.usuario?.perfil !== 'SUPER_ADMIN') {
      res.status(403).json({ erro: 'Acesso restrito' });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        nome: true,
        slug: true,
        plano: true,
        ativo: true,
        asaasApiKey: false,
        asaasSandbox: true,
        whatsappAdminNumber: true,
        subdominio: true,
        customDomain: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    if (!tenant) {
      res.status(404).json({ erro: 'Tenant não encontrado' });
      return;
    }

    res.json(tenant);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.usuario?.perfil !== 'SUPER_ADMIN') {
      res.status(403).json({ erro: 'Acesso restrito' });
      return;
    }

    const data = updateTenantSchema.parse(req.body);

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        nome: true,
        slug: true,
        plano: true,
        ativo: true,
        asaasSandbox: true,
        whatsappAdminNumber: true,
        subdominio: true,
        customDomain: true,
        atualizadoEm: true,
      },
    });

    res.json(tenant);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.usuario?.perfil !== 'SUPER_ADMIN') {
      res.status(403).json({ erro: 'Acesso restrito' });
      return;
    }

    await prisma.tenant.update({
      where: { id: req.params.id },
      data: { ativo: false },
    });

    res.json({ mensagem: 'Tenant desativado com sucesso' });
  } catch (error) {
    next(error);
  }
});

export default router;
