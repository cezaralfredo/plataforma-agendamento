import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Loader2, Search, Filter, CheckCircle, XCircle, Users, CalendarDays, CreditCard, ArrowUpDown, ChevronRight, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Pagination from '../../components/ui/Pagination';
import Modal from '../../components/ui/Modal';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    ATIVA: 'bg-green-50 text-green-700 border-green-200',
    CANCELADA: 'bg-red-50 text-red-700 border-red-200',
    EXPIRADA: 'bg-gray-50 text-gray-500 border-gray-200',
    TENTATIVA_FALHA: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return map[status] || 'bg-gray-50 text-gray-600 border-gray-200';
}

export default function EstabelecimentosPage() {
  const { isPlatformAdmin } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState('');
  const [filterPlano, setFilterPlano] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/tenants/${deleteTarget.id}`);
      toast.success(`Estabelecimento "${deleteTarget.nome}" deletado`);
      setDeleteTarget(null);
      fetchTenants();
    } catch (err: any) {
      toast.error(err?.response?.data?.erro || 'Erro ao deletar estabelecimento');
    } finally {
      setDeleting(false);
    }
  };

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (search) params.search = search;
      if (filterAtivo) params.ativo = filterAtivo;
      if (filterPlano) params.plano = filterPlano;
      const res = await api.get('/admin/tenants', { params });
      setTenants(res.data.tenants);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error('Erro ao carregar estabelecimentos');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterAtivo, filterPlano]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  if (!isPlatformAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Acesso restrito</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Estabelecimentos</h1>
          <p className="text-sm text-gray-500">{total} estabelecimento{(total || 0) !== 1 ? 's' : ''} cadastrado{(total || 0) !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={16} className="text-gray-400" />
            <input
              placeholder="Buscar por nome ou slug..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-field py-1.5 text-sm"
            />
          </div>
          <select value={filterAtivo} onChange={e => { setFilterAtivo(e.target.value); setPage(1); }} className="input-field py-1.5 text-sm w-auto">
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
          <select value={filterPlano} onChange={e => { setFilterPlano(e.target.value); setPage(1); }} className="input-field py-1.5 text-sm w-auto">
            <option value="">Todos os planos</option>
            <option value="BASIC">Basic</option>
            <option value="PRO">Pro</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Nenhum estabelecimento encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-4 font-medium">Estabelecimento</th>
                  <th className="p-4 font-medium">Plano</th>
                  <th className="p-4 font-medium">Assinatura</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-center">Usuários</th>
                  <th className="p-4 font-medium text-center">Clientes</th>
                  <th className="p-4 font-medium text-center">Agend.</th>
                  <th className="p-4 font-medium text-center">Prof.</th>
                  <th className="p-4 font-medium">Criado em</th>
                  <th className="p-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/estabelecimentos/${t.id}`)}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-gray-400 shrink-0" />
                        <div>
                          <p className="font-medium text-gray-800">{t.nome}</p>
                          <p className="text-xs text-gray-500">#{t.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-gray-800">{t.plano}</span>
                    </td>
                    <td className="p-4">
                      {t.assinatura ? (
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor(t.assinatura.status)}`}>
                          {t.assinatura.status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sem assinatura</span>
                      )}
                    </td>
                    <td className="p-4">
                      {t.ativo ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={12} /> Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle size={12} /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center font-medium text-gray-800">{t._count.usuarios}</td>
                    <td className="p-4 text-center font-medium text-gray-800">{t._count.clientes}</td>
                    <td className="p-4 text-center font-medium text-gray-800">{t._count.agendamentos}</td>
                    <td className="p-4 text-center font-medium text-gray-800">{t._count.profissionais}</td>
                    <td className="p-4 text-gray-500 text-xs">{format(parseISO(t.criadoEm), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); }}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Excluir estabelecimento"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Excluir Estabelecimento" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir permanentemente o estabelecimento <strong>{deleteTarget?.nome}</strong>?
            Esta ação irá remover todos os dados associados e não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary" disabled={deleting}>Cancelar</button>
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
