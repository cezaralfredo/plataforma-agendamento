import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NovoEditarTenantModal({ onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const payload = {
      nome: formData.get('nome') as string,
      slug: formData.get('slug') as string,
      adminNome: formData.get('adminNome') as string,
      adminEmail: formData.get('adminEmail') as string,
      adminSenha: formData.get('adminSenha') as string,
      asaasApiKey: formData.get('asaasApiKey') as string || '',
      whatsappAdminNumber: formData.get('whatsappAdminNumber') as string || '',
    };

    try {
      await api.post('/tenants/signup', payload);
      toast.success('Estabelecimento criado com sucesso!');
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.erro || 'Erro ao criar estabelecimento';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Novo Estabelecimento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Estabelecimento *</label>
              <input
                name="nome"
                required
                className="input-field"
                placeholder="Salão & Barbearia Exemplo"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
              <input
                name="slug"
                required
                pattern="[a-z0-9-]+"
                className="input-field"
                placeholder="meu-salao"
              />
              <p className="text-xs text-gray-400 mt-1">Apenas letras minúsculas, números e hífens</p>
            </div>

            <div className="col-span-2 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Administrador</h3>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Admin *</label>
              <input
                name="adminNome"
                required
                className="input-field"
                placeholder="Administrador"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email do Admin *</label>
              <input
                name="adminEmail"
                type="email"
                required
                className="input-field"
                placeholder="admin@exemplo.com"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha do Admin *</label>
              <input
                name="adminSenha"
                type="password"
                required
                minLength={6}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <div className="col-span-2 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Configurações (opcional)</h3>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave API Asaas</label>
              <input
                name="asaasApiKey"
                className="input-field"
                placeholder="asaas_api_key..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Admin (número)</label>
              <input
                name="whatsappAdminNumber"
                className="input-field"
                placeholder="5511999999999"
              />
              <p className="text-xs text-gray-400 mt-1">Número do WhatsApp com DDI (ex: 5511999999999)</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : null}
              {loading ? 'Criando...' : 'Criar Estabelecimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
