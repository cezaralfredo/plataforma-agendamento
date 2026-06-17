import prisma from '../../services/prisma';
import { addMinutes } from 'date-fns';
import { SessaoBot } from '../types';

export class SessionManager {
  private readonly sessionDurationMinutes = 30;

  async getSession(telefone: string): Promise<SessaoBot | null> {
    const cliente = await prisma.cliente.findUnique({ where: { telefone } });
    if (!cliente) return null;

    const session = await prisma.sessaoBot.findFirst({
      where: {
        clienteId: cliente.id,
        expiraEm: { gt: new Date() },
      },
      orderBy: { criadoEm: 'desc' },
    });

    if (!session) return null;

    return {
      ...session,
      dados: (session.dados as Record<string, any>) || {},
    };
  }

  async createSession(clienteId: string, telefone: string): Promise<SessaoBot> {
    await prisma.sessaoBot.deleteMany({
      where: {
        clienteId,
        expiraEm: { lte: new Date() },
      },
    });

    const session = await prisma.sessaoBot.create({
      data: {
        clienteId,
        etapa: 'SAUDACAO',
        dados: {},
        expiraEm: addMinutes(new Date(), this.sessionDurationMinutes),
      },
    });

    return {
      ...session,
      dados: {},
    };
  }

  async updateSession(sessionId: string, etapa: string, dados: any): Promise<void> {
    await prisma.sessaoBot.update({
      where: { id: sessionId },
      data: {
        etapa,
        dados,
        expiraEm: addMinutes(new Date(), this.sessionDurationMinutes),
      },
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await prisma.sessaoBot.delete({ where: { id: sessionId } });
  }

  async cleanExpiredSessions(): Promise<number> {
    const result = await prisma.sessaoBot.deleteMany({
      where: { expiraEm: { lte: new Date() } },
    });
    return result.count;
  }
}
