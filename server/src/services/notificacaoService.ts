import { WhatsAppService } from '../bot/services/whatsappService';

interface DadosConfirmacao {
  servicoNome: string;
  profissionalNome: string;
  data: string;
  horario: string;
  codigo: string;
}

interface DadosLembrete24h {
  servicoNome: string;
  data: string;
  horario: string;
  profissionalNome: string;
}

interface DadosLembrete1h {
  endereco: string;
  data: string;
  horario: string;
}

interface DadosCancelamento {
  servicoNome: string;
  data: string;
  horario: string;
  creditoValor: number;
}

export class NotificacaoService {
  private whatsapp: WhatsAppService;

  constructor() {
    this.whatsapp = new WhatsAppService();
  }

  async enviarConfirmacao(clienteTelefone: string, dados: DadosConfirmacao): Promise<void> {
    const mensagem = [
      '✅ *Agendamento Confirmado!*',
      '',
      `Olá! Seu agendamento foi confirmado com sucesso.`,
      '',
      `📋 *Serviço:* ${dados.servicoNome}`,
      `💈 *Profissional:* ${dados.profissionalNome}`,
      `📅 *Data:* ${dados.data}`,
      `⏰ *Horário:* ${dados.horario}`,
      `🔑 *Código:* ${dados.codigo}`,
      '',
      'Guarde o código acima para consultar seu agendamento.',
      'Caso precise cancelar, entre em contato conosco com pelo menos 2 horas de antecedência.',
      '',
      'Agradecemos a preferência!',
    ].join('\n');

    await this.enviarMensagem(clienteTelefone, mensagem);
  }

  async enviarLembrete24h(clienteTelefone: string, dados: DadosLembrete24h): Promise<void> {
    const mensagem = [
      '⏰ *Lembrete de Agendamento - 24h*',
      '',
      `Olá! Seu agendamento é amanhã!`,
      '',
      `📋 *Serviço:* ${dados.servicoNome}`,
      `💈 *Profissional:* ${dados.profissionalNome}`,
      `📅 *Data:* ${dados.data}`,
      `⏰ *Horário:* ${dados.horario}`,
      '',
      'Se precisar remarcar ou cancelar, entre em contato conosco.',
      'Estamos ansiosos para recebê-lo! 🎉',
    ].join('\n');

    await this.enviarMensagem(clienteTelefone, mensagem);
  }

  async enviarLembrete1h(clienteTelefone: string, dados: DadosLembrete1h): Promise<void> {
    const mensagem = [
      '⏰ *Lembrete de Agendamento - 1h*',
      '',
      `Olá! Seu horário está chegando!`,
      '',
      `📅 *Data:* ${dados.data}`,
      `⏰ *Horário:* ${dados.horario}`,
      `📍 *Endereço:* ${dados.endereco}`,
      '',
      'Por favor, chegue no horário para garantir o melhor atendimento.',
      'Se houver qualquer imprevisto, avise-nos!',
      '',
      'Até já! 😊',
    ].join('\n');

    await this.enviarMensagem(clienteTelefone, mensagem);
  }

  async enviarCancelamento(clienteTelefone: string, dados: DadosCancelamento): Promise<void> {
    const valorFormatado = `R$ ${dados.creditoValor.toFixed(2).replace('.', ',')}`;

    const mensagem = [
      '❌ *Agendamento Cancelado*',
      '',
      `Olá! Seu agendamento foi cancelado conforme solicitado.`,
      '',
      `📋 *Serviço:* ${dados.servicoNome}`,
      `📅 *Data:* ${dados.data}`,
      `⏰ *Horário:* ${dados.horario}`,
      '',
      `💳 *Crédito gerado:* ${valorFormatado}`,
      '',
      'Esse valor estará disponível como crédito para utilizar em um próximo agendamento.',
      'O crédito pode ser usado automaticamente ao fazer uma nova reserva.',
      '',
      'Sentiremos sua falta! Esperamos vê-lo em breve. 🙏',
    ].join('\n');

    await this.enviarMensagem(clienteTelefone, mensagem);
  }

  async enviarMensagem(clienteTelefone: string, mensagem: string): Promise<void> {
    try {
      await this.whatsapp.sendMessage(clienteTelefone, mensagem);
    } catch (error: any) {
      console.error('[NotificacaoService] Erro ao enviar mensagem:', error.message);
      throw new Error(`Falha ao enviar notificação via WhatsApp: ${error.message}`);
    }
  }
}
