import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import prisma from '../../services/prisma';

export interface AuthPayload {
  id: string;
  tenantId: string;
  email: string;
  perfil: 'SUPER_ADMIN' | 'PROFISSIONAL';
  profissionalId?: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: AuthPayload | null;
      tenantId?: string;
    }
  }
}

export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function getTenantId(req: Request): string {
  const tokenTenantId = req.usuario?.tenantId || req.tenantId;
  if (tokenTenantId) return tokenTenantId;

  const headerTenant = req.headers['x-tenant-id'];
  const headerTenantId = Array.isArray(headerTenant) ? headerTenant[0] : headerTenant;

  if (headerTenantId && isValidUUID(headerTenantId)) {
    return headerTenantId;
  }

  return '';
}

export function getTenantIdOrFail(req: Request, res: Response): string {
  const tenantId = getTenantId(req);
  if (!tenantId) {
    res.status(400).json({ erro: 'x-tenant-id header é obrigatório' });
    return '';
  }
  return tenantId;
}

export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ erro: 'Token não fornecido' });
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ erro: 'Formato de token inválido' });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;

    if (!decoded.tenantId) {
      res.status(401).json({ erro: 'Token sem tenant' });
      return;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { ativo: true },
    });

    if (!usuario || !usuario.ativo) {
      res.status(401).json({ erro: 'Usuário desativado' });
      return;
    }

    req.usuario = decoded;
    req.tenantId = decoded.tenantId;
    next();
  } catch (error) {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario) {
    res.status(401).json({ erro: 'Não autenticado' });
    return;
  }

  if (req.usuario.perfil !== 'SUPER_ADMIN') {
    res.status(403).json({ erro: 'Acesso restrito a administradores' });
    return;
  }

  next();
}

export function requireGlobalSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario) {
    res.status(401).json({ erro: 'Não autenticado' });
    return;
  }

  if (req.usuario.perfil !== 'SUPER_ADMIN') {
    res.status(403).json({ erro: 'Acesso restrito' });
    return;
  }

  next();
}

export function requireProfissional(req: Request, res: Response, next: NextFunction): void {
  if (!req.usuario) {
    res.status(401).json({ erro: 'Não autenticado' });
    return;
  }

  if (req.usuario.perfil !== 'PROFISSIONAL') {
    res.status(403).json({ erro: 'Acesso restrito a profissionais' });
    return;
  }

  next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.usuario = null;
    next();
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    req.usuario = null;
    next();
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;

    if (decoded.id && decoded.tenantId) {
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        select: { ativo: true },
      });

      if (usuario?.ativo) {
        req.usuario = decoded;
        req.tenantId = decoded.tenantId;
      } else {
        req.usuario = null;
      }
    } else {
      req.usuario = null;
    }
  } catch {
    req.usuario = null;
  }

  next();
}
