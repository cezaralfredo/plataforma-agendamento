import { CalendarDays, CheckCircle, Users, DollarSign, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfissionalDashboard } from '../../hooks/useProfissionalDashboard';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatsCardSkeleton, TableSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ProfissionalDashboardPage() {
  const { usuario } = useAuth();
  const { resumo, loading, error, refetch } = useProfissionalDashboard();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <StatsCardSkeleton key={i} />)}
        </div>
        <TableSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
    );
  }

  const statsCards = [
    { label: 'Agendamentos Hoje', value: resumo.agendamentosHoje, icon: CalendarDays, color: 'border-l-blue-500', iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
    { label: 'Confirmados', value: resumo.agendamentosConfirmados, icon: CheckCircle, color: 'border-l-green-500', iconColor: 'text-green-600', iconBg: 'bg-green-50' },
    { label: 'Clientes Atendidos', value: resumo.clientesAtendidos, icon: Users, color: 'border-l-purple-500', iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
    { label: 'Faturamento Hoje', value: formatCurrency(resumo.faturamentoHoje), icon: DollarSign, color: 'border-l-emerald-500', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Meu Painel</h1>
          <p className="text-sm text-gray-500">Bem-vindo, {usuario?.nome?.split(' ')[0]}</p>
        </div>
        <button onClick={refetch} className="btn-secondary flex items-center gap-2 text-sm">
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card) => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 ${card.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
              </div>
              <div className={`${card.iconBg} p-2.5 rounded-lg`}>
                <card.icon size={20} className={card.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-800">Próximos Agendamentos</h3>
        </div>
        {resumo.proximosAgendamentos.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nenhum agendamento próximo" description="Você não tem agendamentos futuros no momento." />
        ) : (
          <div className="space-y-3">
            {resumo.proximosAgendamentos.map((ag) => (
              <div key={ag.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                    <Users size={16} className="text-primary-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{ag.cliente.nome}</p>
                    <p className="text-xs text-gray-500">{ag.servicosAgendamento?.map(sa => sa.servico.nome).join(', ') || ag.servico.nome}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-semibold text-gray-800">
                    {format(parseISO(ag.dataHora), "HH:mm")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(ag.valorPago ?? ag.servicosAgendamento?.reduce((s: number, sa) => s + (sa.servico?.valor || 0), 0) ?? ag.servico?.valor ?? 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
