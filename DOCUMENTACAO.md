# 📖 Documentação Completa - Projeto Rua do Céu

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura do Sistema](#-arquitetura-do-sistema)
3. [Tecnologias Utilizadas](#-tecnologias-utilizadas)
4. [Estrutura do Projeto](#-estrutura-do-projeto)
5. [Banco de Dados](#️-banco-de-dados)
6. [API - Endpoints](#-api---endpoints)
7. [Autenticação e Segurança](#-autenticação-e-segurança)
8. [Instalação e Configuração](#️-instalação-e-configuração)
9. [Desenvolvimento](#-desenvolvimento)
10. [Testes](#-testes)
11. [Troubleshooting](#-troubleshooting)
12. [Deploy](#-deploy)
13. [Recursos Adicionais](#-recursos-adicionais)
14. [Contribuindo](#-contribuindo)

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

### Funcionalidades Implementadas ✅

**Gestão de Crianças**
- Cadastro com múltiplos responsáveis
- Tags de saúde (alergias, condições médicas)
- Cálculo automático de idade
- Histórico de doações
- Status ativo/inativo

**Gestão de Doações**
- Controle de estoque em tempo real
- Doações normais
- Presentes de aniversário com lista de destinatários
- Rastreamento de quantidade consumida
- Validação antes de check-in

**Check-ins (Presença)**
- Registro individual
- Operação em massa (bulk)
- Agrupamento por sessão
- Validação de estoque
- Status presente/ausente

**Relatórios e Analytics**
- Dashboard com estatísticas
- Atividades recentes do sistema
- Lista de aniversariantes (com filtros)
- Ranking de urgência (crianças sem atendimento)
- Taxa de cobertura por local
- Análise completa de doações
- Prestação de contas
- Exportação para Excel e PDF

**Autenticação e Segurança**
- Login com email/senha
- Google OAuth 2.0 (server-side flow)
- JWT tokens com expiração (24h)
- Refresh token para renovação automática
- Recuperação de senha via email
- Invalidação de sessão após mudança de senha
- Password version para controle de acesso

**Gestão de Usuários**
- Criação de colaboradores
- Workflow de aprovação (admin autoriza novos usuários)
- Associação com locais de atendimento
- Controle de papéis (admin/user)
- Desativação de contas

**Auditoria Completa**
- Log de todas operações CRUD
- Rastreamento de usuário responsável
- Comparação antes/depois (valores antigos e novos)
- Relatório de atividades

**Progressive Web App (PWA)**
- Instalação como app nativo
- Funcionamento offline (parcial)
- Notificações push
- Sincronização automática

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

#### 2. **locais** (Locais de Atendimento)

Representa os lugares onde o projeto atua.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| nome | String | Nome do local |
| endereco | String | Endereço completo |
| responsavel | String? | Nome do responsável |
| telefone | String? | Telefone de contato |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Data de atualização |

**Relacionamentos:**
- `1:N` com `criancas`
- `1:N` com `checkins`
- `1:N` com `doacoes`
- `1:N` com `colaborador_locais`

---

#### 3. **criancas** (Crianças Atendidas)

Dados das crianças beneficiárias do projeto.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| nome | String | Nome completo |
| data_nascimento | DateTime | Data de nascimento |
| idade | Int? | Idade calculada |
| responsavel | String? | Nome responsável |
| telefone_responsavel | String? | Telefone responsável |
| responsavel2 | String? | Segundo responsável |
| telefone_responsavel2 | String? | Telefone responsável 2 |
| responsavel3 | String? | Terceiro responsável |
| telefone_responsavel3 | String? | Telefone responsável 3 |
| endereco | String? | Endereço da criança |
| escola | String? | Escola frequentada |
| numero_escola | String? | Número na escola |
| observacoes | String? | Observações adicionais |
| ativo | Boolean | Status ativo/inativo |
| local_id | UUID (FK) | Local de atendimento |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Data de atualização |

**Relacionamentos:**
- `N:1` com `locais`
- `1:N` com `checkins`
- `M:N` com `tags_saude` (via `crianca_saude`)
- `1:N` com `doacao_destinatario`

---

#### 4. **doacoes** (Doações/Itens)

Registro de doações recebidas e distribuídas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| descricao | String | Descrição da doação |
| quantidade | Int | Quantidade total |
| quantidade_consumida | Int | Quantidade distribuída |
| tipo | String | "Normal" ou "Presente Ano" |
| local_id | UUID (FK) | Local associado |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Data de atualização |

**Relacionamentos:**
- `N:1` com `locais`
- `1:N` com `checkins`
- `1:N` com `doacao_destinatario`

**Nota:** Doações de aniversário ("Presente Ano") DEVEM ter `crianças_destinatarias` associadas.

---

#### 5. **checkins** (Presença/Distribuição)

Registra quando uma criança recebe uma doação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| crianca_id | UUID (FK) | ID da criança |
| doacao_id | UUID (FK) | ID da doação |
| local_id | UUID (FK) | ID do local |
| status | String | "presente" ou "ausente" |
| quantidade_recebida | Int | Quantidade que recebeu |
| data_checkin | DateTime | Data do check-in |
| sessao_id | String? | Agrupa check-ins em massa |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Data de atualização |

**Relacionamentos:**
- `N:1` com `criancas`
- `N:1` com `doacoes`
- `N:1` com `locais`

---

#### 6. **tags_saude** (Alergias/Condições Médicas)

Alergias e condições médicas das crianças.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| nome | String (UNIQUE) | Nome da tag (ex: "Alergia a Leite") |
| descricao | String? | Descrição detalhada |
| created_at | DateTime | Data de criação |
| updated_at | DateTime | Data de atualização |

**Relacionamentos:**
- `M:N` com `criancas` (via `crianca_saude`)

---

#### 7. **crianca_saude** (Associação M:N)

Relacionamento entre crianças e tags de saúde.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| crianca_id | UUID (FK, PK) | ID da criança |
| tag_saude_id | UUID (FK, PK) | ID da tag de saúde |

---

#### 8. **doacao_destinatario** (Presentes de Aniversário)

Relacionamento entre doações e crianças que receberão presentes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| doacao_id | UUID (FK, PK) | ID da doação |
| crianca_id | UUID (FK, PK) | ID da criança |

---

#### 9. **colaborador_locais** (Associação M:N)

Relacionamento entre colaboradores e locais de atendimento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| profile_id | UUID (FK, PK) | ID do colaborador |
| local_id | UUID (FK, PK) | ID do local |

---

#### 10. **password_reset_tokens**

Armazena tokens para recuperação de senha.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único do token |
| user_id | UUID (FK) | ID do usuário associado |
| expira_em | DateTime | Data e hora de expiração do token |
| usado | Boolean | Indica se o token já foi utilizado |
| created_at | DateTime | Data de criação |

---

#### 11. **audit_logs** (Sistema de Auditoria)

Rastreamento de todas as operações CRUD no sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID (PK) | Identificador único |
| user_id | UUID (FK) | ID do usuário que fez a operação |
| tabela | String | Nome da tabela modificada |
| operacao | String | "INSERT", "UPDATE" ou "DELETE" |
| record_id | String | ID do registro afetado |
| valores_antigos | JSON? | Valores antes da modificação |
| valores_novos | JSON? | Valores depois da modificação |
| created_at | DateTime | Data da operação |

**Relacionamentos:**
- `N:1` com `profiles`

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

#### 1. **Senhas**
- Hash: bcryptjs com 10 rounds
- Armazenamento seguro
- Recuperação via token de uso único

#### 2. **JWT Tokens**
- Assinatura: HMAC SHA256
- Secret mínimo: 32 caracteres
- Expiração: 24 horas (configurável)
- **Invalidação de Sessão**: O payload do JWT contém um `passwordVersion`. Se a senha do usuário for alterada, o `password_version` no banco de dados é incrementado. Tokens com uma versão antiga são automaticamente rejeitados, deslogando o usuário de todas as sessões ativas.

#### 3. **Headers de Segurança (Helmet)**
- Content Security Policy (CSP)
- X-Frame-Options (proteção contra clickjacking)
- X-Content-Type-Options (proteção contra MIME sniffing)
- Strict-Transport-Security (HSTS)

#### 4. **Proteção de Dados**
- Conexão com banco: SSL/TLS (Neon)
- Conexão HTTPS em produção
- CORS configurado para origens autorizadas
- Rate limiting: 300 requisições por IP a cada 15 minutos

#### 5. **Validação de Dados**
- Backend: express-validator em todas as rotas
- Frontend: Zod schemas type-safe
- Validação de telefone para Brasil

#### 6. **Autenticação Multi-Camada**
- JWT para APIs
- Google OAuth 2.0 com server-side flow (mais seguro)
- CSRF protection via state parameter
- Refresh token rotation

#### 7. **Auditoria Completa**
- Log de todas as operações CRUD
- Rastreamento de usuário responsável
- Armazenamento de valores antes/depois
- Consulta em relatório de atividade

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

## 👨‍💻 Desenvolvimento

### Setup Local Completo

#### Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env com variáveis de ambiente
npx prisma migrate dev
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Editar .env com variáveis de ambiente
npm run dev
```

#### Banco de Dados
```bash
# Visualizar banco de dados em GUI
npx prisma studio

# Executar seed de dados (backend/)
npm run db:seed

# Reset do banco (cuidado!)
npx prisma migrate reset
```

### Scripts Disponíveis

**Backend:**
```bash
npm run dev              # Dev com nodemon (auto-reload)
npm start               # Modo produção
npm run db:migrate      # Executar migrações pendentes
npm run db:studio       # Abrir Prisma Studio
npm run db:seed         # Popular banco com dados
```

**Frontend:**
```bash
npm run dev             # Dev server (Vite) - http://localhost:5173
npm run build           # Build otimizado para produção
npm run preview         # Visualizar build localmente
npm run lint            # ESLint para verificação de código
```

### Estrutura de Componentes (Frontend)

```
components/
├── admin/              # Componentes exclusivos para admin
├── birthday/           # Componentes de aniversário
├── dashboard/          # Widgets do dashboard
├── forms/              # Componentes de formulários reutilizáveis
├── layout/
│   ├── AppLayout.tsx           # Layout principal com sidebar
│   ├── AppSidebar.tsx          # Barra de navegação
│   └── ProtectedRoute.tsx      # HOC para rotas autenticadas
├── ui/                 # Componentes shadcn/ui
└── ...
```

### Padrões de Desenvolvimento

1. **Componentes**: Functional components com TypeScript
2. **State Management**: React Query para servidor, hooks para local
3. **Validação**: Zod schemas no frontend, express-validator no backend
4. **Formulários**: React Hook Form + Zod
5. **Estilo**: Tailwind CSS com componentes shadcn/ui
6. **Requisições**: Axios com interceptadores para JWT

### Exemplo de Fluxo: Adicionar Nova Página

1. Criar componente em `src/pages/NovaPagina.tsx`
2. Adicionar rota em `App.tsx` com `<ProtectedRoute>`
3. Criar endpoint no backend `/api/rota-nova`
4. Usar React Query para carregar dados
5. Testar localmente em `http://localhost:5173`

---

## 🧪 Testes

### Testes Manuais

Usar Swagger UI para testar endpoints:
```
http://localhost:5000/api-docs
```

### Checklist de Testes

#### Autenticação
- [ ] Login com email/senha funciona
- [ ] Login com Google funciona
- [ ] Recuperação de senha funciona
- [ ] Refresh token renova access token
- [ ] Logout limpa tokens
- [ ] Usuários pendentes não podem fazer login

#### CRUD Básico
- [ ] Criar criança
- [ ] Editar criança
- [ ] Deletar criança
- [ ] Listar crianças com paginação
- [ ] Buscar criança por ID

#### Doações
- [ ] Criar doação normal
- [ ] Criar presente de aniversário
- [ ] Check-in individual
- [ ] Check-in em massa (bulk)
- [ ] Validação de estoque

#### Relatórios
- [ ] Dashboard carrega
- [ ] Aniversariantes do mês
- [ ] Ranking de urgência
- [ ] Exportação Excel
- [ ] Exportação PDF

#### Administração
- [ ] Criar novo colaborador
- [ ] Aprovar colaborador
- [ ] Associar colaborador a local
- [ ] Criar local
- [ ] Listar logs de auditoria

---

## 🐛 Troubleshooting

### Backend não conecta ao banco de dados

**Erro:** `Error connecting to database`

**Solução:**
```bash
# 1. Verificar variável de ambiente
echo $DATABASE_URL

# 2. Testar conexão direta
npx prisma db execute --stdin < /dev/null

# 3. Ver erro detalhado
npx prisma migrate dev --name init

# 4. Reset (último recurso)
npx prisma migrate reset
```

---

### Frontend não conecta ao backend

**Erro:** `Failed to fetch` ou `CORS error`

**Solução:**
1. Verificar `VITE_API_URL` em `frontend/.env`
2. Certificar que backend está rodando: `http://localhost:5000/api-docs`
3. Verificar CORS no `backend/src/server.js`
4. Usar DevTools do navegador (Network tab) para ver erros

---

### JWT expirado automaticamente

**Comportamento esperado:** Refresh automático

**Se não funcionar:**
1. Verificar `JWT_SECRET` em `.env`
2. Verificar `JWT_EXPIRES_IN` (padrão: 24h)
3. Limpar localStorage/sessionStorage do navegador
4. Fazer login novamente

---

### Resend não envia email

**Solução:**
1. Verificar `RESEND_API_KEY` em `.env`
2. Verificar `EMAIL_FROM` com domínio verificado no Resend
3. Acessar dashboard em https://resend.com
4. Verificar aba "Emails" para ver tentativas de envio
5. Adicionar domínio verificado se necessário

---

### Prisma Studio não abre

```bash
# Tente com porta diferente
npx prisma studio --port 5556

# Ou verifique se porta 5555 está em uso
lsof -i :5555  # macOS/Linux
netstat -ano | findstr :5555  # Windows
```

---

### Erro de migração Prisma

```bash
# Ver status de migrações
npx prisma migrate status

# Resetar migrações (cuidado!)
npx prisma migrate reset

# Criar migration novo
npx prisma migrate dev --name descricao_mudanca
```

---

### Componentes shadcn/ui não aparecem

**Solução:**
1. Certificar que Tailwind está configurado em `tailwind.config.js`
2. Certificar que CSS global está importado em `main.tsx`
3. Reconstruir: `npm run build`
4. Limpar cache: `rm -rf node_modules && npm install`

---

### Erro de validação Zod

**Mensagens de erro não aparecem no formulário:**
1. Certificar que form possui `noValidate`
2. Usar `useForm` do react-hook-form
3. Vincular com `<FormField>` do shadcn/ui

---

## 🚀 Deploy

### Deploy Frontend (Vercel)

1. Push para GitHub
2. Importar projeto em https://vercel.com
3. Configurar variáveis de ambiente
4. Deploy automático em cada push
5. Domínio automático: `seu-projeto.vercel.app`

**Variáveis necessárias:**
```
VITE_API_URL=https://seu-backend.com/api
VITE_GOOGLE_CLIENT_ID=seu-client-id
```

---

### Deploy Backend (Render)

1. Push para GitHub
2. Criar serviço em https://render.com
3. Conectar repositório
4. Configurar variáveis de ambiente
5. Deploy automático

**Variáveis necessárias:**
```
DATABASE_URL=postgresql://...
JWT_SECRET=min-32-caracteres
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-secret
GOOGLE_REDIRECT_URI=https://seu-backend.com/api/auth/google/callback
RESEND_API_KEY=re_...
EMAIL_FROM=nao-responda@seudominio.com
```

---

### Database (Neon)

1. Criar projeto em https://neon.tech
2. Copiar `DATABASE_URL`
3. Usar em `.env` (dev) e variável de ambiente (prod)
4. Backups automáticos
5. SSL/TLS por padrão

---

## 📚 Recursos Adicionais

### Documentação
- [Documentação Prisma](https://www.prisma.io/docs)
- [Documentação Express](https://expressjs.com/)
- [Documentação React](https://react.dev/)
- [Documentação Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

### Segurança
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT.io](https://jwt.io/)
- [Google Identity](https://developers.google.com/identity)

### Ferramentas
- [Swagger Editor](https://editor.swagger.io)
- [PostMan](https://www.postman.com)
- [Thunder Client](https://www.thunderclient.com)

---

## 🤝 Contribuindo

1. Criar branch: `git checkout -b feature/sua-feature`
2. Fazer commits descritivos: `git commit -m "feat: descrição"`
3. Atualizar testes se necessário
4. Atualizar DOCUMENTACAO.md se houver mudanças
5. Fazer PR para revisão

### Convenção de Commits

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Alteração de documentação
- `style:` Formatação, sem mudança de lógica
- `refactor:` Mudança de código sem alterar funcionalidade
- `test:` Adição/alteração de testes
- `chore:` Dependências, configuração

---

**Desenvolvido com ❤️ para o Projeto Rua do Céu**

_Última atualização: 8 de Novembro de 2025_
_Versão da Documentação: 2.0_
_Status: ✅ Completa e Atualizada_
