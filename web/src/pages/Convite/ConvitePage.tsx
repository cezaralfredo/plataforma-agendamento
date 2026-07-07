import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Scissors } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [convite, setConvite] = useState<{ profissionalNome: string; tenantNome: string } | null>(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get(`/convites/${token}`)
      .then(res => {
        setConvite(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err?.response?.data?.error || 'Convite inválido ou expirado.');
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Informe seu email.'); return; }
    if (senha.length < 8) { toast.error('Senha deve ter no mínimo 8 caracteres.'); return; }
    if (senha !== confirmarSenha) { toast.error('Senhas não conferem.'); return; }

    setSubmitting(true);
    try {
      await api.post(`/convites/${token}/aceitar`, { email: email.trim(), senha });
      setSuccess(true);
      toast.success('Conta criada com sucesso!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao criar conta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <XCircle size={48} className="mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Convite Inválido</h1>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Ir para Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">Conta Criada!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Sua conta foi criada com sucesso. Faça login para acessar sua agenda.
          </p>
          <button onClick={() => navigate('/login')} className="btn-primary">
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
            <Scissors size={28} className="text-primary-600" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-center text-gray-800 mb-1">
          Você foi convidado!
        </h1>
        <p className="text-sm text-center text-gray-500 mb-2">
          {convite?.tenantNome}
        </p>
        <p className="text-base text-center text-primary-700 font-medium mb-6">
          Olá, {convite?.profissionalNome}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="input-field"
              placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 número"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              className="input-field"
              placeholder="Repita a senha"
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2"
            disabled={submitting}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Criando...' : 'Criar Acesso'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Ao criar sua conta, você poderá acessar sua agenda, horários e serviços.
        </p>
      </div>
    </div>
  );
}
