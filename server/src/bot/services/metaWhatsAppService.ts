import axios from 'axios';
import { IMessagingService } from './messagingInterface';

export class MetaWhatsAppService implements IMessagingService {
  private baseUrl: string;
  private accessToken: string;
  private phoneNumberId: string;

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.baseUrl = 'https://graph.facebook.com/v21.0';
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
    };
  }

  private formatNumber(to: string): string {
    return to.replace(/\D/g, '');
  }

  async sendMessage(to: string, message: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatNumber(to),
          type: 'text',
          text: { body: message },
        },
        { headers: this.headers() }
      );
    } catch (error: any) {
      console.error('[Meta] sendMessage error:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<void> {
    try {
      const rows = buttons.slice(0, 3).map(btn => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.title.substring(0, 20),
        },
      }));

      await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatNumber(to),
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: body.substring(0, 1024) },
            action: { buttons: rows },
          },
        },
        { headers: this.headers() }
      );
    } catch (error: any) {
      console.error('[Meta] sendButtons error:', error.response?.data || error.message);
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
        id: item.id,
        title: item.title.substring(0, 24),
        description: item.description ? item.description.substring(0, 72) : undefined,
      }));

      await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: this.formatNumber(to),
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: body.substring(0, 1024) },
            action: {
              button: 'Ver opções',
              sections: [{
                title: 'Opções',
                rows,
              }],
            },
          },
        },
        { headers: this.headers() }
      );
    } catch (error: any) {
      console.error('[Meta] sendList error:', error.response?.data || error.message);
      throw error;
    }
  }
}

export function parseMetaWebhook(body: any): { from: string; message: string; messageId: string } | null {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages?.[0];

    if (!messages) return null;

    const from = messages.from;
    if (!from) return null;

    let message = '';

    if (messages.text?.body) {
      message = messages.text.body;
    } else if (messages.interactive?.button_reply?.id) {
      message = messages.interactive.button_reply.id;
    } else if (messages.interactive?.list_reply?.id) {
      message = messages.interactive.list_reply.id;
    }

    return {
      from,
      message,
      messageId: messages.id || '',
    };
  } catch {
    return null;
  }
}

export function verifyMetaWebhook(mode: string, token: string, verifyToken: string): boolean {
  return mode === 'subscribe' && token === verifyToken;
}
