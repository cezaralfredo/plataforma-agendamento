import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface Servico {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  duracaoMinutos: number;
  ativo: boolean;
}

export function useServicos(categoria?: string) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServicos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (categoria) params.categoria = categoria;

      const res = await api.get<Servico[]>('/servicos', { params });
      setServicos(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar serviços.');
    } finally {
      setLoading(false);
    }
  }, [categoria]);

  useEffect(() => {
    fetchServicos();
  }, [fetchServicos]);

  return { servicos, loading, error, refetch: fetchServicos };
}
