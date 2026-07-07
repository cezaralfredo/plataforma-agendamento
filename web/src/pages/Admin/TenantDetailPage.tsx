import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, ArrowLeft, Loader2, CalendarDays, Users, Scissors, DollarSign, CreditCard, FileText, Activity, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDENTE: 'Pendente', CONFIRMADO: 'Confirmado', CANCELADO: 'Cancelado', CONCLUIDO: 'Concluído',
  };
  return map[status] || status;
}

function assinaturaBadge(status: string): string {
  const map: Record<string, string> = {
    ATIVA: 'bg-green-50 text-green-700 border-green-200',
    CANCELADA: 'bg-red-50 text-red-700 border-red-200',
    EXPIRADA: 'bg-gray-50 text-gray-500 border-gray-200',
    TENTATIVA_FALHA: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return map[status] || 'bg-gray-50 text-gray-600 border-gray-200';
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isPlatformAdmin } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAgendamentos, setShowAgendamentos] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [agendamentosTenant, setAgendamentosTenant] = useState<any[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);

  const fetchTenant = useCallback(async () => {
    try {
      const res = await api.get(`/admin/tenants/${id}`);
      setTenant(res.data);
    } catch {
      toast.error('Erro ao carregar detalhes do estabelecimento');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTenant(); }, [fetchTenant]);

  const toggleAtivo = async () => {
    try {
      await api.put(`/admin/tenants/${id}/status`, { ativo: !tenant.ativo });
      toast.success(tenant.ativo ? 'Estabelecimento desativado' : 'Estabelecimento ativado');
      fetchTenant();
    } catch (err: any) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/tenants/${id}`);
      toast.success('Estabelecimento deletado permanentemente');
      navigate('/admin/estabelecimentos');
    } catch (err: any) {
      toast.error(err?.response?.data?.erro || 'Erro ao deletar estabelecimento');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const loadAgendamentos = async () => {
    setShowAgendamentos(!showAgendamentos);
    if (!showAgendamentos) {
      setLoadingAgendamentos(true);
      try {
        const res = await api.get('/agendamentos', { params: { tenantId: id, limit: 50 } });
        setAgendamentosTenant(res.data.agendamentos || []);
      } catch {
        toast.error('Erro ao carregar agendamentos');
      } finally {
        setLoadingAgendamentos(false);
      }
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Acesso restrito</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-600" /></div>;
  }

  if (!tenant) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Estabelecimento não encontrado</p>
        <button onClick={() => navigate('/admin/estabelecimentos')} className="text-primary-600 mt-2">Voltar</button>
      </div>
    );
  }

  const statsCards = [
    { label: 'Usuários', value: tenant._count.usuarios, icon: Users, color: 'border-l-blue-500', iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
    { label: 'Clientes', value: tenant._count.clientes, icon: Users, color: 'border-l-purple-500', iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
    { label: 'Profissionais', value: tenant._count.profissionais, icon: Scissors, color: 'border-l-green-500', iconColor: 'text-green-600', iconBg: 'bg-green-50' },
    { label: 'Serviços', value: tenant._count.servicos, icon: Scissors, color: 'border-l-orange-500', iconColor: 'text-orange-600', iconBg: 'bg-orange-50' },
    { label: 'Agendamentos', value: tenant._count.agendamentos, icon: CalendarDays, color: 'border-l-teal-500', iconColor: 'text-teal-600', iconBg: 'bg-teal-50' },
    { label: 'Agendamentos Hoje', value: tenant.agendamentosHoje, icon: Clock, color: 'border-l-cyan-500', iconColor: 'text-cyan-600', iconBg: 'bg-cyan-50' },
  ];

  const assinatura = tenant.assinatura;
  const plano = assinatura?.plano;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/estabelecimentos')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} />
        Voltar para estabelecimentos
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
              <Building2 size={28} className="text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{tenant.nome}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">#{tenant.slug}</span>
                {tenant.ativo ? (
                  <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    <CheckCircle size={12} /> Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    <XCircle size={12} /> Inativo
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleAtivo} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              tenant.ativo ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'
            }`}>
              {tenant.ativo ? <XCircle size={16} /> : <CheckCircle size={16} />}
              {tenant.ativo ? 'Desativar' : 'Ativar'}
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
          {statsCards.map(card => (
            <div key={card.label} className={`bg-white rounded-lg border border-gray-100 p-4 border-l-4 ${card.color}`}>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-xl font-bold text-gray-800">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Informações</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">ID</span>
              <span className="font-medium text-gray-800">{tenant.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Slug</span>
              <span className="font-medium text-gray-800">{tenant.slug}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Plano</span>
              <span className="font-medium text-gray-800">{tenant.plano}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Criado em</span>
              <span className="font-medium text-gray-800">{format(parseISO(tenant.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">WhatsApp Admin</span>
              <span className="font-medium text-gray-800">{tenant.whatsappAdminNumber || '-'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Provedor</span>
              <span className="font-medium text-gray-800">{tenant.provedorMensageria}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Sandbox Asaas</span>
              <span className="font-medium text-gray-800">{tenant.asaasSandbox ? 'Sim' : 'Não'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Assinatura</h3>
          </div>
          {assinatura ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Plano</span>
                <span className="font-semibold text-gray-800">{plano?.nome || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Status</span>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${assinaturaBadge(assinatura.status)}`}>
                  {assinatura.status}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Ciclo</span>
                <span className="font-medium text-gray-800">{assinatura.ciclo}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Valor</span>
                <span className="font-semibold text-gray-800">{formatCurrency(plano?.preco || 0)}/mês</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Início</span>
                <span className="font-medium text-gray-800">{format(parseISO(assinatura.dataInicio), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Próximo ciclo</span>
                <span className="font-medium text-gray-800">{format(parseISO(assinatura.dataProximoCiclo), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Auto renovar</span>
                <span className="font-medium text-gray-800">{assinatura.autoRenovar ? 'Sim' : 'Não'}</span>
              </div>

              {assinatura.faturas && assinatura.faturas.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Últimas Faturas</h4>
                  <div className="space-y-2">
                    {assinatura.faturas.slice(0, 5).map((f: any) => (
                      <div key={f.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                        <div>
                          <span className="font-medium text-gray-800">{f.numero}</span>
                          <span className="text-gray-500 ml-2">{formatCurrency(f.valor)}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 text-xs rounded-full border ${
                          f.status === 'PAGA' ? 'bg-green-50 text-green-700 border-green-200' :
                          f.status === 'PENDENTE' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-gray-50 text-gray-500 border-gray-200'
                        }`}>{f.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <CreditCard size={32} className="mx-auto mb-2" />
              <p className="text-sm">Nenhuma assinatura ativa</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Agendamentos por Status</h3>
          {tenant.agendamentosPorStatus && Object.keys(tenant.agendamentosPorStatus).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(tenant.agendamentosPorStatus).map(([status, count]: [string, any]) => (
                <div key={status} className={`rounded-lg p-3 text-center ${
                  status === 'PENDENTE' ? 'bg-yellow-50' :
                  status === 'CONFIRMADO' ? 'bg-green-50' :
                  status === 'CANCELADO' ? 'bg-red-50' :
                  'bg-blue-50'
                }`}>
                  <p className="text-lg font-bold text-gray-800">{count as number}</p>
                  <p className="text-xs text-gray-600">{statusLabel(status)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">Nenhum agendamento</div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-gray-500">Faturamento total: <strong className="text-gray-800">{formatCurrency(tenant.faturamentoTotal)}</strong></span>
            <span className="text-gray-500">Agendamentos no mês: <strong className="text-gray-800">{tenant.agendamentosMes}</strong></span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Atividades Recentes</h3>
          </div>
          {tenant.atividades && tenant.atividades.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {tenant.atividades.map((atv: any) => (
                <div key={atv.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-primary-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-800">{atv.descricao}</p>
                    <p className="text-xs text-gray-500">{format(parseISO(atv.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">Nenhuma atividade registrada</div>
          )}
        </div>
      </div>

      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Excluir Estabelecimento" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir permanentemente o estabelecimento <strong>{tenant?.nome}</strong>?
            Esta ação irá remover todos os dados associados (agendamentos, clientes, profissionais, etc.) e não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary" disabled={deleting}>Cancelar</button>
            <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors" disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              {deleting ? 'Excluindo...' : 'Sim, Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
