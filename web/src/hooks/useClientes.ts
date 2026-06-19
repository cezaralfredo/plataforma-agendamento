import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  saldoCredito: number;
  criadoEm: string;
}

export function useClientes(search?: string) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;

      const res = await api.get<Cliente[]>('/clientes', { params });
      setClientes(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  return { clientes, loading, error, refetch: fetchClientes };
}

export function useClienteDetalhes(clienteId: string | null) {
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [creditos, setCreditos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clienteId) {
      setAgendamentos([]);
      setCreditos([]);
      return;
    }

    let cancelled = false;

    const fetchDetalhes = async () => {
      setLoading(true);
      try {
        const [agendamentosRes, creditosRes] = await Promise.all([
          api.get(`/clientes/${clienteId}/agendamentos`),
          api.get(`/clientes/${clienteId}/creditos`),
        ]);
        if (!cancelled) {
          setAgendamentos(agendamentosRes.data.data || agendamentosRes.data);
          setCreditos(creditosRes.data);
        }
      } catch {
        if (!cancelled) {
          setAgendamentos([]);
          setCreditos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetalhes();
    return () => { cancelled = true; };
  }, [clienteId]);

  return { agendamentos, creditos, loading };
}
