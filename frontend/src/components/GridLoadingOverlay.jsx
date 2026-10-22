import { Box, CircularProgress, Typography } from '@mui/material';

export default function GridLoadingOverlay() {
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, height: '100%', color: 'text.secondary' }}
    >
      <CircularProgress size={20} />
      <Typography variant="body2">Carregando dados...</Typography>
    </Box>
  );
}
