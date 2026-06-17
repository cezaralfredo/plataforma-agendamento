import axios from 'axios';
import { config } from '../../config';

export class EvolutionInitializer {
  private baseUrl: string;
  private apiKey: string;
  private instance: string;
  private webhookUrl: string;

  constructor() {
    this.baseUrl = config.evolution.apiUrl;
    this.apiKey = config.evolution.apiKey;
    this.instance = config.evolution.instanceName;
    this.webhookUrl = process.env.EVOLUTION_WEBHOOK_URL || 'http://api:3000/webhook/whatsapp';
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    };
  }

  async init(): Promise<void> {
    console.log('[Evolution] Verificando instância...');

    const status = await this.getStatus();
    if (status === 'connected') {
      console.log('[Evolution] Instância já conectada');
      await this.configureWebhook();
      return;
    }

    const exists = await this.instanceExists();
    if (!exists) {
      console.log('[Evolution] Criando instância...');
      await this.createInstance();
    }

    console.log('[Evolution] Instância pronta. Escaneie o QR Code em:');
    console.log(`  GET ${this.baseUrl}/instance/connect/${this.instance}`);

    await this.configureWebhook();
  }

  async instanceExists(): Promise<boolean> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/instance/fetchInstances`,
        { headers: this.headers() }
      );
      const instances = res.data || [];
      return instances.some((i: any) => i.name === this.instance);
    } catch {
      return false;
    }
  }

  async createInstance(): Promise<void> {
    await axios.post(
      `${this.baseUrl}/instance/create`,
      {
        instanceName: this.instance,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        rejectCall: false,
        msgCall: '',
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        readStatus: true,
        syncFullHistory: false,
      },
      { headers: this.headers() }
    );
  }

  async configureWebhook(): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/instance/setWebhook/${this.instance}`,
        {
          webhookUrl: this.webhookUrl,
          webhookByEvents: true,
          webhookBase64: false,
          events: ['messages.upsert'],
        },
        { headers: this.headers() }
      );
      console.log('[Evolution] Webhook configurado');
    } catch (error) {
      console.warn('[Evolution] Erro ao configurar webhook (pode configurar manualmente):', error);
    }
  }

  async getStatus(): Promise<string> {
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
