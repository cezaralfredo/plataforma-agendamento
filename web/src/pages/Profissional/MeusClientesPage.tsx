import { useState, useEffect } from 'react';
import { Users, Phone, Mail, Calendar, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import toast from 'react-hot-toast';

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  totalAgendamentos: number;
  ultimoAgendamento: {
    dataHora: string;
    status: string;
    servico: { nome: string } | null;
  } | null;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function MeusClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/profissional/clientes');
      setClientes(res.data);
    } catch {
      toast.error('Erro ao carregar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const filtered = clientes.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.telefone && c.telefone.includes(search))
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meus Clientes</h1>
        <p className="text-sm text-gray-500">
          {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} atendido{clientes.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-1.5 text-sm"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente atendido'}
            description={search ? 'Tente alterar a busca.' : 'Você ainda não atendeu nenhum cliente.'}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((cliente) => (
              <div key={cliente.id}>
                <button
                  onClick={() => setExpandedId(expandedId === cliente.id ? null : cliente.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="rounded-full bg-primary-50 p-2.5 flex-shrink-0">
                      <Users size={20} className="text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{cliente.nome}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                        {cliente.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} />
                            {formatPhone(cliente.telefone)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {cliente.totalAgendamentos} agendamento{cliente.totalAgendamentos !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {cliente.ultimoAgendamento && (
                      <span className="hidden sm:inline text-xs text-gray-400">
                        {format(parseISO(cliente.ultimoAgendamento.dataHora), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                    {expandedId === cliente.id ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedId === cliente.id && (
                  <div className="bg-gray-50 border-l-4 border-l-primary-600 px-4 py-4 sm:px-6 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {cliente.telefone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} className="text-gray-400" />
                          {formatPhone(cliente.telefone)}
                        </div>
                      )}
                      {cliente.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} className="text-gray-400" />
                          {cliente.email}
                        </div>
                      )}
                    </div>

                    {cliente.ultimoAgendamento ? (
                      <div className="bg-white rounded-lg border border-gray-200 p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Último agendamento</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-gray-800 font-medium">
                              {cliente.ultimoAgendamento.servico?.nome || '—'}
                            </span>
                            <span className="text-gray-500 ml-2">
                              {format(parseISO(cliente.ultimoAgendamento.dataHora), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <StatusBadge status={cliente.ultimoAgendamento.status} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Nenhum agendamento concluído.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
