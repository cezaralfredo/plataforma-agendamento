import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, Scissors, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Servico {
  id: string | number;
  nome: string;
  categoria: string;
  valor: number;
  duracaoMinutos: number;
  ativo: boolean;
}

type ServicoFormData = {
  nome: string;
  categoria: string;
  valor: string;
  duracao: string;
};

function ServicoModal({
  open,
  onClose,
  onSave,
  servico,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: ServicoFormData) => Promise<void>;
  servico?: Servico | null;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServicoFormData>({
    defaultValues: servico
      ? {
          nome: servico.nome,
          categoria: servico.categoria,
          valor: String(servico.valor),
          duracao: String(servico.duracaoMinutos),
        }
      : { nome: '', categoria: 'SALAO', valor: '', duracao: '30' },
  });

  useEffect(() => {
    if (open) {
      reset(
        servico
          ? {
              nome: servico.nome,
              categoria: servico.categoria,
              valor: String(servico.valor),
              duracao: String(servico.duracaoMinutos),
            }
          : { nome: '', categoria: 'SALAO', valor: '', duracao: '30' }
      );
    }
  }, [open, servico, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {servico ? 'Editar Serviço' : 'Novo Serviço'}
        </h3>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              {...register('nome', { required: 'Nome é obrigatório' })}
              className="input-field"
              placeholder="Nome do serviço"
            />
            {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select {...register('categoria')} className="input-field">
              <option value="SALAO">Salão</option>
              <option value="BARBEARIA">Barbearia</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('valor', { required: 'Valor é obrigatório' })}
                className="input-field"
                placeholder="0,00"
              />
              {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min)</label>
              <input
                type="number"
                min="15"
                step="5"
                {...register('duracao', { required: 'Duração é obrigatória' })}
                className="input-field"
                placeholder="30"
              />
              {errors.duracao && (
                <p className="text-red-500 text-xs mt-1">{errors.duracao.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Salvando...' : servico ? 'Salvar' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ServicosPage() {
  const { isSuperAdmin } = useAuth();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);

  const fetchServicos = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filtroCategoria) params.categoria = filtroCategoria;
      const res = await api.get('/servicos', { params });
      setServicos(res.data);
    } catch (err) {
      toast.error('Erro ao carregar serviços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicos();
  }, [filtroCategoria]);

  const handleSave = async (data: ServicoFormData) => {
    setSaving(true);
    try {
      const payload = {
        nome: data.nome,
        categoria: data.categoria,
        valor: parseFloat(data.valor),
        duracaoMinutos: parseInt(data.duracao, 10),
      };

      if (editingServico) {
        await api.put(`/servicos/${editingServico.id}`, payload);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await api.post('/servicos', payload);
        toast.success('Serviço cadastrado com sucesso!');
      }

      setModalOpen(false);
      setEditingServico(null);
      fetchServicos();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao salvar serviço.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (servico: Servico) => {
    setTogglingId(servico.id);
    try {
      await api.patch(`/servicos/${servico.id}/ativo`, { ativo: !servico.ativo });
      toast.success(servico.ativo ? 'Serviço desativado.' : 'Serviço ativado.');
      fetchServicos();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao alterar status.');
    } finally {
      setTogglingId(null);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Serviços</h1>
        {isSuperAdmin && (
          <button
            onClick={() => {
              setEditingServico(null);
              setModalOpen(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Serviço
          </button>
        )}
      </div>

      <div className="card">
        <div className="mb-4">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="input-field sm:w-48"
          >
            <option value="">Todas as Categorias</option>
            <option value="SALAO">Salão</option>
            <option value="BARBEARIA">Barbearia</option>
          </select>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : servicos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Scissors size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Nenhum serviço encontrado</p>
            <p className="text-sm">
              {filtroCategoria
                ? 'Nenhum serviço para esta categoria.'
                : 'Clique em "Novo Serviço" para cadastrar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">ID</th>
                  <th className="pb-3 font-medium">Nome</th>
                  <th className="pb-3 font-medium">Categoria</th>
                  <th className="pb-3 font-medium">Valor</th>
                  <th className="pb-3 font-medium">Duração</th>
                  <th className="pb-3 font-medium">Ativo</th>
                  {isSuperAdmin && <th className="pb-3 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {servicos.map((servico) => (
                  <tr
                    key={servico.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 text-gray-800 font-mono text-xs">{String(servico.id).slice(0, 8)}</td>
                    <td className="py-3 text-gray-800 font-medium">{servico.nome}</td>
                    <td className="py-3">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                          servico.categoria === 'SALAO'
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {servico.categoria === 'SALAO' ? 'Salão' : 'Barbearia'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-800">{formatCurrency(servico.valor)}</td>
                    <td className="py-3 text-gray-600">{servico.duracaoMinutos} min</td>
                    <td className="py-3">
                      {isSuperAdmin ? (
                        <button
                          onClick={() => handleToggleAtivo(servico)}
                          disabled={togglingId === servico.id}
                          className={`p-1 rounded-lg transition-colors ${
                            servico.ativo
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                        >
                          {togglingId === servico.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : servico.ativo ? (
                            <ToggleRight size={20} />
                          ) : (
                            <ToggleLeft size={20} />
                          )}
                        </button>
                      ) : (
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            servico.ativo ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3">
                        <button
                          onClick={() => {
                            setEditingServico(servico);
                            setModalOpen(true);
                          }}
                          className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ServicoModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingServico(null);
        }}
        onSave={handleSave}
        servico={editingServico}
        loading={saving}
      />
    </div>
  );
}
