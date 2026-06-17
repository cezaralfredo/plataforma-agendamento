import { useState } from 'react';
import { CalendarDays, CheckCircle, DollarSign, Users, TrendingUp, Clock, ArrowRight, Plus, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboard } from '../../hooks/useDashboard';
import { useAgendamentos, useAgendamentosHoje, useAgendamentosProximos } from '../../hooks/useAgendamentos';
import StatusBadge from '../../components/ui/StatusBadge';
import NovoAgendamentoModal from '../../components/agendamentos/NovoAgendamentoModal';
import { StatsCardSkeleton, TableSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';

const dayNames: Record<string, string> = {
  '0': 'Dom', '1': 'Seg', '2': 'Ter', '3': 'Qua',
  '4': 'Qui', '5': 'Sex', '6': 'Sáb',
};

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statsCardsConfig = [
  {
    key: 'agendamentosHoje' as const,
    label: 'Agendamentos Hoje',
    icon: CalendarDays,
    borderColor: 'border-l-blue-500',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    suffix: 'hoje',
  },
  {
    key: 'agendamentosConfirmados' as const,
    label: 'Agendamentos Confirmados',
    icon: CheckCircle,
    borderColor: 'border-l-green-500',
    iconColor: 'text-green-600',
    iconBg: 'bg-green-50',
    suffix: 'confirmados',
  },
  {
    key: 'faturamentoHoje' as const,
    label: 'Faturamento Hoje',
    icon: DollarSign,
    borderColor: 'border-l-emerald-500',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    isCurrency: true,
  },
  {
    key: 'clientesTotal' as const,
    label: 'Clientes Totais',
    icon: Users,
    borderColor: 'border-l-purple-500',
    iconColor: 'text-purple-600',
    iconBg: 'bg-purple-50',
    suffix: 'cadastrados',
  },
];

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);

  const { resumo, loading: resumoLoading, error: resumoError, refetch: refetchResumo } = useDashboard();
  const { agendamentos: agendamentosHoje, loading: hojeLoading } = useAgendamentosHoje();
  const { agendamentos: proximos, loading: proximosLoading } = useAgendamentosProximos(8);
  const { refetch: refetchAgendamentos } = useAgendamentos();

  const handleSuccess = () => {
    refetchResumo();
    refetchAgendamentos();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Agendamento
        </button>
      </div>

      {resumoError && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {resumoError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {resumoLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
          : statsCardsConfig.map((card) => {
              const rawValue = resumo[card.key];
              const displayValue = card.isCurrency
                ? formatCurrency(rawValue as number)
                : rawValue;

              return (
                <div
                  key={card.key}
                  className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 border-l-4 ${card.borderColor} relative overflow-hidden`}
                >
                  <div className="flex items-start justify-between">
                    <div className="z-10">
                      <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {displayValue}
                      </p>
                      {card.suffix && (
                        <p className="text-xs text-gray-400 mt-1">{card.suffix}</p>
                      )}
                    </div>
                    <div className={`${card.iconBg} p-3 rounded-xl`}>
                      <card.icon size={24} className={card.iconColor} />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={20} className="text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-800">Faturamento Semanal</h3>
          </div>
          <div className="h-72">
            {resumo.faturamentoSemanal.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resumo.faturamentoSemanal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="dia"
                    tickFormatter={(val) => dayNames[val] || val}
                    stroke="#9ca3af"
                  />
                  <YAxis stroke="#9ca3af" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="valor" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Nenhum dado de faturamento disponível
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock size={20} className="text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-800">Agendamentos Hoje</h3>
          </div>
          {hojeLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : agendamentosHoje.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum agendamento hoje"
              description="Não há agendamentos para o dia de hoje."
            />
          ) : (
            <div className="space-y-3">
              {agendamentosHoje.slice(0, 6).map((ag) => (
                <div
                  key={ag.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-primary-600 shrink-0">{ag.hora}</span>
                      <span className="text-sm font-medium text-gray-800 truncate">{ag.cliente.nome}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {ag.servico.nome} &middot; {ag.profissional.nome}
                    </p>
                  </div>
                  <StatusBadge status={ag.status} />
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => window.location.href = '/agendamentos'}
            className="mt-4 w-full flex items-center justify-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium py-2 border-t border-gray-100 transition-colors"
          >
            Ver todos
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays size={20} className="text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-800">Próximos Agendamentos</h3>
        </div>
        {proximosLoading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : proximos.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhum agendamento próximo"
            description="Não há agendamentos futuros cadastrados."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Código</th>
                  <th className="pb-3 pr-4 font-medium">Cliente</th>
                  <th className="pb-3 pr-4 font-medium">Serviço</th>
                  <th className="pb-3 pr-4 font-medium">Profissional</th>
                  <th className="pb-3 pr-4 font-medium">Data/Hora</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {proximos.map((ag) => (
                  <tr key={ag.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 text-gray-800 font-medium">{ag.codigo}</td>
                    <td className="py-3 pr-4 text-gray-800">{ag.cliente.nome}</td>
                    <td className="py-3 pr-4 text-gray-800">{ag.servico.nome}</td>
                    <td className="py-3 pr-4 text-gray-600">{ag.profissional.nome}</td>
                    <td className="py-3 pr-4 text-gray-600">
                      {format(parseISO(ag.data), "dd/MM/yyyy", { locale: ptBR })} às {ag.hora}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={ag.status} />
                    </td>
                    <td className="py-3 text-gray-800 font-medium">{formatCurrency(ag.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NovoAgendamentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
