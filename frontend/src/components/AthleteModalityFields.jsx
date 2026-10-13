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
  Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const legacyModalityNames = new Set([
  'natacao-revezamento-masculino',
  'natacao-revezamento-feminino',
  'natacao-revezamento-misto',
  'Natação Revezamento masculino',
  'Natação Revezamento feminino',
  'Natação Revezamento misto',
  'volei-de-praia-4x4-misto',
  'volei-de-praia-4x4-masculino',
  'volei-de-praia-4x4-feminino',
  'Vôlei de praia 4x4 Misto',
  'Vôlei de praia 4x4 Masculino',
  'Vôlei de praia 4x4 Feminino',
]);

const legacyModalityNamesByCanonical = new Map([
  ['natacao-revezamento', 'Natação Revezamento'],
  ['natacao-revezamento-masculino', 'Natação Revezamento'],
  ['natacao-revezamento-feminino', 'Natação Revezamento'],
  ['natacao-revezamento-misto', 'Natação Revezamento'],
  ['Natação Revezamento masculino', 'Natação Revezamento'],
  ['Natação Revezamento feminino', 'Natação Revezamento'],
  ['Natação Revezamento misto', 'Natação Revezamento'],
  ['volei-de-praia-4x4', 'Vôlei de praia 4x4'],
  ['volei-de-praia-4x4-misto', 'Vôlei de praia 4x4'],
  ['volei-de-praia-4x4-masculino', 'Vôlei de praia 4x4'],
  ['volei-de-praia-4x4-feminino', 'Vôlei de praia 4x4'],
  ['Vôlei de praia 4x4 Misto', 'Vôlei de praia 4x4'],
  ['Vôlei de praia 4x4 Masculino', 'Vôlei de praia 4x4'],
  ['Vôlei de praia 4x4 Feminino', 'Vôlei de praia 4x4'],
]);

const getModalityDefinition = (modalities, value) => modalities.find((modality) => (
  [modality.name, modality.slug, ...(modality.legacyNames || []), ...(modality.legacySlugs || [])].includes(value)
));

export const getAthleteModalityRegistrations = (athlete, modalities = []) => {
  const savedEntries = athlete.modalityRegistrations?.length
    ? athlete.modalityRegistrations
    : (athlete.modalities?.length ? athlete.modalities : [athlete.modality].filter(Boolean))
      .map((modality) => ({ modality, naipe: athlete.naipe || athlete.gender || '' }));
  const entries = savedEntries.map((entry) => {
    const savedName = typeof entry === 'string' ? entry : entry.modality;
    const definition = getModalityDefinition(modalities, savedName);
    const modality = definition?.name || (legacyModalityNames.has(savedName) ? legacyModalityNamesByCanonical.get(savedName) : savedName);
    return {
      modality,
      naipe: typeof entry === 'string' ? athlete.naipe || athlete.gender || '' : entry.naipe || '',
    };
  });

  return entries.length ? entries : [{ modality: '', naipe: '' }];
};

export default function AthleteModalityFields({ modalities, entries, raceRegistrationOpen, onChange }) {
  const updateEntry = (index, changes) => {
    onChange(entries.map((entry, entryIndex) => (
      entryIndex === index ? { ...entry, ...changes } : entry
    )));
  };

  const selectModality = (index, modalityName) => {
    const definition = getModalityDefinition(modalities, modalityName);
    const otherBinaryNaipe = entries.find((entry, entryIndex) => (
      entryIndex !== index && ['masculino', 'feminino'].includes(entry.naipe)
    ))?.naipe;
    const allowedGenders = (definition?.genders || []).filter((gender) => (
      gender === 'misto' || !otherBinaryNaipe || gender === otherBinaryNaipe
    ));
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
        const otherBinaryNaipe = entries.find((otherEntry, otherIndex) => (
          otherIndex !== index && ['masculino', 'feminino'].includes(otherEntry.naipe)
        ))?.naipe;
        const allowedGenders = (definition?.genders || []).filter((gender) => (
          gender === 'misto' || !otherBinaryNaipe || gender === otherBinaryNaipe
        ));
        return (
          <Box key={`${entry.modality || 'new'}-${index}`} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <FormControl fullWidth required>
                  <InputLabel id={`athlete-modality-${index}`}>Modalidade</InputLabel>
                  <Select
                    labelId={`athlete-modality-${index}`}
                    label="Modalidade"
                    value={entry.modality}
                    onChange={(event) => selectModality(index, event.target.value)}
                  >
                    <MenuItem value="">Selecione a modalidade</MenuItem>
                    {modalities.map((modality) => {
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
              <Grid item xs={12} md={5}>
                <FormControl fullWidth required disabled={!definition}>
                  <InputLabel id={`athlete-naipe-${index}`}>Naipe</InputLabel>
                  <Select
                    labelId={`athlete-naipe-${index}`}
                    label="Naipe"
                    value={entry.naipe}
                    onChange={(event) => updateEntry(index, { naipe: event.target.value })}
                  >
                    <MenuItem value="">Selecione o naipe</MenuItem>
                    {allowedGenders.map((gender) => (
                      <MenuItem key={gender} value={gender}>
                        {gender === 'masculino' ? 'Masculino' : gender === 'feminino' ? 'Feminino' : 'Misto'}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
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
