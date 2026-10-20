import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PrivacyNotice from '../components/PrivacyNotice';
import ParticipationTermAcceptance from '../components/ParticipationTermAcceptance';
import { getAutomaticAgeCategory, hasCompletedMinimumAge } from '../utils/athleteAge';
import { normalizeModalityCatalog } from '../utils/externalRegistrationModality';
import AthleteModalityFields, { getAthleteModalityRegistrations } from '../components/AthleteModalityFields';
import api, { getApiErrorMessage } from '../services/api';

const emptyForm = {
  entityId: '',
  cpf: '',
  fullName: '',
  birthDate: '',
  photoUrl: '',
  phone: '',
  email: '',
  proofUrl: '',
  affiliationProofUrl: '',
  modalityRegistrations: [{ modality: '', naipe: '' }],
  isPcd: false,
  hasAllergy: false,
  allergyDetails: '',
  hasSpecialCondition: false,
  specialConditionDetails: '',
  fitnessDeclarationConfirmed: false,
  participationTermAccepted: false,
  privacyConsentConfirmed: false,
  matricula: 'Gerada automaticamente',
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

export default function AdminAthleteCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const [form, setForm] = useState(emptyForm);
  const [entities, setEntities] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successOpen, setSuccessOpen] = useState(false);
  const [raceRegistrationOpen, setRaceRegistrationOpen] = useState(true);
  const [uploadInfo, setUploadInfo] = useState({ photo: '', proof: '', affiliationProof: '' });
  const approvedEntities = entities.filter((entity) => entity.status === 'approved');
  const primaryModality = modalities.find((modality) => (
    [modality.name, modality.slug, ...(modality.legacyNames || []), ...(modality.legacySlugs || [])]
      .includes(form.modalityRegistrations[0]?.modality)
  ));
  const calculatedAgeCategory = getAutomaticAgeCategory(form.birthDate, primaryModality?.name, primaryModality?.categories || []);
  useEffect(() => {
    const load = async () => {
      try {
        const [entitiesResponse, modalitiesResponse, athleteResponse, registrationStatusResponse] = await Promise.all([
          api.get('/entities'),
          api.get('/modalities'),
          editId ? api.get(`/athletes/${editId}`) : Promise.resolve(null),
          api.get('/public/registration-status'),
        ]);

        const loadedEntities = entitiesResponse.data.entities || [];
        const loadedModalities = normalizeModalityCatalog(modalitiesResponse.data.modalities || []);
        setEntities(loadedEntities);
        setModalities(loadedModalities);
        setRaceRegistrationOpen(registrationStatusResponse.data.raceRegistrationOpen !== false);

        if (editId && athleteResponse?.data?.athlete) {
          const athlete = athleteResponse.data.athlete;
          const athleteEntityId = typeof athlete.entityId === 'object' ? athlete.entityId?._id : athlete.entityId;
          const athleteModalityRegistrations = getAthleteModalityRegistrations(athlete, loadedModalities);
          setForm({
            entityId: loadedEntities.some((entity) => entity._id === athleteEntityId && entity.status === 'approved')
              ? athleteEntityId
              : '',
            cpf: athlete.cpf,
            fullName: athlete.fullName,
            birthDate: athlete.birthDate ? new Date(athlete.birthDate).toISOString().slice(0, 10) : '',
            photoUrl: athlete.photoUrl || '',
            phone: athlete.phone,
            email: athlete.email,
            proofUrl: athlete.proofUrl || '',
            affiliationProofUrl: athlete.affiliationProofUrl || '',
            modalityRegistrations: athleteModalityRegistrations,
            isPcd: Boolean(athlete.isPcd),
            hasAllergy: Boolean(athlete.hasAllergy),
            allergyDetails: athlete.allergyDetails || '',
            hasSpecialCondition: Boolean(athlete.hasSpecialCondition),
            specialConditionDetails: athlete.specialConditionDetails || '',
            privacyConsentConfirmed: false,
            participationTermAccepted: false,
            matricula: athlete.matricula || 'Gerada automaticamente',
          });
          setUploadInfo({
            photo: athlete.photoUrl ? 'Foto já carregada' : '',
            proof: athlete.proofUrl ? 'Documento já carregado' : '',
            affiliationProof: athlete.affiliationProofUrl ? 'Comprovante de vínculo já carregado' : '',
          });
        }
      } catch (error) {
        setError(getApiErrorMessage(error, 'Erro ao carregar os dados do atleta.'));
      }
    };

    load();
  }, [editId, navigate]);

  const handleFileField = async (event, fieldName) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = await readFileAsDataUrl(file);
    setForm((current) => ({ ...current, [fieldName]: result }));
    setUploadInfo((current) => ({
      ...current,
      [fieldName === 'photoUrl' ? 'photo'
        : fieldName === 'affiliationProofUrl' ? 'affiliationProof' : 'proof']: file.name,
    }));
    event.target.value = '';
  };

  const validateForm = () => {
    if (!form.entityId) return 'Selecione o órgão do atleta.';
    if (!form.cpf || !isValidCPF(form.cpf)) return 'CPF do atleta inválido.';
    if (!form.fullName.trim()) return 'Informe o nome completo do atleta.';
    if (!form.birthDate) return 'Informe a data de nascimento.';
    if (!hasCompletedMinimumAge(form.birthDate)) return 'O atleta precisa já ter completado 18 anos para se cadastrar.';
    if (!isValidPhone(form.phone)) return 'Informe um telefone válido com DDD (10 ou 11 dígitos).';
    if (!form.email || !isValidEmail(form.email)) return 'Informe um e-mail válido.';
    if (!form.modalityRegistrations.length || form.modalityRegistrations.some((entry) => !entry.modality)) return 'Selecione uma modalidade para cada inscrição.';
    if (form.modalityRegistrations.some((entry) => !entry.naipe)) return 'Selecione o naipe de cada modalidade.';
    if (!form.photoUrl) return 'Selecione a foto do atleta.';
    if (!form.proofUrl) return 'Selecione o comprovante do atleta.';
    if (!form.affiliationProofUrl) return 'Selecione o comprovante de vínculo com o órgão.';
    if (!form.participationTermAccepted) return 'Leia e aceite o Termo de Ciência JISPE 2026.';
    if (!form.privacyConsentConfirmed) return 'Leia e confirme o termo de ciência sobre o tratamento de dados.';
    if (!editId && !form.fitnessDeclarationConfirmed) return 'Confirme que o atleta declarou estar apto para participar das atividades.';
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
      setSaving(true);
      const payload = {
        entityId: form.entityId,
        cpf: form.cpf,
        fullName: form.fullName,
        birthDate: form.birthDate,
        photoUrl: form.photoUrl,
        phone: form.phone,
        email: form.email,
        proofUrl: form.proofUrl,
        affiliationProofUrl: form.affiliationProofUrl,
        modality: form.modalityRegistrations[0].modality,
        modalities: form.modalityRegistrations.map((entry) => entry.modality),
        modalityRegistrations: form.modalityRegistrations,
        naipe: form.modalityRegistrations[0].naipe,
        gender: form.modalityRegistrations[0].naipe,
        fitnessDeclarationConfirmed: form.fitnessDeclarationConfirmed,
        participationTermAccepted: form.participationTermAccepted,
        privacyConsentConfirmed: form.privacyConsentConfirmed,
        isPcd: form.isPcd,
        hasAllergy: form.hasAllergy,
        allergyDetails: form.allergyDetails,
        hasSpecialCondition: form.hasSpecialCondition,
        specialConditionDetails: form.specialConditionDetails,
      };

      if (editId) {
        await api.put(`/athletes/${editId}`, payload);
        const successMessage = 'Atleta salvo com sucesso.';
        setSuccess(successMessage);
        setSuccessOpen(true);
      } else {
        await api.post('/athletes', payload);
        const successMessage = 'Atleta cadastrado com sucesso.';
        setSuccess(successMessage);
        setSuccessOpen(true);
      }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Erro ao salvar atleta.');
      setError(message);
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
                <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 3, fontWeight: 800 }}>
                  Admin
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: 22, sm: 34 }, lineHeight: 1.15 }}>
                  {editId ? 'Editar atleta' : 'Novo cadastro de atleta'}
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
              Dados do atleta
            </Typography>

            <Box component="form" onSubmit={handleSubmit} noValidate>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
              )}
              {!raceRegistrationOpen && <Alert severity="warning" sx={{ mb: 2 }}>As inscrições para a corrida foram encerradas: limite de 3.000 corredores atingido.</Alert>}
              <PrivacyNotice
                checked={form.privacyConsentConfirmed}
                onChange={(privacyConsentConfirmed) => setForm((current) => ({ ...current, privacyConsentConfirmed }))}
              />
              <Alert severity="info" sx={{ mb: 2 }}>
                As inscrições para os torneios de Beach Tennis dos Jogos dos Servidores 2026 são feitas exclusivamente em{' '}
                <a href="https://www.beachtennisgovce.com.br/" target="_blank" rel="noreferrer">beachtennisgovce.com.br</a>.
              </Alert>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Nome completo" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Órgão</InputLabel>
                    <Select label="Órgão" value={form.entityId} onChange={(e) => setForm({ ...form, entityId: e.target.value })}>
                      <MenuItem value="">Selecione um órgão aprovado</MenuItem>
                      {approvedEntities.map((entity) => (
                        <MenuItem key={entity._id} value={entity._id}>{entity.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="CPF" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} error={Boolean(error && !isValidCPF(form.cpf))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="date" label="Data de nascimento" InputLabelProps={{ shrink: true }} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="tel" label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={Boolean(error && !isValidPhone(form.phone))} helperText={error && !isValidPhone(form.phone) ? 'Informe DDD e número: 10 ou 11 dígitos.' : 'Com DDD. Ex.: (11) 99999-9999'} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="email" label="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={Boolean(error && !isValidEmail(form.email))} helperText={error && !isValidEmail(form.email) ? 'Informe um endereço de e-mail válido.' : ''} />
                </Grid>

                <Grid item xs={12}>
                  <AthleteModalityFields
                    modalities={modalities}
                    entries={form.modalityRegistrations}
                    raceRegistrationOpen={raceRegistrationOpen}
                    onChange={(modalityRegistrations) => setForm((current) => ({ ...current, modalityRegistrations }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth disabled label="Categoria etária (automática)" value={calculatedAgeCategory || 'Informe nascimento e modalidade'} helperText="Calculada pelas regras do evento 2026." />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth label="Matrícula" value={form.matricula} disabled helperText="A matrícula é gerada automaticamente e não pode ser alterada." />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: 'divider', borderRadius: 2, backgroundColor: '#fafafa' }}>
                    <Typography variant="subtitle1" fontWeight={700}>Saúde e acessibilidade</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
                      Informe essas condições quando necessário para garantir acessibilidade e segurança.
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ height: '100%', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                          <FormControlLabel
                            sx={{ m: 0, alignItems: 'flex-start' }}
                            control={<Checkbox checked={form.isPcd} onChange={(event) => setForm({ ...form, isPcd: event.target.checked })} />}
                            label={<Typography variant="body2" sx={{ pt: 1 }}>Atleta é PCD</Typography>}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                          <FormControlLabel
                            sx={{ m: 0, alignItems: 'flex-start' }}
                            control={<Checkbox checked={form.hasAllergy} onChange={(event) => setForm({ ...form, hasAllergy: event.target.checked, allergyDetails: event.target.checked ? form.allergyDetails : '' })} />}
                            label={<Typography variant="body2" sx={{ pt: 1 }}>Possui alergia</Typography>}
                          />
                          {form.hasAllergy && (
                            <TextField
                              fullWidth
                              size="small"
                              sx={{ mt: 1 }}
                              label="Quais alergias?"
                              value={form.allergyDetails}
                              onChange={(event) => setForm({ ...form, allergyDetails: event.target.value })}
                            />
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, backgroundColor: 'background.paper' }}>
                          <FormControlLabel
                            sx={{ m: 0, alignItems: 'flex-start' }}
                            control={<Checkbox checked={form.hasSpecialCondition} onChange={(event) => setForm({ ...form, hasSpecialCondition: event.target.checked, specialConditionDetails: event.target.checked ? form.specialConditionDetails : '' })} />}
                            label={<Typography variant="body2" sx={{ pt: 1 }}>Possui condição especial</Typography>}
                          />
                          {form.hasSpecialCondition && (
                            <TextField
                              fullWidth
                              size="small"
                              sx={{ mt: 1 }}
                              label="Descreva a condição especial"
                              value={form.specialConditionDetails}
                              onChange={(event) => setForm({ ...form, specialConditionDetails: event.target.value })}
                            />
                          )}
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                {!editId && (
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={(
                        <Checkbox
                          required
                          checked={form.fitnessDeclarationConfirmed}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            fitnessDeclarationConfirmed: event.target.checked,
                          }))}
                        />
                      )}
                      label="Atesto que o(a) atleta declarou estar apto(a) a participar das atividades físicas e esportivas dos Jogos da Integração do Servidor Público Estadual (JISPE), ciente das exigências físicas envolvidas e de suas condições de saúde para a prática das modalidades escolhidas."
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                    Arquivos do atleta
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ minHeight: 150, display: 'flex', alignItems: 'center', gap: 2, p: 2, border: '1px dashed #94a3b8', borderRadius: 1, backgroundColor: '#f8fafc' }}>
                    {form.photoUrl ? (
                      <Box component="img" src={form.photoUrl} alt="Prévia da foto do atleta" sx={{ width: 76, height: 100, flexShrink: 0, objectFit: 'cover', borderRadius: 1, border: '1px solid #cbd5e1' }} />
                    ) : (
                      <Box sx={{ width: 76, height: 100, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, backgroundColor: '#e2e8f0', color: '#64748b' }}>
                        <ImageOutlinedIcon />
                      </Box>
                    )}
                    <Stack spacing={1} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>Foto do atleta</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          {uploadInfo.photo || (form.photoUrl ? 'Foto já carregada' : 'Nenhuma foto selecionada')}
                        </Typography>
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
                    <Box sx={{ width: 76, height: 100, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, backgroundColor: '#e2e8f0', color: '#64748b' }}>
                      <DescriptionOutlinedIcon />
                    </Box>
                    <Stack spacing={1} sx={{ minWidth: 0, alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>Documento do atleta (RG ou CNH)</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          {uploadInfo.proof || (form.proofUrl ? 'Documento já carregado' : 'Nenhum documento selecionado')}
                        </Typography>
                      </Box>
                      <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />}>
                        {form.proofUrl ? 'Trocar documento' : 'Selecionar documento'}
                        <input hidden type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => handleFileField(event, 'proofUrl')} />
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
                        <Typography variant="subtitle2" fontWeight={700}>Comprovante de vínculo com o órgão</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                          {uploadInfo.affiliationProof || (form.affiliationProofUrl ? 'Comprovante de vínculo já carregado' : 'Declaração do RH, contrato, carteira de identificação ou crachá')}
                        </Typography>
                      </Box>
                      <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />}>
                        {form.affiliationProofUrl ? 'Trocar comprovante' : 'Selecionar comprovante'}
                        <input hidden type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => handleFileField(event, 'affiliationProofUrl')} />
                      </Button>
                    </Stack>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <ParticipationTermAcceptance
                    checked={form.participationTermAccepted}
                    onChange={(participationTermAccepted) => setForm((current) => ({ ...current, participationTermAccepted }))}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
                    <Button component={Link} to="/admin" variant="text">
                      Cancelar
                    </Button>
                    <Button type="submit" variant="contained" disabled={saving}>
                      {saving ? (editId ? 'Salvando...' : 'Cadastrando...') : (editId ? 'Salvar atleta' : 'Cadastrar atleta')}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
        <Snackbar
          open={successOpen}
          autoHideDuration={1600}
          onClose={(_, reason) => {
            if (reason === 'clickaway') return;
            setSuccessOpen(false);
            navigate('/admin');
          }}
        >
          <Alert severity="success">{success}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
