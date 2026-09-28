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

## Credenciais iniciais

Admin padrão criado no seed:

- E-mail: admin@jispe.com
- Senha: jispe@2026

## Observações

- O scaffold foi montado conforme o escopo do projeto.
- Ajustes finais de logos, domínios, regras específicas e integrações com MongoDB Atlas/Cloudinary devem ser concluídos com a organização responsável.
- O ambiente atual ainda precisa de instalação do Node.js para validar execução local completa.
