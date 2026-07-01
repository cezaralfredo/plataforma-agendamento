import axios from 'axios';
import { config } from '../config';

export interface TenantAsaasConfig {
  apiKey: string;
  apiUrl: string;
  sandbox: boolean;
}

interface AsaasCustomer {
  object: string;
  id: string;
  name: string;
  phone?: string;
}

interface AsaasPayment {
  object: string;
  id: string;
  customer: string;
  billingType: string;
  value: number;
  netValue: number;
  status: string;
  dueDate: string;
  confirmedDate?: string;
  paymentDate?: string;
  externalReference?: string;
  pixQrCode?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
}

interface PixCobrancaResponse {
  qrCode: string;
  copiaECola: string;
  asaasPaymentId: string;
  asaasCustomerId: string;
}

export class PixService {
  private baseUrl: string;
  private apiKey: string;

  constructor(tenantConfig?: Partial<TenantAsaasConfig>) {
    const env = tenantConfig?.sandbox ?? config.asaas.sandbox ? 'sandbox' : 'producao';
    this.baseUrl = tenantConfig?.apiUrl || config.asaas.apiUrl || (
      env === 'sandbox' ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3'
    );
    this.apiKey = tenantConfig?.apiKey || config.asaas.apiKey;
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'access_token': this.apiKey,
    };
  }

  hasValidConfig(): boolean {
    return !!this.apiKey;
  }

  async criarCliente(nome: string, telefone: string): Promise<string> {
    const telefoneLimpo = telefone.replace(/\D/g, '');

    try {
      const res = await axios.post(
        `${this.baseUrl}/customers`,
        {
          name: nome,
          phone: telefoneLimpo,
          notificationDisabled: true,
        },
        { headers: this.headers() }
      );
      return res.data.id;
    } catch (error: any) {
      console.error('[Asaas] criarCliente error:', error.response?.data || error.message);
      throw new Error('Falha ao criar cliente no Asaas');
    }
  }

  private async buscarCliente(telefone: string): Promise<string | null> {
    try {
      const telefoneLimpo = telefone.replace(/\D/g, '');
      const res = await axios.get(
        `${this.baseUrl}/customers?phone=${telefoneLimpo}`,
        { headers: this.headers() }
      );
      if (res.data?.data?.length > 0) {
        return res.data.data[0].id;
      }
      return null;
    } catch {
      return null;
    }
  }

  async obterOuCriarCliente(nome: string, telefone: string): Promise<string> {
    const existente = await this.buscarCliente(telefone);
    if (existente) return existente;
    return this.criarCliente(nome, telefone);
  }

  async gerarCobranca(
    valor: number,
    clienteNome: string,
    clienteTelefone: string,
    externalReference: string
  ): Promise<PixCobrancaResponse> {
    try {
      const asaasCustomerId = await this.obterOuCriarCliente(clienteNome, clienteTelefone);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      const paymentRes = await axios.post(
        `${this.baseUrl}/lean/payments`,
        {
          customer: asaasCustomerId,
          billingType: 'PIX',
          value: valor,
          dueDate: dueDate.toISOString().split('T')[0],
          externalReference,
          description: `Agendamento - ${clienteNome}`,
        },
        { headers: this.headers() }
      );

      const paymentId: string = paymentRes.data.id;

      const qrRes = await axios.get(
        `${this.baseUrl}/payments/${paymentId}/pixQrCode`,
        { headers: this.headers() }
      );

      const qrData = qrRes.data;

      return {
        qrCode: qrData.encodedImage,
        copiaECola: qrData.payload,
        asaasPaymentId: paymentId,
        asaasCustomerId,
      };
    } catch (error: any) {
      console.error('[Asaas] gerarCobranca error:', error.response?.data || error.message);
      throw new Error('Falha ao gerar cobrança PIX via Asaas');
    }
  }

  async verificarPagamento(asaasPaymentId: string): Promise<string> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/payments/${asaasPaymentId}`,
        { headers: this.headers() }
      );
      return res.data.status;
    } catch (error: any) {
      console.error('[Asaas] verificarPagamento error:', error.response?.data || error.message);
      return 'UNKNOWN';
    }
  }

  async cancelarCobranca(asaasPaymentId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/payments/${asaasPaymentId}`,
        { headers: this.headers() }
      );
    } catch (error: any) {
      console.error('[Asaas] cancelarCobranca error:', error.response?.data || error.message);
      throw new Error('Falha ao cancelar cobrança no Asaas');
    }
  }

  async estornarCobranca(asaasPaymentId: string): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/payments/${asaasPaymentId}/refund`,
        {},
        { headers: this.headers() }
      );
    } catch (error: any) {
      console.error('[Asaas] estornarCobranca error:', error.response?.data || error.message);
      throw new Error('Falha ao estornar cobrança no Asaas');
    }
  }
}

export async function getPixServiceForTenant(tenantId: string): Promise<PixService> {
  const { default: prisma } = await import('./prisma');
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      asaasApiKey: true,
      asaasApiUrl: true,
      asaasSandbox: true,
    },
  });

  if (tenant && tenant.asaasApiKey) {
    return new PixService({
      apiKey: tenant.asaasApiKey,
      apiUrl: tenant.asaasApiUrl,
      sandbox: tenant.asaasSandbox,
    });
  }

  return new PixService();
}
