import { useState, useEffect } from 'react';
import { Calendar, Clock, Loader2, Save, Plus, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Agenda {
  diasTrabalho: number[];
  horarioInicio: string;
  horarioFim: string;
}

interface Bloqueio {
  id: string;
  data: string;
  motivo: string | null;
}

const diasSemana = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

export default function MinhaAgendaPage() {
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [diasTrabalho, setDiasTrabalho] = useState<number[]>([]);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [novaData, setNovaData] = useState('');
  const [novoMotivo, setNovoMotivo] = useState('');
  const [addingBloqueio, setAddingBloqueio] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agendaRes, bloqueiosRes] = await Promise.all([
        api.get('/profissional/minha-agenda'),
        api.get('/profissional/bloqueios'),
      ]);
      const a = agendaRes.data as Agenda;
      setAgenda(a);
      setDiasTrabalho(a.diasTrabalho);
      setHorarioInicio(a.horarioInicio);
      setHorarioFim(a.horarioFim);
      setBloqueios(bloqueiosRes.data);
    } catch (err: any) {
      toast.error('Erro ao carregar agenda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleDia = (dia: number) => {
    setDiasTrabalho(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const handleSaveAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (diasTrabalho.length === 0) {
      toast.error('Selecione ao menos um dia de trabalho.');
      return;
    }
    setSaving(true);
    try {
      await api.put('/profissional/minha-agenda', {
        diasTrabalho,
        horarioInicio,
        horarioFim,
      });
      toast.success('Agenda atualizada com sucesso!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar agenda.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBloqueio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaData) {
      toast.error('Selecione uma data.');
      return;
    }
    setAddingBloqueio(true);
    try {
      await api.post('/profissional/bloqueios', {
        data: novaData,
        motivo: novoMotivo || undefined,
      });
      toast.success('Bloqueio adicionado.');
      setNovaData('');
      setNovoMotivo('');
      const res = await api.get('/profissional/bloqueios');
      setBloqueios(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao adicionar bloqueio.');
    } finally {
      setAddingBloqueio(false);
    }
  };

  const handleRemoveBloqueio = async (id: string) => {
    try {
      await api.delete(`/profissional/bloqueios/${id}`);
      toast.success('Bloqueio removido.');
      setBloqueios(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao remover bloqueio.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Minha Agenda</h1>
        <p className="text-sm text-gray-500">Gerencie seus dias e horários de trabalho</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSaveAgenda} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Dias de Trabalho</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {diasSemana.map(dia => (
                <label
                  key={dia.value}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    diasTrabalho.includes(dia.value)
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={diasTrabalho.includes(dia.value)}
                    onChange={() => toggleDia(dia.value)}
                    className="sr-only"
                  />
                  <Calendar size={16} />
                  <span className="text-sm">{dia.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock size={14} className="inline mr-1" />
                Horário Início
              </label>
              <input
                type="time"
                value={horarioInicio}
                onChange={e => setHorarioInicio(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock size={14} className="inline mr-1" />
                Horário Fim
              </label>
              <input
                type="time"
                value={horarioFim}
                onChange={e => setHorarioFim(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Salvando...' : 'Salvar Agenda'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Bloqueios de Agenda</h3>
        <p className="text-sm text-gray-500 mb-4">Adicione datas em que não estará disponível</p>

        <form onSubmit={handleAddBloqueio} className="flex flex-wrap items-end gap-3 mb-6">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
            <input
              type="date"
              value={novaData}
              onChange={e => setNovaData(e.target.value)}
              className="input-field py-1.5 text-sm"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo (opcional)</label>
            <input
              type="text"
              value={novoMotivo}
              onChange={e => setNovoMotivo(e.target.value)}
              className="input-field py-1.5 text-sm"
              placeholder="Ex: Folga, médico..."
            />
          </div>
          <button
            type="submit"
            className="btn-primary flex items-center gap-1 text-sm py-1.5"
            disabled={addingBloqueio}
          >
            {addingBloqueio ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Adicionar
          </button>
        </form>

        {bloqueios.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nenhum bloqueio cadastrado.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bloqueios.map(b => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {format(parseISO(b.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  {b.motivo && (
                    <p className="text-xs text-gray-500">{b.motivo}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveBloqueio(b.id)}
                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                  title="Remover"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
