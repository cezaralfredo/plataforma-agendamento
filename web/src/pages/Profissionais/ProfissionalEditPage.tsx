import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Users, Scissors, Check } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Servico {
  id: number;
  nome: string;
  categoria: string;
  valor: number;
  duracaoMinutos: number;
  ativo: boolean;
}

interface Profissional {
  id: string;
  nome: string;
  especialidades: string[];
  diasTrabalho: string[];
  horarioInicio: string;
  horarioFim: string;
  ativo: boolean;
}

const diasSemana = [
  { value: 'SEGUNDA', label: 'Segunda' },
  { value: 'TERCA', label: 'Terça' },
  { value: 'QUARTA', label: 'Quarta' },
  { value: 'QUINTA', label: 'Quinta' },
  { value: 'SEXTA', label: 'Sexta' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
];

export default function ProfissionalEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);

  const [nome, setNome] = useState('');
  const [diasTrabalho, setDiasTrabalho] = useState<string[]>([]);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('18:00');
  const [especialidades, setEspecialidades] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/profissionais/${id}`),
      api.get('/servicos'),
    ]).then(([profRes, servRes]) => {
      const prof: Profissional = profRes.data;
      setProfissional(prof);
      setNome(prof.nome);
      setDiasTrabalho(prof.diasTrabalho);
      setHorarioInicio(prof.horarioInicio);
      setHorarioFim(prof.horarioFim);
      setEspecialidades(prof.especialidades);
      setServicos(servRes.data.filter((s: Servico) => s.ativo));
    }).catch(() => {
      toast.error('Erro ao carregar dados.');
    }).finally(() => setLoading(false));
  }, [id]);

  const toggleEspecialidade = (nomeServico: string) => {
    setEspecialidades(prev =>
      prev.includes(nomeServico)
        ? prev.filter(e => e !== nomeServico)
        : [...prev, nomeServico],
    );
  };

  const toggleDia = (dia: string) => {
    setDiasTrabalho(prev =>
      prev.includes(dia)
        ? prev.filter(d => d !== dia)
        : [...prev, dia],
    );
  };

  const handleSave = async () => {
    if (!id || !nome.trim()) {
      toast.error('Nome é obrigatório.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/profissionais/${id}`, {
        nome: nome.trim(),
        especialidades,
        diasTrabalho,
        horarioInicio,
        horarioFim,
      });
      toast.success('Profissional atualizado com sucesso!');
      navigate('/profissionais');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (!profissional) {
    return (
      <div className="text-center py-20 text-gray-500">
        <Users size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Profissional não encontrado</p>
      </div>
    );
  }

  const servicosPorCategoria = servicos.reduce<Record<string, Servico[]>>((acc, s) => {
    if (!acc[s.categoria]) acc[s.categoria] = [];
    acc[s.categoria].push(s);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profissionais')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{profissional.nome}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-gray-800">Informações Básicas</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="input-field"
            placeholder="Nome do profissional"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Trabalho</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Início</label>
              <input
                type="time"
                value={horarioInicio}
                onChange={e => setHorarioInicio(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fim</label>
              <input
                type="time"
                value={horarioFim}
                onChange={e => setHorarioFim(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Dias de Trabalho</label>
          <div className="flex flex-wrap gap-2">
            {diasSemana.map(dia => (
              <button
                key={dia.value}
                type="button"
                onClick={() => toggleDia(dia.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  diasTrabalho.includes(dia.value)
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {diasTrabalho.includes(dia.value) && <Check size={14} className="inline mr-1" />}
                {dia.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Serviços Prestados</h2>
          <span className="text-sm text-gray-500">
            {especialidades.length} de {servicos.length} selecionados
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Selecione quais serviços este profissional pode realizar.
        </p>

        {Object.entries(servicosPorCategoria).map(([categoria, servicosCat]) => (
          <div key={categoria} className="mb-6 last:mb-0">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              {categoria === 'BARBEARIA' ? 'Barbearia' : categoria === 'SALAO' ? 'Salão' : categoria}
            </h3>
            <div className="flex flex-col gap-2">
              {servicosCat.map(servico => {
                const selecionado = especialidades.includes(servico.nome);
                return (
                  <label
                    key={servico.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                      selecionado
                        ? 'bg-primary-50/50 border-primary-300'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selecionado}
                      onChange={() => toggleEspecialidade(servico.nome)}
                      className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{servico.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-sm text-gray-400">{servico.duracaoMinutos} min</span>
                        <span className="text-sm font-medium text-gray-500">
                          R$ {servico.valor.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {servicos.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Scissors size={32} className="mx-auto mb-2" />
            <p className="text-sm">Nenhum serviço cadastrado neste estabelecimento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
