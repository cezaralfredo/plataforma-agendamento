import { SessaoBot as PrismaSessaoBot } from '@prisma/client';

export type SessaoBot = PrismaSessaoBot & {
  dados: Record<string, any>;
};

export interface BotResponse {
  type: 'text' | 'buttons' | 'list';
  text: string;
  buttons?: Array<{ id: string; title: string }>;
  listItems?: Array<{ id: string; title: string; description?: string }>;
}

export interface BotTenantInfo {
  id: string;
  nome: string;
  slug: string;
  plano: string;
  asaasApiKey: string;
  asaasApiUrl: string;
  asaasSandbox: boolean;
  evolutionApiKey: string;
  evolutionInstanceName: string;
  metaAccessToken: string;
  metaPhoneNumberId: string;
  telegramBotToken: string;
  provedorMensageria: string;
  whatsappAdminNumber: string;
}
