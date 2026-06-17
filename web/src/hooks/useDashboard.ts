import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface FaturamentoSemanal {
  dia: string;
  valor: number;
}

export interface Resumo {
  agendamentosHoje: number;
  agendamentosConfirmados: number;
  faturamentoHoje: number;
  clientesTotal: number;
  faturamentoSemanal: FaturamentoSemanal[];
}

const DEFAULT_RESUMO: Resumo = {
  agendamentosHoje: 0,
  agendamentosConfirmados: 0,
  faturamentoHoje: 0,
  clientesTotal: 0,
  faturamentoSemanal: [],
};

interface DadoFaturamento {
  data: string;
  valor: number;
}

interface PagamentoRecente {
  id: string;
  cliente: string;
  valor: number;
  forma: string;
  data: string;
}

export interface Faturamento {
  hoje: number;
  semana: number;
  mes: number;
  dados: DadoFaturamento[];
  pagamentosRecentes: PagamentoRecente[];
}

export function useDashboard() {
  const [resumo, setResumo] = useState<Resumo>(DEFAULT_RESUMO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResumo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Resumo>('/dashboard/resumo');
      setResumo(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar resumo do dashboard.');
      setResumo(DEFAULT_RESUMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumo();
  }, [fetchResumo]);

  return { resumo, loading, error, refetch: fetchResumo };
}

export function useFaturamento(periodo: 'daily' | 'weekly' | 'monthly' | 'annual') {
  const [faturamento, setFaturamento] = useState<Faturamento>({
    hoje: 0,
    semana: 0,
    mes: 0,
    dados: [],
    pagamentosRecentes: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchFaturamento = async () => {
      setLoading(true);
      try {
        const res = await api.get<Faturamento>('/dashboard/faturamento', {
          params: { periodo },
        });
        if (!cancelled) setFaturamento(res.data);
      } catch {
        if (!cancelled) {
          setFaturamento({ hoje: 0, semana: 0, mes: 0, dados: [], pagamentosRecentes: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFaturamento();
    return () => { cancelled = true; };
  }, [periodo]);

  return { faturamento, loading };
}
