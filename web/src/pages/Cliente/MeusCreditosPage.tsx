import { useState, useEffect } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { useClientAuth } from '../../contexts/Cliente/ClientAuthContext';

interface Credito {
  id: string;
  tipo: string;
  valor: number;
  descricao: string;
  criadoEm: string;
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MeusCreditosPage() {
  const { sessao, updateCliente } = useClientAuth();
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saldo, setSaldo] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get('/cliente-portal/creditos', { params: { page, limit: 15 } })
      .then(res => {
        setCreditos(res.data.creditos);
        setSaldo(res.data.saldoCredito);
        setTotalPages(res.data.totalPages);
        updateCliente({ saldoCredito: res.data.saldoCredito });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meus Créditos</h1>
        <p className="text-sm text-gray-500">Histórico de movimentação de créditos</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Wallet size={28} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Saldo Disponível</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(saldo)}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : creditos.length === 0 ? (
          <EmptyState icon={Wallet} title="Nenhuma movimentação" description="Você ainda não tem créditos." />
        ) : (
          <div className="space-y-2">
            {creditos.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  {c.tipo === 'ENTRADA' ? (
                    <ArrowDownCircle size={18} className="text-green-500 shrink-0" />
                  ) : (
                    <ArrowUpCircle size={18} className="text-red-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{c.descricao}</p>
                    <p className="text-xs text-gray-400">{format(parseISO(c.criadoEm), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                </div>
                <span className={`font-medium ml-4 shrink-0 ${c.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                  {c.tipo === 'ENTRADA' ? '+' : '-'}{formatCurrency(c.valor)}
                </span>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
