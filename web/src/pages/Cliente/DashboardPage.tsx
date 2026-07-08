import { useState, useEffect } from 'react';
import { CalendarDays, Clock, Wallet, Scissors, Loader2 } from 'lucide-react';
import { useClientAuth } from '../../contexts/Cliente/ClientAuthContext';
import api from '../../services/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface DashboardData {
  agendamentosHoje: number;
  proximosAgendamentos: Array<{
    id: string;
    dataHora: string;
    status: string;
    servico: { nome: string; valor: number };
    servicosAgendamento?: Array<{ servico: { id: number; nome: string; valor: number; duracaoMinutos: number } }>;
    profissional: { nome: string };
  }>;
  totalAgendamentos: number;
  creditosRecentes: Array<{
    id: string;
    tipo: string;
    valor: number;
    descricao: string;
    criadoEm: string;
  }>;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ClienteDashboardPage() {
  const { sessao } = useClientAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/cliente-portal/dashboard')
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-24 animate-pulse" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Agendamentos Hoje', value: data?.agendamentosHoje || 0, icon: CalendarDays, color: 'border-l-blue-500' },
    { label: 'Total de Agendamentos', value: data?.totalAgendamentos || 0, icon: Clock, color: 'border-l-purple-500' },
    { label: 'Saldo em Créditos', value: formatCurrency(sessao?.cliente.saldoCredito || 0), icon: Wallet, color: 'border-l-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Olá, {sessao?.cliente.nome?.split(' ')[0]}</h1>
        <p className="text-sm text-gray-500">Bem-vindo à sua área</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 border-l-4 ${s.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-xl font-bold text-gray-800">{s.value}</p>
              </div>
              <s.icon size={20} className="text-gray-400" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={20} className="text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-800">Próximos Agendamentos</h3>
          </div>
          <Link to="agendamentos" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Ver todos
          </Link>
        </div>
        {data?.proximosAgendamentos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Scissors size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Nenhum agendamento futuro.</p>
            <Link to="novo-agendamento" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-1 inline-block">
              Agendar agora
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
              {data?.proximosAgendamentos.map((ag) => (
              <div key={ag.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {ag.servicosAgendamento && ag.servicosAgendamento.length > 1
                      ? ag.servicosAgendamento.map(sa => sa.servico.nome).join(', ')
                      : ag.servico.nome}
                  </p>
                  <p className="text-xs text-gray-500">{ag.profissional.nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">
                    {format(parseISO(ag.dataHora), "dd/MM HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {data?.creditosRecentes && data.creditosRecentes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={20} className="text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-800">Movimentações Recentes</h3>
            </div>
            <Link to="creditos" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Ver todas
            </Link>
          </div>
          <div className="space-y-2">
            {data.creditosRecentes.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-gray-800 truncate">{c.descricao}</p>
                  <p className="text-gray-400 text-xs">{format(parseISO(c.criadoEm), "dd/MM/yyyy")}</p>
                </div>
                <span className={`font-medium ml-4 ${c.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                  {c.tipo === 'ENTRADA' ? '+' : '-'}{formatCurrency(c.valor)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
