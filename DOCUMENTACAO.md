# 📖 Documentação Completa - Projeto Rua do Céu

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#tecnologias-utilizadas)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Banco de Dados](#banco-de-dados)
6. [API - Endpoints](#api---endpoints)
7. [Autenticação e Segurança](#autenticação-e-segurança)
8. [Instalação e Configuração](#instalação-e-configuração)
9. [Desenvolvimento](#desenvolvimento)
10. [Deploy](#deploy)
11. [Testes](#testes)
12. [Troubleshooting](#troubleshooting)
13. [Contribuindo](#contribuindo)
14. [Licença](#licença)

---

## 🎯 Visão Geral

### O que é o Projeto Rua do Céu?

O **Projeto Rua do Céu** é uma plataforma web fullstack desenvolvida para auxiliar organizações sociais no gerenciamento de crianças em situação de vulnerabilidade. O sistema permite:

- ✅ Cadastro e acompanhamento de crianças atendidas
- ✅ Gestão de locais de atendimento
- ✅ Registro de check-ins (presença/frequência)
- ✅ Controle de doações recebidas e distribuídas
- ✅ Gerenciamento de colaboradores com sistema de aprovação
- ✅ Relatórios e dashboards com estatísticas detalhadas
- ✅ Sistema de tags de saúde (alergias, condições médicas)
- ✅ Auditoria completa de operações
- ✅ Autenticação segura com **Google OAuth 2.0** e **recuperação de senha**
- ✅ Página dedicada para **aniversariantes** com filtros e exportação

### Objetivos Principais

1. **Centralização de Dados**: Manter todas as informações de crianças, locais e doações em um único lugar
2. **Acompanhamento**: Registrar frequência e participação das crianças em atividades
3. **Relatórios**: Gerar relatórios e análises para tomada de decisão
4. **Segurança**: Proteger dados sensíveis com autenticação e controle de acesso
5. **Auditoria**: Rastrear todas as operações para conformidade e transparência

---

## 🏗️ Arquitetura do Sistema

### Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      CAMADA DE APRESENTAÇÃO                 │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Frontend - React + Vite + TypeScript                │  │
│  │  - Interface do Usuário (UI/UX)                      │  │
│  │  - Gerenciamento de Estado (React Query)             │  │
│  │  - Validação de Formulários (Zod)                    │  │
│  │  - Roteamento (React Router)                         │  │
│  │  - Porta: 5173 (desenvolvimento)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS (REST API)
                        │ Autenticação: JWT Bearer Token / Google OAuth 2.0
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE APLICAÇÃO                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Backend - Node.js + Express.js                      │  │
│  │  - Rotas da API (RESTful)                            │  │
│  │  - Middleware de Autenticação/Autorização            │  │
│  │  - Validação de Dados (express-validator)            │  │
│  │  - Logs e Auditoria (morgan)                         │  │
│  │  - Documentação (Swagger)                            │  │
│  │  - Porta: 5000 (desenvolvimento)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Prisma ORM
                        │ Connection Pool
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   CAMADA DE PERSISTÊNCIA                    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Neon Database)                          │  │
│  │  - Armazenamento de Dados                            │  │
│  │  - Relacionamentos e Constraints                     │  │
│  │  - Indexes para Performance                          │  │
│  │  - SSL/TLS Connection                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Usuário  │─────▶│ Frontend │─────▶│ Backend  │─────▶│   DB     │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
     ▲                 │                  │                  │
     │                 │                  │                  │
     │                 ▼                  ▼                  ▼
     │            Validação          Autenticação        Query
     │            React/Zod       JWT/Google OAuth       Prisma
     │                 │                  │                  │
     │                 │                  │                  │
     └─────────────────┴──────────────────┴──────────────────┘
                      Resposta com Dados
```

---

## 💻 Tecnologias Utilizadas

### Frontend

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **React** | 18.x | Biblioteca para construção de UI |
| **Vite** | 5.x | Build tool e dev server |
| **TypeScript** | 5.x | Superset JavaScript com tipagem |
| **React Router** | 6.x | Roteamento SPA |
| **React Query** | 5.x | Gerenciamento de estado server |
| **Axios** | 1.x | Cliente HTTP |
| **Zod** | 3.x | Validação de schemas |
| **Tailwind CSS** | 3.x | Framework CSS utility-first |
| **Lucide React** | - | Biblioteca de ícones |
| **xlsx** | - | Exportação para Excel |
| **jspdf** | - | Exportação para PDF |
| **jspdf-autotable** | - | Geração de tabelas em PDF |

### Backend

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **Node.js** | 18.x+ | Runtime JavaScript |
| **Express.js** | 4.x | Framework web |
| **Prisma ORM** | 5.6.x | ORM para TypeScript/Node.js |
| **PostgreSQL** | 15.x | Banco de dados relacional |
| **JWT** | 9.x | Autenticação via tokens |
| **google-auth-library** | - | Biblioteca oficial do Google para OAuth 2.0 |
| **bcryptjs** | 2.x | Hash de senhas |
| **Helmet** | 7.x | Segurança HTTP headers |
| **CORS** | 2.x | Cross-Origin Resource Sharing |
| **Morgan** | 1.x | HTTP request logger |
| **Swagger** | 5.x/6.x | Documentação API |
| **express-validator** | 7.x | Validação de dados |
| **express-rate-limit** | 7.x | Rate limiting |

### Infraestrutura

| Serviço | Uso |
|---------|-----|
| **Neon** | PostgreSQL Serverless (Database) |
| **Render** | Deploy do Backend (opcional) |
| **Vercel** | Deploy do Frontend (opcional) |
| **GitHub** | Controle de versão |

---

## 📁 Estrutura do Projeto

```
.
│
├── backend/                          # Aplicação Backend
│   ├── src/
│   │   ├── middleware/              # Middlewares customizados (auth, audit)
│   │   ├── routes/                  # Rotas da API (auth, criancas, etc.)
│   │   ├── utils/                   # Utilitários (email, oauth)
│   │   ├── seed.js                  # Seed de dados iniciais
│   │   └── server.js                # Configuração do servidor Express
│   │
│   ├── prisma/
│   │   ├── schema.prisma            # Schema do banco de dados
│   │   └── migrations/              # Migrações do banco
│   │
│   ├── .env.example                 # Exemplo de .env
│   └── package.json                 # Dependências backend
│
├── frontend/                         # Aplicação Frontend
│   ├── src/
│   │   ├── components/              # Componentes React
│   │   ├── pages/                   # Páginas da aplicação
│   │   ├── hooks/                   # Custom hooks
│   │   ├── lib/                     # Funções utilitárias e API
│   │   ├── contexts/                # Contextos React
│   │   ├── App.tsx                  # Componente raiz
│   │   └── main.tsx                 # Entry point
│   │
│   ├── public/                      # Arquivos estáticos
│   ├── .env.example                 # Exemplo de .env
│   ├── index.html                   # HTML raiz
│   ├── package.json                 # Dependências frontend
│   ├── vite.config.ts               # Configuração Vite
│   └── tailwind.config.js           # Configuração Tailwind
│
├── .gitignore                       # Arquivos ignorados pelo Git
├── README.md                        # Documentação inicial
├── DOCUMENTACAO.md                  # Esta documentação
├── GUIA-INICIAR-APLICACAO.md        # Guia de início rápido
└── DEPLOY.md                        # Guia de deploy
```

---

## 🗄️ Banco de Dados

### Modelo de Dados (ER Diagram)

(O diagrama ER precisa ser atualizado para refletir as novas tabelas e campos)

### Tabelas Principais

#### 1. **profiles** (Usuários/Colaboradores)

Armazena informações de todos os usuários do sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| nome | String | Nome completo |
| email | String (UNIQUE) | Email para login |
| password | String | Hash bcrypt da senha (pode ser vazio para usuários OAuth) |
| google_id | String? (UNIQUE) | ID do usuário vindo do Google |
| telefone | String? | Telefone de contato |
| role | String | Papel: "admin" ou "user" |
| ativo | Boolean | Status do usuário |
| status_aprovacao | String | `pendente`, `aprovado`, `rejeitado` |
| password_version | Int | Usado para invalidar JWTs após troca de senha |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Data de atualização |

**Relacionamentos:**
- `1:N` com `audit_logs`
- `1:N` com `colaborador_locais`
- `1:N` com `password_reset_tokens`

---

#### 2. **password_reset_tokens**

Armazena tokens para recuperação de senha.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único do token |
| user_id | UUID (FK) | ID do usuário associado |
| expira_em | DateTime | Data e hora de expiração do token |
| usado | Boolean | Indica se o token já foi utilizado |
| created_at | DateTime | Data de criação |

---

(As demais tabelas permanecem as mesmas, com exceção das alterações na tabela `profiles`)

---

## 🔌 API - Endpoints

### Base URL

- **Desenvolvimento:** `http://localhost:5000/api`
- **Produção:** `https://seu-backend.onrender.com/api`

### Autenticação

Todos os endpoints (exceto os de `auth`) requerem autenticação via JWT token no header:

```
Authorization: Bearer <seu-jwt-token>
```

---

### 🔐 Auth - Autenticação

#### POST `/auth/login`

Autentica um usuário com email/senha e retorna tokens.

**Response (200):**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": { ... }
}
```

---

#### GET `/auth/google/login`

Inicia o fluxo de autenticação com Google. Redireciona o usuário para a página de login do Google.

---

#### GET `/auth/google/callback`

Endpoint de callback para o Google. Recebe o `code` e `state`, valida, e redireciona para o frontend com os tokens (`/auth/callback?access_token=...&refresh_token=...`) ou para a página de erro/aprovação.

---

#### POST `/auth/google/logout`

Realiza o logout do usuário, destruindo a sessão no backend.

---

#### POST `/auth/refresh`

Usa um `refresh_token` para obter um novo `access_token`.

**Request Body:**
```json
{
  "refreshToken": "seu-refresh-token"
}
```

**Response (200):**
```json
{
  "access_token": "novo-access-token",
  "user": { ... }
}
```

---

#### POST `/auth/esqueci-senha`

Solicita um email de recuperação de senha.

**Request Body:**
```json
{
  "email": "usuario@exemplo.com"
}
```

---

#### GET `/auth/validar-token-reset`

Valida se um token de recuperação de senha é válido e não expirou.

**Query Params:**
- `token`: O token recebido por email.

---

#### POST `/auth/resetar-senha`

Define uma nova senha usando um token de recuperação válido.

**Request Body:**
```json
{
  "token": "token-de-recuperacao",
  "novaSenha": "nova-senha-segura"
}
```

---

### 📊 Relatórios (Novos Endpoints)

#### GET `/relatorios/atividade`
Retorna as atividades recentes no sistema (novos cadastros, doações, check-ins).

---

#### GET `/relatorios/aniversarios`
Lista os aniversariantes com base em filtros (mês, ano, local).

---

#### GET `/relatorios/analise-doacoes`
Fornece uma análise completa de doações com KPIs (Key Performance Indicators).

---

#### GET `/relatorios/criancas-sem-doacao`
Lista crianças que nunca receberam doações.

---

#### GET `/relatorios/ranking-urgencia`
Cria um ranking de crianças que não recebem doações há mais tempo.

---

#### GET `/relatorios/taxa-cobertura`
Calcula a taxa de cobertura de doações por local.

---

#### GET `/relatorios/historico-crianca/:id`
Retorna o histórico detalhado de doações para uma criança específica.

---

#### GET `/relatorios/prestacao-contas`
Gera um relatório de prestação de contas das doações distribuídas.

---

#### GET `/relatorios/aniversarios-mes`
Relatório de aniversariantes do mês com o status do presente de aniversário.

---

#### POST `/relatorios/exportar-excel`
Exporta dados de relatórios (como doações) para um arquivo Excel.

---

## 🔒 Autenticação e Segurança

### Fluxo de Autenticação JWT

(O fluxo principal permanece o mesmo, mas agora coexiste com o Google OAuth)

### Fluxo de Autenticação Google OAuth 2.0 (Server-Side)

1.  **Início**: O usuário clica em "Entrar com Google" no frontend.
2.  **Redirect para Backend**: O frontend redireciona para `GET /api/auth/google/login`.
3.  **Redirect para Google**: O backend gera uma URL de autorização do Google (com `client_id`, `redirect_uri`, `scope`, e `state` para proteção CSRF) e redireciona o usuário para essa URL.
4.  **Consentimento**: O usuário concede permissão na tela de consentimento do Google.
5.  **Callback para Backend**: O Google redireciona o usuário de volta para a `redirect_uri` (`GET /api/auth/google/callback`), enviando um `authorization code` e o `state`.
6.  **Validação e Troca**: O backend valida o `state` e troca o `authorization code` por um `access_token` e `id_token` do Google.
7.  **Busca/Criação de Usuário**: O backend usa as informações do `id_token` (email, nome) para buscar ou criar um usuário no banco de dados.
    -   **Novo Usuário**: É criado com `status_aprovacao: 'pendente'`.
    -   **Usuário Existente**: O `google_id` é associado à conta.
8.  **Geração de JWT**: O backend gera seus próprios `access_token` e `refresh_token` para o usuário.
9.  **Redirect para Frontend**: O backend redireciona o usuário para uma página de callback no frontend (`/auth/callback`), passando os tokens como parâmetros de URL.
10. **Armazenamento**: O frontend extrai os tokens da URL, armazena-os de forma segura e redireciona o usuário para a página principal.

### Fluxo de Recuperação de Senha

1.  **Solicitação**: Usuário informa o email em `POST /api/auth/esqueci-senha`.
2.  **Geração de Token**: O backend gera um token de uso único, armazena na tabela `password_reset_tokens` com data de expiração, e envia por email para o usuário.
3.  **Validação**: O usuário clica no link do email, que o leva para a página `/resetar-senha?token=...`. O frontend valida o token com o backend via `GET /api/auth/validar-token-reset`.
4.  **Redefinição**: Se o token for válido, o usuário digita a nova senha. O frontend envia o token e a nova senha para `POST /api/auth/resetar-senha`.
5.  **Invalidação de Sessões**: O backend atualiza a senha e incrementa o campo `password_version` do usuário. Isso invalida todos os JWTs e Refresh Tokens emitidos anteriormente para aquele usuário, forçando um novo login em todos os dispositivos.

### Segurança Implementada

#### 2. **JWT Tokens**
- Assinatura: HMAC SHA256
- Secret mínimo: 32 caracteres
- Expiração: 24 horas (configurável)
- **Invalidação de Sessão**: O payload do JWT contém um `passwordVersion`. Se a senha do usuário for alterada, o `password_version` no banco de dados é incrementado. Tokens com uma versão antiga são automaticamente rejeitados, deslogando o usuário de todas as sessões ativas.

(As demais seções de segurança permanecem as mesmas)

---

## ⚙️ Instalação e Configuração

### Pré-requisitos

- Node.js 18.x ou superior
- npm 9.x ou superior
- PostgreSQL 15.x (ou conta Neon)
- Git

### 2. Configurar Backend

**Editar `backend/.env`:**

Adicionar as seguintes variáveis para o Google OAuth:

```env
# Google OAuth
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
```

E para o serviço de email (ex: Resend):

```env
# Email Service (Resend)
RESEND_API_KEY=seu-api-key-do-resend
EMAIL_FROM=nao-responda@seu-dominio.com
```

---

## 📚 Recursos Adicionais

- [Documentação Prisma](https://www.prisma.io/docs)
- [Documentação Express](https://expressjs.com/)
- [Documentação React](https://react.dev/)
- [Documentação Vite](https://vitejs.dev/)
- [JWT.io](https://jwt.io/)
- [Google Identity for Developers](https://developers.google.com/identity)

---

**Desenvolvido com ❤️ para o Projeto Rua do Céu**

_Última atualização: 3 de Novembro de 2025_
