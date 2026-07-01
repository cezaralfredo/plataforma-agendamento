import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, CalendarDays, Users, Scissors, UserCircle, DollarSign, Settings, Building2, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agendamentos', icon: CalendarDays, label: 'Agendamentos' },
  { to: '/profissionais', icon: Users, label: 'Profissionais' },
  { to: '/servicos', icon: Scissors, label: 'Serviços' },
  { to: '/clientes', icon: UserCircle, label: 'Clientes' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  { to: '/tenants', icon: Building2, label: 'Tenants' },
];

export default function Layout() {
  const { usuario, tenant, logout, isSuperAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = isSuperAdmin ? navItems : navItems.filter(n => n.to === '/dashboard' || n.to === '/agendamentos');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-primary-700 truncate">{tenant?.nome || 'Plataforma'}</h1>
            <p className="text-xs text-gray-500">Painel de Agendamento</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-2">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
              <p className="font-medium text-gray-700 truncate">{usuario?.nome}</p>
              <p className="text-gray-500 text-xs truncate">
                {usuario?.perfil === 'SUPER_ADMIN' ? 'Administrador' : 'Profissional'}
                {tenant ? ` • ${tenant.slug}` : ''}
              </p>
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
          <h2 className="text-lg font-semibold text-gray-800">Bem-vindo, {usuario?.nome?.split(' ')[0]}</h2>
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
