import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

export interface AuthPayload {
  id: string;
  email: string;
  perfil: 'SUPER_ADMIN' | 'PROFISSIONAL';
  profissionalId?: string;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: AuthPayload | null;
    }
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
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
    req.usuario = decoded;
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

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
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
    req.usuario = decoded;
  } catch {
    req.usuario = null;
  }

  next();
}
