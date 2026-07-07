import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Loader2, Search, Filter, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    PENDENTE: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    PAGA: 'bg-green-50 text-green-700 border-green-200',
    ATRASADA: 'bg-red-50 text-red-700 border-red-200',
    CANCELADA: 'bg-gray-50 text-gray-500 border-gray-200',
    REEMBOLSADA: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return map[status] || 'bg-gray-50 text-gray-600 border-gray-200';
}

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente', PAGA: 'Paga', ATRASADA: 'Atrasada',
  CANCELADA: 'Cancelada', REEMBOLSADA: 'Reembolsada',
};

export default function FaturasPage() {
  const { isPlatformAdmin } = useAuth();
  const [faturas, setFaturas] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [resumo, setResumo] = useState<any>(null);
  const [gerarModalOpen, setGerarModalOpen] = useState(false);
  const [assinaturaId, setAssinaturaId] = useState('');
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState<any>(null);

  const fetchFaturas = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.tenantId = search;
      const res = await api.get('/faturas', { params });
      setFaturas(res.data.faturas);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      toast.error('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  const fetchResumo = useCallback(async () => {
    try {
      const res = await api.get('/faturas/resumo/geral');
      setResumo(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchFaturas(); }, [fetchFaturas]);
  useEffect(() => { fetchResumo(); }, [fetchResumo]);

  const handleGerarFatura = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/faturas/gerar', {
        assinaturaId,
        valor,
        descricao,
        dataVencimento: new Date(dataVencimento).toISOString(),
      });
      toast.success('Fatura gerada');
      setGerarModalOpen(false);
      fetchFaturas();
      fetchResumo();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.erro || 'Erro ao gerar fatura');
    } finally {
      setSaving(false);
    }
  };

  const handleMarcarPaga = async (fatura: any) => {
    try {
      await api.put(`/faturas/${fatura.id}`, { status: 'PAGA', metodoPagamento: 'PIX' });
      toast.success('Fatura marcada como paga');
      fetchFaturas();
      fetchResumo();
      if (selectedFatura?.id === fatura.id) setDetailModalOpen(false);
    } catch (err: any) {
      toast.error('Erro ao atualizar fatura');
    }
  };

  const openDetail = async (fatura: any) => {
    try {
      const res = await api.get(`/faturas/${fatura.id}`);
      setSelectedFatura(res.data);
      setDetailModalOpen(true);
    } catch {
      toast.error('Erro ao carregar detalhes');
    }
  };

  if (!isPlatformAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Acesso restrito</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Faturamento</h1>
          <p className="text-sm text-gray-500">Gerencie as faturas dos estabelecimentos</p>
        </div>
        <button onClick={() => setGerarModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Gerar Fatura
        </button>
      </div>

      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Total Faturas</p>
            <p className="text-xl font-bold text-gray-800">{resumo.totalFaturas}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-l-green-500">
            <p className="text-xs text-gray-500">Total Recebido</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(resumo.totalPago)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-l-yellow-500">
            <p className="text-xs text-gray-500">Pendente</p>
            <p className="text-xl font-bold text-yellow-600">{formatCurrency(resumo.totalPendente)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-l-blue-500">
            <p className="text-xs text-gray-500">Receita (mês)</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(resumo.receitaMes)}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={16} className="text-gray-400" />
            <input
              placeholder="Filtrar por tenant..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="input-field py-1.5 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field py-1.5 text-sm w-auto"
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGA">Paga</option>
            <option value="ATRASADA">Atrasada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="REEMBOLSADA">Reembolsada</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-600" /></div>
        ) : faturas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">Nenhuma fatura encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-4 font-medium">Número</th>
                  <th className="p-4 font-medium">Estabelecimento</th>
                  <th className="p-4 font-medium">Descrição</th>
                  <th className="p-4 font-medium">Valor</th>
                  <th className="p-4 font-medium">Vencimento</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((fatura) => (
                  <tr key={fatura.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{fatura.numero}</td>
                    <td className="p-4 text-gray-800">{fatura.tenant?.nome || '-'}</td>
                    <td className="p-4 text-gray-600 max-w-[200px] truncate">{fatura.descricao || '-'}</td>
                    <td className="p-4 font-medium text-gray-800">{formatCurrency(fatura.valor)}</td>
                    <td className="p-4 text-gray-600">{format(parseISO(fatura.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${statusBadgeClass(fatura.status)}`}>
                        {statusLabels[fatura.status] || fatura.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openDetail(fatura)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">
                          Detalhes
                        </button>
                        {fatura.status === 'PENDENTE' && (
                          <button onClick={() => handleMarcarPaga(fatura)} className="text-green-600 hover:text-green-700 text-xs font-medium">
                            Pagar
                          </button>
                        )}
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

      <Modal open={gerarModalOpen} onClose={() => setGerarModalOpen(false)} title="Gerar Fatura" size="md">
        <form onSubmit={handleGerarFatura} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID da Assinatura *</label>
            <input value={assinaturaId} onChange={e => setAssinaturaId(e.target.value)} required className="input-field" placeholder="uuid da assinatura" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
            <input type="number" step="0.01" min="0" value={valor} onChange={e => setValor(parseFloat(e.target.value) || 0)} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} className="input-field" placeholder="Assinatura Pro - Mensal" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Vencimento *</label>
            <input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} required className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setGerarModalOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
              {saving && <Loader2 size={18} className="animate-spin" />}
              Gerar Fatura
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={detailModalOpen} onClose={() => { setDetailModalOpen(false); setSelectedFatura(null); }} title="Detalhes da Fatura" size="md">
        {selectedFatura && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Número</p>
                <p className="font-semibold text-gray-800">{selectedFatura.numero}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${statusBadgeClass(selectedFatura.status)}`}>
                  {statusLabels[selectedFatura.status] || selectedFatura.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500">Valor</p>
                <p className="font-semibold text-gray-800">{formatCurrency(selectedFatura.valor)}</p>
              </div>
              <div>
                <p className="text-gray-500">Vencimento</p>
                <p className="font-semibold text-gray-800">{format(parseISO(selectedFatura.dataVencimento), "dd/MM/yyyy", { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-gray-500">Estabelecimento</p>
                <p className="font-semibold text-gray-800">{selectedFatura.tenant?.nome || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">Plano</p>
                <p className="font-semibold text-gray-800">{selectedFatura.assinatura?.plano?.nome || '-'}</p>
              </div>
              {selectedFatura.dataPagamento && (
                <div>
                  <p className="text-gray-500">Data Pagamento</p>
                  <p className="font-semibold text-gray-800">{format(parseISO(selectedFatura.dataPagamento), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              )}
              {selectedFatura.metodoPagamento && (
                <div>
                  <p className="text-gray-500">Método</p>
                  <p className="font-semibold text-gray-800">{selectedFatura.metodoPagamento}</p>
                </div>
              )}
            </div>
            {selectedFatura.descricao && (
              <div>
                <p className="text-sm text-gray-500">Descrição</p>
                <p className="text-sm text-gray-800">{selectedFatura.descricao}</p>
              </div>
            )}
            {selectedFatura.status === 'PENDENTE' && (
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => handleMarcarPaga(selectedFatura)} className="btn-primary flex items-center gap-2">
                  <CheckCircle size={16} />
                  Marcar como Paga
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
