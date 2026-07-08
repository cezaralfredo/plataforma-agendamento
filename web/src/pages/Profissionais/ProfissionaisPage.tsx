import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Plus, Users, ToggleLeft, ToggleRight, Clock, Loader2, Trash2, Link as LinkIcon, Copy, Check, ExternalLink, Scissors } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Profissional {
  id: string;
  nome: string;
  especialidades: string[];
  diasTrabalho: string[];
  horarioInicio: string;
  horarioFim: string;
  ativo: boolean;
  convites?: { id: string; usado: boolean; expiraEm: string }[];
}

interface Servico {
  id: number;
  nome: string;
  categoria: string;
  valor: number;
  duracaoMinutos: number;
  ativo: boolean;
}

type ProfissionalFormData = {
  nome: string;
  diasTrabalho: string[];
  horarioInicio: string;
  horarioFim: string;
};

const diasSemana = [
  { value: 'SEGUNDA', label: 'Segunda' },
  { value: 'TERCA', label: 'Terça' },
  { value: 'QUARTA', label: 'Quarta' },
  { value: 'QUINTA', label: 'Quinta' },
  { value: 'SEXTA', label: 'Sexta' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' },
];

function ProfissionalModal({
  open,
  onClose,
  onSave,
  profissional,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: ProfissionalFormData & { especialidades: string[] }) => Promise<void>;
  profissional?: Profissional | null;
  loading: boolean;
}) {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(false);
  const [especialidades, setEspecialidades] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfissionalFormData>({
    defaultValues: profissional
      ? {
          nome: profissional.nome,
          diasTrabalho: profissional.diasTrabalho,
          horarioInicio: profissional.horarioInicio,
          horarioFim: profissional.horarioFim,
        }
      : {
          nome: '',
          diasTrabalho: [],
          horarioInicio: '08:00',
          horarioFim: '18:00',
        },
  });

  useEffect(() => {
    if (open) {
      setLoadingServicos(true);
      api.get('/servicos').then(res => {
        const ativos: Servico[] = res.data.filter((s: Servico) => s.ativo);
        setServicos(ativos);
        if (profissional) {
          setEspecialidades(profissional.especialidades);
        } else {
          setEspecialidades([]);
        }
      }).catch(() => {
        toast.error('Erro ao carregar serviços.');
      }).finally(() => setLoadingServicos(false));

      reset(
        profissional
          ? {
              nome: profissional.nome,
              diasTrabalho: profissional.diasTrabalho,
              horarioInicio: profissional.horarioInicio,
              horarioFim: profissional.horarioFim,
            }
          : {
              nome: '',
              diasTrabalho: [],
              horarioInicio: '08:00',
              horarioFim: '18:00',
            }
      );
    }
  }, [open, profissional, reset]);

  const toggleServico = (nome: string) => {
    setEspecialidades(prev =>
      prev.includes(nome) ? prev.filter(e => e !== nome) : [...prev, nome]
    );
  };

  const onSubmit = (data: ProfissionalFormData) => {
    onSave({ ...data, especialidades });
  };

  const servicosPorCategoria = servicos.reduce<Record<string, Servico[]>>((acc, s) => {
    if (!acc[s.categoria]) acc[s.categoria] = [];
    acc[s.categoria].push(s);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {profissional ? 'Editar Profissional' : 'Novo Profissional'}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              {...register('nome', { required: 'Nome é obrigatório' })}
              className="input-field"
              placeholder="Nome do profissional"
            />
            {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Serviços Prestados
              </label>
              <span className="text-xs text-gray-500">
                {especialidades.length} de {servicos.length} selecionados
              </span>
            </div>
            {loadingServicos ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : servicos.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Scissors size={24} className="mx-auto mb-1" />
                <p className="text-sm">Nenhum serviço cadastrado.</p>
              </div>
            ) : (
              Object.entries(servicosPorCategoria).map(([categoria, servicosCat]) => (
                <div key={categoria} className="mb-3 last:mb-0">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {categoria === 'BARBEARIA' ? 'Barbearia' : categoria === 'SALAO' ? 'Salão' : categoria}
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {servicosCat.map(servico => {
                      const selecionado = especialidades.includes(servico.nome);
                      return (
                        <label
                          key={servico.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selecionado
                              ? 'bg-primary-50/50 border-primary-300'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selecionado}
                            onChange={() => toggleServico(servico.nome)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{servico.nome}</p>
                            <p className="text-xs text-gray-400">{servico.duracaoMinutos}min • R$ {servico.valor.toFixed(2)}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dias de Trabalho</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {diasSemana.map((dia) => (
                <label
                  key={dia.value}
                  className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={dia.value}
                    {...register('diasTrabalho')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {dia.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário Início</label>
              <input type="time" {...register('horarioInicio')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário Fim</label>
              <input type="time" {...register('horarioFim')} className="input-field" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Salvando...' : profissional ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProfissionaisPage() {
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<Profissional | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profissional | null>(null);
  const [conviteUrl, setConviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchProfissionais = async () => {
    setLoading(true);
    try {
      const res = await api.get('/profissionais');
      setProfissionais(res.data);
    } catch (err) {
      toast.error('Erro ao carregar profissionais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfissionais();
  }, []);

  const handleSave = async (data: ProfissionalFormData & { especialidades: string[] }) => {
    setSaving(true);
    try {
      const payload = {
        nome: data.nome,
        especialidades: data.especialidades,
        diasTrabalho: data.diasTrabalho,
        horarioInicio: data.horarioInicio,
        horarioFim: data.horarioFim,
      };

      if (editingProf) {
        await api.put(`/profissionais/${editingProf.id}`, payload);
        toast.success('Profissional atualizado com sucesso!');
        setModalOpen(false);
        setEditingProf(null);
      } else {
        const res = await api.post('/profissionais', payload);
        const conviteToken = res.data.conviteToken;
        if (conviteToken) {
          const baseUrl = window.location.origin;
          setConviteUrl(`${baseUrl}/convite/${conviteToken}`);
        }
        toast.success('Profissional cadastrado com sucesso!');
        setModalOpen(false);
      }
      fetchProfissionais();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar profissional.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (prof: Profissional) => {
    setTogglingId(prof.id);
    try {
      await api.patch(`/profissionais/${prof.id}/ativo`, { ativo: !prof.ativo });
      toast.success(prof.ativo ? 'Profissional desativado.' : 'Profissional ativado.');
      fetchProfissionais();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao alterar status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await api.delete(`/profissionais/${confirmDelete.id}`);
      toast.success('Profissional excluído permanentemente.');
      setConfirmDelete(null);
      fetchProfissionais();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao excluir profissional.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (prof: Profissional) => {
    navigate(`/profissionais/${prof.id}`);
  };

  const openNew = () => {
    setEditingProf(null);
    setModalOpen(true);
  };

  const diasLabel: Record<string, string> = {
    SEGUNDA: 'Seg',
    TERCA: 'Ter',
    QUARTA: 'Qua',
    QUINTA: 'Qui',
    SEXTA: 'Sex',
    SABADO: 'Sáb',
    DOMINGO: 'Dom',
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Users size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-sm">Apenas administradores podem gerenciar profissionais.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Profissionais</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Novo Profissional
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-44" />
          ))}
        </div>
      ) : profissionais.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <Users size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">Nenhum profissional cadastrado</p>
          <p className="text-sm">Clique em "Novo Profissional" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {profissionais.map((prof) => (
            <div
              key={prof.id}
              className={`card cursor-pointer transition-all hover:shadow-md ${
                !prof.ativo ? 'opacity-60' : ''
              }`}
              onClick={() => openEdit(prof)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{prof.nome}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prof.especialidades.map((esp) => (
                      <span
                        key={esp}
                        className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full"
                      >
                        {esp}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleAtivo(prof);
                  }}
                  disabled={togglingId === prof.id}
                  className={`p-1.5 rounded-lg transition-colors ${
                    prof.ativo
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={prof.ativo ? 'Desativar' : 'Ativar'}
                >
                  {togglingId === prof.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : prof.ativo ? (
                    <ToggleRight size={22} />
                  ) : (
                    <ToggleLeft size={22} />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(prof);
                  }}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {prof.convites && prof.convites.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                  <LinkIcon size={10} />
                  Convite pendente
                </span>
              )}

              <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                <Clock size={14} />
                <span>
                  {prof.horarioInicio} às {prof.horarioFim}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {prof.diasTrabalho.map((dia) => (
                  <span
                    key={dia}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                  >
                    {diasLabel[dia] || dia}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Excluir Profissional</h3>
            <p className="text-sm text-gray-600 mb-6">
              Tem certeza que deseja excluir permanentemente <strong>{confirmDelete.nome}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary"
                disabled={deletingId === confirmDelete.id}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger flex items-center gap-2"
                disabled={deletingId === confirmDelete.id}
              >
                {deletingId === confirmDelete.id && <Loader2 size={16} className="animate-spin" />}
                {deletingId === confirmDelete.id ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {conviteUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Profissional Cadastrado!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Compartilhe o link abaixo com o profissional para ele criar o próprio acesso:
            </p>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
              <LinkIcon size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                readOnly
                value={conviteUrl}
                className="text-sm bg-transparent text-gray-700 flex-1 outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(conviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-500 hover:text-primary-600"
                title="Copiar"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              O link é válido por 7 dias e pode ser usado apenas uma vez.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setConviteUrl(null)}
                className="btn-primary"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfissionalModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProf(null);
        }}
        onSave={handleSave}
        profissional={editingProf}
        loading={saving}
      />
    </div>
  );
}
