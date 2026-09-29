import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../contexts/AuthContext';
import { useFeedback } from '../contexts/FeedbackContext';
import api, { getApiErrorMessage } from '../services/api';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const homePath = user?.role === 'admin' ? '/admin' : '/entity';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.newPassword.length < 12) return setError('A nova senha precisa ter pelo menos 12 caracteres.');
    if (form.newPassword !== form.confirmPassword) return setError('A confirmação não corresponde à nova senha.');

    try {
      setSaving(true);
      const response = await api.put('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      notify(response.data.message, 'success');
      logout();
      navigate('/login', { replace: true });
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, 'Não foi possível alterar a senha.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', py: { xs: 3, md: 6 }, px: 2 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: { xs: 2.5, md: 4 }, border: '1px solid #e2e8f0' }}>
          <Stack spacing={3}>
            <Button component={Link} to={homePath} startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'flex-start' }}>
              Voltar ao painel
            </Button>
            <Box>
              <Typography variant="overline" color="primary.main" fontWeight={800}>Conta</Typography>
              <Typography variant="h4" fontWeight={800}>Gerenciar perfil</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{user?.name} · {user?.email}</Typography>
            </Box>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <Typography variant="h6" fontWeight={700}>Alterar senha</Typography>
                <TextField
                  required
                  fullWidth
                  type="password"
                  label="Senha atual"
                  autoComplete="current-password"
                  value={form.currentPassword}
                  onChange={(event) => setForm((current) => ({ ...current, currentPassword: event.target.value }))}
                />
                <TextField
                  required
                  fullWidth
                  type="password"
                  label="Nova senha"
                  autoComplete="new-password"
                  helperText="Use pelo menos 12 caracteres."
                  value={form.newPassword}
                  onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))}
                />
                <TextField
                  required
                  fullWidth
                  type="password"
                  label="Confirmar nova senha"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button type="submit" variant="contained" disabled={saving || !form.currentPassword || !form.newPassword || !form.confirmPassword}>
                  {saving ? 'Salvando...' : 'Salvar nova senha'}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  A alteração encerra as outras sessões desta conta. Você precisará entrar novamente.
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
