import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../../services/api';

interface ClienteSessao {
  token: string;
  cliente: { id: string; nome: string; telefone: string; email: string | null; saldoCredito: number };
  tenant: { id: string; nome: string; slug: string };
}

interface ClientAuthContextType {
  sessao: ClienteSessao | null;
  loading: boolean;
  login: (telefone: string, tenantSlug: string) => Promise<void>;
  logout: () => void;
  updateCliente: (data: Partial<ClienteSessao['cliente']>) => void;
}

const ClientAuthContext = createContext<ClientAuthContextType>({} as ClientAuthContextType);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<ClienteSessao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('clienteSessao');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ClienteSessao;
        setSessao(parsed);
        api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
      } catch { sessionStorage.removeItem('clienteSessao'); }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (telefone: string, tenantSlug: string) => {
    const res = await api.post('/cliente-portal/acesso', { telefone, tenantSlug });
    const data = res.data as ClienteSessao;
    setSessao(data);
    sessionStorage.setItem('clienteSessao', JSON.stringify(data));
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
  }, []);

  const logout = useCallback(() => {
    setSessao(null);
    sessionStorage.removeItem('clienteSessao');
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const updateCliente = useCallback((data: Partial<ClienteSessao['cliente']>) => {
    setSessao(prev => {
      if (!prev) return prev;
      const updated = { ...prev, cliente: { ...prev.cliente, ...data } };
      sessionStorage.setItem('clienteSessao', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <ClientAuthContext.Provider value={{ sessao, loading, login, logout, updateCliente }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  return useContext(ClientAuthContext);
}
