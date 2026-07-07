import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { addDays } from 'date-fns';
import prisma from '../../services/prisma';
import { verifyToken, getTenantId } from '../middleware/auth';

const router = Router();

const senhaSchema = z.string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Senha deve conter pelo menos um número');

const aceitarConviteSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: senhaSchema,
});

router.get('/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    const convite = await prisma.conviteProfissional.findUnique({
      where: { token },
      include: {
        profissional: { select: { nome: true } },
        tenant: { select: { nome: true } },
      },
    });

    if (!convite) {
      res.status(404).json({ error: 'Convite não encontrado.' });
      return;
    }

    if (convite.usado) {
      res.status(400).json({ error: 'Este convite já foi utilizado.' });
      return;
    }

    if (new Date() > convite.expiraEm) {
      res.status(400).json({ error: 'Este convite expirou.' });
      return;
    }

    res.json({
      token: convite.token,
      profissionalNome: convite.profissional.nome,
      tenantNome: convite.tenant.nome,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:token/aceitar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { email, senha } = aceitarConviteSchema.parse(req.body);

    const convite = await prisma.conviteProfissional.findUnique({
      where: { token },
    });

    if (!convite) {
      res.status(404).json({ error: 'Convite não encontrado.' });
      return;
    }

    if (convite.usado) {
      res.status(400).json({ error: 'Este convite já foi utilizado.' });
      return;
    }

    if (new Date() > convite.expiraEm) {
      res.status(400).json({ error: 'Este convite expirou.' });
      return;
    }

    if (convite.email && convite.email !== email) {
      res.status(400).json({ error: 'O email informado não corresponde ao convite.' });
      return;
    }

    const emailExiste = await prisma.usuario.findUnique({
      where: { tenantId_email: { tenantId: convite.tenantId, email } },
    });

    if (emailExiste) {
      res.status(400).json({ error: 'Este email já está em uso neste estabelecimento.' });
      return;
    }

    const profissional = await prisma.profissional.findFirst({
      where: { id: convite.profissionalId, tenantId: convite.tenantId },
    });

    if (!profissional) {
      res.status(404).json({ error: 'Profissional não encontrado.' });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.$transaction(async (tx) => {
      const user = await tx.usuario.create({
        data: {
          tenantId: convite.tenantId,
          nome: profissional.nome,
          email,
          senha: senhaHash,
          perfil: 'PROFISSIONAL',
          profissionalId: convite.profissionalId,
        },
      });

      await tx.conviteProfissional.update({
        where: { id: convite.id },
        data: { usado: true, email },
      });

      return user;
    });

    res.status(201).json({
      mensagem: 'Conta criada com sucesso! Faça login para acessar.',
      email: usuario.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    next(error);
  }
});

export default router;
