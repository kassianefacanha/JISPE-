# JISPE 2026

Aplicação full-stack para os Jogos da Integração do Servidor Público Estadual 2026.

## Visão geral

Este repositório foi inicializado como monorepo para o sistema JISPE 2026, com estrutura preparada para:

- Backend em Node.js + Express
- Frontend em React + Vite + TailwindCSS
- Modelos iniciais de entidade, atleta, admin, modalidade, matrícula e inscrições
- Documentação básica de API e manuais
- Configuração de deploy para Render, Vercel e GitHub Actions

## Estrutura inicial

```bash
jispe-2026/
├── backend/
│   ├── src/
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   ├── index.html
│   └── package.json
├── docs/
├── .github/
├── .gitignore
├── package.json
├── render.yaml
├── vercel.json
├── README.md
└── .
```

## Como iniciar

1. Instalar o Node.js e o npm
2. No diretório raiz executar:

```bash
npm install
```

3. Iniciar o backend:

```bash
npm run dev:backend
```

4. Iniciar o frontend:

```bash
npm run dev:frontend
```

## Uploads no Cloudflare R2

O bucket deve permanecer privado. Configure no Render `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET_NAME`; as chaves devem ser secrets do serviço, nunca variáveis `VITE_*` ou arquivos commitados. Em produção, o backend não inicia sem R2 e MongoDB configurados.

Para testar as credenciais locais sem mostrá-las, preencha `backend/.env` e execute:

```bash
npm --prefix backend run check:r2
```

O teste cria um objeto temporário, lê e compara o conteúdo, e o apaga ao terminar. Ele precisa de permissão de leitura e gravação no bucket.

Para e-mails transacionais, configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` localmente e no Render. Use credenciais SMTP de um provedor de e-mail; não reutilize a senha da conta de e-mail. O sistema envia confirmações de cadastro da entidade e do atleta, avisos de aprovação/rejeição e alertas de alteração de senha. A redefinição está disponível para entidades, usa token de uso único válido por 30 minutos e revoga sessões antigas. Falhas no envio são registradas sem desfazer o cadastro, alteração ou decisão já concluída.

O script de migração roda primeiro em simulação:

```bash
npm --prefix backend run migrate:r2
```

Para aplicar, faça um backup do MongoDB, configure as mesmas variáveis R2 e `MONGODB_URI` no ambiente que executará o script, e defina `R2_MIGRATION_APPLY=true` e `R2_MIGRATION_CONFIRM=I_UNDERSTAND`. Essa confirmação é exigida em qualquer ambiente. Execute novamente:

```bash
npm --prefix backend run migrate:r2
```

Verifique os arquivos no bucket e teste cadastro, visualização e download antes de remover qualquer backup. Comprovantes continuam privados e são servidos por links assinados de curta duração.

## Administrador inicial

No primeiro início, se não houver nenhum administrador, o backend cria um usando `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Configure esses valores em `backend/.env` localmente ou nos secrets do Render antes de iniciar uma base vazia. A senha precisa ter pelo menos 16 caracteres; ela é armazenada somente como hash bcrypt. Depois que existir um administrador, essas variáveis não alteram a conta.

O seed de desenvolvimento continua destrutivo e só deve ser usado em banco descartável. Ele exige `SEED_ENTITY_PASSWORD` para as entidades de teste e usa as mesmas variáveis `ADMIN_*` para criar o administrador após limpar o banco.

## Observações

- O scaffold foi montado conforme o escopo do projeto.
- Ajustes finais de logos, domínios, regras específicas e integrações com MongoDB Atlas/Cloudinary devem ser concluídos com a organização responsável.
- O ambiente atual ainda precisa de instalação do Node.js para validar execução local completa.
