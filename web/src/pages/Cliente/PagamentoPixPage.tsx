import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Copy, CheckCircle, AlertCircle, Clock, ArrowLeft, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface ServicoAgendamento {
  servico: { nome: string; valor: number };
}

interface Profissional {
  nome: string;
}

interface Pagamento {
  id: string;
  status: string;
  valor: number;
  qrCode: string | null;
  copiaECola: string | null;
  expiradoEm: string | null;
  pagoEm: string | null;
}

interface Agendamento {
  id: string;
  dataHora: string;
  status: string;
  valorPago: number;
  profissional: Profissional;
  servicosAgendamento: ServicoAgendamento[];
  pagamento: Pagamento | null;
}

export default function PagamentoPixPage() {
  const { slug, agendamentoId } = useParams<{ slug: string; agendamentoId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [pagamento, setPagamento] = useState<Pagamento | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [expirado, setExpirado] = useState(false);

  const gerarPix = useCallback(async () => {
    if (!agendamentoId) return;
    setGerando(true);
    try {
      const res = await api.post(`/cliente-portal/agendamentos/${agendamentoId}/gerar-pix`);
      setPagamento(res.data.pagamento);
    } catch (err: any) {
      if (err?.response?.status === 400) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Erro ao gerar PIX.');
      }
    } finally {
      setGerando(false);
    }
  }, [agendamentoId]);

  const carregarStatus = useCallback(async () => {
    if (!agendamentoId) return;
    try {
      const res = await api.get(`/cliente-portal/pagamentos/${agendamentoId}`);
      setAgendamento(res.data.agendamento);
      if (res.data.pagamento) {
        setPagamento(res.data.pagamento);
        if (res.data.pagamento.status === 'EXPIRADO') {
          setExpirado(true);
        }
      }
    } catch {
      // ignora erro no polling
    }
  }, [agendamentoId]);

  useEffect(() => {
    carregarStatus().finally(() => setLoading(false));
  }, [carregarStatus]);

  useEffect(() => {
    if (pagamento?.status === 'AGUARDANDO' && !pagamento.qrCode) {
      gerarPix();
    }
  }, [pagamento, gerarPix]);

  useEffect(() => {
    if (pagamento?.status !== 'AGUARDANDO' && pagamento?.status !== 'PENDENTE') return;
    const interval = setInterval(carregarStatus, 5000);
    return () => clearInterval(interval);
  }, [pagamento?.status, carregarStatus]);

  const copiarChave = () => {
    if (pagamento?.copiaECola) {
      navigator.clipboard.writeText(pagamento.copiaECola);
      setCopiado(true);
      toast.success('Chave PIX copiada!');
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-500 mt-4">Carregando...</p>
      </div>
    );
  }

  if (!agendamento) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Agendamento não encontrado</h2>
        <button onClick={() => navigate(`/cliente/${slug}/agendamentos`)} className="btn-primary mt-4">
          Meus Agendamentos
        </button>
      </div>
    );
  }

  if (agendamento.status === 'CONFIRMADO' || pagamento?.status === 'PAGO') {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Pagamento Confirmado!</h2>
        <p className="text-gray-500 mb-6">
          Seu agendamento foi confirmado com sucesso.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-left mb-6 text-sm">
          <p className="text-gray-600"><strong>Profissional:</strong> {agendamento.profissional.nome}</p>
          <p className="text-gray-600">
            <strong>Data:</strong>{' '}
            {new Date(agendamento.dataHora).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
          <p className="text-gray-600">
            <strong>Horário:</strong>{' '}
            {new Date(agendamento.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-gray-600"><strong>Valor pago:</strong> R$ {agendamento.valorPago.toFixed(2)}</p>
        </div>
        <button onClick={() => navigate(`/cliente/${slug}/agendamentos`)} className="btn-primary">
          Meus Agendamentos
        </button>
      </div>
    );
  }

  if (expirado) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <Clock size={48} className="mx-auto mb-4 text-orange-400" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">PIX Expirado</h2>
        <p className="text-gray-500 mb-2">O tempo para pagamento expirou.</p>
        <p className="text-gray-500 mb-6">Seu agendamento continua pendente. Gere um novo PIX para pagar.</p>
        <button onClick={gerarPix} disabled={gerando} className="btn-primary">
          {gerando ? 'Gerando...' : 'Gerar Novo PIX'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-6">
      <button
        onClick={() => navigate(`/cliente/${slug}/agendamentos`)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="text-center mb-6">
        <CreditCard size={40} className="mx-auto mb-2 text-primary-600" />
        <h1 className="text-xl font-bold text-gray-800">Pagamento via PIX</h1>
        <p className="text-gray-500 text-sm mt-1">Escaneie o QR Code ou copie a chave PIX para pagar</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <div className="flex justify-center mb-4">
          {pagamento?.qrCode ? (
            <img
              src={`data:image/png;base64,${pagamento.qrCode}`}
              alt="QR Code PIX"
              className="w-64 h-64"
            />
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              {gerando ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              ) : (
                <button onClick={gerarPix} className="btn-primary">
                  Gerar PIX
                </button>
              )}
            </div>
          )}
        </div>

        {pagamento?.copiaECola && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">Chave PIX (copia e cola)</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={pagamento.copiaECola}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
              />
              <button
                onClick={copiarChave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1 text-sm"
              >
                {copiado ? <CheckCircle size={16} /> : <Copy size={16} />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {!pagamento?.qrCode && !gerando && (
          <div className="text-center mt-4">
            <button onClick={gerarPix} className="btn-primary">
              Gerar PIX
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-3">Resumo do Agendamento</h3>
        <div className="space-y-2 text-sm">
          <p className="text-gray-600">
            <strong>Profissional:</strong> {agendamento.profissional.nome}
          </p>
          <p className="text-gray-600">
            <strong>Data:</strong>{' '}
            {new Date(agendamento.dataHora).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
          <p className="text-gray-600">
            <strong>Horário:</strong>{' '}
            {new Date(agendamento.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div>
            <strong className="text-gray-600">Serviços:</strong>
            {agendamento.servicosAgendamento.map((sa, i) => (
              <p key={i} className="text-gray-500 ml-2">
                {sa.servico.nome} - R$ {sa.servico.valor.toFixed(2)}
              </p>
            ))}
          </div>
          <hr className="my-2" />
          <p className="text-lg font-bold text-gray-800">
            Total: R$ {agendamento.valorPago.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Clock size={12} /> O PIX expira em 15 minutos
          </p>
        </div>
      </div>
    </div>
  );
}
