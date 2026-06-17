import Queue from 'bull';
import prisma from '../services/prisma';
import { config } from '../config';
import { NotificacaoService } from '../services/notificacaoService';
import { addHours, startOfMinute, format, startOfHour } from 'date-fns';

interface LembreteJobData {
  type: '24h' | '1h';
}

const notificacaoService = new NotificacaoService();

const lembreteQueue = new Queue<LembreteJobData>('lembretes', config.redis.url, {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

lembreteQueue.process(async (job) => {
  const { type } = job.data;

  try {
    const agora = new Date();
    const inicioProximaHora = startOfHour(addHours(agora, 1));

    if (type === '24h') {
      await processarLembretes24h(agora);
    } else if (type === '1h') {
      await processarLembretes1h(inicioProximaHora);
    }
  } catch (error: any) {
    console.error(`[LembretesJob] Erro ao processar lembrete ${type}:`, error.message);
    throw error;
  }
});

async function processarLembretes24h(agora: Date): Promise<void> {
  const inicio = startOfMinute(addHours(agora, 24));
  const fim = startOfMinute(addHours(agora, 25));

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      status: { in: ['CONFIRMADO'] },
      dataHora: {
        gte: inicio,
        lt: fim,
      },
    },
    include: {
      cliente: { select: { nome: true, telefone: true } },
      profissional: { select: { nome: true } },
      servico: { select: { nome: true } },
    },
  });

  for (const agendamento of agendamentos) {
    try {
      const dataFormatada = format(agendamento.dataHora, "dd/MM/yyyy");
      const horarioFormatado = format(agendamento.dataHora, "HH:mm");

      await notificacaoService.enviarLembrete24h(agendamento.cliente.telefone, {
        servicoNome: agendamento.servico.nome,
        data: dataFormatada,
        horario: horarioFormatado,
        profissionalNome: agendamento.profissional.nome,
      });

      console.log(`[LembretesJob] Lembrete 24h enviado para ${agendamento.cliente.nome} (${agendamento.id})`);
    } catch (error: any) {
      console.error(
        `[LembretesJob] Erro ao enviar lembrete 24h para agendamento ${agendamento.id}:`,
        error.message
      );
    }
  }
}

async function processarLembretes1h(inicioProximaHora: Date): Promise<void> {
  const inicio = inicioProximaHora;
  const fim = startOfHour(addHours(inicioProximaHora, 1));

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      status: { in: ['CONFIRMADO'] },
      dataHora: {
        gte: inicio,
        lt: fim,
      },
    },
    include: {
      cliente: { select: { nome: true, telefone: true } },
      servico: { select: { nome: true } },
    },
  });

  const endereco = config.frontendUrl || 'Nosso endereço';

  for (const agendamento of agendamentos) {
    try {
      const dataFormatada = format(agendamento.dataHora, "dd/MM/yyyy");
      const horarioFormatado = format(agendamento.dataHora, "HH:mm");

      await notificacaoService.enviarLembrete1h(agendamento.cliente.telefone, {
        endereco,
        data: dataFormatada,
        horario: horarioFormatado,
      });

      console.log(`[LembretesJob] Lembrete 1h enviado para ${agendamento.cliente.nome} (${agendamento.id})`);
    } catch (error: any) {
      console.error(
        `[LembretesJob] Erro ao enviar lembrete 1h para agendamento ${agendamento.id}:`,
        error.message
      );
    }
  }
}

lembreteQueue.on('failed', (job, err) => {
  console.error(`[LembretesQueue] Job ${job.id} falhou:`, err.message);
});

lembreteQueue.on('completed', (job) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[LembretesQueue] Job ${job.id} concluído`);
  }
});

async function agendarJobRecorrente(): Promise<void> {
  const jobs = await lembreteQueue.getRepeatableJobs();

  const job24hExists = jobs.some((j) => j.name === 'lembrete-24h');
  const job1hExists = jobs.some((j) => j.name === 'lembrete-1h');

  if (!job24hExists) {
    await lembreteQueue.add(
      { type: '24h' },
      {
        repeat: { cron: '0 * * * *' },
        jobId: 'lembrete-24h',
      }
    );
    console.log('[LembretesJob] Job recorrente 24h agendado (a cada hora)');
  }

  if (!job1hExists) {
    await lembreteQueue.add(
      { type: '1h' },
      {
        repeat: { cron: '0 * * * *' },
        jobId: 'lembrete-1h',
      }
    );
    console.log('[LembretesJob] Job recorrente 1h agendado (a cada hora)');
  }
}

agendarJobRecorrente().catch((err) => {
  console.error('[LembretesJob] Erro ao agendar jobs recorrentes:', err.message);
});

export { lembreteQueue };
export default lembreteQueue;
