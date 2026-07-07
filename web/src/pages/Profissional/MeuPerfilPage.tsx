import { useState, useEffect } from 'react';
import { User, Loader2, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function MeuPerfilPage() {
  const { usuario } = useAuth();
  const [nome, setNome] = useState(usuario?.nome || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuario?.nome) setNome(usuario.nome);
  }, [usuario]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('O nome é obrigatório.');
      return;
    }
    setLoading(true);
    try {
      await api.put('/profissional/meu-perfil', { nome: nome.trim() });
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>
        <p className="text-sm text-gray-500">Atualize suas informações pessoais</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User size={28} className="text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">{usuario?.nome}</p>
              <p className="text-sm text-gray-500">{usuario?.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="input-field"
              placeholder="Seu nome"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
