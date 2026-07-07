import { useState } from 'react';
import { User, Smartphone, Mail, Save, Loader2 } from 'lucide-react';
import { useClientAuth } from '../../contexts/Cliente/ClientAuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function MeuPerfilPage() {
  const { sessao, updateCliente } = useClientAuth();
  const [nome, setNome] = useState(sessao?.cliente.nome || '');
  const [email, setEmail] = useState(sessao?.cliente.email || '');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Nome é obrigatório.'); return; }
    setLoading(true);
    try {
      const payload: any = { nome: nome.trim() };
      if (email.trim()) payload.email = email.trim();
      else payload.email = null;

      await api.put('/cliente-portal/perfil', payload);
      toast.success('Perfil atualizado!');
      updateCliente({ nome: nome.trim(), email: email.trim() || null });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erro ao atualizar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Meu Perfil</h1>
        <p className="text-sm text-gray-500">Atualize suas informações</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <User size={28} className="text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">{sessao?.cliente.nome}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Smartphone size={12} /> {sessao?.cliente.telefone}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail size={14} className="inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input-field"
              placeholder="seu@email.com (opcional)"
            />
          </div>
          <div className="pt-2">
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
