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
  FormControlLabel,
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
import PrivacyNotice from '../components/PrivacyNotice';
import ParticipationTermAcceptance from '../components/ParticipationTermAcceptance';
import { getAutomaticAgeCategory, hasCompletedMinimumAge } from '../utils/athleteAge';
import { normalizeModalityCatalog } from '../utils/externalRegistrationModality';
import AthleteModalityFields, { getAthleteModalityRegistrations } from '../components/AthleteModalityFields';
import api, { getApiErrorMessage } from '../services/api';
import { useFeedback } from '../contexts/FeedbackContext';

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

export default function EntityAthleteCreatePage({ selfRegistration = false }) {
  const { notify } = useFeedback();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const athleteId = searchParams.get('id');
  const isEditing = Boolean(athleteId);
  const [form, setForm] = useState(emptyForm);
  const [modalities, setModalities] = useState([]);
  const [entities, setEntities] = useState([]);
  const [uploadInfo, setUploadInfo] = useState({ photo: '', proof: '', affiliationProof: '' });
  const [saving, setSaving] = useState(false);
  const [athleteRegistrationOpen, setAthleteRegistrationOpen] = useState(true);
  const [selfAthleteRegistrationOpen, setSelfAthleteRegistrationOpen] = useState(true);
  const [raceRegistrationOpen, setRaceRegistrationOpen] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const primaryModality = modalities.find((modality) => (
    [modality.name, modality.slug, ...(modality.legacyNames || []), ...(modality.legacySlugs || [])]
      .includes(form.modalityRegistrations[0]?.modality)
  ));
  const calculatedAgeCategory = getAutomaticAgeCategory(form.birthDate, primaryModality?.name, primaryModality?.categories || []);
  useEffect(() => {
    api.get('/modalities')
      .then((response) => setModalities(normalizeModalityCatalog(response.data.modalities || [])))
      .catch((loadError) => setError(getApiErrorMessage(loadError, 'Não foi possível carregar as modalidades.')));
  }, []);

  useEffect(() => {
    api.get('/public/registration-status')
      .then((response) => {
        setAthleteRegistrationOpen(response.data.athleteRegistrationOpen !== false);
        setSelfAthleteRegistrationOpen(response.data.selfAthleteRegistrationOpen !== false);
        setRaceRegistrationOpen(response.data.raceRegistrationOpen !== false);
      })
      .catch((loadError) => setError(getApiErrorMessage(loadError, 'Não foi possível verificar se o cadastro está aberto.')));
  }, []);

  useEffect(() => {
    if (!selfRegistration) return undefined;
    let active = true;
    api.get('/public/entities')
      .then((response) => {
        if (active) setEntities(response.data.entities || []);
      })
      .catch((loadError) => {
        if (active) setError(getApiErrorMessage(loadError, 'Não foi possível carregar a lista de órgãos.'));
      });
    return () => { active = false; };
  }, [selfRegistration]);

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
          affiliationProofUrl: athlete.affiliationProofUrl || '',
          modalityRegistrations: getAthleteModalityRegistrations(athlete, modalities),
          isPcd: Boolean(athlete.isPcd),
          hasAllergy: Boolean(athlete.hasAllergy),
          allergyDetails: athlete.allergyDetails || '',
          hasSpecialCondition: Boolean(athlete.hasSpecialCondition),
          specialConditionDetails: athlete.specialConditionDetails || '',
          privacyConsentConfirmed: false,
          participationTermAccepted: false,
        });
        setUploadInfo({
          photo: athlete.photoUrl ? 'Foto já carregada' : '',
          proof: athlete.proofUrl ? 'Documento já carregado' : '',
          affiliationProof: athlete.affiliationProofUrl ? 'Comprovante de vínculo já carregado' : '',
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
      setUploadInfo((current) => ({
        ...current,
        [fieldName === 'photoUrl' ? 'photo'
          : fieldName === 'affiliationProofUrl' ? 'affiliationProof' : 'proof']: file.name,
      }));
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
    if (selfRegistration && !form.entityId) return setError('Selecione o órgão ao qual você está vinculado(a).');
    if (!isValidCPF(form.cpf)) return setError('CPF do atleta inválido.');
    if (!form.birthDate) return setError('Informe a data de nascimento do atleta.');
    if (!hasCompletedMinimumAge(form.birthDate)) return setError('O atleta precisa já ter completado 18 anos para se cadastrar.');
    if (!isValidPhone(form.phone)) return setError('Informe um telefone válido com DDD (10 ou 11 dígitos).');
    if (!isValidEmail(form.email)) return setError('Informe um e-mail válido do atleta.');
    if (!form.modalityRegistrations.length || form.modalityRegistrations.some((entry) => !entry.modality)) return setError('Selecione uma modalidade para cada inscrição.');
    if (form.modalityRegistrations.some((entry) => !entry.naipe)) return setError('Selecione o naipe de cada modalidade.');
    if (!form.photoUrl) return setError('Selecione a foto do atleta.');
    if (!form.proofUrl) return setError('Selecione o comprovante do atleta.');
    if (!form.affiliationProofUrl) return setError('Selecione o comprovante de vínculo com o órgão.');
    if (!form.participationTermAccepted) return setError('Leia e aceite o Termo de Ciência JISPE 2026.');
    if (!form.privacyConsentConfirmed) return setError('Leia e confirme o termo de ciência sobre o tratamento de dados.');
    if (!isEditing && !form.fitnessDeclarationConfirmed) {
      return setError('Confirme que o atleta declarou estar apto para participar das atividades.');
    }

    try {
      setSaving(true);
      const firstRegistration = form.modalityRegistrations[0];
      const payload = {
        ...form,
        modality: firstRegistration.modality,
        modalities: form.modalityRegistrations.map((entry) => entry.modality),
        naipe: firstRegistration.naipe,
        gender: firstRegistration.naipe,
      };
      if (isEditing) {
        await api.put(`/athletes/${athleteId}`, payload);
      } else if (selfRegistration) {
        await api.post('/athletes/self-register', payload);
      } else {
        await api.post('/athletes', payload);
      }
      const message = isEditing
        ? 'Dados do atleta atualizados com sucesso.'
        : selfRegistration
          ? 'Solicitação enviada. O órgão selecionado precisa aprovar seu cadastro; você receberá um e-mail após a aprovação.'
          : 'Atleta cadastrado com sucesso.';
      setSuccess(message);
      notify(message, 'success');
      if (isEditing) {
        navigate('/entity');
      } else {
        setForm({ ...emptyForm, entityId: selfRegistration ? form.entityId : '' });
        setUploadInfo({ photo: '', proof: '', affiliationProof: '' });
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
                <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 3, fontWeight: 800 }}>{selfRegistration ? 'Atleta' : 'Órgão'}</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: 22, sm: 34 }, lineHeight: 1.15 }}>{isEditing ? 'Editar atleta' : selfRegistration ? 'Cadastro de atleta' : 'Cadastrar atleta'}</Typography>
              </Box>
            </Box>
            <Button component={Link} to={selfRegistration ? '/login' : '/entity'} variant="outlined">{selfRegistration ? 'Voltar ao login' : 'Voltar ao painel'}</Button>
          </Stack>
        </Paper>

        <Card>
          <CardContent sx={{ p: { xs: 2, md: 4 } }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>{isEditing ? 'Editar dados do atleta' : 'Dados do atleta'}</Typography>
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {!athleteRegistrationOpen && !selfRegistration && !isEditing && <Alert severity="warning" sx={{ mb: 2 }}>O cadastro de atletas pelos órgãos está temporariamente fechado pelo administrador.</Alert>}
              {selfRegistration && !selfAthleteRegistrationOpen && <Alert severity="warning" sx={{ mb: 2 }}>O cadastro direto de atletas está temporariamente fechado pelo administrador. Tente novamente quando as inscrições forem liberadas.</Alert>}
              {!raceRegistrationOpen && <Alert severity="warning" sx={{ mb: 2 }}>As inscrições para a corrida foram encerradas: limite de 3.000 corredores atingido.</Alert>}
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
              {selfRegistration && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Após enviar seus dados, o órgão escolhido analisará e aprovará o cadastro. O acesso às atividades e à carteirinha só será liberado após a aprovação.
                </Alert>
              )}
              <PrivacyNotice
                checked={form.privacyConsentConfirmed}
                onChange={(privacyConsentConfirmed) => setForm((current) => ({ ...current, privacyConsentConfirmed }))}
              />
              <Alert severity="info" sx={{ mb: 2 }}>
                As inscrições para os torneios de Beach Tennis dos Jogos dos Servidores 2026 devem ser realizadas exclusivamente pelo site{' '}
                <a href="https://www.beachtennisgovce.com.br/" target="_blank" rel="noreferrer">beachtennisgovce.com.br</a>.
              </Alert>

              <Grid container spacing={2.5}>
                {selfRegistration && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      required
                      select
                      label="Órgão ao qual está vinculado(a)"
                      value={form.entityId}
                      onChange={(event) => setForm((current) => ({ ...current, entityId: event.target.value }))}
                    >
                      <MenuItem value=""><em>Selecione um órgão</em></MenuItem>
                      {entities.map((entity) => (
                        <MenuItem key={entity._id} value={entity._id}>{entity.name}</MenuItem>
                      ))}
                    </TextField>
                    {!entities.length && <Typography variant="caption" color="text.secondary">Não há órgãos aprovados disponíveis para cadastro.</Typography>}
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight={700}>Dados pessoais</Typography>
                  <Divider sx={{ mt: 1 }} />
                </Grid>
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
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 1, mb: 0.5 }}>Saúde e acessibilidade</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Informe essas condições quando necessário para garantir acessibilidade e segurança.
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ p: { xs: 1.5, sm: 2 }, border: '1px solid', borderColor: 'divider', borderRadius: 2, backgroundColor: '#fafafa' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={<Checkbox checked={form.isPcd} onChange={(event) => setForm({ ...form, isPcd: event.target.checked })} />}
                          label="Atleta é PCD"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={<Checkbox checked={form.hasAllergy} onChange={(event) => setForm((current) => ({
                            ...current,
                            hasAllergy: event.target.checked,
                            allergyDetails: event.target.checked ? current.allergyDetails : '',
                          }))} />}
                          label="Possui alergia"
                        />
                        {form.hasAllergy && (
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            sx={{ mt: 1 }}
                            label="Quais alergias?"
                            value={form.allergyDetails}
                            onChange={(event) => setForm({ ...form, allergyDetails: event.target.value })}
                          />
                        )}
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={<Checkbox checked={form.hasSpecialCondition} onChange={(event) => setForm((current) => ({
                            ...current,
                            hasSpecialCondition: event.target.checked,
                            specialConditionDetails: event.target.checked ? current.specialConditionDetails : '',
                          }))} />}
                          label="Possui condição especial"
                        />
                        {form.hasSpecialCondition && (
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            sx={{ mt: 1 }}
                            label="Descreva a condição especial"
                            value={form.specialConditionDetails}
                            onChange={(event) => setForm({ ...form, specialConditionDetails: event.target.value })}
                          />
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
                {!isEditing && (
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
                      label={selfRegistration
                        ? 'Declaro estar apto(a) a participar das atividades físicas e esportivas dos Jogos da Integração do Servidor Público Estadual (JISPE), ciente das exigências físicas envolvidas e de minhas condições de saúde para a prática das modalidades escolhidas.'
                        : 'Atesto que o(a) atleta declarou estar apto(a) a participar das atividades físicas e esportivas dos Jogos da Integração do Servidor Público Estadual (JISPE), ciente das exigências físicas envolvidas e de suas condições de saúde para a prática das modalidades escolhidas.'}
                    />
                  </Grid>
                )}
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Documentos do atleta</Typography>
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
                        <Typography variant="subtitle2" fontWeight={700}>Documento do atleta (RG ou CNH)</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{uploadInfo.proof || (form.proofUrl ? 'Documento já carregado' : 'Nenhum documento selecionado')}</Typography>
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
                    <Box sx={{ width: 76, height: 100, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1, backgroundColor: '#e2e8f0', color: '#64748b' }}><DescriptionOutlinedIcon /></Box>
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
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                {!selfRegistration && <Button component={Link} to="/entity" variant="text">Cancelar</Button>}
                {selfRegistration && <Button component={Link} to="/login" variant="text">Cancelar</Button>}
                <Button type="submit" variant="contained" disabled={saving || (!isEditing && selfRegistration && !selfAthleteRegistrationOpen) || (!isEditing && !selfRegistration && !athleteRegistrationOpen) || (selfRegistration && !entities.length)}>
                  {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : selfRegistration ? selfAthleteRegistrationOpen ? 'Enviar cadastro para aprovação' : 'Cadastro fechado' : athleteRegistrationOpen ? 'Cadastrar atleta' : 'Cadastro fechado'}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}