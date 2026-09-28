import { useState } from 'react';
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
import api from '../services/api';

export default function PublicBadgeValidationPage() {
  const [matricula, setMatricula] = useState('');
  const [athlete, setAthlete] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setAthlete(null);

    try {
      const response = await api.get(`/public/validate/${encodeURIComponent(matricula.trim())}`);
      setAthlete(response.data.athlete);
    } catch (err) {
      setError(err.response?.data?.message || 'Carteirinha não localizada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ width: 260, maxWidth: '100%', height: 'auto', mb: 1 }} />
            <Typography variant="h4" fontWeight={800}>
              Validar carteirinha
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Número da matrícula"
                value={matricula}
                onChange={(event) => setMatricula(event.target.value)}
                placeholder="2026 0001"
              />
              <Button type="submit" variant="contained" size="large" disabled={loading || !matricula.trim()}>
                {loading ? 'Validando...' : 'Validar'}
              </Button>
            </Stack>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {athlete && (
            <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <CardContent sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {athlete.photoUrl ? (
                      <Box
                        component="img"
                        src={athlete.photoUrl}
                        alt={athlete.fullName}
                        sx={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 2 }}
                      />
                    ) : (
                      <Box sx={{ width: 90, height: 90, borderRadius: 2, backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontWeight: 700 }}>
                        FOTO
                      </Box>
                    )}
                    <Box>
                      <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800 }}>
                        Status verificado
                      </Typography>
                      <Typography variant="h5" fontWeight={800}>
                        {athlete.fullName}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack spacing={1}>
                    <Typography><strong>Órgão / equipe:</strong> {athlete.entity}</Typography>
                    <Typography><strong>Modalidade:</strong> {athlete.modality}</Typography>
                    <Typography><strong>Categoria:</strong> {athlete.ageCategory}</Typography>
                    <Typography><strong>Matrícula:</strong> {athlete.matricula}</Typography>
                    <Typography><strong>Status da inscrição:</strong> {athlete.status}</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
