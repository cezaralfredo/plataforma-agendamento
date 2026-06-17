import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Phone, Mail, CreditCard, CalendarDays, ChevronDown, ChevronUp, UserCircle, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useClientes, useClienteDetalhes } from '../../hooks/useClientes';
import StatusBadge from '../../components/ui/StatusBadge';
import ClienteFormModal from '../../components/clientes/ClienteFormModal';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ClientesPage() {
  const { isSuperAdmin, isProfissional } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<{
    id: string;
    nome: string;
    telefone: string;
    email?: string;
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const { clientes, loading, refetch } = useClientes(searchTerm);
  const { agendamentos, creditos, loading: detailLoading } = useClienteDetalhes(expandedId);

  if (isProfissional) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <UserCircle size={32} className="text-gray-400" />
        </div>
        <p className="text-lg font-semibold text-gray-800">Acesso restrito</p>
        <p className="text-sm text-gray-500">Apenas administradores podem gerenciar clientes.</p>
      </div>
    );
  }

  const saldoCreditos = creditos.reduce(
    (sum, c) => sum + (c.valor || 0) * (c.tipo === 'ENTRADA' ? 1 : -1),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button
          onClick={() => {
            setEditingCliente(null);
            setModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Search Bar */}
      <div className="card">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Client List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : clientes.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="Nenhum cliente encontrado"
          description={
            searchTerm
              ? 'Nenhum resultado para a busca.'
              : 'Nenhum cliente cadastrado.'
          }
          action={
            !searchTerm
              ? { label: 'Novo Cliente', onClick: () => { setEditingCliente(null); setModalOpen(true); } }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {clientes.map((cliente) => {
            const isExpanded = expandedId === cliente.id;
            const totalAgend = (cliente as any).totalAgendamentos ?? 0;

            return (
              <div key={cliente.id} className="card overflow-hidden">
                {/* Card Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : cliente.id)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-gray-50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex-shrink-0 rounded-full bg-gray-100 p-3">
                      <UserCircle size={28} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-800">{cliente.nome}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {formatPhone(cliente.telefone || '')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {cliente.email || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <div className="hidden text-right sm:block">
                      <p className="flex items-center justify-end gap-1 text-sm font-semibold text-gray-800">
                        <CreditCard size={14} className="text-primary-600" />
                        {formatCurrency(cliente.saldoCredito ?? 0)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {totalAgend} agendamento{totalAgend !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCliente({
                          id: cliente.id,
                          nome: cliente.nome,
                          telefone: cliente.telefone || '',
                          email: cliente.email || undefined,
                        });
                        setModalOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                      title="Editar cliente"
                    >
                      <Edit2 size={16} />
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Mobile summary */}
                <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-xs text-gray-500 sm:hidden">
                  <span className="flex items-center gap-1 font-medium text-gray-700">
                    <CreditCard size={12} className="text-primary-600" />
                    {formatCurrency(cliente.saldoCredito ?? 0)}
                  </span>
                  <span>
                    {totalAgend} agendamento{totalAgend !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-l-4 border-l-primary-600 border-t-2 border-t-gray-100 bg-gray-50">
                    {detailLoading ? (
                      <div className="space-y-4 p-6">
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 w-1/3 rounded bg-gray-200" />
                          <div className="h-9 w-full rounded bg-gray-200" />
                          <div className="h-9 w-full rounded bg-gray-200" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2">
                        {/* Histórico de Agendamentos */}
                        <section>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <CalendarDays size={16} className="text-primary-600" />
                            Histórico de Agendamentos
                          </h4>
                          {agendamentos.length === 0 ? (
                            <p className="text-sm text-gray-500">Nenhum agendamento encontrado.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                                    <th className="whitespace-nowrap pb-2 pr-2">Data/Hora</th>
                                    <th className="whitespace-nowrap pb-2 pr-2">Serviço</th>
                                    <th className="whitespace-nowrap pb-2 pr-2">Profissional</th>
                                    <th className="whitespace-nowrap pb-2 pr-2">Status</th>
                                    <th className="whitespace-nowrap pb-2 text-right">Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {agendamentos.slice(0, 5).map((ag) => (
                                    <tr key={ag.id} className="border-b border-gray-100 last:border-0">
                                      <td className="whitespace-nowrap py-2 pr-2 text-gray-600">
                                        {format(parseISO(ag.data), "dd/MM")} às {ag.hora?.slice(0, 5)}
                                      </td>
                                      <td className="whitespace-nowrap py-2 pr-2 font-medium text-gray-800">
                                        {ag.servico?.nome || '—'}
                                      </td>
                                      <td className="whitespace-nowrap py-2 pr-2 text-gray-600">
                                        {ag.profissional?.nome || '—'}
                                      </td>
                                      <td className="whitespace-nowrap py-2 pr-2">
                                        <StatusBadge status={ag.status} />
                                      </td>
                                      <td className="whitespace-nowrap py-2 text-right font-medium text-gray-800">
                                        {formatCurrency(ag.valor || 0)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>

                        {/* Histórico de Créditos */}
                        <section>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <CreditCard size={16} className="text-primary-600" />
                            Histórico de Créditos
                          </h4>
                          <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                            <span className="text-sm font-medium text-gray-600">Saldo total</span>
                            <span
                              className={`text-sm font-bold ${
                                saldoCreditos >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {formatCurrency(saldoCreditos)}
                            </span>
                          </div>
                          {creditos.length === 0 ? (
                            <p className="text-sm text-gray-500">Nenhum crédito encontrado.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                                    <th className="whitespace-nowrap pb-2 pr-2">Data</th>
                                    <th className="whitespace-nowrap pb-2 pr-2">Descrição</th>
                                    <th className="whitespace-nowrap pb-2 text-right">Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {creditos.slice(0, 5).map((cred) => {
                                    const isEntrada = cred.tipo === 'ENTRADA';
                                    return (
                                      <tr key={cred.id} className="border-b border-gray-100 last:border-0">
                                        <td className="whitespace-nowrap py-2 pr-2 text-gray-600">
                                          {format(parseISO(cred.criadoEm), "dd/MM/yyyy")}
                                        </td>
                                        <td className="py-2 pr-2 text-gray-700">{cred.descricao || '—'}</td>
                                        <td
                                          className={`whitespace-nowrap py-2 text-right font-medium ${
                                            isEntrada ? 'text-green-600' : 'text-red-600'
                                          }`}
                                        >
                                          {isEntrada ? '+' : '-'}
                                          {formatCurrency(cred.valor || 0)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </section>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <ClienteFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          refetch();
          if (expandedId) {
            setExpandedId(null);
            setTimeout(() => setExpandedId(expandedId), 0);
          }
          setModalOpen(false);
        }}
        cliente={editingCliente}
      />
    </div>
  );
}
