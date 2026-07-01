import Queue from 'bull';
import prisma from '../services/prisma';
import { config } from '../config';
import { NotificacaoService } from '../services/notificacaoService';
import { addMinutes, format } from 'date-fns';

const expiracaoQueue = new Queue<{}>('expiracao-bloqueio', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 10000,
    },
  },
});

expiracaoQueue.process(async () => {
  try {
    const limiteExpiracao = addMinutes(new Date(), -config.regras.tempoExpiracaoPixMinutos);

    const agendamentosExpirados = await prisma.agendamento.findMany({
      where: {
        status: 'PENDENTE',
        criadoEm: {
          lt: limiteExpiracao,
        },
        pagamento: {
          is: {
            status: 'AGUARDANDO',
            expiradoEm: {
              lt: new Date(),
            },
          },
        },
      },
      include: {
        cliente: { select: { nome: true, telefone: true } },
        servico: { select: { nome: true } },
        pagamento: { select: { id: true } },
        tenant: { select: { evolutionApiKey: true, evolutionInstanceName: true } },
      },
    });

    const agendamentosSemPagamento = await prisma.agendamento.findMany({
      where: {
        status: 'PENDENTE',
        criadoEm: {
          lt: limiteExpiracao,
        },
        pagamento: null,
      },
      include: {
        cliente: { select: { nome: true, telefone: true } },
        servico: { select: { nome: true } },
        tenant: { select: { evolutionApiKey: true, evolutionInstanceName: true } },
      },
    });

    const todosExpirados = [
      ...agendamentosExpirados,
      ...agendamentosSemPagamento.map((a) => ({
        ...a,
        pagamento: null as { id: string } | null,
      })),
    ];

    if (todosExpirados.length === 0) {
      return;
    }

    const idsAgendamentos = todosExpirados.map((a) => a.id);

    await prisma.$transaction(async (tx) => {
      await tx.agendamento.updateMany({
        where: { id: { in: idsAgendamentos } },
        data: { status: 'CANCELADO' },
      });

      await tx.pagamento.updateMany({
        where: {
          agendamentoId: { in: idsAgendamentos },
          status: 'AGUARDANDO',
        },
        data: { status: 'EXPIRADO' },
      });
    });

    for (const agendamento of todosExpirados) {
      try {
        const dataFormatada = format(agendamento.dataHora, "dd/MM/yyyy");
        const horarioFormatado = format(agendamento.dataHora, "HH:mm");

        const notificacaoService = new NotificacaoService(
          agendamento.tenant.evolutionApiKey || undefined,
          agendamento.tenant.evolutionInstanceName || undefined,
        );

        await notificacaoService.enviarMensagem(
          agendamento.cliente.telefone,
          [
            `⏰ *Horário Liberado*`,
            '',
            `Olá ${agendamento.cliente.nome}! O horário do dia ${dataFormatada} às ${horarioFormatado}`,
            `para o serviço ${agendamento.servico.nome} foi liberado porque o pagamento não foi concluído dentro do prazo.`,
            '',
            'Caso ainda tenha interesse, você pode fazer um novo agendamento.',
            'Estamos à disposição! 😊',
          ].join('\n')
        );

        console.log(`[ExpiracaoBloqueioJob] Notificação enviada para ${agendamento.cliente.nome} (${agendamento.id})`);
      } catch (error: any) {
        console.error(
          `[ExpiracaoBloqueioJob] Erro ao notificar cliente ${agendamento.cliente.nome}:`,
          error.message
        );
      }
    }

    console.log(`[ExpiracaoBloqueioJob] ${todosExpirados.length} agendamentos expirados processados`);
  } catch (error: any) {
    console.error('[ExpiracaoBloqueioJob] Erro ao processar expiração de bloqueios:', error.message);
    throw error;
  }
});

expiracaoQueue.on('failed', (job, err) => {
  console.error(`[ExpiracaoQueue] Job ${job.id} falhou:`, err.message);
});

expiracaoQueue.on('completed', (job) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ExpiracaoQueue] Job ${job.id} concluído`);
  }
});

async function agendarJobRecorrente(): Promise<void> {
  const jobs = await expiracaoQueue.getRepeatableJobs();

  const jobExists = jobs.some((j) => j.name === 'expiracao-bloqueio');

  if (!jobExists) {
    await expiracaoQueue.add(
      {},
      {
        repeat: { cron: '*/5 * * * *' },
        jobId: 'expiracao-bloqueio',
      }
    );
    console.log('[ExpiracaoBloqueioJob] Job recorrente agendado (a cada 5 minutos)');
  }
}

agendarJobRecorrente().catch((err) => {
  console.error('[ExpiracaoBloqueioJob] Erro ao agendar jobs recorrentes:', err.message);
});

export { expiracaoQueue };
export default expiracaoQueue;
