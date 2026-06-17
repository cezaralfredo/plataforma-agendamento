import { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, Calendar, BarChart3, Loader2, ArrowUp, ArrowDown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Faturamento {
  hoje: number;
  semana: number;
  mes: number;
  dados: { label: string; valor: number }[];
  pagamentosRecentes: {
    id: string;
    codigo: string;
    cliente: string;
    servico: string;
    valor: number;
    data: string;
    metodo: string;
  }[];
}

type Periodo = 'daily' | 'weekly' | 'monthly' | 'annual';

const periodos: { value: Periodo; label: string }[] = [
  { value: 'daily', label: 'Hoje' },
  { value: 'weekly', label: '7 Dias' },
  { value: 'monthly', label: '30 Dias' },
  { value: 'annual', label: 'Anual' },
];

const metodoLabel: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão Crédito',
  CARTAO_DEBITO: 'Cartão Débito',
  PIX: 'Pix',
  CREDITO: 'Crédito Interno',
};

export default function FinanceiroPage() {
  const { isSuperAdmin } = useAuth();
  const [faturamento, setFaturamento] = useState<Faturamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('weekly');

  useEffect(() => {
    const fetchFaturamento = async () => {
      setLoading(true);
      try {
        const res = await api.get('/dashboard/faturamento', { params: { periodo } });
        setFaturamento(res.data);
      } catch (err) {
        toast.error('Erro ao carregar dados financeiros.');
      } finally {
        setLoading(false);
      }
    };
    fetchFaturamento();
  }, [periodo]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <DollarSign size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-sm">Apenas administradores podem acessar o financeiro.</p>
      </div>
    );
  }

  const cards = [
    {
      title: 'Faturamento Hoje',
      value: faturamento?.hoje ?? 0,
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Faturamento da Semana',
      value: faturamento?.semana ?? 0,
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Faturamento do Mês',
      value: faturamento?.mes ?? 0,
      icon: BarChart3,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Financeiro</h1>
        <div className="flex gap-2">
          {periodos.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                periodo === p.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !faturamento ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-28" />
            ))}
          </div>
          <div className="card h-72" />
          <div className="card h-64" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div key={card.title} className="card flex items-center gap-4">
                <div className={`${card.bg} p-3 rounded-xl`}>
                  <card.icon size={28} className={card.color} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {formatCurrency(card.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-800">Evolução do Faturamento</h3>
            </div>
            <div className="h-72">
              {faturamento?.dados && faturamento.dados.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={faturamento.dados}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      dot={{ fill: '#7c3aed', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Nenhum dado disponível para o período
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Pagamentos Recentes</h3>
            {faturamento?.pagamentosRecentes && faturamento.pagamentosRecentes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="pb-3 font-medium">Código</th>
                      <th className="pb-3 font-medium">Cliente</th>
                      <th className="pb-3 font-medium">Serviço</th>
                      <th className="pb-3 font-medium">Valor</th>
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faturamento.pagamentosRecentes.map((pag) => (
                      <tr key={pag.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 text-gray-800 font-medium">{pag.codigo}</td>
                        <td className="py-3 text-gray-800">{pag.cliente}</td>
                        <td className="py-3 text-gray-600">{pag.servico}</td>
                        <td className="py-3 text-gray-800 font-medium">
                          {formatCurrency(pag.valor)}
                        </td>
                        <td className="py-3 text-gray-500">{formatDate(pag.data)}</td>
                        <td className="py-3">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {metodoLabel[pag.metodo] || pag.metodo}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Nenhum pagamento recente encontrado
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
