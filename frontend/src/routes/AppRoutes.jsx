import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useAuth } from '../contexts/AuthContext';
import AdminAthleteCreatePage from '../pages/AdminAthleteCreatePage';
import AdminDashboard from '../pages/AdminDashboard';
import AdminStatisticsPage from '../pages/AdminStatisticsPage';
import AdminEntityCreatePage from '../pages/AdminEntityCreatePage';
import AdminManagementPage from '../pages/AdminManagementPage';
import EntityDashboard from '../pages/EntityDashboard';
import EntityAthleteCreatePage from '../pages/EntityAthleteCreatePage';
import EntityRegisterPage from '../pages/EntityRegisterPage';
import HomeContentAdminPage from '../pages/HomeContentAdminPage';
import LoginPage from '../pages/LoginPage';
import PasswordRecoveryPage from '../pages/PasswordRecoveryPage';
import ProfilePage from '../pages/ProfilePage';
import PublicBadgeValidationPage from '../pages/PublicBadgeValidationPage';
import PublicRegistrationStatusPage from '../pages/PublicRegistrationStatusPage';
import PublicHomePage from '../pages/PublicHomePage';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const allowedRoles = Array.isArray(role) ? role : role ? [role] : [];
  const localDemoRoute = import.meta.env.DEV
    && searchParams.get('demo') === '1'
    && ['/admin', '/admin/estatisticas', '/entity'].includes(location.pathname);

  if (localDemoRoute) return children;
  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-600">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;

  return children;
}

export default function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<PasswordRecoveryPage />} />
        <Route path="/redefinir-senha" element={<PasswordRecoveryPage />} />
        <Route path="/cadastro-entidade" element={<EntityRegisterPage />} />
        <Route
          path="/cadastro-atleta"
          element={
            <ProtectedRoute role={['admin', 'superadmin']}>
              <AdminAthleteCreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/validar-carteirinha" element={<PublicBadgeValidationPage />} />
        <Route path="/consultar-inscricao" element={<PublicRegistrationStatusPage />} />
        <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role={['admin', 'superadmin', 'gerencia']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/estatisticas"
          element={
            <ProtectedRoute role={['admin', 'superadmin', 'gerencia']}>
              <AdminStatisticsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/pagina-inicial"
          element={
            <ProtectedRoute role={['admin', 'superadmin', 'gerencia']}>
              <HomeContentAdminPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/entidades/novo"
          element={
            <ProtectedRoute role={['admin', 'superadmin']}>
              <AdminEntityCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/atletas/novo"
          element={
            <ProtectedRoute role={['admin', 'superadmin']}>
              <AdminAthleteCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/gestao"
          element={
            <ProtectedRoute role={['admin', 'superadmin']}>
              <AdminManagementPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/entity"
          element={
            <ProtectedRoute role="entity">
              <EntityDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/entity/atletas/novo"
          element={
            <ProtectedRoute role="entity">
              <EntityAthleteCreatePage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Button
        component="a"
        href="https://wa.me/5585996744204"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com o suporte JISPE 2026 pelo WhatsApp: (85) 99674-4204"
        startIcon={<SupportAgentIcon />}
        sx={{
          position: 'fixed',
          right: { xs: 12, sm: 24 },
          bottom: { xs: 12, sm: 24 },
          zIndex: 1300,
          borderRadius: 99,
          minWidth: { xs: 44, sm: 'auto' },
          width: { xs: 44, sm: 'auto' },
          height: { xs: 44, sm: 'auto' },
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 1.25 },
          color: '#fff',
          backgroundColor: '#128c7e',
          boxShadow: 4,
          '&:hover': { backgroundColor: '#0f766e' },
        }}
        title="Falar com o suporte JISPE 2026"
      >
        <span className="hidden sm:inline">Suporte: (85) 99674-4204</span>
      </Button>
      <Button
        component="a"
        href="/Regulamento_JISPE_2026.pdf"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Abrir Regulamento JISPE 2026 em PDF"
        startIcon={<MenuBookIcon />}
        sx={{
          position: 'fixed',
          right: { xs: 12, sm: 24 },
          bottom: { xs: 64, sm: 84 },
          zIndex: 1300,
          borderRadius: 99,
          minWidth: { xs: 44, sm: 'auto' },
          width: { xs: 44, sm: 'auto' },
          height: { xs: 44, sm: 'auto' },
          px: { xs: 1, sm: 2 },
          py: { xs: 1, sm: 1.25 },
          color: '#fff',
          backgroundColor: '#1e40af',
          boxShadow: 4,
          '&:hover': { backgroundColor: '#1e3a8a' },
        }}
        title="Abrir Regulamento JISPE 2026 em PDF"
      >
        <span className="hidden sm:inline">Regulamento</span>
      </Button>
    </>
  );
}
