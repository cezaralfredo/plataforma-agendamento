import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
}

export interface Profissional {
  id: string;
  nome: string;
  especialidades?: string[];
}

export interface Servico {
  id: string;
  nome: string;
  valor: number;
  duracaoMinutos?: number;
}

export interface Pagamento {
  id: string;
  valor: number;
  forma: string;
  status: string;
}

export interface AgendamentoServico {
  servico: Servico;
}

export interface Agendamento {
  id: string;
  codigo: string;
  cliente: Cliente;
  profissional: Profissional;
  servico: Servico;
  servicosAgendamento: AgendamentoServico[];
  pagamento?: Pagamento;
  data: string;
  hora: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO';
  valor: number;
  observacao?: string;
  criadoEm: string;
}

interface AgendamentosFiltros {
  status?: string;
  profissionalId?: string;
  dataInicio?: string;
  dataFim?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface AgendamentosResponse {
  agendamentos: Agendamento[];
  total: number;
  page: number;
  totalPages: number;
}

interface CriarAgendamentoData {
  clienteId: string;
  profissionalId: string;
  servicoId: string;
  data: string;
  hora: string;
  observacao?: string;
}

export function useAgendamentos(filtros?: AgendamentosFiltros) {
  const [data, setData] = useState<AgendamentosResponse>({
    agendamentos: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgendamentos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (filtros?.status) params.status = filtros.status;
      if (filtros?.profissionalId) params.profissionalId = filtros.profissionalId;
      if (filtros?.dataInicio) params.dataInicio = filtros.dataInicio;
      if (filtros?.dataFim) params.dataFim = filtros.dataFim;
      if (filtros?.search) params.search = filtros.search;
      if (filtros?.page) params.page = filtros.page;
      if (filtros?.limit) params.limit = filtros.limit;

      const res = await api.get<AgendamentosResponse>('/agendamentos', { params });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar agendamentos.');
    } finally {
      setLoading(false);
    }
  }, [
    filtros?.status,
    filtros?.profissionalId,
    filtros?.dataInicio,
    filtros?.dataFim,
    filtros?.search,
    filtros?.page,
    filtros?.limit,
  ]);

  useEffect(() => {
    fetchAgendamentos();
  }, [fetchAgendamentos]);

  const cancelar = useCallback(async (id: string) => {
    const res = await api.post<Agendamento>(`/agendamentos/${id}/cancelar`);
    setData((prev) => ({
      ...prev,
      agendamentos: prev.agendamentos.map((a) =>
        a.id === id ? { ...a, status: 'CANCELADO' as const } : a
      ),
    }));
    return res.data;
  }, []);

  const concluir = useCallback(async (id: string) => {
    const res = await api.post<Agendamento>(`/agendamentos/${id}/concluir`);
    setData((prev) => ({
      ...prev,
      agendamentos: prev.agendamentos.map((a) =>
        a.id === id ? { ...a, status: 'CONCLUIDO' as const } : a
      ),
    }));
    return res.data;
  }, []);

  const criar = useCallback(async (data: CriarAgendamentoData) => {
    const res = await api.post<Agendamento>('/agendamentos', data);
    await fetchAgendamentos();
    return res.data;
  }, [fetchAgendamentos]);

  return {
    agendamentos: data.agendamentos,
    total: data.total,
    page: data.page,
    totalPages: data.totalPages,
    loading,
    error,
    refetch: fetchAgendamentos,
    cancelar,
    concluir,
    criar,
  };
}

export function useAgendamentosProximos(limit: number = 5) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get<Agendamento[]>('/agendamentos/proximos', {
          params: { limit },
        });
        if (!cancelled) setAgendamentos(res.data);
      } catch {
        if (!cancelled) setAgendamentos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [limit]);

  return { agendamentos, loading };
}

export function useAgendamentosHoje() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await api.get<Agendamento[]>('/agendamentos/hoje');
        if (!cancelled) setAgendamentos(res.data);
      } catch {
        if (!cancelled) setAgendamentos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { agendamentos, loading };
}
