import { Box } from '@mui/material';

export default function SystemLogo({ compact = false, sx = {} }) {
  return (
    <Box
      component="img"
      src="/logo.png"
      alt="JISPE 2026"
      sx={{
        display: 'block',
        width: compact ? 180 : 260,
        height: 'auto',
        objectFit: 'contain',
        ...sx,
      }}
    />
  );
}
