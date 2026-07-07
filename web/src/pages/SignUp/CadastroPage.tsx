import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Building2, Mail, Lock, User, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import api from '../../services/api';

export default function CadastroPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload: Record<string, any> = {
      nome: formData.get('nome') as string,
      slug: formData.get('slug') as string,
      adminNome: formData.get('adminNome') as string,
      adminEmail: formData.get('adminEmail') as string,
      adminSenha: formData.get('adminSenha') as string,
    };

    const signupKey = formData.get('signupKey') as string;
    const headers: Record<string, string> = {};
    if (signupKey) {
      headers['x-signup-key'] = signupKey;
    }

    try {
      await api.post('/tenants/signup', payload, { headers });
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.erro || 'Erro ao criar conta. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 to-purple-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Conta criada com sucesso!</h2>
            <p className="text-gray-500 mb-6">
              Seu estabelecimento foi cadastrado. Agora é só fazer o login.
            </p>
            <Link to="/login" className="btn-primary inline-flex items-center gap-2">
              Ir para o Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Scissors size={32} className="text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Criar nova conta</h1>
          <p className="text-purple-200 mt-1">Cadastre seu estabelecimento na plataforma</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Estabelecimento *</label>
                <div className="relative">
                  <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="nome"
                    required
                    className="input-field pl-10"
                    placeholder="Salão & Barbearia Exemplo"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9-]+"
                  className="input-field"
                  placeholder="meu-salao"
                  disabled={loading}
                />
                <p className="text-xs text-gray-400 mt-1">Apenas letras minúsculas, números e hífens. Será usado na URL do seu estabelecimento.</p>
              </div>

              <div className="col-span-2 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados do Administrador</h3>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Admin *</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="adminNome"
                    required
                    className="input-field pl-10"
                    placeholder="Seu nome"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="adminEmail"
                    type="email"
                    required
                    className="input-field pl-10"
                    placeholder="admin@exemplo.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="adminSenha"
                    type="password"
                    required
                    minLength={8}
                    className="input-field pl-10"
                    placeholder="Mínimo 8 caracteres"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres, com letra maiúscula, minúscula e número</p>
              </div>

              <div className="col-span-2 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Configurações</h3>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chave de registro (se solicitado)</label>
                <input
                  name="signupKey"
                  className="input-field"
                  placeholder="Deixe em branco se não tiver"
                  disabled={loading}
                />
                <p className="text-xs text-gray-400 mt-1">Informe apenas se o administrador solicitar uma chave de registro</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
              <ArrowLeft size={14} />
              Já tenho uma conta. Fazer login.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
