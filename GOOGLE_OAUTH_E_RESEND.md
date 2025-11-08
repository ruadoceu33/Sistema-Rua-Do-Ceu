# Integração com Google OAuth e Resend

Este documento detalha a implementação da autenticação via Google OAuth e o serviço de envio de e-mails utilizando Resend no projeto.

## Google OAuth

O sistema suporta dois fluxos de autenticação com o Google para oferecer flexibilidade e segurança.

### 1. Fluxo Server-Side (Recomendado)

Este é o fluxo principal e mais seguro, seguindo o padrão "Authorization Code Flow".

- **Início do Fluxo:**
  - O frontend redireciona o usuário para o endpoint `GET /api/auth/google/login`.
  - O backend gera um `state` token (para proteção contra CSRF), o armazena na sessão do usuário e redireciona o usuário para a página de consentimento do Google, incluindo o `state`.

- **Callback do Google:**
  - Após o usuário autorizar, o Google redireciona de volta para `GET /api/auth/google/callback` com um `authorization_code` e o `state` original.
  - O backend valida se o `state` recebido é o mesmo armazenado na sessão.
  - O `authorization_code` é trocado por um `access_token` e `refresh_token` junto à API do Google.

- **Autenticação e Criação de Usuário:**
  - Com o `access_token`, o backend obtém as informações do perfil do usuário (nome, email, googleId).
  - **Usuário Existente (Admin):** Se um usuário com o mesmo e-mail já existe e tem `role: 'admin'`, o sistema o autentica imediatamente e gera os tokens JWT, atualizando o `google_id` se necessário. Admins sempre conseguem fazer login.
  - **Usuário Existente (Colaborador):**
    - Se tiver `status_aprovacao: 'aprovado'` e `ativo: true`, o login é bem-sucedido e os tokens JWT são gerados.
    - Se tiver `status_aprovacao: 'pendente'` ou `status_aprovacao: 'rejeitado'`, o usuário é redirecionado para a página de espera de aprovação.
    - Se tiver `ativo: false`, o acesso é negado com mensagem "Sua conta está desativada".
  - **Novo Usuário:** Se o e-mail não existe, um novo perfil de colaborador (`role: 'user'`) é criado com:
    - `status_aprovacao: 'pendente'` (aguardando aprovação do admin)
    - `ativo: false` (conta desativada até aprovação)
    - `password: ''` (sem senha, pois usa Google OAuth)
    - O usuário é redirecionado para a página `/aguardando-aprovacao` informando que sua conta aguarda revisão.

- **Arquivos Relevantes:**
  - `backend/src/routes/auth.js`: Contém os endpoints `/google/login` e `/google/callback`.
  - `backend/src/utils/googleOAuth.js`: Abstrai a comunicação com a API do Google.

### 2. Fluxo Client-Side (Legado/Alternativo)

Este fluxo permite que o frontend (usando a biblioteca do Google) obtenha um `id_token` e o envie diretamente para o backend.

- **Processo:**
  - O frontend obtém o `credential` (um JWT) do Google.
  - Este token é enviado para o endpoint `POST /api/auth/google`.
  - O backend verifica a validade do token com o Google, extrai as informações do usuário e segue o mesmo processo de login ou criação de conta descrito no fluxo server-side.

- **Arquivo Relevante:**
  - `backend/src/routes/auth.js`: Contém o endpoint `/google`.

### 3. Logout (Aplicável aos dois fluxos)

O sistema suporta logout via destruição de sessão:

- **Endpoint:** `POST /api/auth/google/logout`
- **Funcionamento:**
  - Destrói a sessão do servidor (se existir)
  - Retorna sucesso (código 200)
  - O frontend deve limpar tokens JWT locais (localStorage/sessionStorage)
- **Importante:** O logout não invalida os tokens JWT já emitidos. Para forçar logout de todos os dispositivos, deve-se alterar a senha, o que incrementa o `password_version` e invalida todos os tokens antigos.

### 4. Refresh de Token

O sistema suporta renovação automática de tokens de acesso:

- **Endpoint:** `POST /api/auth/refresh`
- **Payload:**
  ```json
  {
    "refreshToken": "seu_refresh_token_aqui"
  }
  ```
- **Funcionamento:**
  1. Valida o `refreshToken` (JWT com expiração em 7 dias)
  2. Verifica se o usuário ainda existe e está ativo
  3. **Validação crítica:** Compara `passwordVersion` do token com a versão atual do usuário
     - Se a senha foi alterada em outro dispositivo, retorna erro 401
     - Isso força o usuário a fazer login novamente por segurança
  4. Se tudo válido, gera um novo `access_token` (JWT com expiração em 24 horas)
- **Response:**
  ```json
  {
    "access_token": "novo_jwt_token",
    "user": {
      "id": "user_id",
      "nome": "Nome do Usuário",
      "email": "email@exemplo.com",
      "role": "user",
      "telefone": "11999999999"
    }
  }
  ```

### 5. Password Version (Mecanismo de Invalidação de Sessões)

O campo `password_version` implementa um sistema robusto de invalidação de tokens:

- **Armazenado em:** Cada perfil de usuário (`profiles.password_version`)
- **Armazenado no JWT:** Todo token JWT (access e refresh) contém `passwordVersion`
- **Funcionamento:**
  - Quando a senha é alterada via `/api/auth/resetar-senha`, o `password_version` é incrementado
  - Em cada validação de token (middleware `authenticateToken`), compara a versão no token com a atual
  - Se forem diferentes, o token é rejeitado com erro 401: "Sua senha foi alterada em outro dispositivo"
- **Benefício:** Permite invalidar TODOS os tokens de um usuário simultâneamente sem manter blacklist
- **Exemplo:** Se um usuário alterar senha em um dispositivo, em qualquer outro dispositivo sua próxima requisição será rejeitada

## Resend (Serviço de E-mail)

O Resend é utilizado para o envio de e-mails transacionais, como a recuperação de senha.

- **Funcionalidade:**
  - Quando um usuário solicita a redefinição de senha (`POST /api/auth/esqueci-senha`), o backend gera um token de uso único e o armazena no banco de dados.
  - A função `enviarEmailRecuperacaoSenha` é chamada, utilizando a API do Resend para enviar um e-mail formatado em HTML para o usuário.
  - O e-mail contém um link para a página de redefinição de senha no frontend, com o token como parâmetro.

- **Configuração:**
  - A chave da API do Resend é configurada na variável de ambiente `RESEND_API_KEY`.
  - O e-mail remetente é definido em `EMAIL_FROM`.

- **Fluxo Detalhado:**
  1. Usuário acessa a página de "Esqueci a senha" e insere seu email
  2. Frontend faz POST para `/api/auth/esqueci-senha` com o email
  3. Backend:
     - Busca o usuário pelo email (por segurança, sempre responde sucesso mesmo se email não existe)
     - Cria um `passwordResetToken` com expiração de 1 hora
     - Chama `enviarEmailRecuperacaoSenha()` com os dados do usuário
     - Retorna mensagem de sucesso
  4. Resend envia email HTML formatado com:
     - Link clicável: `FRONTEND_URL/resetar-senha?token=TOKEN_GERADO`
     - Aviso de expiração em 1 hora
     - Informação de uso único do token
  5. Usuário clica no link, que leva para a página de redefinição de senha no frontend
  6. Frontend valida o token via `GET /api/auth/validar-token-reset?token=TOKEN`
  7. Se válido, usuário insere nova senha e faz POST para `/api/auth/resetar-senha`
  8. Backend:
     - Valida token (não expirado, não usado, existe)
     - Faz hash da nova senha com bcrypt (rounds configuráveis)
     - Atualiza a senha E incrementa `password_version` em transação atômica
     - Marca token como usado
     - Invalida todos os tokens JWT antigos do usuário
  9. Usuario é redirecionado para login

- **Validações do Token de Reset:**
  - Token deve existir no banco
  - Token não pode ter sido usado antes (`usado: false`)
  - Token não pode estar expirado (comparado com `expira_em`)
  - Retorna erro 400 para qualquer validação falha

- **Arquivo Relevante:**
  - `backend/src/utils/emailService.js`: Contém a lógica para montar e enviar os e-mails.

## Variáveis de Ambiente Necessárias

Para funcionamento completo dos fluxos OAuth e Resend, configure as seguintes variáveis no `.env`:

### Google OAuth (Server-Side Flow)
```env
GOOGLE_CLIENT_ID=sua_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret_super_secreto
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback
SESSION_SECRET=seu_session_secret_aleatorio_32_caracteres
```

### Google OAuth (Client-Side Flow)
```env
GOOGLE_CLIENT_ID=sua_client_id.apps.googleusercontent.com
```

### Resend (Email)
```env
RESEND_API_KEY=re_seu_api_key_do_resend
EMAIL_FROM=seu-email@seu-dominio.com  # Deve ser verificado no Resend
FRONTEND_URL=http://localhost:5173    # URL para gerar links nos emails
```

### JWT (Autenticação)
```env
JWT_SECRET=seu_jwt_secret_aleatorio_minimo_32_caracteres
JWT_EXPIRE_HOURS=24       # Expiração do access token
JWT_REFRESH_EXPIRE_DAYS=7 # Expiração do refresh token
```

### Segurança (Geral)
```env
BCRYPT_ROUNDS=12          # Rounds para hash de senha (10-12 recomendado)
```

## Fluxo de Aprovação de Colaboradores

Quando um novo usuário tenta fazer login (via Google OAuth ou registro), o sistema implementa um fluxo de aprovação:

1. **Criação Inicial:**
   - `status_aprovacao: 'pendente'`
   - `ativo: false`
   - Usuário é redirecionado para página de espera

2. **Validação nas Tentativas de Login:**
   - Admin `role: 'admin'`: login sempre permitido
   - Colaborador com status ≠ 'aprovado': acesso negado até aprovação
   - Colaborador com `ativo: false`: acesso negado

3. **Aprovação (por Admin):**
   - Admin acessa sistema de gerenciamento de colaboradores
   - Aprova o novo colaborador: `status_aprovacao: 'aprovado'` e `ativo: true`
   - Colaborador agora consegue fazer login

4. **Reject/Desativação:**
   - Se rejeitado: `status_aprovacao: 'rejeitado'`
   - Se desativado: `ativo: false`
   - Em ambos os casos, acesso é negado mesmo com status_aprovacao correto

## Tratamento de Erros

### Google OAuth
| Erro | Código HTTP | Significado |
|------|-------------|------------|
| State token inválido | 302 redirect | CSRF protection - token não corresponde |
| Authorization code ausente | 302 redirect | Google não retornou código |
| Token do Google inválido | 401 | Credenciais do Google incorretas |
| Conta pendente aprovação | 200 | Usuário criado mas não aprovado ainda |
| Conta desativada | 403 | Usuário rejeitado ou desativado |

### Resend Email
| Erro | Causa | Solução |
|------|-------|--------|
| RESEND_API_KEY inválida | Variável de ambiente não configurada | Gere nova API key no Resend |
| EMAIL_FROM não verificado | Email não está verificado no Resend | Verifique o domínio no Resend |
| Email não entregue | Problema do lado do Resend | Verifique status na dashboard do Resend |

### Password Reset Token
| Erro | Código | Significado |
|------|--------|------------|
| Token inválido | INVALID_TOKEN | Token não existe no banco |
| Token já usado | TOKEN_ALREADY_USED | Mesmo token não pode ser reutilizado |
| Token expirado | TOKEN_EXPIRED | Expirou em 1 hora |

## Resumo dos Endpoints

### Google OAuth
- `GET /api/auth/google/login` → Inicia fluxo, redireciona para Google
- `GET /api/auth/google/callback` → Callback do Google, redireciona para frontend com tokens
- `POST /api/auth/google` → Login direto com credential JWT do Google
- `POST /api/auth/google/logout` → Destrói sessão

### Autenticação Geral
- `POST /api/auth/login` → Login com email/senha (sem Google)
- `POST /api/auth/refresh` → Renova access_token usando refresh_token
- `GET /api/auth/me` → Obtém perfil do usuário autenticado (requer token)

### Password Reset
- `POST /api/auth/esqueci-senha` → Solicita email de recuperação (body: email)
- `GET /api/auth/validar-token-reset` → Valida token de reset (query: token)
- `POST /api/auth/resetar-senha` → Redefine senha (body: token, novaSenha)

## Fluxograma: Google OAuth Server-Side Flow

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ GET /api/auth/google/login
       ▼
┌─────────────────────────┐
│  Backend Node.js        │
│ 1. Gera state token     │
│ 2. Salva em sessão      │
│ 3. Redireciona para     │
│    Google               │
└──────┬──────────────────┘
       │
       ▼
┌──────────────────┐
│  Google OAuth    │
│  Servidores      │
│  (Consentimento) │
└──────┬───────────┘
       │ User aprova
       │ Redireciona com code
       │
       ▼
┌─────────────────────────┐
│  Backend Node.js        │
│ GET /google/callback    │
│ 1. Valida state         │
│ 2. Troca code por token │
│ 3. Busca info do usuário│
│ 4. Login/Cria conta     │
│ 5. Gera JWT tokens      │
│ 6. Redireciona com JWT  │
└──────┬──────────────────┘
       │
       ▼
┌──────────────────────┐
│   Browser            │
│   (Frontend)         │
│   Armazena tokens    │
│   Faz login          │
└──────────────────────┘
```

## Fluxograma: Password Reset (Resend)

```
┌──────────────────┐
│  Usuário         │
│  Acessa          │
│  "Esqueci senha" │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  Frontend                │
│  POST /esqueci-senha     │
│  Body: { email }         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Backend                 │
│ 1. Busca usuário         │
│ 2. Cria passwordReset    │
│    Token (1h expira)     │
│ 3. Chama Resend          │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Resend Email Service    │
│  Envia HTML com link:    │
│  /resetar-senha?token=X  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Email do Usuário        │
│  Clica no link           │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Frontend                    │
│  GET /validar-token-reset    │
│  Valida se token é válido    │
│  Mostra formulário de senha  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Usuário                     │
│  Insere nova senha           │
│  POST /resetar-senha         │
└────────┬─────────────────────┘
         │
         ▼
┌────────────────────────────────────┐
│  Backend                           │
│ 1. Valida token                    │
│ 2. Hash nova senha (bcrypt)        │
│ 3. Atualiza password + incrementa  │
│    password_version (invalida JWT) │
│ 4. Marca token como usado          │
│ 5. Retorna sucesso                 │
└────────┬────────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Frontend                │
│  Redireciona para login  │
│  Exibe mensagem de OK    │
└──────────────────────────┘
```

## Checklist de Segurança

Para garantir implementação segura dos fluxos, verifique:

- [ ] `GOOGLE_CLIENT_SECRET` está SOMENTE no backend `.env`, nunca no frontend
- [ ] `JWT_SECRET` tem mínimo de 32 caracteres aleatórios
- [ ] `SESSION_SECRET` tem mínimo de 32 caracteres aleatórios
- [ ] HTTPS é obrigatório em produção (Vercel/Render forçam)
- [ ] CORS_ORIGINS está restrito aos domínios do frontend
- [ ] Rate limiting está ativo em produção
- [ ] `password_version` é validado em cada requisição autenticada
- [ ] Password reset tokens expiram em 1 hora
- [ ] Password reset tokens são uso único (usado: true)
- [ ] Bcrypt rounds está configurado para 10-12
- [ ] Email de recuperação mostra aviso de 1 hora de expiração
- [ ] Logout funciona via destruição de sessão no servidor
- [ ] Refresh token também valida `password_version`

## Arquivos Relacionados

- `backend/src/routes/auth.js` - Todos os endpoints de autenticação
- `backend/src/utils/googleOAuth.js` - Lógica Google OAuth
- `backend/src/utils/emailService.js` - Lógica de envio de emails
- `backend/src/middleware/auth.js` - Middleware de autenticação JWT
- `backend/.env.example` - Variáveis de ambiente necessárias
