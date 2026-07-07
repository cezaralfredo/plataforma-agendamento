import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface ProximoAgendamento {
  id: string;
  cliente: { id: string; nome: string; telefone?: string };
  servico: { id: string; nome: string; valor: number; duracaoMinutos?: number };
  dataHora: string;
  status: string;
}

export interface ProfissionalResumo {
  agendamentosHoje: number;
  agendamentosConfirmados: number;
  clientesAtendidos: number;
  faturamentoHoje: number;
  proximosAgendamentos: ProximoAgendamento[];
}

const DEFAULT_RESUMO: ProfissionalResumo = {
  agendamentosHoje: 0,
  agendamentosConfirmados: 0,
  clientesAtendidos: 0,
  faturamentoHoje: 0,
  proximosAgendamentos: [],
};

export function useProfissionalDashboard() {
  const [resumo, setResumo] = useState<ProfissionalResumo>(DEFAULT_RESUMO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResumo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ProfissionalResumo>('/profissional/dashboard');
      setResumo(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar painel.');
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
