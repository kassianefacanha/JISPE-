import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useFeedback } from '../contexts/FeedbackContext';
import api, { getApiErrorMessage } from '../services/api';

const defaultControls = {
  entityRegistrationOpen: true,
  athleteRegistrationOpen: true,
};

export default function AdminRegistrationSettings({ entities }) {
  const { notify } = useFeedback();
  const [controls, setControls] = useState(defaultControls);
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [rules, setRules] = useState([]);
  const [loadingControls, setLoadingControls] = useState(true);
  const [loadingRules, setLoadingRules] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [error, setError] = useState('');

  const approvedEntities = useMemo(
    () => entities.filter((entity) => entity.status === 'approved'),
    [entities]
  );

  useEffect(() => {
    let mounted = true;
    api.get('/admin/registration-controls')
      .then((response) => {
        if (mounted) setControls(response.data.controls || defaultControls);
      })
      .catch((loadError) => {
        if (mounted) setError(getApiErrorMessage(loadError, 'Não foi possível carregar as travas de inscrição.'));
      })
      .finally(() => {
        if (mounted) setLoadingControls(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedEntityId && approvedEntities.length) {
      setSelectedEntityId(approvedEntities[0]._id);
    }
  }, [approvedEntities, selectedEntityId]);

  useEffect(() => {
    if (!selectedEntityId) {
      setRules([]);
      return undefined;
    }

    let mounted = true;
    setLoadingRules(true);
    setError('');
    api.get(`/admin/entities/${selectedEntityId}/modality-rules`)
      .then((response) => {
        if (mounted) setRules(response.data.rules || []);
      })
      .catch((loadError) => {
        if (mounted) setError(getApiErrorMessage(loadError, 'Não foi possível carregar as modalidades da entidade.'));
      })
      .finally(() => {
        if (mounted) setLoadingRules(false);
      });

    return () => { mounted = false; };
  }, [selectedEntityId]);

  const updateGlobalControl = async (field, value) => {
    const previous = controls[field];
    setControls((current) => ({ ...current, [field]: value }));
    try {
      const response = await api.patch('/admin/registration-controls', { [field]: value });
      setControls(response.data.controls);
      notify('Trava geral atualizada.', 'success');
    } catch (saveError) {
      setControls((current) => ({ ...current, [field]: previous }));
      notify(getApiErrorMessage(saveError, 'Não foi possível atualizar a trava geral.'));
    }
  };

  const updateRule = (modalitySlug, field, value) => {
    setRules((current) => current.map((rule) => (
      rule.modalitySlug === modalitySlug ? { ...rule, [field]: value } : rule
    )));
  };

  const saveRules = async () => {
    setSavingRules(true);
    try {
      await api.put(`/admin/entities/${selectedEntityId}/modality-rules`, {
        rules: rules.map((rule) => ({
          modalitySlug: rule.modalitySlug,
          enabled: rule.enabled,
          maxAthletes: rule.maxAthletes === '' || rule.maxAthletes == null ? null : Number(rule.maxAthletes),
        })),
      });
      notify('Regras por modalidade salvas.', 'success');
    } catch (saveError) {
      notify(getApiErrorMessage(saveError, 'Não foi possível salvar as regras por modalidade.'));
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="h6" fontWeight={700}>Controles gerais de inscrição</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} divider={<Box sx={{ borderColor: 'divider' }} />}>
          <FormControlLabel
            control={<Switch checked={controls.entityRegistrationOpen} disabled={loadingControls} onChange={(event) => updateGlobalControl('entityRegistrationOpen', event.target.checked)} />}
            label={<Box><Typography fontWeight={700}>Cadastro de entidades</Typography><Typography variant="body2" color="text.secondary">{controls.entityRegistrationOpen ? 'Recebendo novas solicitações' : 'Bloqueado para novos cadastros'}</Typography></Box>}
          />
          <FormControlLabel
            control={<Switch checked={controls.athleteRegistrationOpen} disabled={loadingControls} onChange={(event) => updateGlobalControl('athleteRegistrationOpen', event.target.checked)} />}
            label={<Box><Typography fontWeight={700}>Cadastro de atletas</Typography><Typography variant="body2" color="text.secondary">{controls.athleteRegistrationOpen ? 'Entidades podem cadastrar atletas' : 'Bloqueado para entidades'}</Typography></Box>}
          />
        </Stack>
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
        <Typography variant="h6" fontWeight={700}>Limites por modalidade e entidade</Typography>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 300 } }}>
          <InputLabel id="modality-rules-entity-label">Entidade aprovada</InputLabel>
          <Select
            labelId="modality-rules-entity-label"
            label="Entidade aprovada"
            value={selectedEntityId}
            onChange={(event) => setSelectedEntityId(event.target.value)}
            disabled={!approvedEntities.length}
          >
            {approvedEntities.map((entity) => <MenuItem key={entity._id} value={entity._id}>{entity.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      {!approvedEntities.length ? (
        <Alert severity="info">Não há entidades aprovadas para configurar.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Limites de cadastro por modalidade">
            <TableHead>
              <TableRow>
                <TableCell>Modalidade</TableCell>
                <TableCell>Categorias</TableCell>
                <TableCell align="center">Atletas cadastrados</TableCell>
                <TableCell align="center">Cadastro</TableCell>
                <TableCell align="center">Vagas por entidade</TableCell>
                <TableCell align="center">Situação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.map((rule) => {
                const full = rule.maxAthletes != null && rule.registeredCount >= rule.maxAthletes;
                return (
                  <TableRow key={rule.modalitySlug} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{rule.modalityName}</TableCell>
                    <TableCell>{rule.categories.join(', ') || '—'}</TableCell>
                    <TableCell align="center">{rule.registeredCount}</TableCell>
                    <TableCell align="center">
                      <Switch checked={rule.enabled} onChange={(event) => updateRule(rule.modalitySlug, 'enabled', event.target.checked)} inputProps={{ 'aria-label': `Permitir ${rule.modalityName}` }} />
                    </TableCell>
                    <TableCell align="center">
                      <TextField
                        type="number"
                        size="small"
                        value={rule.maxAthletes ?? ''}
                        onChange={(event) => updateRule(rule.modalitySlug, 'maxAthletes', event.target.value)}
                        inputProps={{ min: 1, step: 1, 'aria-label': `Vagas de ${rule.modalityName}` }}
                        placeholder="Sem limite"
                        sx={{ width: 130 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {!rule.enabled ? <Chip label="Bloqueada" color="error" size="small" /> : full ? <Chip label="Lotada" color="warning" size="small" /> : <Chip label="Aberta" color="success" size="small" />}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rules.length && !loadingRules && <TableRow><TableCell colSpan={6} align="center">Nenhuma modalidade disponível.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={saveRules} disabled={!selectedEntityId || loadingRules || savingRules}>
          {savingRules ? 'Salvando...' : 'Salvar limites'}
        </Button>
      </Stack>
    </Stack>
  );
}