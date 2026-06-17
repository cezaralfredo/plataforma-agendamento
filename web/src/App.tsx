import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import AgendamentosPage from './pages/Agendamentos/AgendamentosPage';
import ProfissionaisPage from './pages/Profissionais/ProfissionaisPage';
import ServicosPage from './pages/Servicos/ServicosPage';
import ClientesPage from './pages/Clientes/ClientesPage';
import FinanceiroPage from './pages/Financeiro/FinanceiroPage';
import ConfiguracoesPage from './pages/Configuracoes/ConfiguracoesPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  return usuario ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="agendamentos" element={<AgendamentosPage />} />
        <Route path="profissionais" element={<ProfissionaisPage />} />
        <Route path="servicos" element={<ServicosPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
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
