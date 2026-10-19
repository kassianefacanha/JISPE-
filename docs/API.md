# API JISPE 2026

## Base URL

- Local: http://localhost:5000/api
- Produção: https://<backend-render-url>/api

## Endpoints principais

### Autenticação

- POST /api/auth/login
  - Body: { email, password }
  - Retorna JWT para admin ou entidade aprovada

### Entidades

- POST /api/entities/register
  - Cadastro de entidade pública
  - Requer `privacyConsentConfirmed: true`; a confirmação é registrada com data, declarante e versão do termo
- POST /api/entities e PUT /api/entities/:id
  - Cadastro e atualização administrativa; também requerem `privacyConsentConfirmed: true`
- GET /api/entities
  - Lista entidades para admin
- PATCH /api/entities/:id/approve
  - Aprova entidade
- PATCH /api/entities/:id/reject
  - Rejeita entidade

### Atletas

- GET /api/public/entities
  - Lista os órgãos aprovados para o cadastro público de atletas
- POST /api/athletes/self-register
  - Cadastro público de atleta; inicia como pendente e exige aprovação do órgão escolhido
- Cadastros feitos por administrador ou órgão autenticado
  - São considerados aprovados automaticamente
- POST /api/athletes
  - Cadastro de atleta por entidade autenticada
  - Requer RG/CNH, comprovante de vínculo e atestado médico em JPG, PNG, WebP ou PDF (até 3 MiB cada)
  - Requer `privacyConsentConfirmed: true`; a confirmação é registrada com data, declarante e versão do termo
- PATCH /api/athletes/:id/approve
  - Aprovação do cadastro pelo órgão; envia aviso ao e-mail informado pelo atleta
- GET /api/admin/registration-controls e PATCH /api/admin/registration-controls
  - Admin pode consultar/alterar `selfAthleteRegistrationOpen` para abrir ou fechar o cadastro direto feito pelos atletas; essa trava é independente do cadastro feito pelos órgãos
- PUT /api/athletes/:id
  - Atualização de atleta; também requer `privacyConsentConfirmed: true`
- POST /api/athletes/:id/registrations
  - Inscreve atleta em modalidade

### Modalidades

- GET /api/modalities
  - Lista modalidades ativas

### Carteirinha pública

- GET /api/public/validate/:matricula
  - Validação da carteirinha por matrícula

### Relatórios

- GET /api/reports/athletes?format=xlsx
  - Exporta planilha Excel para admin

## Observações

- JWT expira em 24 horas.
- Entidades só pode logar após aprovação.
- CPF deve ser validado em todas as entradas de pessoa.
