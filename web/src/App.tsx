import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/Login/LoginPage';
import CadastroPage from './pages/SignUp/CadastroPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import AgendamentosPage from './pages/Agendamentos/AgendamentosPage';
import ProfissionaisPage from './pages/Profissionais/ProfissionaisPage';
import ProfissionalEditPage from './pages/Profissionais/ProfissionalEditPage';
import ServicosPage from './pages/Servicos/ServicosPage';
import ClientesPage from './pages/Clientes/ClientesPage';
import FinanceiroPage from './pages/Financeiro/FinanceiroPage';
import ConfiguracoesPage from './pages/Configuracoes/ConfiguracoesPage';
import AdminDashboardPage from './pages/Admin/DashboardPage';
import FaturasPage from './pages/Admin/FaturasPage';
import EstabelecimentosPage from './pages/Admin/EstabelecimentosPage';
import TenantDetailPage from './pages/Admin/TenantDetailPage';
import ProfissionalDashboardPage from './pages/Profissional/DashboardPage';
import MeusAgendamentosPage from './pages/Profissional/MeusAgendamentosPage';
import MeuPerfilPage from './pages/Profissional/MeuPerfilPage';
import MinhaAgendaPage from './pages/Profissional/MinhaAgendaPage';
import MeusClientesPage from './pages/Profissional/MeusClientesPage';
import ConvitePage from './pages/Convite/ConvitePage';
import ClienteAcessoPage from './pages/Cliente/AcessoPage';
import ClienteDashboardPage from './pages/Cliente/DashboardPage';
import ClienteMeusAgendamentosPage from './pages/Cliente/MeusAgendamentosPage';
import ClienteNovoAgendamentoPage from './pages/Cliente/NovoAgendamentoPage';
import ClientePagamentoPixPage from './pages/Cliente/PagamentoPixPage';
import ClienteMeusCreditosPage from './pages/Cliente/MeusCreditosPage';
import ClienteMeuPerfilPage from './pages/Cliente/MeuPerfilPage';
import ClienteLayout from './components/Cliente/ClienteLayout';
import { ClientAuthProvider, useClientAuth } from './contexts/Cliente/ClientAuthContext';

function ClienteRoutes() {
  const { sessao } = useClientAuth();
  if (!sessao) return <Outlet />;
  return <ClienteLayout />;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  return usuario ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin } = useAuth();
  return isPlatformAdmin ? <>{children}</> : <Navigate to="/dashboard" />;
}

function ClientRoute({ children }: { children: React.ReactNode }) {
  const { sessao, loading } = useClientAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  return sessao ? <>{children}</> : <Navigate to="acesso" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/convite/:token" element={<ConvitePage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="agendamentos" element={<AgendamentosPage />} />
        <Route path="profissionais" element={<ProfissionaisPage />} />
        <Route path="profissionais/:id" element={<ProfissionalEditPage />} />
        <Route path="servicos" element={<ServicosPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
        <Route path="tenants" element={<Navigate to="/admin/estabelecimentos" replace />} />
        <Route path="admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="admin/estabelecimentos" element={<AdminRoute><EstabelecimentosPage /></AdminRoute>} />
        <Route path="admin/estabelecimentos/:id" element={<AdminRoute><TenantDetailPage /></AdminRoute>} />
        <Route path="admin/faturas" element={<AdminRoute><FaturasPage /></AdminRoute>} />
        <Route path="profissional" element={<ProfissionalDashboardPage />} />
        <Route path="profissional/agendamentos" element={<MeusAgendamentosPage />} />
        <Route path="profissional/perfil" element={<MeuPerfilPage />} />
        <Route path="profissional/agenda" element={<MinhaAgendaPage />} />
        <Route path="profissional/clientes" element={<MeusClientesPage />} />
      </Route>
      <Route path="/cliente/:slug" element={
        <ClientAuthProvider>
          <ClienteRoutes />
        </ClientAuthProvider>
      }>
        <Route path="acesso" element={<ClienteAcessoPage />} />
        <Route index element={<ClientRoute><ClienteDashboardPage /></ClientRoute>} />
        <Route path="agendamentos" element={<ClientRoute><ClienteMeusAgendamentosPage /></ClientRoute>} />
        <Route path="novo-agendamento" element={<ClientRoute><ClienteNovoAgendamentoPage /></ClientRoute>} />
        <Route path="pagamento/:agendamentoId" element={<ClientRoute><ClientePagamentoPixPage /></ClientRoute>} />
        <Route path="creditos" element={<ClientRoute><ClienteMeusCreditosPage /></ClientRoute>} />
        <Route path="perfil" element={<ClientRoute><ClienteMeuPerfilPage /></ClientRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
