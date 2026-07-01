import prisma from '../../services/prisma';
import { getPixServiceForTenant } from '../../services/pixService';
import { SessionManager } from '../services/sessionManager';
import { BotResponse, SessaoBot } from '../types';
import { addMinutes } from 'date-fns';
import { Tenant } from '@prisma/client';

const sessionManager = new SessionManager();

export async function pagamentoPIX(telefone: string, mensagem: string, session: SessaoBot, tenant: Tenant): Promise<BotResponse> {
  const msg = mensagem.trim().toLowerCase();
  const dados = (session.dados || {}) as any;
  const tenantId = tenant.id;

  if (msg === 'menu') {
    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'buttons',
      text: 'Menu principal:',
      buttons: [
        { id: 'agendar', title: '📅 Agendar' },
        { id: 'cancelar', title: '❌ Cancelar' },
      ],
    };
  }

  if (session.etapa === 'PAGAMENTO') {
    if (msg === 'pagar' || msg === '✅ pagar' || msg === 'confirmar pagamento') {
      const agendamentoId = dados.agendamentoId;
      if (!agendamentoId) {
        await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
        return { type: 'text', text: 'Sessão expirada. Vamos recomeçar.' };
      }

      const pagamentoExiste = await prisma.pagamento.findUnique({
        where: { agendamentoId },
      });

      if (pagamentoExiste?.status === 'PAGO') {
        const agendamento = await prisma.agendamento.findUnique({ where: { id: agendamentoId } });

        await sessionManager.updateSession(session.id, 'AGENDADO', dados);

        return {
          type: 'buttons',
          text: [
            '✅ *Pagamento confirmado com sucesso!*',
            '',
            `Seu agendamento foi confirmado!`,
            `Código: ${dados.agendamentoCodigo || agendamento?.codigoUnico || ''}`,
            '',
            'Obrigado por agendar conosco! 🎉',
          ].join('\n'),
          buttons: [
            { id: 'agendar', title: '📅 Novo agendamento' },
            { id: 'menu', title: '🏠 Menu principal' },
          ],
        };
      }

      await prisma.agendamento.update({
        where: { id: agendamentoId },
        data: { status: 'CONFIRMADO' },
      });

      if (pagamentoExiste) {
        await prisma.pagamento.update({
          where: { agendamentoId },
          data: { status: 'PAGO', pagoEm: new Date() },
        });
      }

      await sessionManager.updateSession(session.id, 'AGENDADO', dados);

      return {
        type: 'buttons',
        text: [
          '✅ *Pagamento confirmado com sucesso!*',
          '',
          `Seu agendamento foi confirmado!`,
          `Código: ${dados.agendamentoCodigo || ''}`,
          '',
          'Obrigado por agendar conosco! 🎉',
        ].join('\n'),
        buttons: [
          { id: 'agendar', title: '📅 Novo agendamento' },
          { id: 'menu', title: '🏠 Menu principal' },
        ],
      };
    }

    if (msg === 'cancelar' || msg === '❌ cancelar') {
      const agendamentoId = dados.agendamentoId;
      if (agendamentoId) {
        await prisma.agendamento.update({
          where: { id: agendamentoId },
          data: { status: 'CANCELADO' },
        });
      }

      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
      return {
        type: 'buttons',
        text: 'Pagamento cancelado. Deseja fazer algo mais?',
        buttons: [
          { id: 'agendar', title: '📅 Agendar' },
          { id: 'cancelar', title: '❌ Cancelar' },
        ],
      };
    }

    const agendamentoId = dados.agendamentoId;
    if (!agendamentoId) {
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
      return { type: 'text', text: 'Sessão expirada. Vamos recomeçar.' };
    }

    const agendamento = await prisma.agendamento.findUnique({
      where: { id: agendamentoId },
      include: { cliente: true, servico: true, pagamento: true },
    });

    if (!agendamento) {
      await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
      return { type: 'text', text: 'Agendamento não encontrado.' };
    }

    let qrCode = agendamento.pagamento?.qrCode || '';
    let copiaECola = agendamento.pagamento?.copiaECola || '';

    if (!qrCode && !copiaECola) {
      try {
        const pixService = await getPixServiceForTenant(tenantId);
        if (!pixService.hasValidConfig()) {
          return {
            type: 'text',
            text: 'Pagamento PIX não configurado para este estabelecimento. Entre em contato com o administrador.',
          };
        }

        const cobranca = await pixService.gerarCobranca(
          agendamento.valorPago,
          agendamento.cliente.nome,
          agendamento.cliente.telefone,
          agendamento.id,
        );

        qrCode = cobranca.qrCode;
        copiaECola = cobranca.copiaECola;

        await prisma.pagamento.upsert({
          where: { agendamentoId },
          create: {
            tenantId,
            agendamentoId,
            txidPix: cobranca.asaasPaymentId,
            valor: agendamento.valorPago,
            qrCode,
            copiaECola,
            expiradoEm: addMinutes(new Date(), 15),
          },
          update: {
            txidPix: cobranca.asaasPaymentId,
            qrCode,
            copiaECola,
            status: 'AGUARDANDO',
            expiradoEm: addMinutes(new Date(), 15),
          },
        });

        await sessionManager.updateSession(session.id, 'PAGAMENTO', {
          ...dados,
          asaasPaymentId: cobranca.asaasPaymentId,
        });
      } catch (error) {
        console.error('[pagamentoPIX] Erro ao gerar cobrança Asaas:', error);
        return {
          type: 'text',
          text: 'Desculpe, ocorreu um erro ao gerar o PIX. Tente novamente em instantes.',
        };
      }
    }

    const nomeEstabelecimento = tenant.nome || 'Estabelecimento';

    return {
      type: 'text',
      text: [
        '💳 *Pagamento via PIX*',
        '',
        `Valor: R$ ${agendamento.valorPago.toFixed(2)}`,
        '',
        'Escaneie o QR Code abaixo com seu banco:',
        '',
        copiaECola || '',
        '',
        '📱 *Ou use o código copia e cola acima*',
        '',
        'Após realizar o pagamento, clique em "Já paguei" para confirmar.',
        '',
        '*Importante:* O PIX será confirmado automaticamente pelo sistema!',
      ].join('\n'),
      buttons: [
        { id: 'pagar', title: '✅ Já paguei' },
        { id: 'cancelar', title: '❌ Cancelar' },
      ],
    };
  }

  if (session.etapa === 'AGENDADO') {
    if (msg === 'agendar' || msg === '📅 novo agendamento') {
      await sessionManager.updateSession(session.id, 'ESCOLHA_SERVICO', {});
      return { type: 'text', text: 'Vamos começar um novo agendamento!' };
    }

    await sessionManager.updateSession(session.id, 'MENU_SERVICOS', {});
    return {
      type: 'buttons',
      text: [
        '✅ Seu horário está confirmado!',
        `Código: ${dados.agendamentoCodigo || ''}`,
        '',
        'O que deseja fazer agora?',
      ].join('\n'),
      buttons: [
        { id: 'agendar', title: '📅 Novo agendamento' },
        { id: 'menu', title: '🏠 Menu principal' },
      ],
    };
  }

  return { type: 'text', text: 'Não entendi. Envie "menu" para recomeçar.' };
}
