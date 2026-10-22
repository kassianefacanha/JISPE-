import { Navigate, Route, Routes } from 'react-router-dom';
import { Button } from '@mui/material';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useAuth } from '../contexts/AuthContext';
import AdminAthleteCreatePage from '../pages/AdminAthleteCreatePage';
import AdminDashboard from '../pages/AdminDashboard';
import AdminEntityCreatePage from '../pages/AdminEntityCreatePage';
import AdminManagementPage from '../pages/AdminManagementPage';
import EntityDashboard from '../pages/EntityDashboard';
import EntityAthleteCreatePage from '../pages/EntityAthleteCreatePage';
import EntityRegisterPage from '../pages/EntityRegisterPage';
import LoginPage from '../pages/LoginPage';
import PasswordRecoveryPage from '../pages/PasswordRecoveryPage';
import ProfilePage from '../pages/ProfilePage';
import PublicBadgeValidationPage from '../pages/PublicBadgeValidationPage';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const allowedRoles = Array.isArray(role) ? role : role ? [role] : [];

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-600">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;

  return children;
}

export default function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<PasswordRecoveryPage />} />
        <Route path="/redefinir-senha" element={<PasswordRecoveryPage />} />
        <Route path="/cadastro-entidade" element={<EntityRegisterPage />} />
        <Route path="/cadastro-atleta" element={<EntityAthleteCreatePage selfRegistration />} />
        <Route path="/validar-carteirinha" element={<PublicBadgeValidationPage />} />
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
          px: 2,
          py: 1.25,
          color: '#fff',
          backgroundColor: '#128c7e',
          boxShadow: 4,
          '&:hover': { backgroundColor: '#0f766e' },
        }}
      >
        Suporte: (85) 99674-4204
      </Button>
    </>
  );
}
