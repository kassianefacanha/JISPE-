import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { getAutomaticAgeCategory, hasCompletedMinimumAge } from '../utils/athleteAge';
import api, { getApiErrorMessage } from '../services/api';
import { useFeedback } from '../contexts/FeedbackContext';

const emptyForm = {
  cpf: '',
  fullName: '',
  birthDate: '',
  photoUrl: '',
  phone: '',
  email: '',
  proofUrl: '',
  modality: '',
  naipe: '',
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });

const isValidCPF = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(digits[index]) * (10 - index);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(digits[index]) * (11 - index);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === Number(digits[10]);
};

const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
const isValidPhone = (value = '') => [10, 11].includes(String(value).replace(/\D/g, '').length);

export default function EntityAthleteCreatePage() {
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const athleteId = searchParams.get('id');
  const isEditing = Boolean(athleteId);
  const [form, setForm] = useState(emptyForm);
  const [modalities, setModalities] = useState([]);
  const [uploadInfo, setUploadInfo] = useState({ photo: '', proof: '' });
  const [saving, setSaving] = useState(false);
  const [athleteRegistrationOpen, setAthleteRegistrationOpen] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const selectedModality = modalities.find((modality) =>
    (modality.name || modality.slug) === form.modality || modality.legacyNames?.includes(form.modality)
  );
  const ageCategories = selectedModality?.categories || [];
  const allowedGenders = selectedModality?.genders || [];
  const calculatedAgeCategory = getAutomaticAgeCategory(form.birthDate, form.modality, ageCategories);

  useEffect(() => {
    api.get('/modalities')
      .then((response) => setModalities(response.data.modalities || []))
      .catch((loadError) => setError(getApiErrorMessage(loadError, 'Não foi possível carregar as modalidades.')));
  }, []);

  useEffect(() => {
    api.get('/public/registration-status')
      .then((response) => setAthleteRegistrationOpen(response.data.athleteRegistrationOpen !== false))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!athleteId) return undefined;

    let active = true;
    api.get(`/athletes/${athleteId}`)
      .then((response) => {
        if (!active) return;
        const athlete = response.data.athlete;
        const birthDate = athlete.birthDate ? new Date(athlete.birthDate) : null;
        setForm({
          cpf: athlete.cpf || '',
          fullName: athlete.fullName || '',
          birthDate: birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate.toISOString().slice(0, 10) : '',
          photoUrl: athlete.photoUrl || '',
          phone: athlete.phone || '',
          email: athlete.email || '',
          proofUrl: athlete.proofUrl || '',
          modality: athlete.modality || '',
          naipe: athlete.naipe || athlete.gender || '',
        });
        setUploadInfo({
          photo: athlete.photoUrl ? 'Foto já carregada' : '',
          proof: athlete.proofUrl ? 'Documento já carregado' : '',
        });
      })
      .catch((loadError) => {
        if (active) setError(getApiErrorMessage(loadError, 'Não foi possível carregar os dados do atleta.'));
      });

    return () => {
      active = false;
    };
  }, [athleteId]);

  const handleFileField = async (event, fieldName) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await readFileAsDataUrl(file);
      setForm((current) => ({ ...current, [fieldName]: result }));
      setUploadInfo((current) => ({ ...current, [fieldName === 'photoUrl' ? 'photo' : 'proof']: file.name }));
      setError('');
    } catch (fileError) {
      setError(fileError.message || 'Não foi possível ler o arquivo.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.fullName.trim()) return setError('Informe o nome completo do atleta.');
    if (!isValidCPF(form.cpf)) return setError('CPF do atleta inválido.');
    if (!form.birthDate) return setError('Informe a data de nascimento do atleta.');
    if (!hasCompletedMinimumAge(form.birthDate)) return setError('O atleta precisa já ter completado 18 anos para se cadastrar.');
    if (!isValidPhone(form.phone)) return setError('Informe um telefone válido com DDD (10 ou 11 dígitos).');
    if (!isValidEmail(form.email)) return setError('Informe um e-mail válido do atleta.');
    if (!form.modality) return setError('Selecione a modalidade do atleta.');
    if (!form.photoUrl) return setError('Selecione a foto do atleta.');
    if (!form.proofUrl) return setError('Selecione o comprovante do atleta.');

    try {
      setSaving(true);
      if (isEditing) {
        await api.put(`/athletes/${athleteId}`, { ...form, gender: form.naipe });
      } else {
        await api.post('/athletes', { ...form, gender: form.naipe });
      }
      const message = isEditing ? 'Dados do atleta atualizados com sucesso.' : 'Atleta cadastrado com sucesso.';
      setSuccess(message);
      notify(message, 'success');
      if (isEditing) {
        navigate('/entity');
      } else {
        setForm(emptyForm);
        setUploadInfo({ photo: '', proof: '' });
      }
    } catch (saveError) {
      const message = getApiErrorMessage(saveError, 'Erro ao cadastrar atleta.');
      setError(message);
      notify(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', py: { xs: 3, md: 5 }, px: 2 }}>
      <Container maxWidth="lg">
        <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
              <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ display: 'block', width: { xs: 72, sm: 104 }, maxWidth: '35vw', height: 'auto', flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 3, fontWeight: 800 }}>Entidade</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: 22, sm: 34 }, lineHeight: 1.15 }}>{isEditing ? 'Editar atleta' : 'Cadastrar atleta'}</Typography>
              </Box>
            </Box>
            <Button component={Link} to="/entity" variant="outlined">Voltar ao painel</Button>
          </Stack>
        </Paper>

        <Card>
          <CardContent sx={{ p: { xs: 2, md: 4 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{isEditing ? 'Editar dados do atleta' : 'Dados do atleta'}</Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {!athleteRegistrationOpen && !isEditing && <Alert severity="warning" sx={{ mb: 2 }}>O cadastro de atletas está temporariamente fechado pelo administrador.</Alert>}
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required label="Nome completo" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required label="CPF" value={form.cpf} onChange={(event) => setForm({ ...form, cpf: event.target.value })} error={Boolean(error && !isValidCPF(form.cpf))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required type="date" label="Data de nascimento" InputLabelProps={{ shrink: true }} value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required type="tel" label="Telefone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} error={Boolean(error && !isValidPhone(form.phone))} helperText={error && !isValidPhone(form.phone) ? 'Informe DDD e número: 10 ou 11 dígitos.' : 'Com DDD. Ex.: (11) 99999-9999'} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth required type="email" label="E-mail" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} error={Boolean(error && !isValidEmail(form.email))} helperText={error && !isValidEmail(form.email) ? 'Informe um endereço de e-mail válido.' : ''} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select fullWidth required label="Modalidade" value={form.modality} onChange={(event) => {
                    const modalityName = event.target.value;
                    const nextModality = modalities.find((modality) => (modality.name || modality.slug) === modalityName);
                    const nextGenders = nextModality?.genders || [];
                    setForm((current) => ({
                      ...current,
                      modality: modalityName,
                      naipe: nextGenders.includes(current.naipe) ? current.naipe : nextGenders[0] || '',
                    }));
                  }}>
                    <MenuItem value="">Selecione a modalidade</MenuItem>
                    {modalities.map((modality) => (
                      <MenuItem key={modality._id || modality.slug} value={modality.name || modality.slug}>{modality.name || modality.slug}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField select fullWidth required label="Naipe" value={form.naipe} onChange={(event) => setForm({ ...form, naipe: event.target.value })}>
                    <MenuItem value="">Selecione o naipe</MenuItem>
                    {allowedGenders.map((gender) => (
                      <MenuItem key={gender} value={gender}>{gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Misto'}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth disabled label="Categoria etária (automática)" value={calculatedAgeCategory || 'Informe nascimento e modalidade'} helperText="Calculada pelo ano de nascimento e pelas regras do evento 2026." />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Foto e documento</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ minHeight: 150, display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px dashed #94a3b8', borderRadius: 1, backgroundColor: '#f8fafc' }}>
                    {form.photoUrl ? (
                      <Box component="img" src={form.photoUrl} alt="Prévia da foto do atleta" sx={{ width: 76, height: 100, flexShrink: 0, objectFit: 'cover', borderRadius: 1, border: '1px solid #cbd5e1' }} />
                    ) : (
                      <Box sx={{ width: 76, height: 100, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, backgroundColor: '#e2e8f0', color: '#64748b' }}><ImageOutlinedIcon /></Box>
                    )}
                    <Stack spacing={1} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>Foto 3x4</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{uploadInfo.photo || (form.photoUrl ? 'Foto já carregada' : 'Nenhuma foto selecionada')}</Typography>
                      </Box>
                      <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />}>
                        {form.photoUrl ? 'Trocar foto' : 'Selecionar foto'}
                        <input hidden type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => handleFileField(event, 'photoUrl')} />
                      </Button>
                    </Stack>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ minHeight: 150, display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px dashed #94a3b8', borderRadius: 1, backgroundColor: '#f8fafc' }}>
                    <Box sx={{ width: 76, height: 100, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, backgroundColor: '#e2e8f0', color: '#64748b' }}><DescriptionOutlinedIcon /></Box>
                    <Stack spacing={1} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>Comprovante</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{uploadInfo.proof || (form.proofUrl ? 'Documento já carregado' : 'Nenhum documento selecionado')}</Typography>
                      </Box>
                      <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />}>
                        {form.proofUrl ? 'Trocar documento' : 'Selecionar documento'}
                        <input hidden type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => handleFileField(event, 'proofUrl')} />
                      </Button>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                <Button component={Link} to="/entity" variant="text">Cancelar</Button>
                <Button type="submit" variant="contained" disabled={saving || (!isEditing && !athleteRegistrationOpen)}>
                  {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : athleteRegistrationOpen ? 'Cadastrar atleta' : 'Cadastro fechado'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}