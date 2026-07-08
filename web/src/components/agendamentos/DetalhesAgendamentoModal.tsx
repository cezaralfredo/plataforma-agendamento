import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, User, Scissors, Calendar, DollarSign, CreditCard, Ban, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal, StatusBadge } from '../ui';
import api from '../../services/api';

interface ServicoDetalhado {
  id: string;
  nome: string;
  valor: number;
  duracaoMinutos?: number;
  categoria?: string;
}

interface PagamentoDetalhado {
  id: string;
  valor: number;
  forma?: string;
  status: string;
  txid?: string;
}

interface AgendamentoDetalhado {
  id: string;
  codigo: string;
  cliente: { id: string; nome: string; telefone?: string; email?: string };
  profissional: { id: string; nome: string };
  servico: ServicoDetalhado;
  servicosAgendamento: { servico: ServicoDetalhado }[];
  pagamento?: PagamentoDetalhado;
  data: string;
  hora: string;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CONCLUIDO' | 'CANCELADO';
  valor: number;
}

interface DetalhesAgendamentoModalProps {
  open: boolean;
  onClose: () => void;
  agendamentoId?: string | null;
}

export default function DetalhesAgendamentoModal({ open, onClose, agendamentoId }: DetalhesAgendamentoModalProps) {
  const [agendamento, setAgendamento] = useState<AgendamentoDetalhado | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: string;
    title: string;
    message: string;
  } | null>(null);

  const fetchDetalhes = useCallback(async () => {
    if (!agendamentoId) return;
    setLoading(true);
    try {
      const res = await api.get<AgendamentoDetalhado>(`/agendamentos/${agendamentoId}`);
      setAgendamento(res.data);
    } catch {
      setAgendamento(null);
    } finally {
      setLoading(false);
    }
  }, [agendamentoId]);

  useEffect(() => {
    if (open && agendamentoId) {
      fetchDetalhes();
    } else if (!open) {
      setAgendamento(null);
      setConfirmAction(null);
    }
  }, [open, agendamentoId, fetchDetalhes]);

  const handleAction = async () => {
    if (!confirmAction || !agendamento) return;

    setActionLoading(confirmAction.type);
    try {
      await api.post(`/agendamentos/${agendamento.id}/${confirmAction.type}`);
      const actionLabel =
        confirmAction.type === 'confirmar' ? 'confirmado' :
        confirmAction.type === 'concluir' ? 'concluído' : 'cancelado';
      toast.success(`Agendamento ${actionLabel} com sucesso!`);
      setConfirmAction(null);
      fetchDetalhes();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `Erro ao ${confirmAction.type} agendamento.`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const actions = [];
  if (agendamento?.status === 'PENDENTE') {
    actions.push(
      { type: 'confirmar', label: 'Confirmar', icon: CheckCircle, className: 'bg-green-600 hover:bg-green-700 text-white' },
      { type: 'cancelar', label: 'Cancelar', icon: Ban, className: 'bg-red-600 hover:bg-red-700 text-white' },
    );
  } else if (agendamento?.status === 'CONFIRMADO') {
    actions.push(
      { type: 'concluir', label: 'Concluir', icon: CheckCircle, className: 'bg-blue-600 hover:bg-blue-700 text-white' },
      { type: 'cancelar', label: 'Cancelar', icon: Ban, className: 'bg-red-600 hover:bg-red-700 text-white' },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Detalhes do Agendamento" size="md">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={32} className="animate-spin text-primary-600" />
        </div>
      ) : !agendamento ? (
        <div className="text-center py-8 text-gray-500">
          <XCircle size={40} className="mx-auto mb-2 text-gray-300" />
          <p>Agendamento não encontrado.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Código</p>
              <p className="text-lg font-bold text-gray-900 font-mono">{agendamento.codigo}</p>
            </div>
            <StatusBadge status={agendamento.status} />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <User size={14} />
              Cliente
            </h4>
            <p className="text-sm font-medium text-gray-800">{agendamento.cliente?.nome}</p>
            {agendamento.cliente?.telefone && (
              <p className="text-sm text-gray-500">{agendamento.cliente.telefone}</p>
            )}
            {agendamento.cliente?.email && (
              <p className="text-sm text-gray-500">{agendamento.cliente.email}</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <User size={14} />
              Profissional
            </h4>
            <p className="text-sm font-medium text-gray-800">{agendamento.profissional?.nome}</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Scissors size={14} />
              Serviço
            </h4>
            {agendamento.servicosAgendamento?.length > 0 ? (
              <div className="space-y-2">
                {agendamento.servicosAgendamento.map((sa, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-medium text-gray-800">{sa.servico.nome}</p>
                    <div className="flex gap-4 text-gray-500">
                      <span>Categoria: {sa.servico.categoria === 'SALAO' ? 'Salão' : sa.servico.categoria === 'BARBEARIA' ? 'Barbearia' : sa.servico.categoria}</span>
                      {sa.servico.duracaoMinutos && <span>Duração: {sa.servico.duracaoMinutos} min</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-gray-800">{agendamento.servico?.nome}</p>
            )}
            <p className="text-sm font-semibold text-gray-800 mt-1">
              Valor: {formatCurrency(agendamento.valor)}
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Calendar size={14} />
              Data / Hora
            </h4>
            <p className="text-sm font-medium text-gray-800">
              {formatDate(agendamento.data)} às {agendamento.hora}
            </p>
          </div>

          {agendamento.pagamento && (
            <div className="border-t border-gray-100 pt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <DollarSign size={14} />
                Pagamento
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-gray-500">Status:</span>{' '}
                  <StatusBadge status={agendamento.pagamento.status} />
                </p>
                <p>
                  <span className="text-gray-500">Valor:</span>{' '}
                  <span className="font-medium text-gray-800">{formatCurrency(agendamento.pagamento.valor)}</span>
                </p>
                {agendamento.pagamento.forma && (
                  <p className="flex items-center gap-1">
                    <CreditCard size={14} className="text-gray-400" />
                    <span className="text-gray-500">Forma:</span>{' '}
                    <span className="text-gray-700">{agendamento.pagamento.forma}</span>
                  </p>
                )}
                {agendamento.pagamento.txid && (
                  <p className="text-xs text-gray-400 font-mono">
                    TXID: {agendamento.pagamento.txid}
                  </p>
                )}
              </div>
            </div>
          )}

          {actions.length > 0 && (
            <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-2">
              {actions.map((action) => {
                const Icon = action.icon;
                const isLoading = actionLoading === action.type;
                return (
                  <button
                    key={action.type}
                    onClick={() => {
                      const actionLabel =
                        action.type === 'confirmar' ? 'confirmar' :
                        action.type === 'concluir' ? 'concluir' : 'cancelar';
                      setConfirmAction({
                        type: action.type,
                        title: `${action.label} Agendamento`,
                        message: `Tem certeza que deseja ${actionLabel} o agendamento ${agendamento.codigo}?`,
                      });
                    }}
                    disabled={!!actionLoading}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${action.className}`}
                  >
                    {isLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Icon size={14} />
                    )}
                    {isLoading ? 'Processando...' : action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{confirmAction.title}</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="btn-secondary text-sm"
                disabled={!!actionLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleAction}
                className="btn-danger text-sm flex items-center gap-2"
                disabled={!!actionLoading}
              >
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                {actionLoading ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
