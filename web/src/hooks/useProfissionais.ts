import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface Profissional {
  id: string;
  nome: string;
  especialidades: string[];
  diasTrabalho: number[];
  horarioInicio: string;
  horarioFim: string;
  ativo: boolean;
}

export function useProfissionais() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfissionais = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Profissional[]>('/profissionais');
      setProfissionais(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar profissionais.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfissionais();
  }, [fetchProfissionais]);

  return { profissionais, loading, error, refetch: fetchProfissionais };
}

export function useProfissionalHorarios(profissionalId: string | null, data: string | null) {
  const [horarios, setHorarios] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profissionalId || !data) {
      setHorarios([]);
      return;
    }

    let cancelled = false;

    const fetchHorarios = async () => {
      setLoading(true);
      try {
        const res = await api.get<any>(`/profissionais/${profissionalId}/horarios`, {
          params: { data },
        });
        if (!cancelled) setHorarios(res.data.horariosDisponiveis || res.data);
      } catch {
        if (!cancelled) setHorarios([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHorarios();
    return () => { cancelled = true; };
  }, [profissionalId, data]);

  return { horarios, loading };
}
