import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  erro: string;
  detalhes?: unknown;
  codigo?: string;
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('[ERROR]', err);

  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      erro: 'Erro de validação',
      detalhes: err.errors.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      })),
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
          detalhes: err.meta?.target,
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
          erro: 'Violação de chave estrangeira',
          detalhes: err.meta?.field_name,
          codigo: 'FOREIGN_KEY',
        };
        res.status(400).json(response);
        return;
      default:
        response = {
          erro: 'Erro no banco de dados',
          codigo: 'DATABASE_ERROR',
          detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined,
        };
        res.status(500).json(response);
        return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    const response: ErrorResponse = {
      erro: 'Erro de validação no banco de dados',
      codigo: 'DATABASE_VALIDATION',
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined,
    };
    res.status(400).json(response);
    return;
  }

  const response: ErrorResponse = {
    erro: err.message || 'Erro interno do servidor',
    codigo: 'INTERNAL_ERROR',
    detalhes: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  res.status(500).json(response);
}
