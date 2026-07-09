import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { config } from '../../config';

interface ErrorResponse {
  erro: string;
  codigo?: string;
}

const isDev = config.nodeEnv === 'development';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  if (isDev) {
    console.error('[ERROR]', err);
  } else {
    console.error('[ERROR]', err.name, '-', err.message?.substring(0, 200));
  }

  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      erro: 'Erro de validação',
      codigo: 'VALIDATION_ERROR',
    };
    res.status(400).json(response);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let response: ErrorResponse;

    switch (err.code) {
      case 'P2002':
        response = {
          erro: 'Registro duplicado',
          codigo: 'UNIQUE_CONSTRAINT',
        };
        res.status(409).json(response);
        return;
      case 'P2025':
        response = {
          erro: 'Registro não encontrado',
          codigo: 'NOT_FOUND',
        };
        res.status(404).json(response);
        return;
      case 'P2003':
        response = {
          erro: 'Operação não permitida devido a restrições do sistema',
          codigo: 'FOREIGN_KEY',
        };
        res.status(400).json(response);
        return;
      default:
        response = {
          erro: 'Erro no banco de dados',
          codigo: 'DATABASE_ERROR',
        };
        res.status(500).json(response);
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    const response: ErrorResponse = {
      erro: 'Erro de validação no banco de dados',
      codigo: 'DATABASE_VALIDATION',
    };
    res.status(400).json(response);
    return;
  }

  const response: ErrorResponse = {
    erro: 'Erro interno do servidor',
    codigo: 'INTERNAL_ERROR',
  };

  res.status(500).json(response);
}
