import axios from 'axios';
import { config } from '../../config';

export class WhatsAppService {
  private baseUrl: string;
  private apiKey: string;
  private instance: string;

  constructor(evolutionApiUrl?: string, evolutionApiKey?: string, instanceName?: string) {
    this.baseUrl = evolutionApiUrl || `${config.evolution.apiUrl}`;
    this.apiKey = evolutionApiKey || config.evolution.apiKey;
    this.instance = instanceName || config.evolution.instanceName;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    };
  }

  private formatNumber(to: string): string {
    return to.replace(/\D/g, '') + '@s.whatsapp.net';
  }

  async sendMessage(to: string, message: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        {
          number: this.formatNumber(to),
          text: message,
        },
        { headers: this.headers() }
      );
    } catch (error: any) {
      console.error('[Evolution] sendMessage error:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<void> {
    try {
      const evolutionButtons = buttons.slice(0, 5).map(btn => ({
        type: 'reply',
        reply: { id: btn.id, title: btn.title },
      }));

      await axios.post(
        `${this.baseUrl}/message/sendButtons/${this.instance}`,
        {
          number: this.formatNumber(to),
          title: 'Agendamento',
          description: body,
          buttons: evolutionButtons,
        },
        { headers: this.headers() }
      );
    } catch (error: any) {
      console.error('[Evolution] sendButtons error:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendList(
    to: string,
    body: string,
    listItems: Array<{ id: string; title: string; description?: string }>
  ): Promise<void> {
    try {
      const rows = listItems.slice(0, 10).map(item => ({
        title: item.title,
        description: item.description || '',
        rowId: item.id,
      }));

      await axios.post(
        `${this.baseUrl}/message/sendList/${this.instance}`,
        {
          number: this.formatNumber(to),
          title: 'Agendamento',
          description: body,
          buttonText: 'Ver opções',
          sections: [{
            title: 'Opções',
            rows,
          }],
        },
        { headers: this.headers() }
      );
    } catch (error: any) {
      console.error('[Evolution] sendList error:', error.response?.data || error.message);
      throw error;
    }
  }

  async instanceConnect(): Promise<string> {
    const res = await axios.get(
      `${this.baseUrl}/instance/connect/${this.instance}`,
      { headers: this.headers() }
    );
    return res.data?.base64 || '';
  }

  async instanceStatus(): Promise<string> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/instance/connectionState/${this.instance}`,
        { headers: this.headers() }
      );
      return res.data?.state || 'disconnected';
    } catch {
      return 'disconnected';
    }
  }
}
