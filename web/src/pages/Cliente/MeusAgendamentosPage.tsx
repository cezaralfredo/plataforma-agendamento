import { useState, useEffect, useMemo } from 'react';
import { CalendarDays, Search, XCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';

interface Agendamento {
  id: string;
  dataHora: string;
  status: string;
  servico: { nome: string; valor: number };
  profissional: { nome: string };
}

export default function MeusAgendamentosPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchAgendamentos = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/cliente-portal/agendamentos', { params });
      setAgendamentos(res.data.agendamentos);
      setTotalPages(res.data.totalPages);
    } catch { toast.error('Erro ao carregar agendamentos.'); }
      finally { setLoading(false); }
  };

  useEffect(() => { fetchAgendamentos(); }, [page, statusFilter]);

  const handleCancelar = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    setCancellingId(id);
    try {
      await api.put(`/cliente-portal/agendamentos/${id}/cancelar`);
      toast.success('Agendamento cancelado. Crédito de 90% adicionado.');
      fetchAgendamentos();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao cancelar.');
    } finally { setCancellingId(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meus Agendamentos</h1>
        <p className="text-sm text-gray-500">Consulte e gerencie seus agendamentos</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field py-1.5 text-sm w-auto">
            <option value="">Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        {loading ? (
          <TableSkeleton rows={5} />
        ) : agendamentos.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhum agendamento" description="Você não tem agendamentos no momento." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="p-4 font-medium">Serviço</th>
                  <th className="p-4 font-medium">Profissional</th>
                  <th className="p-4 font-medium">Data</th>
                  <th className="p-4 font-medium">Horário</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.map((ag) => (
                  <tr key={ag.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{ag.servico.nome}</td>
                    <td className="p-4 text-gray-600">{ag.profissional.nome}</td>
                    <td className="p-4 text-gray-600">{format(parseISO(ag.dataHora), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td className="p-4 text-gray-600">{format(parseISO(ag.dataHora), "HH:mm")}</td>
                    <td className="p-4"><StatusBadge status={ag.status} /></td>
                    <td className="p-4">
                      {(ag.status === 'PENDENTE' || ag.status === 'CONFIRMADO') && (
                        <button
                          onClick={() => handleCancelar(ag.id)}
                          disabled={cancellingId === ag.id}
                          className="text-red-600 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                        >
                          <XCircle size={12} />
                          {cancellingId === ag.id ? 'Cancelando...' : 'Cancelar'}
                        </button>
                      )}
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
    </div>
  );
}
