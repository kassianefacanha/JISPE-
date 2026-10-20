import { Alert, Button, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

export default function ParticipationTermAcceptance({ checked, onChange }) {
  return (
    <Alert severity="info">
      <Stack spacing={1}>
        <Typography variant="subtitle2" fontWeight={700}>
          Termo de Ciência JISPE 2026
        </Typography>
        <Typography variant="body2">
          Abra e leia o termo antes de confirmar o aceite.
        </Typography>
        <Button
          component="a"
          href="/Termo_de_Ciencia_JISPE_2026.pdf"
          target="_blank"
          rel="noreferrer"
          startIcon={<DescriptionOutlinedIcon />}
          sx={{ alignSelf: 'flex-start' }}
        >
          Abrir termo em PDF
        </Button>
        <FormControlLabel
          control={(
            <Checkbox
              required
              checked={checked}
              onChange={(event) => onChange(event.target.checked)}
            />
          )}
          label="Li e aceito o Termo de Ciência JISPE 2026."
        />
      </Stack>
    </Alert>
  );
}
