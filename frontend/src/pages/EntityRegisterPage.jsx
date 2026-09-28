import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../services/api';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  responsibleFullName: '',
  responsibleCpf: '',
  responsibleEmail: '',
};

export default function EntityRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      await api.post('/entities/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        responsible: {
          fullName: form.responsibleFullName,
          cpf: form.responsibleCpf,
          email: form.responsibleEmail,
        },
      });

      setMessage('Cadastro solicitado com sucesso. Aguarde a aprovação do administrador.');
      setForm(emptyForm);
      setTimeout(() => navigate('/login'), 1400);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível cadastrar a entidade.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', py: { xs: 3, md: 5 }, px: 2 }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ width: 220, maxWidth: '100%', height: 'auto', mb: 1 }} />
            <Typography variant="h4" fontWeight={800} color="text.primary">
              Cadastro de entidade
            </Typography>
          </Box>
          <Button component={Link} to="/login" variant="outlined">
            Voltar ao login
          </Button>
        </Stack>

        <Paper elevation={0} sx={{ borderRadius: 4, p: { xs: 2, md: 4 }, border: '1px solid #e2e8f0' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Preencha os dados abaixo para solicitar o cadastro da sua entidade. O acesso será liberado somente após aprovação do administrador.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Nome da entidade" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="email" label="E-mail da entidade" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="password" label="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Nome do responsável" value={form.responsibleFullName} onChange={(e) => setForm({ ...form, responsibleFullName: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="CPF do responsável" value={form.responsibleCpf} onChange={(e) => setForm({ ...form, responsibleCpf: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth type="email" label="E-mail do responsável" value={form.responsibleEmail} onChange={(e) => setForm({ ...form, responsibleEmail: e.target.value })} />
              </Grid>
            </Grid>

            <Stack spacing={2} sx={{ mt: 3 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}

              <Button type="submit" variant="contained" size="large" disabled={submitting}>
                {submitting ? 'Enviando...' : 'Cadastrar entidade'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
