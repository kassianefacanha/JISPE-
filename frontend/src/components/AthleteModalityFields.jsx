import {
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getAutomaticAgeCategory } from '../utils/athleteAge';

const legacySwimmingNames = new Set([
  'natacao-revezamento-masculino',
  'natacao-revezamento-feminino',
  'natacao-revezamento-misto',
  'Natação Revezamento masculino',
  'Natação Revezamento feminino',
  'Natação Revezamento misto',
]);

const getModalityDefinition = (modalities, value) => modalities.find((modality) => (
  [modality.name, modality.slug, ...(modality.legacyNames || []), ...(modality.legacySlugs || [])].includes(value)
));

export const getAthleteModalityRegistrations = (athlete, modalities = []) => {
  const savedEntries = athlete.modalityRegistrations?.length
    ? athlete.modalityRegistrations
    : (athlete.modalities?.length ? athlete.modalities : [athlete.modality].filter(Boolean))
      .map((modality) => ({ modality, naipe: athlete.naipe || athlete.gender || '' }));
  const uniqueEntries = new Map();

  savedEntries.forEach((entry) => {
    const savedName = typeof entry === 'string' ? entry : entry.modality;
    const definition = getModalityDefinition(modalities, savedName);
    const modality = definition?.name || (legacySwimmingNames.has(savedName) ? 'Natação Revezamento' : savedName);
    if (modality && !uniqueEntries.has(modality)) {
      uniqueEntries.set(modality, {
        modality,
        naipe: typeof entry === 'string' ? athlete.naipe || athlete.gender || '' : entry.naipe || '',
      });
    }
  });

  return uniqueEntries.size ? [...uniqueEntries.values()] : [{ modality: '', naipe: '' }];
};

export default function AthleteModalityFields({ modalities, entries, birthDate, raceRegistrationOpen, onChange }) {
  const updateEntry = (index, changes) => {
    onChange(entries.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, ...changes } : entry
    )));
  };

  const selectModality = (index, modalityName) => {
    const definition = getModalityDefinition(modalities, modalityName);
    const allowedGenders = definition?.genders || [];
    const currentNaipe = entries[index]?.naipe;
    updateEntry(index, {
      modality: modalityName,
      naipe: allowedGenders.includes(currentNaipe) ? currentNaipe : allowedGenders[0] || '',
    });
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" fontWeight={700}>Modalidades e naipes</Typography>
      {entries.map((entry, index) => {
        const definition = getModalityDefinition(modalities, entry.modality);
        const availableModalities = modalities.filter((modality) => (
          (modality.name || modality.slug) === entry.modality
          || !entries.some((otherEntry, otherIndex) => (
            otherIndex !== index && otherEntry.modality === (modality.name || modality.slug)
          ))
        ));
        const ageCategory = getAutomaticAgeCategory(birthDate, definition?.name, definition?.categories || []);

        return (
          <Box key={`${entry.modality || 'new'}-${index}`} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth required>
                  <InputLabel id={`athlete-modality-${index}`}>Modalidade</InputLabel>
                  <Select
                    labelId={`athlete-modality-${index}`}
                    label="Modalidade"
                    value={entry.modality}
                    onChange={(event) => selectModality(index, event.target.value)}
                  >
                    <MenuItem value="">Selecione a modalidade</MenuItem>
                    {availableModalities.map((modality) => {
                      const modalityName = modality.name || modality.slug;
                      const isClosedRace = !raceRegistrationOpen && modality.slug === 'corrida-5km' && entry.modality !== modalityName;
                      return (
                        <MenuItem key={modality._id || modality.slug} value={modalityName} disabled={isClosedRace}>
                          {modalityName}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth required disabled={!definition}>
                  <InputLabel id={`athlete-naipe-${index}`}>Naipe</InputLabel>
                  <Select
                    labelId={`athlete-naipe-${index}`}
                    label="Naipe"
                    value={entry.naipe}
                    onChange={(event) => updateEntry(index, { naipe: event.target.value })}
                  >
                    <MenuItem value="">Selecione o naipe</MenuItem>
                    {(definition?.genders || []).map((gender) => (
                      <MenuItem key={gender} value={gender}>
                        {gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Misto'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  disabled
                  label="Categoria etária (automática)"
                  value={ageCategory || (birthDate && definition ? 'Categoria não definida' : 'Informe nascimento e modalidade')}
                />
              </Grid>
              <Grid item xs={12} md={1}>
                {entries.length > 1 && (
                  <IconButton
                    aria-label={`Remover modalidade ${index + 1}`}
                    title="Remover modalidade"
                    onClick={() => onChange(entries.filter((_, entryIndex) => entryIndex !== index))}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          </Box>
        );
      })}
      <Box>
        <Button startIcon={<AddOutlinedIcon />} onClick={() => onChange([...entries, { modality: '', naipe: '' }])}>
          Adicionar modalidade
        </Button>
      </Box>
    </Stack>
  );
}
