import axios from 'axios';
import { IMessagingService } from './messagingInterface';

export class TelegramService implements IMessagingService {
  private baseUrl: string;

  constructor(botToken: string) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  async sendMessage(to: string, message: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: to,
        text: message,
        parse_mode: 'HTML',
      });
    } catch (error: any) {
      console.error('[Telegram] sendMessage error:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendButtons(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<void> {
    try {
      const inlineKeyboard = [];
      const row: any[] = [];

      for (const btn of buttons) {
        row.push({
          text: btn.title,
          callback_data: btn.id,
        });
        if (row.length === 2) {
          inlineKeyboard.push([...row]);
          row.length = 0;
        }
      }
      if (row.length > 0) {
        inlineKeyboard.push(row);
      }

      await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: to,
        text: body,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } catch (error: any) {
      console.error('[Telegram] sendButtons error:', error.response?.data || error.message);
      throw error;
    }
  }

  async sendList(
    to: string,
    body: string,
    listItems: Array<{ id: string; title: string; description?: string }>
  ): Promise<void> {
    try {
      const inlineKeyboard = [];
      const row: any[] = [];

      for (const item of listItems) {
        row.push({
          text: item.title,
          callback_data: item.id,
        });
        if (row.length === 2) {
          inlineKeyboard.push([...row]);
          row.length = 0;
        }
      }
      if (row.length > 0) {
        inlineKeyboard.push(row);
      }

      await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: to,
        text: body,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } catch (error: any) {
      console.error('[Telegram] sendList error:', error.response?.data || error.message);
      throw error;
    }
  }

  async setWebhook(url: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/setWebhook`, {
        url,
        allowed_updates: ['message', 'callback_query'],
      });
    } catch (error: any) {
      console.error('[Telegram] setWebhook error:', error.response?.data || error.message);
    }
  }
}

export function parseTelegramWebhook(body: any): { from: string; message: string; messageId: string } | null {
  try {
    let from = '';
    let message = '';

    if (body.message) {
      from = String(body.message.from?.id || '');
      message = body.message.text || '';
    } else if (body.callback_query) {
      from = String(body.callback_query.from?.id || '');
      message = body.callback_query.data || '';
    }

    if (!from) return null;

    return {
      from,
      message,
      messageId: String(body.update_id || ''),
    };
  } catch {
    return null;
  }
}
