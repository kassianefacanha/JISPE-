import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import api, { getApiErrorMessage } from '../services/api';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  phone: '',
  responsibleFullName: '',
  responsibleCpf: '',
  responsibleEmail: '',
  responsiblePhoto: '',
  responsibleProof: '',
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });

export default function EntityRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/public/registration-status')
      .then((response) => setRegistrationOpen(response.data.entityRegistrationOpen !== false))
      .catch(() => {});
  }, []);
  const [uploadInfo, setUploadInfo] = useState({ photo: '', proof: '' });

  const handleFileField = async (event, fieldName) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await readFileAsDataUrl(file);
    setForm((current) => ({ ...current, [fieldName]: result }));
    setUploadInfo((current) => ({
      ...current,
      [fieldName === 'responsiblePhoto' ? 'photo' : 'proof']: file.name,
    }));
    event.target.value = '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!form.responsiblePhoto || !form.responsibleProof) {
      setError('Selecione a foto e o comprovante do responsável para enviar o cadastro.');
      return;
    }

    setSubmitting(true);

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
          photoUrl: form.responsiblePhoto,
          proofUrl: form.responsibleProof,
        },
      });

      setMessage('Cadastro solicitado com sucesso. Aguarde a aprovação do administrador.');
      setForm(emptyForm);
      setUploadInfo({ photo: '', proof: '' });
      setTimeout(() => navigate('/login'), 1400);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível cadastrar a entidade.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc', py: { xs: 3, md: 5 }, px: 2 }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2} sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 2 }, minWidth: 0 }}>
            <Box component="img" src="/logo.png" alt="JISPE 2026" sx={{ display: 'block', width: { xs: 72, sm: 104 }, maxWidth: '35vw', height: 'auto', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 3, fontWeight: 800 }}>
                Entidade
              </Typography>
              <Typography variant="h4" fontWeight={800} color="text.primary" sx={{ fontSize: { xs: 22, sm: 34 }, lineHeight: 1.15 }}>
                Cadastro de entidade
              </Typography>
            </Box>
          </Box>
          <Button component={Link} to="/login" variant="outlined">
            Voltar ao login
          </Button>
        </Stack>

        <Paper elevation={0} sx={{ borderRadius: 4, p: { xs: 2, md: 4 }, border: '1px solid #e2e8f0' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Preencha os dados abaixo para solicitar o cadastro da sua entidade. O acesso será liberado somente após aprovação do administrador.
          </Typography>
          {!registrationOpen && <Alert severity="warning" sx={{ mb: 2 }}>O cadastro de novas entidades está temporariamente fechado.</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Nome da entidade" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required type="email" label="E-mail da entidade" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required type="password" label="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required type="tel" label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} helperText="Com DDD. Ex.: (11) 99999-9999" />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="Nome do responsável" value={form.responsibleFullName} onChange={(e) => setForm({ ...form, responsibleFullName: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required label="CPF do responsável" value={form.responsibleCpf} onChange={(e) => setForm({ ...form, responsibleCpf: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth required type="email" label="E-mail do responsável" value={form.responsibleEmail} onChange={(e) => setForm({ ...form, responsibleEmail: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                  Foto e documento do responsável
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ minHeight: 150, display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px dashed #94a3b8', borderRadius: 1, backgroundColor: '#f8fafc' }}>
                  {form.responsiblePhoto ? (
                    <Box component="img" src={form.responsiblePhoto} alt="Prévia da foto do responsável" sx={{ width: 76, height: 100, flexShrink: 0, objectFit: 'cover', borderRadius: 1, border: '1px solid #cbd5e1' }} />
                  ) : (
                    <Box sx={{ width: 76, height: 100, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, backgroundColor: '#e2e8f0', color: '#64748b' }}>
                      <ImageOutlinedIcon />
                    </Box>
                  )}
                  <Stack spacing={1} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>Foto do responsável</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                        {uploadInfo.photo || 'Nenhuma foto selecionada'}
                      </Typography>
                    </Box>
                    <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />}>
                      {form.responsiblePhoto ? 'Trocar foto' : 'Selecionar foto'}
                      <input hidden type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(event) => handleFileField(event, 'responsiblePhoto')} />
                    </Button>
                  </Stack>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ minHeight: 150, display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px dashed #94a3b8', borderRadius: 1, backgroundColor: '#f8fafc' }}>
                  <Box sx={{ width: 76, height: 100, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, backgroundColor: '#e2e8f0', color: '#64748b' }}>
                    <DescriptionOutlinedIcon />
                  </Box>
                  <Stack spacing={1} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>Comprovante do responsável</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                        {uploadInfo.proof || 'Nenhum documento selecionado'}
                      </Typography>
                    </Box>
                    <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />}>
                      {form.responsibleProof ? 'Trocar documento' : 'Selecionar documento'}
                      <input hidden type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => handleFileField(event, 'responsibleProof')} />
                    </Button>
                  </Stack>
                </Box>
              </Grid>
            </Grid>

            <Stack spacing={2} sx={{ mt: 3 }}>
              {error && <Alert severity="error">{error}</Alert>}
              {message && <Alert severity="success">{message}</Alert>}

              <Button type="submit" variant="contained" size="large" disabled={submitting || !registrationOpen}>
                {submitting ? 'Enviando...' : registrationOpen ? 'Cadastrar entidade' : 'Cadastro fechado'}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
