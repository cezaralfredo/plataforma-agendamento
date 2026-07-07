import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Loader2, Edit3, CheckCircle, XCircle, DollarSign, Users, Scissors, CalendarDays, BarChart3, Globe, Smartphone, Cpu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';

interface Plano {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  preco: number;
  moeda: string;
  maxProfissionais: number;
  maxServicos: number;
  maxClientes: number;
  maxAgendamentosMes: number;
  relatoriosFinanceiros: boolean;
  apiWhatsApp: boolean;
  multiProfissional: boolean;
  customDomain: boolean;
  evolucaoApi: boolean;
  destaque: boolean;
  ordem: number;
  ativo: boolean;
  _count: { assinaturas: number };
}

const initialForm: Partial<Plano> & { descricao: string } = {
  nome: '', slug: '', descricao: '', preco: 0, moeda: 'BRL',
  maxProfissionais: 2, maxServicos: 10, maxClientes: 100, maxAgendamentosMes: 200,
  relatoriosFinanceiros: false, apiWhatsApp: true, multiProfissional: true,
  customDomain: false, evolucaoApi: false, destaque: false, ordem: 1, ativo: true,
};

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PlanosPage() {
  const { isPlatformAdmin } = useAuth();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plano | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const fetchPlanos = useCallback(async () => {
    try {
      const res = await api.get('/planos');
      setPlanos(res.data);
    } catch {
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlanos(); }, [fetchPlanos]);

  const openNew = () => {
    setEditing(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (plano: Plano) => {
    setEditing(plano);
    setForm({
      nome: plano.nome,
      slug: plano.slug,
      descricao: plano.descricao || '',
      preco: plano.preco,
      moeda: plano.moeda,
      maxProfissionais: plano.maxProfissionais,
      maxServicos: plano.maxServicos,
      maxClientes: plano.maxClientes,
      maxAgendamentosMes: plano.maxAgendamentosMes,
      relatoriosFinanceiros: plano.relatoriosFinanceiros,
      apiWhatsApp: plano.apiWhatsApp,
      multiProfissional: plano.multiProfissional,
      customDomain: plano.customDomain,
      evolucaoApi: plano.evolucaoApi,
      destaque: plano.destaque,
      ordem: plano.ordem,
      ativo: plano.ativo,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/planos/${editing.id}`, form);
        toast.success('Plano atualizado');
      } else {
        await api.post('/planos', form);
        toast.success('Plano criado');
      }
      setModalOpen(false);
      fetchPlanos();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.erro || 'Erro ao salvar plano';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (plano: Plano) => {
    try {
      await api.put(`/planos/${plano.id}`, { ativo: !plano.ativo });
      toast.success(plano.ativo ? 'Plano desativado' : 'Plano ativado');
      fetchPlanos();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao alterar status');
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Acesso restrito</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-600" /></div>;
  }

  const features = [
    { key: 'maxProfissionais', label: 'Profissionais', icon: Users },
    { key: 'maxServicos', label: 'Serviços', icon: Scissors },
    { key: 'maxClientes', label: 'Clientes', icon: Users },
    { key: 'maxAgendamentosMes', label: 'Agendamentos/mês', icon: CalendarDays },
  ];

  const boolFeatures = [
    { key: 'relatoriosFinanceiros', label: 'Relatórios Financeiros', icon: BarChart3 },
    { key: 'apiWhatsApp', label: 'WhatsApp API', icon: Smartphone },
    { key: 'multiProfissional', label: 'Multi-profissional', icon: Users },
    { key: 'customDomain', label: 'Domínio Personalizado', icon: Globe },
    { key: 'evolucaoApi', label: 'Evolution API', icon: Cpu },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planos</h1>
          <p className="text-sm text-gray-500">Gerencie os planos de assinatura da plataforma</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planos.map((plano) => (
          <div key={plano.id} className={`card relative overflow-hidden ${plano.destaque ? 'ring-2 ring-primary-500' : ''}`}>
            {plano.destaque && (
              <div className="absolute top-3 right-3 bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Destaque</div>
            )}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{plano.nome}</h3>
                {plano.descricao && <p className="text-sm text-gray-500 mt-1">{plano.descricao}</p>}
              </div>
              <button onClick={() => toggleAtivo(plano)} className="shrink-0" title={plano.ativo ? 'Desativar' : 'Ativar'}>
                {plano.ativo ? <CheckCircle size={20} className="text-green-500" /> : <XCircle size={20} className="text-red-500" />}
              </button>
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold text-gray-800">{formatCurrency(plano.preco)}</span>
              <span className="text-gray-500 text-sm">/mês</span>
            </div>

            <div className="space-y-2 mb-4">
              {features.map(f => (
                <div key={f.key} className="flex items-center gap-2 text-sm text-gray-600">
                  <f.icon size={14} className="text-gray-400 shrink-0" />
                  <span>{(plano as any)[f.key]} {f.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {boolFeatures.filter(f => (plano as any)[f.key]).map(f => (
                <span key={f.key} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                  {f.label}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">{plano._count.assinaturas} assinaturas</span>
              <button onClick={() => openEdit(plano)} className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium">
                <Edit3 size={14} />
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {planos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">Nenhum plano cadastrado</p>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Plano' : 'Novo Plano'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input name="nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input name="slug" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required pattern="[a-z0-9-]+" className="input-field" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea name="descricao" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="input-field" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) *</label>
              <input name="preco" type="number" step="0.01" min="0" value={form.preco} onChange={e => setForm({ ...form, preco: parseFloat(e.target.value) || 0 })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordem</label>
              <input name="ordem" type="number" min="0" value={form.ordem} onChange={e => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })} className="input-field" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Limites</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Profissionais</label>
                <input name="maxProfissionais" type="number" min="1" value={form.maxProfissionais} onChange={e => setForm({ ...form, maxProfissionais: parseInt(e.target.value) || 1 })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Serviços</label>
                <input name="maxServicos" type="number" min="1" value={form.maxServicos} onChange={e => setForm({ ...form, maxServicos: parseInt(e.target.value) || 1 })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Clientes</label>
                <input name="maxClientes" type="number" min="1" value={form.maxClientes} onChange={e => setForm({ ...form, maxClientes: parseInt(e.target.value) || 1 })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max. Agendamentos/mês</label>
                <input name="maxAgendamentosMes" type="number" min="1" value={form.maxAgendamentosMes} onChange={e => setForm({ ...form, maxAgendamentosMes: parseInt(e.target.value) || 1 })} className="input-field" />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Funcionalidades</h4>
            <div className="grid grid-cols-2 gap-3">
              {boolFeatures.map(f => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.checked })} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <f.icon size={14} className="text-gray-400" />
                  {f.label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.destaque} onChange={e => setForm({ ...form, destaque: e.target.checked })} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span>Plano em Destaque</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
              {saving && <Loader2 size={18} className="animate-spin" />}
              {editing ? 'Salvar' : 'Criar Plano'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
