require('dotenv').config();

const { checkConnection } = require('../services/r2Storage');

checkConnection()
  .then(() => console.log('Conexão R2 funcionando: upload, leitura e exclusão confirmados.'))
  .catch((error) => {
    console.error(`Falha ao testar o R2 (${error.name || 'erro'}). Confira as credenciais, bucket e permissão Object Read & Write.`);
    process.exitCode = 1;
  });