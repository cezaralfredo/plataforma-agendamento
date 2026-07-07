import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Scissors, Loader2, Smartphone } from 'lucide-react';
import { useClientAuth } from '../../contexts/Cliente/ClientAuthContext';
import toast from 'react-hot-toast';

export default function AcessoPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { login } = useClientAuth();
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefone.trim()) { toast.error('Informe seu telefone.'); return; }
    if (!slug) { toast.error('Estabelecimento não identificado.'); return; }

    setLoading(true);
    try {
      await login(telefone.trim(), slug);
      navigate(`/cliente/${slug}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao acessar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
            <Scissors size={28} className="text-primary-600" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-center text-gray-800 mb-1">Área do Cliente</h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Informe seu telefone para acessar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <div className="relative">
              <Smartphone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                className="input-field pl-9"
                placeholder="(11) 99999-8888"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Acessando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Se você ainda não tem cadastro, ele será criado automaticamente.
        </p>
      </div>
    </div>
  );
}
