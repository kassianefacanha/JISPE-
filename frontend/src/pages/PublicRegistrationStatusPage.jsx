import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import api, { getApiErrorMessage } from '../services/api';

const getApprovalLabel = (status) => ({
  approved: 'Aprovada',
  pending: 'Aguardando aprovação do órgão',
  rejected: 'Não aprovada',
}[status] || 'Status indisponível');

export default function PublicRegistrationStatusPage() {
  const [form, setForm] = useState({ email: '', cpf: '' });
  const [athlete, setAthlete] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const checkStatus = async (event) => {
    event.preventDefault();
    setError('');
    setAthlete(null);
    setLoading(true);
    try {
      const response = await api.post('/public/registration-status', form);
      setAthlete(response.data.athlete);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Não foi possível consultar a inscrição.'));
    } finally {
      setLoading(false);
    }
  };

  const downloadBadge = async () => {
    setError('');
    setDownloading(true);
    try {
      const response = await api.post('/public/registration-status/badge', form, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'carteirinha-jispe-2026.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      if (requestError.response?.data instanceof Blob) {
        try {
          const body = JSON.parse(await requestError.response.data.text());
          setError(body.message || 'Não foi possível gerar a carteirinha.');
        } catch {
          setError('Não foi possível gerar a carteirinha.');
        }
      } else {
        setError(getApiErrorMessage(requestError, 'Não foi possível gerar a carteirinha.'));
      }
    } finally {
      setDownloading(false);
    }
  };

  const status = athlete?.approvalStatus;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 4, md: 6 } }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
        <Stack spacing={3}>
          <Button component={RouterLink} to="/login" startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
            Voltar para o login
          </Button>

          <Box textAlign="center">
            <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ display: 'block', width: 240, maxWidth: '100%', height: 'auto', mx: 'auto', mb: 2 }} />
            <Typography variant="h4" fontWeight={800}>
              Consultar inscrição
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Informe o e-mail e o CPF utilizados no cadastro para verificar a aprovação.
            </Typography>
          </Box>

          <Box component="form" onSubmit={checkStatus} noValidate>
            <Stack spacing={2}>
              <TextField
                fullWidth
                required
                type="email"
                label="E-mail do atleta"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
              <TextField
                fullWidth
                required
                label="CPF do atleta"
                autoComplete="off"
                inputProps={{ inputMode: 'numeric' }}
                value={form.cpf}
                onChange={(event) => setForm((current) => ({ ...current, cpf: event.target.value }))}
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" disabled={loading || downloading}>
                {loading ? 'Consultando...' : 'Verificar inscrição'}
              </Button>
            </Stack>
          </Box>

          {athlete && (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="overline" color="primary.main" fontWeight={800}>
                      Resultado da consulta
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>{athlete.fullName}</Typography>
                  </Box>
                  <Alert severity={status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info'}>
                    Status da inscrição: <strong>{getApprovalLabel(status)}</strong>
                  </Alert>
                  {status === 'approved' && (
                    <Button
                      variant="contained"
                      startIcon={<DownloadIcon />}
                      onClick={downloadBadge}
                      disabled={downloading}
                    >
                      {downloading ? 'Gerando carteirinha...' : 'Gerar carteirinha'}
                    </Button>
                  )}
                  {status === 'pending' && (
                    <Typography variant="body2" color="text.secondary">
                      A carteirinha ficará disponível após a aprovação pelo órgão responsável.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
