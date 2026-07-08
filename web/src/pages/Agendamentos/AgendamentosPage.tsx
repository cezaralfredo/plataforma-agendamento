import { useState, useCallback, useMemo, useEffect } from 'react';
import { CalendarDays, Table2, Plus, Search, Filter, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../../services/api';
import { useAgendamentos } from '../../hooks/useAgendamentos';
import StatusBadge from '../../components/ui/StatusBadge';
import NovoAgendamentoModal from '../../components/agendamentos/NovoAgendamentoModal';
import DetalhesAgendamentoModal from '../../components/agendamentos/DetalhesAgendamentoModal';
import CalendarioAgendamentos from '../../components/agendamentos/CalendarioAgendamentos';
import Modal from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function AgendamentosPage() {
  const [viewMode, setViewMode] = useState<'tabela' | 'calendario'>('tabela');
  const [showFilters, setShowFilters] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [page, setPage] = useState(1);
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [selectedAgendamentoId, setSelectedAgendamentoId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, dataInicio, dataFim]);

  const filtros = useMemo(
    () => ({
      ...(statusFilter && { status: statusFilter }),
      ...(dataInicio && { dataInicio }),
      ...(dataFim && { dataFim }),
      ...(searchTerm && { search: searchTerm }),
      page,
      limit: 10,
    }),
    [statusFilter, dataInicio, dataFim, searchTerm, page],
  );

  const { agendamentos, total, totalPages, loading, error, refetch, cancelar, concluir } =
    useAgendamentos(filtros);

  const hasFilters = statusFilter || dataInicio || dataFim || searchTerm;

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setSearchTerm('');
    setStatusFilter('');
    setDataInicio('');
    setDataFim('');
    setPage(1);
  }, []);

  const handleRowClick = useCallback((id: string) => {
    setSelectedAgendamentoId(id);
    setDetalhesModalOpen(true);
  }, []);

  const handleCalendarSelect = useCallback((agendamento: any) => {
    setSelectedAgendamentoId(agendamento?.id || null);
    setDetalhesModalOpen(true);
  }, []);

  const handleCancelar = useCallback(
    async (id: string, codigo: string) => {
      if (!window.confirm(`Tem certeza que deseja cancelar o agendamento ${codigo}?`)) return;
      try {
        await cancelar(id);
        toast.success('Agendamento cancelado com sucesso!');
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Erro ao cancelar agendamento.');
      }
    },
    [cancelar],
  );

  const handleConcluir = useCallback(
    async (id: string, codigo: string) => {
      if (!window.confirm(`Confirmar conclusão do agendamento ${codigo}?`)) return;
      try {
        await concluir(id);
        toast.success('Agendamento concluído com sucesso!');
      } catch (err: any) {
        toast.error(err?.response?.data?.error || 'Erro ao concluir agendamento.');
      }
    },
    [concluir],
  );

  const handleNovoSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Agendamentos</h1>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('tabela')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'tabela'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Table2 size={16} />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              onClick={() => setViewMode('calendario')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'calendario'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CalendarDays size={16} />
              <span className="hidden sm:inline">Calendário</span>
            </button>
          </div>

          <button
            onClick={() => setNovoModalOpen(true)}
            className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo Agendamento</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {viewMode === 'tabela' ? (
        <>
          <div className="card">
            <div className="sm:hidden mb-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Filter size={16} />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                {hasFilters && (
                  <span className="w-2 h-2 rounded-full bg-primary-600" />
                )}
              </button>
            </div>

            <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-3 mb-4`}>
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="input-field pl-10 w-full"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field sm:w-44"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="input-field sm:w-40"
                placeholder="Data início"
              />
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="input-field sm:w-40"
                placeholder="Data fim"
              />
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="btn-secondary flex items-center gap-1.5 text-sm shrink-0"
                >
                  <X size={16} />
                  Limpar Filtros
                </button>
              )}
            </div>

            {loading ? (
              <TableSkeleton rows={8} columns={7} />
            ) : error ? (
              <EmptyState
                icon={X}
                title="Erro ao carregar agendamentos"
                description={error}
                action={{ label: 'Tentar novamente', onClick: refetch }}
              />
            ) : agendamentos.length === 0 ? (
              <EmptyState
                title="Nenhum agendamento encontrado"
                description="Tente ajustar os filtros ou crie um novo agendamento."
                action={{ label: 'Novo Agendamento', onClick: () => setNovoModalOpen(true) }}
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-3 font-medium whitespace-nowrap">Código</th>
                        <th className="pb-3 font-medium whitespace-nowrap">Cliente</th>
                        <th className="pb-3 font-medium whitespace-nowrap">Profissional</th>
                        <th className="pb-3 font-medium whitespace-nowrap">Serviço</th>
                        <th className="pb-3 font-medium whitespace-nowrap">Data/Hora</th>
                        <th className="pb-3 font-medium whitespace-nowrap">Status</th>
                        <th className="pb-3 font-medium whitespace-nowrap">Valor</th>
                        <th className="pb-3 font-medium whitespace-nowrap">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agendamentos.map((ag) => (
                        <tr
                          key={ag.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleRowClick(ag.id)}
                        >
                          <td className="py-3 pr-4 text-gray-800 font-medium">{ag.codigo}</td>
                          <td className="py-3 pr-4 text-gray-800">{ag.cliente?.nome}</td>
                          <td className="py-3 pr-4 text-gray-800">{ag.profissional?.nome}</td>
                          <td className="py-3 pr-4 text-gray-800">
  {ag.servicosAgendamento?.map(sa => sa.servico.nome).join(', ') || ag.servico?.nome}
</td>
                          <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                            {format(parseISO(ag.data), 'dd/MM/yyyy')} às {ag.hora}
                          </td>
                          <td className="py-3 pr-4">
                            <StatusBadge status={ag.status} />
                          </td>
                          <td className="py-3 pr-4 text-gray-800 font-medium">
                            {formatCurrency(ag.valor)}
                          </td>
                          <td className="py-3 whitespace-nowrap">
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              {(ag.status === 'PENDENTE' || ag.status === 'CONFIRMADO') && (
                                <button
                                  onClick={() => handleCancelar(ag.id, ag.codigo)}
                                  className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
                                >
                                  Cancelar
                                </button>
                              )}
                              {ag.status === 'CONFIRMADO' && (
                                <button
                                  onClick={() => handleConcluir(ag.id, ag.codigo)}
                                  className="text-xs font-medium text-green-600 hover:text-green-800 transition-colors"
                                >
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

                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </div>
        </>
      ) : (
        <CalendarioAgendamentos onSelectEvent={handleCalendarSelect} />
      )}

      <NovoAgendamentoModal
        open={novoModalOpen}
        onClose={() => setNovoModalOpen(false)}
        onSuccess={handleNovoSuccess}
      />

      <DetalhesAgendamentoModal
        open={detalhesModalOpen}
        onClose={() => {
          setDetalhesModalOpen(false);
          setSelectedAgendamentoId(null);
        }}
        agendamentoId={selectedAgendamentoId}
      />
    </div>
  );
}
