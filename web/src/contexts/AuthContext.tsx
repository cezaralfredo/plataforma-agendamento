import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: 'SUPER_ADMIN' | 'PROFISSIONAL';
  profissionalId?: string;
  tenantId: string;
}

interface TenantInfo {
  id: string;
  nome: string;
  slug: string;
  plano: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  tenant: TenantInfo | null;
  loading: boolean;
  login: (email: string, senha: string, tenantSlug?: string) => Promise<void>;
  logout: () => void;
  isSuperAdmin: boolean;
  isProfissional: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      Promise.all([
        api.get('/auth/me'),
        api.get('/tenants/me'),
      ])
        .then(([userRes, tenantRes]) => {
          setUsuario(userRes.data);
          setTenant(tenantRes.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('tenantSlug');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, senha: string, tenantSlug?: string) => {
    if (tenantSlug) {
      localStorage.setItem('tenantSlug', tenantSlug);
    }

    const res = await api.post('/auth/login', { email, senha });
    const { token: newToken, usuario: user } = res.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUsuario(user);

    try {
      const tenantRes = await api.get('/tenants/me');
      setTenant(tenantRes.data);
    } catch {
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('tenantSlug');
    setToken(null);
    setUsuario(null);
    setTenant(null);
  };

  const isSuperAdmin = usuario?.perfil === 'SUPER_ADMIN';
  const isProfissional = usuario?.perfil === 'PROFISSIONAL';

  return (
    <AuthContext.Provider value={{ usuario, token, tenant, loading, login, logout, isSuperAdmin, isProfissional }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
