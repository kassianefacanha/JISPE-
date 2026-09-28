import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminAthleteCreatePage from '../pages/AdminAthleteCreatePage';
import AdminDashboard from '../pages/AdminDashboard';
import AdminEntityCreatePage from '../pages/AdminEntityCreatePage';
import AdminManagementPage from '../pages/AdminManagementPage';
import EntityDashboard from '../pages/EntityDashboard';
import EntityRegisterPage from '../pages/EntityRegisterPage';
import LoginPage from '../pages/LoginPage';
import PublicBadgeValidationPage from '../pages/PublicBadgeValidationPage';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-600">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/login" replace />;

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro-entidade" element={<EntityRegisterPage />} />
      <Route path="/validar-carteirinha" element={<PublicBadgeValidationPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/entidades/novo"
        element={
          <ProtectedRoute role="admin">
            <AdminEntityCreatePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/atletas/novo"
        element={
          <ProtectedRoute role="admin">
            <AdminAthleteCreatePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/gestao"
        element={
          <ProtectedRoute role="admin">
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
    </Routes>
  );
}
