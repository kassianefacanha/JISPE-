import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
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
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import api from '../services/api';

export default function PublicBadgeValidationPage() {
  const [matricula, setMatricula] = useState('');
  const [athlete, setAthlete] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const videoRef = useRef(null);

  const validateMatricula = useCallback(async (value) => {
    const matriculaValue = String(value || '').trim();
    if (!matriculaValue) return;

    setLoading(true);
    setError('');
    setAthlete(null);

    try {
      const response = await api.get(`/public/validate/${encodeURIComponent(matriculaValue)}`);
      setAthlete(response.data.athlete);
    } catch (err) {
      setError(err.response?.data?.message || 'Carteirinha não localizada.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scannerOpen) return undefined;

    let active = true;
    let controls;
    const reader = new BrowserQRCodeReader();
    setScannerError('');

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
      if (!active || !result) return;

      const scannedMatricula = result.getText().trim();
      setMatricula(scannedMatricula);
      setScannerOpen(false);
      void validateMatricula(scannedMatricula);
    }).then((cameraControls) => {
      controls = cameraControls;
      if (!active) controls.stop();
    }).catch(() => {
      if (!active) return;
      setScannerError('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
      setScannerOpen(false);
    });

    return () => {
      active = false;
      controls?.stop();
    };
  }, [scannerOpen, validateMatricula]);

  const handleSubmit = (event) => {
    event.preventDefault();
    void validateMatricula(matricula);
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
        <Stack spacing={3}>
          <Button component={RouterLink} to="/login" startIcon={<ArrowBackIcon />} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
            Voltar para o login
          </Button>

          <Box>
            <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ display: 'block', width: 260, maxWidth: '100%', height: 'auto', objectFit: 'contain', mx: 'auto', mb: 2 }} />
            <Typography variant="h4" fontWeight={800} align="center">
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
              <Stack direction="row" spacing={1}>
                <Button type="submit" variant="contained" size="large" disabled={loading || !matricula.trim()}>
                  {loading ? 'Validando...' : 'Validar'}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  startIcon={scannerOpen ? <CloseIcon /> : <QrCodeScannerIcon />}
                  onClick={() => setScannerOpen((open) => !open)}
                >
                  {scannerOpen ? 'Fechar câmera' : 'Ler QR Code'}
                </Button>
              </Stack>
            </Stack>
          </Box>

          {scannerOpen && (
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack spacing={1.5}>
                <Typography variant="body2" fontWeight={700}>
                  Aponte a câmera para o QR Code da carteirinha
                </Typography>
                <Box
                  component="video"
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  sx={{ width: '100%', maxHeight: 360, aspectRatio: '4 / 3', objectFit: 'cover', backgroundColor: '#0f172a', borderRadius: 1 }}
                />
              </Stack>
            </Paper>
          )}

          {scannerError && <Alert severity="warning">{scannerError}</Alert>}
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
