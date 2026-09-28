import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const emptyForm = {
  cpf: '',
  fullName: '',
  birthDate: '',
  photoUrl: '',
  phone: '',
  email: '',
  proofUrl: '',
  modality: '',
  naipe: 'masculino',
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });

export default function EntityDashboard() {
  const { user, logout } = useAuth();
  const [athletes, setAthletes] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadInfo, setUploadInfo] = useState({ photo: '', proof: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [athletesResponse, modalitiesResponse] = await Promise.all([
          api.get('/athletes'),
          api.get('/modalities'),
        ]);

        setAthletes(athletesResponse.data.athletes || []);
        setModalities(modalitiesResponse.data.modalities || []);
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  const isValidCPF = (value = '') => {
    const digits = String(value).replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i += 1) {
      sum += Number(digits.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== Number(digits.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i += 1) {
      sum += Number(digits.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === Number(digits.charAt(10));
  };

  const isValidEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

  const handleFileField = async (event, fieldName) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await readFileAsDataUrl(file);
    setForm((current) => ({ ...current, [fieldName]: result }));
    setUploadInfo((current) => ({
      ...current,
      [fieldName === 'photoUrl' ? 'photo' : 'proof']: file.name,
    }));
    event.target.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.cpf || !isValidCPF(form.cpf)) {
      const message = 'CPF do atleta inválido.';
      setError(message);
      return;
    }

    if (!form.fullName.trim()) {
      const message = 'Informe o nome completo do atleta.';
      setError(message);
      return;
    }

    if (!form.birthDate) {
      const message = 'Informe a data de nascimento do atleta.';
      setError(message);
      return;
    }

    if (!form.phone.trim()) {
      const message = 'Informe o telefone do atleta.';
      setError(message);
      return;
    }

    if (!form.email || !isValidEmail(form.email)) {
      const message = 'Informe um e-mail válido do atleta.';
      setError(message);
      return;
    }

    if (!form.modality) {
      const message = 'Selecione a modalidade do atleta.';
      setError(message);
      return;
    }

    if (!form.photoUrl) {
      const message = 'Selecione a foto do atleta.';
      setError(message);
      return;
    }

    if (!form.proofUrl) {
      const message = 'Selecione o comprovante do atleta.';
      setError(message);
      return;
    }

    try {
      const payload = {
        ...form,
        gender: form.naipe,
      };

      const response = await api.post('/athletes', payload);
      setAthletes((current) => [response.data.athlete, ...current]);
      const successMessage = 'Atleta cadastrado com sucesso.';
      setSuccess(successMessage);
      setForm(emptyForm);
      setUploadInfo({ photo: '', proof: '' });
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao cadastrar atleta';
      setError(message);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', py: { xs: 3, md: 6 }, px: 2 }}>
      <Container maxWidth="xl">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
          <Box>
            <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ width: 220, maxWidth: '100%', height: 'auto', mb: 1 }} />
            <Typography variant="h4" fontWeight={800}>
              Painel da entidade
            </Typography>
          </Box>
          <Button variant="contained" color="inherit" onClick={logout}>
            Sair
          </Button>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: '1px solid #e2e8f0' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Cadastrar atleta
              </Typography>

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Nome completo" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth type="date" label="Data de nascimento" InputLabelProps={{ shrink: true }} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth type="email" label="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Modalidade"
                      value={form.modality}
                      onChange={(e) => setForm({ ...form, modality: e.target.value })}
                    >
                      <MenuItem value="">Selecione a modalidade</MenuItem>
                      {modalities.map((modality) => (
                        <MenuItem key={modality._id || modality.slug} value={modality.name || modality.slug}>
                          {modality.name || modality.slug}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Naipe"
                      value={form.naipe}
                      onChange={(e) => setForm({ ...form, naipe: e.target.value })}
                    >
                      <MenuItem value="masculino">Masculino</MenuItem>
                      <MenuItem value="feminino">Feminino</MenuItem>
                      <MenuItem value="misto">Misto</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Button fullWidth variant="outlined" component="label">
                      Foto 3x4
                      <input hidden type="file" accept="image/*" onChange={(event) => handleFileField(event, 'photoUrl')} />
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button fullWidth variant="outlined" component="label">
                      Comprovante
                      <input hidden type="file" accept="image/*,.pdf" onChange={(event) => handleFileField(event, 'proofUrl')} />
                    </Button>
                  </Grid>
                </Grid>

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5, backgroundColor: '#f8fafc' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Foto carregada
                      </Typography>
                      {uploadInfo.photo ? (
                        <Typography variant="body2" fontWeight={700}>{uploadInfo.photo}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Nenhuma foto carregada</Typography>
                      )}
                      {form.photoUrl && (
                        <Box component="img" src={form.photoUrl} alt="Prévia da foto" sx={{ mt: 1, width: 72, height: 88, objectFit: 'cover', borderRadius: 2, border: '1px solid #dbeafe' }} />
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, p: 1.5, backgroundColor: '#f8fafc' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Documento carregado
                      </Typography>
                      {uploadInfo.proof ? (
                        <Typography variant="body2" fontWeight={700}>{uploadInfo.proof}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">Nenhum documento carregado</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                <Button type="submit" variant="contained" size="large" sx={{ mt: 3, width: '100%' }}>
                  Cadastrar atleta
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Resumo
              </Typography>
              <Stack spacing={2}>
                <Card sx={{ backgroundColor: '#ecfdf5', border: 'none' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Usuário</Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
                      {user?.name || 'Entidade'}
                    </Typography>
                  </CardContent>
                </Card>
                <Card sx={{ backgroundColor: '#fff7ed', border: 'none' }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Atletas cadastrados</Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 1 }}>
                      {athletes.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Paper sx={{ mt: 4, p: { xs: 2, md: 3 }, borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Atletas cadastrados
          </Typography>

          <Stack spacing={2}>
            {athletes.length === 0 ? (
              <Typography color="text.secondary">Ainda não há atletas cadastrados.</Typography>
            ) : (
              athletes.map((athlete) => (
                <Paper key={athlete._id} variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                    <Box>
                      <Typography fontWeight={700}>{athlete.fullName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        CPF: {athlete.cpf} · Matrícula: {athlete.matricula}
                      </Typography>
                    </Box>
                    <Chip label={athlete.ageCategory} color="success" />
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
