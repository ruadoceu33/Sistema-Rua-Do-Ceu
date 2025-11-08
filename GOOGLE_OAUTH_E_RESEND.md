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
  - **Usuário Existente:** Se um usuário com o mesmo e-mail já existe, o sistema o autentica e gera os tokens JWT da aplicação.
  - **Novo Usuário:** Se o e-mail não existe, um novo perfil de colaborador (`role: 'user'`) é criado com `status_aprovacao: 'pendente'`. O usuário é então redirecionado para uma página informando que sua conta aguarda aprovação.

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

## Resend (Serviço de E-mail)

O Resend é utilizado para o envio de e-mails transacionais, como a recuperação de senha.

- **Funcionalidade:**
  - Quando um usuário solicita a redefinição de senha (`POST /api/auth/esqueci-senha`), o backend gera um token de uso único e o armazena no banco de dados.
  - A função `enviarEmailRecuperacaoSenha` é chamada, utilizando a API do Resend para enviar um e-mail formatado em HTML para o usuário.
  - O e-mail contém um link para a página de redefinição de senha no frontend, com o token como parâmetro.

- **Configuração:**
  - A chave da API do Resend é configurada na variável de ambiente `RESEND_API_KEY`.
  - O e-mail remetente é definido em `EMAIL_FROM`.

- **Arquivo Relevante:**
  - `backend/src/utils/emailService.js`: Contém a lógica para montar e enviar os e-mails.
