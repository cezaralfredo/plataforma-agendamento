import { useState, useEffect, useCallback } from 'react';
import { Building2, Users, CalendarDays, DollarSign, CreditCard, TrendingUp, Activity, Zap, Loader2, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#7c3aed', '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

export default function AdminDashboardPage() {
  const { isPlatformAdmin } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (err: any) {
      setError('Erro ao carregar dados do dashboard');
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!isPlatformAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-sm">Apenas super administradores podem acessar este painel.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">{error}</div>
    );
  }

  const { tenants, usuarios, clientes, agendamentos, planos, financeiro, atividadesRecentes } = data;

  const statsCards = [
    { label: 'Estabelecimentos', value: tenants.ativos, total: tenants.total, icon: Building2, color: 'border-l-blue-500', iconColor: 'text-blue-600', iconBg: 'bg-blue-50', suffix: 'ativos' },
    { label: 'Usuários', value: usuarios.total, icon: Users, color: 'border-l-purple-500', iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
    { label: 'Clientes', value: clientes.total, icon: Users, color: 'border-l-green-500', iconColor: 'text-green-600', iconBg: 'bg-green-50' },
    { label: 'Agendamentos (mês)', value: agendamentos.mes, icon: CalendarDays, color: 'border-l-orange-500', iconColor: 'text-orange-600', iconBg: 'bg-orange-50' },
    { label: 'Faturamento (mês)', value: formatCurrency(financeiro.faturamentoMes), icon: DollarSign, color: 'border-l-emerald-500', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', isCurrency: true },
    { label: 'Receita Total', value: formatCurrency(financeiro.receitaTotal), icon: TrendingUp, color: 'border-l-teal-500', iconColor: 'text-teal-600', iconBg: 'bg-teal-50', isCurrency: true },
  ];

  const pieData = planos.distribuicao
    .filter((p: any) => p.quantidade > 0)
    .map((p: any) => ({ name: p.plano, value: p.quantidade }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Painel da Plataforma</h1>
          <p className="text-sm text-gray-500">Visão geral de todos os estabelecimentos</p>
        </div>
        <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm">
          <Activity size={16} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsCards.map((card) => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 ${card.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
                {card.suffix && (
                  <p className="text-xs text-gray-400 mt-1">{card.suffix} de {card.total}</p>
                )}
              </div>
              <div className={`${card.iconBg} p-2.5 rounded-lg`}>
                <card.icon size={20} className={card.iconColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={20} className="text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-800">Atividades Recentes</h3>
          </div>
          {atividadesRecentes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhuma atividade registrada</div>
          ) : (
            <div className="space-y-3">
              {atividadesRecentes.map((atv: any) => (
                <div key={atv.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800">{atv.descricao}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {atv.tenant?.nome} &middot; {format(parseISO(atv.criadoEm), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Planos</h3>
            <div className="space-y-3">
              {planos.maisUsados.map((p: any) => (
                <div key={p.slug} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{p.nome}</span>
                  <span className="text-sm text-gray-500">{p.assinaturas} assinaturas</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribuição de Planos</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_: any, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">Sem dados</div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Faturamento</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Recebido (mês)</span>
                <span className="font-semibold text-green-600">{formatCurrency(financeiro.faturamentoMes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pendente</span>
                <span className="font-semibold text-yellow-600">{formatCurrency(financeiro.faturasPendentes ? 0 : 0)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-700 font-medium">Total recebido</span>
                <span className="font-semibold text-gray-800">{formatCurrency(financeiro.receitaTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-800">Agendamentos por Status</h3>
          </div>
        </div>
        {Object.keys(agendamentos.porStatus).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(agendamentos.porStatus).map(([status, count]: [string, any]) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                PENDENTE: { label: 'Pendentes', color: 'text-yellow-600 bg-yellow-50' },
                CONFIRMADO: { label: 'Confirmados', color: 'text-green-600 bg-green-50' },
                CANCELADO: { label: 'Cancelados', color: 'text-red-600 bg-red-50' },
                CONCLUIDO: { label: 'Concluídos', color: 'text-blue-600 bg-blue-50' },
              };
              const info = statusMap[status] || { label: status, color: 'text-gray-600 bg-gray-50' };
              return (
                <div key={status} className={`rounded-lg p-4 ${info.color}`}>
                  <p className="text-2xl font-bold">{count as number}</p>
                  <p className="text-sm">{info.label}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">Nenhum agendamento registrado</div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Faturas por Status</h3>
        </div>
        {Object.keys(financeiro.faturasPorStatus).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.entries(financeiro.faturasPorStatus).map(([status, info]: [string, any]) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                PENDENTE: { label: 'Pendentes', color: 'text-yellow-600 bg-yellow-50' },
                PAGA: { label: 'Pagas', color: 'text-green-600 bg-green-50' },
                ATRASADA: { label: 'Atrasadas', color: 'text-red-600 bg-red-50' },
                CANCELADA: { label: 'Canceladas', color: 'text-gray-600 bg-gray-50' },
                REEMBOLSADA: { label: 'Reembolsadas', color: 'text-purple-600 bg-purple-50' },
              };
              const sInfo = statusMap[status] || { label: status, color: 'text-gray-600 bg-gray-50' };
              return (
                <div key={status} className={`rounded-lg p-4 ${sInfo.color}`}>
                  <p className="text-2xl font-bold">{info.count}</p>
                  <p className="text-sm">{sInfo.label}</p>
                  <p className="text-xs mt-1">{formatCurrency(info.valor)}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">Nenhuma fatura gerada</div>
        )}
      </div>
    </div>
  );
}
