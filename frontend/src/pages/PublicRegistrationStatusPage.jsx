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
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import AthleteModalityFields, { getAthleteModalityRegistrations } from '../components/AthleteModalityFields';
import { normalizeModalityCatalog } from '../utils/externalRegistrationModality';
import api, { getApiErrorMessage } from '../services/api';

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a foto selecionada.'));
    reader.readAsDataURL(file);
  });

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
  const [editing, setEditing] = useState(false);
  const [modalities, setModalities] = useState([]);
  const [raceRegistrationOpen, setRaceRegistrationOpen] = useState(true);
  const [modalityRegistrations, setModalityRegistrations] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoChanged, setPhotoChanged] = useState(false);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingEditOptions, setLoadingEditOptions] = useState(false);

  const checkStatus = async (event) => {
    event.preventDefault();
    setError('');
    setEditError('');
    setEditing(false);
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

  const startEditing = async () => {
    setEditError('');
    setLoadingEditOptions(true);
    try {
      const [modalitiesResponse, statusResponse] = await Promise.all([
        api.get('/modalities'),
        api.get('/public/registration-status'),
      ]);
      const availableModalities = normalizeModalityCatalog(modalitiesResponse.data.modalities || []);
      setModalities(availableModalities);
      setRaceRegistrationOpen(statusResponse.data.raceRegistrationOpen !== false);
      setModalityRegistrations(getAthleteModalityRegistrations(athlete, availableModalities));
      setPhotoUrl(athlete.photoUrl || '');
      setPhotoChanged(false);
      setEditing(true);
    } catch (requestError) {
      setEditError(getApiErrorMessage(requestError, 'Não foi possível carregar as opções de edição.'));
    } finally {
      setLoadingEditOptions(false);
    }
  };

  const handlePhotoChange = async (event) => {
    const [file] = event.target.files || [];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setEditError('A foto precisa estar em JPG, PNG ou WebP.');
      event.target.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setEditError('A foto pode ter no máximo 3 MiB.');
      event.target.value = '';
      return;
    }

    try {
      setPhotoUrl(await readFileAsDataUrl(file));
      setPhotoChanged(true);
      setEditError('');
    } catch (requestError) {
      setEditError(requestError.message);
    }
  };

  const saveEdits = async (event) => {
    event.preventDefault();
    setEditError('');
    setSavingEdit(true);
    try {
      const payload = {
        ...form,
        modalityRegistrations,
        ...(photoChanged ? { photoUrl } : {}),
      };
      const response = await api.post('/public/registration-status/update', payload);
      setAthlete(response.data.athlete);
      setEditing(false);
    } catch (requestError) {
      setEditError(getApiErrorMessage(requestError, 'Não foi possível salvar as alterações.'));
    } finally {
      setSavingEdit(false);
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
                  {athlete.photoUrl && (
                    <Box
                      component="img"
                      src={athlete.photoUrl}
                      alt={`Foto de ${athlete.fullName}`}
                      sx={{ width: 76, height: 100, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                    />
                  )}
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>Modalidades</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(athlete.modalities?.length ? athlete.modalities : [athlete.modality]).filter(Boolean).join(', ') || 'Não informadas'}
                    </Typography>
                  </Box>
                  <Alert severity={status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info'}>
                    Status da inscrição: <strong>{getApprovalLabel(status)}</strong>
                  </Alert>
                  {status === 'approved' ? (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<ImageOutlinedIcon />}
                        onClick={startEditing}
                        disabled={editing || savingEdit || loadingEditOptions}
                      >
                        {loadingEditOptions ? 'Carregando opções...' : 'Editar modalidade e foto'}
                      </Button>
                      {editError && !editing && <Alert severity="error">{editError}</Alert>}
                    </>
                  ) : (
                    <Alert severity="info">
                      A edição da modalidade e da foto está disponível somente para inscrições aprovadas.
                    </Alert>
                  )}
                  {editing && (
                    <Box component="form" onSubmit={saveEdits}>
                      <Stack spacing={2}>
                        <Typography variant="h6" fontWeight={700}>Editar inscrição</Typography>
                        <AthleteModalityFields
                          modalities={modalities}
                          entries={modalityRegistrations}
                          raceRegistrationOpen={raceRegistrationOpen}
                          onChange={setModalityRegistrations}
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                          {photoUrl && (
                            <Box
                              component="img"
                              src={photoUrl}
                              alt="Prévia da foto do atleta"
                              sx={{ width: 76, height: 100, flexShrink: 0, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                            />
                          )}
                          <Button component="label" variant="outlined" startIcon={<ImageOutlinedIcon />}>
                            {photoChanged ? 'Trocar foto selecionada' : 'Selecionar nova foto'}
                            <input hidden type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handlePhotoChange} />
                          </Button>
                          <Typography variant="body2" color="text.secondary">
                            JPG, PNG ou WebP; até 3 MiB.
                          </Typography>
                        </Stack>
                        {editError && <Alert severity="error">{editError}</Alert>}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <Button type="submit" variant="contained" disabled={savingEdit}>
                            {savingEdit ? 'Salvando...' : 'Salvar alterações'}
                          </Button>
                          <Button
                            variant="text"
                            onClick={() => {
                              setEditing(false);
                              setEditError('');
                            }}
                            disabled={savingEdit}
                          >
                            Cancelar
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>
                  )}
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
