import { useEffect, useState } from 'react';
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
import LoginIcon from '@mui/icons-material/Login';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import BusinessIcon from '@mui/icons-material/Business';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { useAuth } from '../contexts/AuthContext';
import api, { getApiErrorMessage } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selfAthleteRegistrationOpen, setSelfAthleteRegistrationOpen] = useState(null);
  const [registrationStatusError, setRegistrationStatusError] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/public/registration-status')
      .then((response) => {
        if (active) setSelfAthleteRegistrationOpen(response.data.selfAthleteRegistrationOpen !== false);
      })
      .catch(() => {
        if (active) {
          setSelfAthleteRegistrationOpen(false);
          setRegistrationStatusError(true);
        }
      });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(form.email, form.password);
      if (['admin', 'superadmin', 'gerencia'].includes(user.role)) navigate('/admin');
      else navigate('/entity');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível entrar no sistema.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 3, md: 5 },
        pb: { xs: 15, md: 12 },
        background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 48%, #fff7ed 100%)',
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={{ xs: 3, md: 4 }}>
          <Box textAlign="center">
            <Box
              component="img"
              src="/logo.png"
              alt="JISPE 2026"
              sx={{ display: 'block', width: { xs: 155, sm: 190 }, maxWidth: '100%', height: 'auto', mx: 'auto', mb: 1.5 }}
            />
            <Typography variant="h4" component="h1" fontWeight={800} color="text.primary">
              JISPE 2026
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Acesse sua conta ou encontre o serviço que precisa.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(0, 0.95fr)' },
              gap: { xs: 2, md: 3 },
              alignItems: 'stretch',
            }}
          >
            <Paper
              component="section"
              aria-labelledby="login-title"
              elevation={4}
              sx={{ borderRadius: 4, p: { xs: 2.5, sm: 4 }, border: '1px solid #e2e8f0' }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography id="login-title" variant="h5" component="h2" fontWeight={800}>
                    Acesso ao sistema
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Entre com as credenciais do seu órgão.
                  </Typography>
                </Box>

                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <Stack spacing={2}>
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
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      startIcon={<LoginIcon />}
                      disabled={loading}
                      sx={{ minHeight: 48, fontWeight: 700 }}
                    >
                      {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                    <Button component={Link} to="/recuperar-senha" variant="text" sx={{ alignSelf: 'center' }}>
                      Esqueceu a senha do órgão?
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            <Paper
              component="section"
              aria-labelledby="quick-access-title"
              elevation={2}
              sx={{ borderRadius: 4, p: { xs: 2.5, sm: 4 }, border: '1px solid #e2e8f0', backgroundColor: '#ffffffdd' }}
            >
              <Stack spacing={2.5}>
                <Box>
                  <Typography id="quick-access-title" variant="h5" component="h2" fontWeight={800}>
                    Acesso rápido
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Cadastros, consultas e validação de carteirinha.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                    gap: 1.5,
                  }}
                >
                  <Button
                    component={selfAthleteRegistrationOpen === true ? Link : 'button'}
                    to={selfAthleteRegistrationOpen === true ? '/cadastro-atleta' : undefined}
                    variant="contained"
                    color="secondary"
                    startIcon={<PersonAddAlt1Icon />}
                    disabled={selfAthleteRegistrationOpen !== true}
                    sx={{ minHeight: 56, px: 1.5, borderRadius: 2, fontWeight: 700, whiteSpace: 'normal', lineHeight: 1.25 }}
                  >
                    {selfAthleteRegistrationOpen === null
                      ? 'Verificando inscrições...'
                      : selfAthleteRegistrationOpen
                        ? 'Cadastro de atleta'
                        : 'Inscrições encerradas'}
                  </Button>
                  <Button
                    component={Link}
                    to="/cadastro-entidade"
                    variant="outlined"
                    startIcon={<BusinessIcon />}
                    sx={{ minHeight: 56, px: 1.5, borderRadius: 2, fontWeight: 700, whiteSpace: 'normal', lineHeight: 1.25 }}
                  >
                    Cadastrar órgão
                  </Button>
                  <Button
                    component={Link}
                    to="/consultar-inscricao"
                    variant="outlined"
                    color="secondary"
                    startIcon={<FactCheckOutlinedIcon />}
                    sx={{ minHeight: 56, px: 1.5, borderRadius: 2, fontWeight: 700, whiteSpace: 'normal', lineHeight: 1.25 }}
                  >
                    Consultar inscrição
                  </Button>
                  <Button
                    component={Link}
                    to="/validar-carteirinha"
                    variant="outlined"
                    color="secondary"
                    startIcon={<BadgeOutlinedIcon />}
                    sx={{ minHeight: 56, px: 1.5, borderRadius: 2, fontWeight: 700, whiteSpace: 'normal', lineHeight: 1.25 }}
                  >
                    Validar carteirinha
                  </Button>
                </Box>

                {selfAthleteRegistrationOpen === false && (
                  <Alert severity={registrationStatusError ? 'warning' : 'info'}>
                    {registrationStatusError
                      ? 'Não foi possível verificar se as inscrições estão abertas. Tente novamente mais tarde.'
                      : 'O cadastro direto de atletas está temporariamente fechado.'}
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
