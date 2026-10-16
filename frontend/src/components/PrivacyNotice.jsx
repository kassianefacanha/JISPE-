import { Alert, Typography } from '@mui/material';

export default function PrivacyNotice() {
  return (
    <Alert severity="info" sx={{ mb: 2, alignItems: 'flex-start' }}>
      <Typography variant="body2">
        Os dados informados serão usados para administrar inscrições e a participação nos Jogos dos Servidores 2026. Informações sobre PCD, alergias e condições especiais são dados sensíveis de saúde; informe-as apenas quando necessárias para acessibilidade e segurança. O acesso é restrito às equipes autorizadas. A consulta pública da carteirinha pode exibir nome, foto, matrícula, categoria, modalidade, naipe e entidade, mas não exibe CPF, documentos ou informações de saúde. Para exercer seus direitos sobre os dados, procure a organização do evento pelos canais oficiais.
      </Typography>
    </Alert>
  );
}