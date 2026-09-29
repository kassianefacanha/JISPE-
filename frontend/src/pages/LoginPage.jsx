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
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(form.email, form.password);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/entity');
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível entrar no sistema.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 48%, #fff7ed 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ borderRadius: 4, p: { xs: 3, sm: 5 }, border: '1px solid #e2e8f0' }}>
          <Stack spacing={3}>
            <Box textAlign="center">
              <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ display: 'block', width: 190, maxWidth: '100%', height: 'auto', mx: 'auto', mb: 1 }} />
              <Typography variant="h4" fontWeight={800} color="text.primary">
                Acesso ao sistema
              </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <Stack spacing={2.5}>
                <TextField
                  label="E-mail"
                  type="email"
                  fullWidth
                  autoComplete="username"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="seu@email.com"
                />

                <TextField
                  label="Senha"
                  type="password"
                  fullWidth
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="••••••••"
                />

                {error && <Alert severity="error">{error}</Alert>}

                <Button type="submit" variant="contained" size="large" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
                <Button component={Link} to="/recuperar-senha" variant="text" sx={{ alignSelf: 'center' }}>
                  Esqueceu a senha da entidade?
                </Button>
              </Stack>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                component={Link}
                to="/cadastro-entidade"
                variant="outlined"
                color="primary"
                size="large"
                sx={{ borderRadius: 2, fontWeight: 700, flex: 1 }}
              >
                Cadastrar entidade
              </Button>
              <Button
                component={Link}
                to="/validar-carteirinha"
                variant="text"
                color="secondary"
                size="large"
                sx={{ borderRadius: 2, fontWeight: 700, flex: 1 }}
              >
                Validar carteirinha
              </Button>
            </Stack>

          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
