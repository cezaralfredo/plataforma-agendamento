import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../../services/prisma';
import { config } from '../../config';
import { getTenantId, verifyToken, isValidUUID } from '../middleware/auth';

const router = Router();

const senhaSchema = z.string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número');

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha é obrigatória'),
  tenantSlug: z.string().optional(),
});

const registerSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  senha: senhaSchema,
  perfil: z.enum(['SUPER_ADMIN', 'PROFISSIONAL']),
  profissionalId: z.string().uuid().optional(),
});

const changePasswordSchema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
  novaSenha: senhaSchema,
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, senha, tenantSlug } = loginSchema.parse(req.body);

    let tenantId = getTenantId(req);

    if (!tenantId && tenantSlug) {
      const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (tenant && tenant.ativo) {
        tenantId = tenant.id;
      }
    }

    if (!tenantId) {
      const headerSlug = req.headers['x-tenant-id'];
      const slug = Array.isArray(headerSlug) ? headerSlug[0] : headerSlug;
      if (slug && !isValidUUID(slug)) {
        let tenant = await prisma.tenant.findUnique({ where: { slug } });
        if (!tenant) {
          tenant = await prisma.tenant.findUnique({ where: { id: slug } });
        }
        if (tenant && tenant.ativo) {
          tenantId = tenant.id;
        }
      } else if (slug && isValidUUID(slug)) {
        tenantId = slug;
      }
    }

    if (!tenantId) {
      const slug = req.query.slug as string;
      if (slug) {
        const tenant = await prisma.tenant.findUnique({ where: { slug } });
        if (tenant && tenant.ativo) {
          tenantId = tenant.id;
        }
      }
    }

    if (!tenantId) {
      res.status(400).json({ erro: 'Tenant não identificado. Informe o slug ou x-tenant-id.' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (!usuario) {
      res.status(401).json({ erro: 'Email ou senha incorretos' });
      return;
    }

    if (!usuario.ativo) {
      res.status(401).json({ erro: 'Usuário desativado' });
      return;
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      res.status(401).json({ erro: 'Email ou senha incorretos' });
      return;
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        tenantId: usuario.tenantId,
        email: usuario.email,
        perfil: usuario.perfil,
        profissionalId: usuario.profissionalId || undefined,
      },
      config.jwt.secret as string,
      { expiresIn: config.jwt.expiresIn as any }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        tenantId: usuario.tenantId,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/register', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.usuario!.perfil !== 'SUPER_ADMIN') {
      res.status(403).json({ erro: 'Apenas super administradores podem criar usuários' });
      return;
    }

    const data = registerSchema.parse(req.body);
    const tenantId = getTenantId(req);

    if (!tenantId) {
      res.status(400).json({ erro: 'Tenant não identificado' });
      return;
    }

    const emailExistente = await prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId, email: data.email } },
    });

    if (emailExistente) {
      res.status(409).json({ erro: 'Email já cadastrado' });
      return;
    }

    if (data.profissionalId) {
      const profissionalExiste = await prisma.profissional.findFirst({
        where: { id: data.profissionalId, tenantId },
      });

      if (!profissionalExiste) {
        res.status(400).json({ erro: 'Profissional não encontrado' });
        return;
      }

      const usuarioVinculado = await prisma.usuario.findUnique({
        where: { profissionalId: data.profissionalId },
      });

      if (usuarioVinculado) {
        res.status(409).json({ erro: 'Profissional já possui um usuário vinculado' });
        return;
      }
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        tenantId,
        nome: data.nome,
        email: data.email,
        senha: senhaHash,
        perfil: data.perfil,
        profissionalId: data.profissionalId || null,
      },
      select: {
        id: true,
        tenantId: true,
        nome: true,
        email: true,
        perfil: true,
        profissionalId: true,
        ativo: true,
        criadoEm: true,
      },
    });

    res.status(201).json(usuario);
  } catch (error) {
    next(error);
  }
});

router.get('/me', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.id },
      select: {
        id: true,
        tenantId: true,
        nome: true,
        email: true,
        perfil: true,
        profissionalId: true,
        ativo: true,
        criadoEm: true,
        profissional: {
          select: {
            id: true,
            nome: true,
            especialidades: true,
          },
        },
      },
    });

    if (!usuario) {
      res.status(404).json({ erro: 'Usuário não encontrado' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    next(error);
  }
});

router.put('/change-password', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { senhaAtual, novaSenha } = changePasswordSchema.parse(req.body);

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario!.id },
    });

    if (!usuario) {
      res.status(404).json({ erro: 'Usuário não encontrado' });
      return;
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);

    if (!senhaValida) {
      res.status(401).json({ erro: 'Senha atual incorreta' });
      return;
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha: senhaHash },
    });

    res.json({ mensagem: 'Senha alterada com sucesso' });
  } catch (error) {
    next(error);
  }
});

export default router;
