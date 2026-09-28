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
- GET /api/entities
  - Lista entidades para admin
- PATCH /api/entities/:id/approve
  - Aprova entidade
- PATCH /api/entities/:id/reject
  - Rejeita entidade

### Atletas

- POST /api/athletes
  - Cadastro de atleta por entidade autenticada
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

- JWT expira em 7 dias.
- Entidades só pode logar após aprovação.
- CPF deve ser validado em todas as entradas de pessoa.
