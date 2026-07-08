import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scissors, Users, Clock, CheckCircle, Loader2, ArrowLeft, Check, CreditCard } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';

interface Servico { id: number; nome: string; valor: number; duracaoMinutos: number }
interface Profissional { id: string; nome: string; especialidades: string[]; diasTrabalho: number[] }

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function NovoAgendamentoPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(true);

  const [servicoIds, setServicoIds] = useState<number[]>([]);
  const [profissionalId, setProfissionalId] = useState<string | null>(null);
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!slug) return;
    api.get('/cliente-portal/servicos', { params: { slug } })
      .then(res => setServicos(res.data))
      .catch(() => toast.error('Erro ao carregar serviços.'))
      .finally(() => setLoadingServicos(false));
  }, [slug]);

  useEffect(() => {
    if (!slug || servicoIds.length === 0) return;
    api.get('/cliente-portal/profissionais', { params: { slug, servicoIds: servicoIds.join(',') } })
      .then(res => setProfissionais(res.data))
      .catch(() => {});
  }, [servicoIds, slug]);

  const servicoIdsStr = useMemo(() => servicoIds.join(','), [servicoIds]);

  useEffect(() => {
    if (!slug || !profissionalId || servicoIds.length === 0 || !data) { setHorarios([]); return; }
    api.get('/cliente-portal/horarios', { params: { slug, profissionalId, servicoIds: servicoIdsStr, data } })
      .then(res => setHorarios(res.data.horariosDisponiveis || []))
      .catch(() => {});
  }, [slug, profissionalId, servicoIdsStr, data]);

  const servicosSelecionados = servicos.filter(s => servicoIds.includes(s.id));
  const profissionalSelecionado = profissionais.find(p => p.id === profissionalId);

  const duracaoTotal = useMemo(
    () => servicosSelecionados.reduce((sum, s) => sum + s.duracaoMinutos, 0),
    [servicosSelecionados]
  );
  const valorTotal = useMemo(
    () => servicosSelecionados.reduce((sum, s) => sum + s.valor, 0),
    [servicosSelecionados]
  );

  const toggleServico = (id: number) => {
    setServicoIds(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const handleConfirmar = async () => {
    if (servicoIds.length === 0 || !profissionalId || !data || !horario) return;
    setSubmitting(true);
    try {
      const dataHora = `${data}T${horario}:00`;
      const res = await api.post('/cliente-portal/agendamentos', {
        servicoIds,
        profissionalId,
        dataHora,
      });
      const agendamento = res.data;
      toast.success('Agendamento criado!');
      navigate(`/cliente/${slug}/pagamento/${agendamento.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao agendar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Agendamento Confirmado!</h2>
        <div className="text-gray-500 mb-2">
          {servicosSelecionados.map(s => (
            <p key={s.id}>{s.nome}</p>
          ))}
        </div>
        <p className="text-gray-500 mb-6">
          com {profissionalSelecionado?.nome} em {format(parseISO(`${data}T${horario}:00`), "dd/MM/yyyy 'às' HH:mm")}
        </p>
        <button onClick={() => { setSuccess(false); setStep(1); setServicoIds([]); setProfissionalId(null); setData(''); setHorario(''); }} className="btn-primary">
          Novo Agendamento
        </button>
      </div>
    );
  }

  const totalSteps = 4;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Novo Agendamento</h1>
        <p className="text-sm text-gray-500">Passo {step} de {totalSteps}</p>
      </div>

      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-primary-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Scissors size={20} className="text-primary-600" />
              Escolha os Serviços
            </h2>
            {servicoIds.length > 0 && (
              <p className="text-sm text-primary-600 font-medium mb-2">
                {servicoIds.length} selecionado{servicoIds.length !== 1 ? 's' : ''} • {formatCurrency(valorTotal)} • {duracaoTotal}min
              </p>
            )}
            {loadingServicos ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
            ) : (
              servicos.map(s => {
                const selected = servicoIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleServico(s.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors flex items-center gap-3 ${
                      selected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                    }`}>
                      {selected && <Check size={14} className="text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800">{s.nome}</p>
                      <p className="text-sm text-gray-500">{s.duracaoMinutos}min • {formatCurrency(s.valor)}</p>
                    </div>
                  </button>
                );
              })
            )}
            {servicoIds.length > 0 && (
              <button
                onClick={() => setStep(2)}
                className="btn-primary w-full mt-2"
              >
                Continuar ({servicoIds.length} serviço{servicoIds.length !== 1 ? 's' : ''})
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
              <ArrowLeft size={14} /> Voltar
            </button>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Users size={20} className="text-primary-600" />
              Escolha o Profissional
            </h2>
            {profissionais.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum profissional disponível.</p>
            ) : (
              profissionais.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setProfissionalId(p.id); setStep(3); }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    profissionalId === p.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-gray-800">{p.nome}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.isArray(p.especialidades) && p.especialidades.slice(0, 3).map(esp => (
                      <span key={esp} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{esp}</span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
              <ArrowLeft size={14} /> Voltar
            </button>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Clock size={20} className="text-primary-600" />
              Escolha a Data
            </h2>
            <input
              type="date"
              value={data}
              onChange={e => { setData(e.target.value); setHorario(''); setStep(4); }}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="input-field"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <button onClick={() => setStep(3)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
              <ArrowLeft size={14} /> Voltar
            </button>
            <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Clock size={20} className="text-primary-600" />
              Escolha o Horário
            </h2>
            {horarios.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum horário disponível nesta data.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {horarios.map(h => (
                  <button
                    key={h}
                    onClick={() => setHorario(h)}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      horario === h ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}

            {horario && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Serviços</p>
                  {servicosSelecionados.map(s => (
                    <p key={s.id} className="text-sm text-gray-700">• {s.nome} ({formatCurrency(s.valor)})</p>
                  ))}
                  <p className="text-sm text-gray-800 font-medium mt-1">Total: {formatCurrency(valorTotal)} • {duracaoTotal}min</p>
                </div>
                <p className="text-sm text-gray-600">
                  <strong>Profissional:</strong> {profissionalSelecionado?.nome}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Data:</strong> {format(parseISO(data), "dd/MM/yyyy")}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Horário:</strong> {horario}
                </p>
                <button
                  onClick={handleConfirmar}
                  className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? 'Confirmando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
