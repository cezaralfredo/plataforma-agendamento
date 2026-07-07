import { useState, useEffect, useMemo } from 'react';
import { CalendarDays, Search, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAgendamentos } from '../../hooks/useAgendamentos';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import NovoAgendamentoModal from '../../components/agendamentos/NovoAgendamentoModal';
import DetalhesAgendamentoModal from '../../components/agendamentos/DetalhesAgendamentoModal';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function MeusAgendamentosPage() {
  const { usuario } = useAuth();
  const profissionalId = usuario?.profissionalId;

  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [page, setPage] = useState(1);
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string | null>(null);
  const [delegarModal, setDelegarModal] = useState<{ open: boolean; agendamentoId: string }>({ open: false, agendamentoId: '' });
  const [colegas, setColegas] = useState<{ id: string; nome: string }[]>([]);
  const [selectedColega, setSelectedColega] = useState('');
  const [delegating, setDelegating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, dataInicio, dataFim]);

  const filtros = useMemo(() => ({
    ...(profissionalId && { profissionalId }),
    ...(statusFilter && { status: statusFilter }),
    ...(dataInicio && { dataInicio }),
    ...(dataFim && { dataFim }),
    ...(searchTerm && { search: searchTerm }),
    page,
    limit: 10,
  }), [profissionalId, statusFilter, dataInicio, dataFim, searchTerm, page]);

  const { agendamentos, total, totalPages, loading, error, refetch, cancelar, concluir } =
    useAgendamentos(filtros);

  const openDelegar = async (agendamentoId: string) => {
    setDelegarModal({ open: true, agendamentoId });
    setSelectedColega('');
    try {
      const res = await api.get('/profissional/colegas');
      setColegas(res.data);
    } catch {
      toast.error('Erro ao carregar profissionais.');
    }
  };

  const handleDelegar = async () => {
    if (!selectedColega) { toast.error('Selecione um profissional.'); return; }
    setDelegating(true);
    try {
      await api.put(`/profissional/agendamentos/${delegarModal.agendamentoId}/delegar`, {
        novoProfissionalId: selectedColega,
      });
      toast.success('Agendamento delegado com sucesso!');
      setDelegarModal({ open: false, agendamentoId: '' });
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao delegar agendamento.');
    } finally {
      setDelegating(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meus Agendamentos</h1>
          <p className="text-sm text-gray-500">{total} agendamento{(total || 0) !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setNovoModalOpen(true)} className="btn-primary flex items-center gap-2">
          Novo Agendamento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={16} className="text-gray-400" />
            <input
              placeholder="Buscar cliente..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input-field py-1.5 text-sm"
            />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field py-1.5 text-sm w-auto">
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input-field py-1.5 text-sm w-auto" />
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input-field py-1.5 text-sm w-auto" />
          {(searchTerm || statusFilter || dataInicio || dataFim) && (
            <button onClick={() => { setSearchInput(''); setSearchTerm(''); setStatusFilter(''); setDataInicio(''); setDataFim(''); }} className="text-xs text-primary-600 hover:text-primary-700">
              Limpar Filtros
            </button>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : agendamentos.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum agendamento encontrado"
            description={searchTerm || statusFilter || dataInicio || dataFim ? 'Tente alterar os filtros.' : 'Você não tem agendamentos.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-4 font-medium">Cliente</th>
                  <th className="p-4 font-medium">Serviço</th>
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium">Horário</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.map((ag) => (
                  <tr key={ag.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{ag.cliente.nome}</td>
                    <td className="p-4 text-gray-600">{ag.servico.nome}</td>
                    <td className="p-4 text-gray-600">{format(parseISO(ag.data), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td className="p-4 text-gray-600">{ag.hora.slice(0, 5)}</td>
                    <td className="p-4"><StatusBadge status={ag.status} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setSelectedAgendamentoId(ag.id); setDetalhesModalOpen(true); }} className="text-primary-600 hover:text-primary-700 text-xs font-medium">
                          Detalhes
                        </button>
                        {(ag.status === 'PENDENTE' || ag.status === 'CONFIRMADO') && (
                          <>
                            <button onClick={() => cancelar(ag.id)} className="text-red-600 hover:text-red-700 text-xs font-medium">
                              Cancelar
                            </button>
                            <button onClick={() => openDelegar(ag.id)} className="text-purple-600 hover:text-purple-700 text-xs font-medium flex items-center gap-1">
                              <ArrowRightLeft size={12} />
                              Delegar
                            </button>
                          </>
                        )}
                        {ag.status === 'CONFIRMADO' && (
                          <button onClick={() => concluir(ag.id)} className="text-green-600 hover:text-green-700 text-xs font-medium">
                            Concluir
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

      {delegarModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Delegar Agendamento</h3>
            <p className="text-sm text-gray-600 mb-4">Selecione para qual profissional transferir este agendamento:</p>
            <select
              value={selectedColega}
              onChange={e => setSelectedColega(e.target.value)}
              className="input-field mb-4"
            >
              <option value="">Selecione um profissional</option>
              {colegas.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDelegarModal({ open: false, agendamentoId: '' })}
                className="btn-secondary"
                disabled={delegating}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelegar}
                className="btn-primary flex items-center gap-2"
                disabled={delegating}
              >
                {delegating && <Loader2 size={16} className="animate-spin" />}
                {delegating ? 'Delegando...' : 'Delegar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <NovoAgendamentoModal
        open={novoModalOpen}
        onClose={() => setNovoModalOpen(false)}
        onSuccess={() => { setNovoModalOpen(false); refetch(); }}
      />

      <DetalhesAgendamentoModal
        open={detalhesModalOpen}
        onClose={() => { setDetalhesModalOpen(false); setSelectedAgendamentoId(null); }}
        agendamentoId={selectedAgendamentoId}
      />
    </div>
  );
}
