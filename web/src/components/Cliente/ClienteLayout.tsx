import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useClientAuth } from '../../contexts/Cliente/ClientAuthContext';
import {
  LayoutDashboard, CalendarDays, PlusCircle, Wallet, User, LogOut, Menu, X, Scissors
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '', icon: LayoutDashboard, label: 'Início' },
  { to: 'agendamentos', icon: CalendarDays, label: 'Meus Agendamentos' },
  { to: 'novo-agendamento', icon: PlusCircle, label: 'Novo Agendamento' },
  { to: 'creditos', icon: Wallet, label: 'Meus Créditos' },
  { to: 'perfil', icon: User, label: 'Meu Perfil' },
];

export default function ClienteLayout() {
  const { sessao, logout } = useClientAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(`/cliente/${slug}/acesso`);
  };

  const basePath = `/cliente/${slug}`;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-primary-700 truncate">{sessao?.tenant.nome || 'Cliente'}</h1>
            <p className="text-xs text-gray-500">Área do Cliente</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-2">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={`${basePath}/${item.to}`}
              end={item.to === ''}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm min-w-0 flex-1">
              <p className="font-medium text-gray-700 truncate">{sessao?.cliente.nome}</p>
              <p className="text-gray-500 text-xs truncate">{sessao?.cliente.telefone}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 lg:px-8">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-4">
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <Scissors size={20} className="text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-800">{sessao?.tenant.nome}</h2>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
