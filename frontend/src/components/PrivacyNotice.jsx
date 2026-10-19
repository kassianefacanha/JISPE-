import { Alert, Checkbox, FormControlLabel, Typography } from '@mui/material';

export default function PrivacyNotice({ checked, onChange }) {
  return (
    <Alert severity="info" sx={{ mb: 2, alignItems: 'flex-start' }}>
      <Typography variant="body2" component="p" sx={{ mb: 1 }}>
        Ao cadastrar e enviar estes dados, declaro que li e estou ciente de que eles serão tratados para administrar as inscrições e a participação nos Jogos dos Servidores 2026. Informações sobre PCD, alergias e condições especiais são dados pessoais sensíveis e devem ser informadas apenas quando necessárias para acessibilidade e segurança. O acesso aos dados é restrito às equipes autorizadas. A consulta pública da carteirinha poderá exibir nome, foto, matrícula, categoria, modalidade, naipe e órgão; CPF, documentos e informações de saúde não serão exibidos. Para exercer direitos relativos aos dados, procure a organização do evento pelos canais oficiais. Se estou cadastrando dados de outra pessoa, confirmo que ela ou seu representante legal foi informado(a) sobre esse tratamento.
      </Typography>
      <FormControlLabel
        control={<Checkbox required checked={checked} onChange={(event) => onChange(event.target.checked)} />}
        label="Li e estou ciente das informações acima e confirmo que o titular dos dados (ou seu representante legal) foi informado(a)."
      />
    </Alert>
  );
}