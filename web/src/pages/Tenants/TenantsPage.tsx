import { useState, useEffect } from 'react';
import { Building2, Plus, Loader2, CheckCircle, XCircle, Eye, ExternalLink } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import NovoEditarTenantModal from './NovoEditarTenantModal';

interface Tenant {
  id: string;
  nome: string;
  slug: string;
  plano: string;
  ativo: boolean;
  criadoEm: string;
  _count: {
    usuarios: number;
    clientes: number;
    agendamentos: number;
  };
}

export default function TenantsPage() {
  const { isSuperAdmin } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchTenants = async () => {
    try {
      const res = await api.get('/tenants');
      setTenants(res.data);
    } catch (err: any) {
      toast.error('Erro ao carregar estabelecimentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
        <p className="text-lg font-medium">Acesso restrito</p>
        <p className="text-sm">Apenas super administradores podem gerenciar estabelecimentos.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Estabelecimentos</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Novo Estabelecimento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 size={20} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{tenant.nome}</h3>
                  <p className="text-sm text-gray-500">{tenant.slug}</p>
                </div>
              </div>
              {tenant.ativo ? (
                <CheckCircle size={18} className="text-green-500" />
              ) : (
                <XCircle size={18} className="text-red-500" />
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                {tenant.plano}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="font-semibold text-gray-800">{tenant._count.usuarios}</p>
                <p className="text-gray-500 text-xs">Usuários</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{tenant._count.clientes}</p>
                <p className="text-gray-500 text-xs">Clientes</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">{tenant._count.agendamentos}</p>
                <p className="text-gray-500 text-xs">Agendamentos</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tenants.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">Nenhum estabelecimento cadastrado</p>
          <p className="text-sm">Crie o primeiro estabelecimento para começar.</p>
        </div>
      )}

      {showModal && (
        <NovoEditarTenantModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchTenants();
          }}
        />
      )}
    </div>
  );
}
