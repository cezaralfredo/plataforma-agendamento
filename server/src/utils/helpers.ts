import { v4 as uuidv4 } from 'uuid';
import { addMinutes, format, parseISO, startOfDay, endOfDay, isBefore, isAfter, isWithinInterval, setHours, setMinutes } from 'date-fns';
import { z } from 'zod';

export function gerarCodigoUnico(): string {
  return uuidv4().split('-')[0].toUpperCase() + Date.now().toString(36).toUpperCase();
}

export function gerarTxidPix(): string {
  return uuidv4().replace(/-/g, '').substring(0, 32).toUpperCase();
}

export function formatarMoeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

export function formatarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

export function calcularHorarioFim(inicio: string | Date, duracaoMinutos: number): Date {
  const data = typeof inicio === 'string' ? parseISO(inicio) : inicio;
  return addMinutes(data, duracaoMinutos);
}

export function horariosDisponiveis(
  data: Date,
  horarioInicio: string,
  horarioFim: string,
  duracaoMinutos: number,
  agendamentos: Array<{ dataHora: Date; duracao: number }>,
  bloqueios: Array<{ data: Date }>
): string[] {
  const slots: string[] = [];
  const [hInicio, mInicio] = horarioInicio.split(':').map(Number);
  const [hFim, mFim] = horarioFim.split(':').map(Number);

  let current = setMinutes(setHours(startOfDay(data), hInicio), mInicio);
  const fim = setMinutes(setHours(startOfDay(data), hFim), mFim);

  while (isBefore(current, fim)) {
    const slotFim = addMinutes(current, duracaoMinutos);

    if (!isAfter(slotFim, fim)) {
      const conflito = agendamentos.some(ag => {
        const agFim = addMinutes(ag.dataHora, ag.duracao);
        return isWithinInterval(current, { start: ag.dataHora, end: agFim }) ||
               isWithinInterval(slotFim, { start: ag.dataHora, end: agFim }) ||
               (isBefore(ag.dataHora, current) && isAfter(agFim, slotFim));
      });

      const bloqueado = bloqueios.some(b =>
        isWithinInterval(current, { start: startOfDay(b.data), end: endOfDay(b.data) })
      );

      if (!conflito && !bloqueado) {
        slots.push(format(current, 'HH:mm'));
      }
    }

    current = addMinutes(current, 30);
  }

  return slots;
}

export function validarTelefoneWhatsApp(telefone: string): boolean {
  const regex = /^55\d{10,11}$/;
  return regex.test(telefone.replace(/\D/g, ''));
}

export function parseMensagemWhatsApp(body: any): { from: string; message: string; messageId: string } | null {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages?.[0];

    if (!messages) return null;

    return {
      from: messages.from,
      message: messages.text?.body || messages.interactive?.button_reply?.id || messages.interactive?.list_reply?.id || '',
      messageId: messages.id,
    };
  } catch {
    return null;
  }
}

export function parseEvolutionMensagem(body: any): { from: string; message: string; messageId: string } | null {
  try {
    if (body?.event !== 'messages.upsert') return null;

    const data = body.data;
    if (!data?.key || data.key.fromMe) return null;

    const remoteJid: string = data.key.remoteJid || '';
    const number = remoteJid.split('@')[0];
    if (!number) return null;

    const msg = data.message || {};
    const text =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.buttonsResponseMessage?.selectedButtonId ||
      msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
      msg.imageMessage?.caption ||
      '';

    return {
      from: number,
      message: text,
      messageId: data.key.id || '',
    };
  } catch {
    return null;
  }
}

export function formatarDataHora(data: Date): string {
  return format(data, "dd/MM/yyyy 'às' HH:mm");
}

export function formatarData(data: Date): string {
  return format(data, 'dd/MM/yyyy');
}
