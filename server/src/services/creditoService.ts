import prisma from './prisma';
import { config } from '../config';
import { Credito } from '@prisma/client';

export class CreditoService {
  async adicionarCredito(clienteId: string, valor: number, origem: string, tenantId: string): Promise<Credito> {
    if (valor <= 0) {
      throw new Error('Valor do crédito deve ser positivo');
    }

    try {
      const credito = await prisma.$transaction(async (tx) => {
        const novoCredito = await tx.credito.create({
          data: {
            tenantId,
            clienteId,
            valor,
            origem,
            utilizado: false,
          },
        });

        await tx.cliente.update({
          where: { id: clienteId },
          data: {
            saldoCredito: { increment: valor },
          },
        });

        return novoCredito;
      });

      return credito;
    } catch (error: any) {
      console.error('[CreditoService] adicionarCredito error:', error.message);
      throw new Error('Falha ao adicionar crédito');
    }
  }

  async consultarSaldo(clienteId: string): Promise<number> {
    try {
      const creditosValidos = await prisma.credito.findMany({
        where: {
          clienteId,
          utilizado: false,
          criadoEm: {
            gte: this.calcularDataExpiracao(),
          },
        },
      });

      const saldo = creditosValidos.reduce((total, credito) => total + credito.valor, 0);
      return saldo;
    } catch (error: any) {
      console.error('[CreditoService] consultarSaldo error:', error.message);
      throw new Error('Falha ao consultar saldo de créditos');
    }
  }

  async utilizarCredito(clienteId: string, valor: number): Promise<number> {
    if (valor <= 0) {
      return 0;
    }

    try {
      const creditosDisponiveis = await prisma.credito.findMany({
        where: {
          clienteId,
          utilizado: false,
          criadoEm: {
            gte: this.calcularDataExpiracao(),
          },
        },
        orderBy: { criadoEm: 'asc' },
      });

      if (creditosDisponiveis.length === 0) {
        return 0;
      }

      let valorRestante = valor;
      let valorUtilizado = 0;
      const creditosParaAtualizar: Array<{ id: string; valorUsar: number }> = [];

      for (const credito of creditosDisponiveis) {
        if (valorRestante <= 0) break;

        const valorUsar = Math.min(credito.valor, valorRestante);
        creditosParaAtualizar.push({ id: credito.id, valorUsar });
        valorRestante -= valorUsar;
        valorUtilizado += valorUsar;
      }

      if (valorUtilizado <= 0) {
        return 0;
      }

      await prisma.$transaction(async (tx) => {
        for (const item of creditosParaAtualizar) {
          const credito = await tx.credito.findUnique({
            where: { id: item.id },
            select: { valor: true, utilizado: true },
          });

          if (!credito || credito.utilizado) continue;

          const diferenca = credito.valor - item.valorUsar;

          if (diferenca <= 0.01) {
            await tx.credito.update({
              where: { id: item.id },
              data: { utilizado: true },
            });
          } else {
            await tx.credito.update({
              where: { id: item.id },
              data: {
                valor: { decrement: item.valorUsar },
              },
            });
          }
        }

        await tx.cliente.update({
          where: { id: clienteId },
          data: {
            saldoCredito: { decrement: valorUtilizado },
          },
        });
      });

      return valorUtilizado;
    } catch (error: any) {
      console.error('[CreditoService] utilizarCredito error:', error.message);
      throw new Error('Falha ao utilizar crédito');
    }
  }

  async listarCreditos(clienteId: string): Promise<Credito[]> {
    try {
      const creditos = await prisma.credito.findMany({
        where: { clienteId },
        orderBy: { criadoEm: 'desc' },
      });

      return creditos;
    } catch (error: any) {
      console.error('[CreditoService] listarCreditos error:', error.message);
      throw new Error('Falha ao listar créditos');
    }
  }

  private calcularDataExpiracao(): Date {
    const data = new Date();
    data.setDate(data.getDate() - config.regras.prazoExpiracaoCreditoDias);
    return data;
  }
}
