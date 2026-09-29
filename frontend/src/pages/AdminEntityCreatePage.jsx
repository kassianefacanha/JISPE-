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
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import { useFeedback } from '../contexts/FeedbackContext';
import api from '../services/api';

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
const isValidPhone = (value = '') => [10, 11].includes(String(value).replace(/\D/g, '').length);

export default function AdminEntityCreatePage() {
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadInfo, setUploadInfo] = useState({ photo: '', proof: '' });

  useEffect(() => {
    const loadEntity = async () => {
      if (!editId) return;

      try {
        const response = await api.get(`/entities/${editId}`);
        const entity = response.data.entity;
        setForm({
          name: entity.name,
          email: entity.email,
          password: '',
          phone: entity.phone,
          responsibleFullName: entity.responsible?.fullName || '',
          responsibleCpf: entity.responsible?.cpf || '',
          responsibleEmail: entity.responsible?.email || '',
          responsiblePhoto: entity.responsible?.photoUrl || '',
          responsibleProof: entity.responsible?.proofUrl || '',
        });
      } catch (error) {
        notify(error.response?.data?.message || 'Erro ao carregar entidade');
        navigate('/admin');
      }
    };

    loadEntity();
  }, [editId, navigate]);

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

  const validateForm = () => {
    if (!form.name.trim()) return 'Informe o nome da entidade.';
    if (!form.email || !isValidEmail(form.email)) return 'Informe um e-mail válido da entidade.';
    if (!editId && !form.password.trim()) return 'Informe a senha da entidade.';
    if (!isValidPhone(form.phone)) return 'Informe um telefone válido com DDD (10 ou 11 dígitos).';
    if (!form.responsibleFullName.trim()) return 'Informe o nome do responsável.';
    if (!form.responsibleCpf || !isValidCPF(form.responsibleCpf)) return 'CPF do responsável inválido.';
    if (!form.responsibleEmail || !isValidEmail(form.responsibleEmail)) return 'Informe um e-mail válido do responsável.';
    if (!form.responsiblePhoto) return 'Selecione a foto do responsável.';
    if (!form.responsibleProof) return 'Selecione o comprovante do responsável.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setCreating(true);
      const payload = {
        name: form.name,
        email: form.email,
        password: editId ? undefined : form.password,
        phone: form.phone,
        responsible: {
          fullName: form.responsibleFullName,
          cpf: form.responsibleCpf,
          email: form.responsibleEmail,
          photoUrl: form.responsiblePhoto,
          proofUrl: form.responsibleProof,
        },
      };

      if (editId) {
        await api.put(`/entities/${editId}`, payload);
        const successMessage = 'Entidade atualizada com sucesso.';
        setSuccess(successMessage);
        notify(successMessage, 'success');
      } else {
        await api.post('/entities', {
          ...payload,
          password: form.password,
          status: 'pending',
        });
        const successMessage = 'Entidade cadastrada com sucesso. Ela ficará pendente até aprovação.';
        setSuccess(successMessage);
        notify(successMessage, 'success');
      }

      setForm(emptyForm);
      navigate('/admin');
    } catch (error) {
      const message = error.response?.data?.message || 'Erro ao salvar entidade';
      setError(message);
    } finally {
      setCreating(false);
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
                <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 3, fontWeight: 800 }}>
                  Admin
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: 22, sm: 34 }, lineHeight: 1.15 }}>
                  {editId ? 'Editar entidade' : 'Novo cadastro de entidade'}
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button component={Link} to="/admin" variant="outlined">
                Dashboard
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Card>
          <CardContent sx={{ p: { xs: 2, md: 4 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Dados da entidade
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              )}
              {success && (
                <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
              )}
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Nome da entidade" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="email" label="E-mail de acesso" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={Boolean(error && !isValidEmail(form.email))} helperText={error && !isValidEmail(form.email) ? 'Informe um endereço de e-mail válido.' : ''} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="password"
                    label={editId ? 'Senha (não editável)' : 'Senha de acesso'}
                    value={editId ? '' : form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    disabled={Boolean(editId)}
                    helperText={editId ? 'A senha não pode ser alterada neste formulário.' : 'Preencha a senha ao cadastrar a entidade.'}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="tel" label="Telefone / contato" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={Boolean(error && !isValidPhone(form.phone))} helperText={error && !isValidPhone(form.phone) ? 'Informe DDD e número: 10 ou 11 dígitos.' : 'Com DDD. Ex.: (11) 99999-9999'} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Nome do responsável" value={form.responsibleFullName} onChange={(e) => setForm({ ...form, responsibleFullName: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="CPF do responsável" value={form.responsibleCpf} onChange={(e) => setForm({ ...form, responsibleCpf: e.target.value })} error={Boolean(error && !isValidCPF(form.responsibleCpf))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="email" label="E-mail do responsável" value={form.responsibleEmail} onChange={(e) => setForm({ ...form, responsibleEmail: e.target.value })} error={Boolean(error && !isValidEmail(form.responsibleEmail))} helperText={error && !isValidEmail(form.responsibleEmail) ? 'Informe um endereço de e-mail válido.' : ''} />
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
                          {uploadInfo.photo || (form.responsiblePhoto ? 'Foto já carregada' : 'Nenhuma foto selecionada')}
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
                        <Typography variant="subtitle2" fontWeight={700}>Documento do responsável</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          {uploadInfo.proof || (form.responsibleProof ? 'Documento já carregado' : 'Nenhum documento selecionado')}
                        </Typography>
                      </Box>
                      <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />}>
                        {form.responsibleProof ? 'Trocar documento' : 'Selecionar documento'}
                        <input hidden type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => handleFileField(event, 'responsibleProof')} />
                      </Button>
                    </Stack>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
                    <Button component={Link} to="/admin" variant="text">
                      Cancelar
                    </Button>
                    <Button type="submit" variant="contained" disabled={creating}>
                      {creating ? (editId ? 'Salvando...' : 'Cadastrando...') : (editId ? 'Salvar entidade' : 'Cadastrar entidade')}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
