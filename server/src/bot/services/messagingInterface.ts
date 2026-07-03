export interface IMessagingService {
  sendMessage(to: string, message: string): Promise<void>;
  sendButtons(to: string, body: string, buttons: Array<{ id: string; title: string }>): Promise<void>;
  sendList(to: string, body: string, listItems: Array<{ id: string; title: string; description?: string }>): Promise<void>;
}

export function createMessagingService(tenant: {
  provedorMensageria: string;
  evolutionApiKey: string;
  evolutionInstanceName: string;
  metaAccessToken: string;
  metaPhoneNumberId: string;
  telegramBotToken: string;
}): IMessagingService {
  const provider = tenant.provedorMensageria || 'EVOLUTION';

  switch (provider) {
    case 'META': {
      const { MetaWhatsAppService } = require('./metaWhatsAppService');
      return new MetaWhatsAppService(
        tenant.metaAccessToken,
        tenant.metaPhoneNumberId
      );
    }
    case 'TELEGRAM': {
      const { TelegramService } = require('./telegramService');
      return new TelegramService(tenant.telegramBotToken);
    }
    case 'EVOLUTION':
    default: {
      const { WhatsAppService } = require('./whatsappService');
      return new WhatsAppService(
        undefined,
        tenant.evolutionApiKey,
        tenant.evolutionInstanceName
      );
    }
  }
}
