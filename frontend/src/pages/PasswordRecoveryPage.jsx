import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import api, { getApiErrorMessage } from '../services/api';

export default function PasswordRecoveryPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const isReset = Boolean(token);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (isReset && form.password.length < 12) {
      setError('A nova senha precisa ter pelo menos 12 caracteres.');
      return;
    }
    if (isReset && form.password !== form.confirmPassword) {
      setError('A confirmação não corresponde à nova senha.');
      return;
    }

    try {
      setLoading(true);
      if (isReset) {
        const response = await api.post('/auth/reset-password', { token, password: form.password });
        setSuccess(response.data.message || 'Senha alterada. Entre com a nova senha.');
      } else {
        const response = await api.post('/auth/forgot-password', { email });
        setSuccess(response.data.message || 'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir a senha.');
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Não foi possível concluir a solicitação. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: 4, background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 48%, #fff7ed 100%)' }}>
      <Container maxWidth="sm">
        <Paper elevation={4} sx={{ p: { xs: 3, sm: 5 }, border: '1px solid #e2e8f0' }}>
          <Stack spacing={3}>
            <Box textAlign="center">
              <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ display: 'block', width: 180, maxWidth: '100%', height: 'auto', mx: 'auto', mb: 2 }} />
              <Typography variant="h4" fontWeight={800}>
                {isReset ? 'Definir nova senha' : 'Recuperar senha da entidade'}
              </Typography>
            </Box>
            {success ? (
              <Stack spacing={2}>
                <Alert severity="success">{success}</Alert>
                <Button component={Link} to="/login" variant="contained">Voltar para o login</Button>
              </Stack>
            ) : (
              <Box component="form" onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  {isReset ? (
                    <>
                      <TextField
                        required
                        fullWidth
                        type="password"
                        label="Nova senha"
                        autoComplete="new-password"
                        helperText="Use pelo menos 12 caracteres."
                        value={form.password}
                        onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
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
                    </>
                  ) : (
                    <>
                      <Typography color="text.secondary">
                        Informe o e-mail cadastrado. Se houver uma conta de entidade, enviaremos um link válido por 30 minutos.
                      </Typography>
                      <TextField
                        required
                        fullWidth
                        type="email"
                        label="E-mail da entidade"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </>
                  )}
                  {error && <Alert severity="error">{error}</Alert>}
                  <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? 'Aguarde...' : isReset ? 'Salvar nova senha' : 'Enviar link de redefinição'}
                  </Button>
                  <Button component={Link} to="/login" variant="text">Voltar para o login</Button>
                </Stack>
              </Box>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
