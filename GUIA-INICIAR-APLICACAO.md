# 🚀 GUIA COMPLETO - COMO INICIAR SUA APLICAÇÃO FULLSTACK

## 📚 ENTENDENDO O CONCEITO (SUA DÚVIDA PRINCIPAL)

### **Sim, você está certo!**

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND (Porta 5173)                                   │
│  http://localhost:5173                                   │
│                                                          │
│  O que o usuário VÊ e INTERAGE                          │
│  - Tela de login                                        │
│  - Dashboard                                            │
│  - Formulários                                          │
│  - Botões, tabelas, etc                                 │
│                                                          │
│  Configuração importante:                               │
│  .env → VITE_API_URL=http://localhost:5000/api         │
│         ↑↑↑ APONTA PARA O BACKEND ↑↑↑                   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ Faz requisições HTTP
                     │ (GET, POST, PUT, DELETE)
                     ↓
┌────────────────────┴─────────────────────────────────────┐
│  BACKEND (Porta 5000)                                    │
│  http://localhost:5000                                   │
│                                                          │
│  Onde a LÓGICA acontece (invisível ao usuário)          │
│  - Recebe requisições do frontend                       │
│  - Valida dados                                         │
│  - Busca/Salva no banco de dados                        │
│  - Retorna resposta para o frontend                     │
│                                                          │
│  Configuração importante:                               │
│  .env → CORS_ORIGINS=http://localhost:5173              │
│         ↑↑↑ PERMITE O FRONTEND SE CONECTAR ↑↑↑          │
└──────────────────────────────────────────────────────────┘
```

### **POR QUE PORTAS DIFERENTES?**

1. **Separação de Responsabilidades:**
   - Frontend: Interface do usuário
   - Backend: Lógica de negócio e dados

2. **Desenvolvimento Independente:**
   - Você pode trabalhar no frontend sem mexer no backend
   - Equipes diferentes podem trabalhar em paralelo

3. **Segurança:**
   - Backend pode ter regras de acesso (CORS)
   - Não expõe código sensível (senhas, tokens)

4. **Escalabilidade:**
   - Na produção, podem estar em servidores diferentes
   - Frontend → Vercel (CDN global)
   - Backend → Railway (servidor dedicado)

---

## 🎯 PASSO A PASSO COMPLETO

### **TERMINAL 1 - BACKEND (Cozinha do Restaurante)**

```bash
# 1. Entrar na pasta do backend
cd backend

# 2. Instalar dependências (primeira vez ou se mudou algo)
npm install

# 3. Gerar cliente Prisma (conecta com banco de dados)
npx prisma generate

# 4. Criar tabelas no banco de dados (primeira vez)
npx prisma db push

# 5. Iniciar servidor backend
npm run dev

# ✅ SUCESSO se ver:
# 🚀 Server running on http://0.0.0.0:5000
# 📚 Swagger docs available at http://0.0.0.0:5000/api-docs
# 🏥 Health check at http://0.0.0.0:5000/health
#
# Nota: O backend também utiliza:
# - expressão-session para autenticação OAuth
# - Prisma Client conectado ao Neon PostgreSQL
# - Rate limiting em produção
# - CORS configurado para http://localhost:5173
```

**O que está acontecendo:**
- ✅ Servidor Express.js rodando
- ✅ Conectado ao banco Neon PostgreSQL
- ✅ Ouvindo requisições na porta 5000
- ✅ Aceitando conexões do http://localhost:5173

---

### **TERMINAL 2 - FRONTEND (Salão do Restaurante)**

```bash
# 1. Entrar na pasta do frontend
cd frontend

# 2. Instalar dependências (primeira vez ou se mudou algo)
npm install

# 3. Iniciar servidor frontend
npm run dev

# ✅ SUCESSO se ver:
# VITE v5.4.19  ready in 1234 ms
# ➜  Local:   http://localhost:5173/
# ➜  press h + enter to show help
```

**O que está acontecendo:**
- ✅ Servidor Vite (React) rodando
- ✅ Interface carregada
- ✅ Pronto para fazer requisições para http://localhost:5000

---

## 🔍 COMO TESTAR SE ESTÁ FUNCIONANDO

### **Teste 1: Backend está vivo?**

Abra o navegador: http://localhost:5000/health

**Resposta esperada:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-09T...",
  "version": "1.0.0"
}
```

✅ Backend funcionando!

---

### **Teste 2: Frontend está vivo?**

Abra o navegador: http://localhost:5173

**Você deve ver:**
- Tela de login bonita
- Campos de email e senha
- Botão "Entrar"

✅ Frontend funcionando!

---

### **Teste 3: Frontend consegue falar com Backend?**

Abra o console do navegador (F12) e digite:

```javascript
fetch('http://localhost:5000/health')
  .then(r => r.json())
  .then(data => console.log('✅ Backend respondeu:', data))
```

**Resposta esperada no console:**
```
✅ Backend respondeu: {status: "OK", ...}
```

✅ Integração funcionando!

---

## 🎬 FLUXO VISUAL DE UMA REQUISIÇÃO

### **Exemplo: Fazer Login**

```
┌─────────────────────────────────────────────────────┐
│ 1. USUÁRIO digita email e senha                    │
│    Frontend: http://localhost:5173/auth            │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────┐
│ 2. FRONTEND envia dados via axios                  │
│    POST http://localhost:5000/api/auth/login       │
│    Body: { email: "...", password: "..." }         │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓ atravessa a rede
                     │
┌────────────────────┴────────────────────────────────┐
│ 3. BACKEND recebe na porta 5000                    │
│    Arquivo: backend/src/routes/auth.js             │
│    - Valida email/senha                            │
│    - Busca usuário no PostgreSQL                   │
│    - Gera token JWT                                │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌────────────────────┴────────────────────────────────┐
│ 4. BANCO DE DADOS responde                         │
│    Neon PostgreSQL (nuvem)                         │
│    SELECT * FROM profiles WHERE email = '...'      │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓
┌────────────────────┴────────────────────────────────┐
│ 5. BACKEND retorna resposta                        │
│    Status: 200 OK                                  │
│    Body: {                                         │
│      access_token: "eyJhbG...",                    │
│      user: { nome: "...", role: "..." }            │
│    }                                               │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓ volta pela rede
                     │
┌────────────────────┴────────────────────────────────┐
│ 6. FRONTEND recebe resposta                        │
│    - Salva token no localStorage                   │
│    - Redireciona para /dashboard                   │
│    - Mostra nome do usuário                        │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 CONFIGURAÇÃO DE AUTENTICAÇÃO E VARIÁVEIS DE AMBIENTE

Após instalar as dependências, configure o arquivo `.env` no diretório `backend/` com as seguintes variáveis:

### **Variáveis Obrigatórias:**

```env
# Database
NEON_DB_URL=postgresql://usuario:senha@ep-xxxxx.region.aws.neon.tech/database?sslmode=require

# JWT (Security)
JWT_SECRET=seu_secret_aleatorio_minimo_32_caracteres
JWT_EXPIRE_HOURS=24
JWT_REFRESH_EXPIRE_DAYS=7

# Server
PORT=5000
NODE_ENV=development
HOST=0.0.0.0

# CORS (Segurança)
CORS_ORIGINS=http://localhost:5173

# Bcrypt (Password Hashing)
BCRYPT_ROUNDS=12

# Rate Limiting (Produção)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_REQUESTS=300
```

### **Variáveis Opcionais (se usar Google OAuth ou Email):**

```env
# Google OAuth
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Email (Resend)
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@projeto-rua-do-ceu.com
FRONTEND_URL=http://localhost:5173

# Session (para OAuth flow)
SESSION_SECRET=seu_session_secret_aleatorio
```

### **Como gerar secrets aleatórios:**

```bash
# No terminal Node.js ou seu editor
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🛠️ CRIAR PRIMEIRO USUÁRIO ADMIN

Depois que **ambos servidores estiverem rodando**, precisamos criar um usuário:

### **Opção 1: Via Swagger (Mais Fácil)**

1. Abra: http://localhost:5000/api-docs
2. Procure: `POST /api/auth/register`
3. Clique em "Try it out"
4. Cole este JSON:

```json
{
  "nome": "Administrador",
  "email": "admin@projeto.com",
  "password": "senha123",
  "telefone": "11999999999"
}
```

5. Clique em "Execute"
6. Status 201 = Sucesso! ✅

### **Opção 2: Via Frontend**

1. Vá para: http://localhost:5173/auth
2. Clique em "Criar Conta" ou "Registrar"
3. Preencha os dados
4. Clique em "Registrar"

---

## 🔐 TORNAR USUÁRIO ADMIN

O usuário criado é "user" por padrão. Para torná-lo admin:

```bash
# No terminal do backend
cd backend
npm run db:studio
```

1. Abre interface web: http://localhost:5555
2. Clique na tabela `profiles`
3. Encontre seu usuário
4. Altere `role` de `user` para `admin`
5. Clique em "Save 1 change"

✅ Agora você tem um admin!

---

## 🎉 TESTAR O LOGIN

1. Vá para: http://localhost:5173
2. Faça login com:
   - Email: `admin@projeto.com`
   - Senha: `senha123`
3. Se funcionar:
   - ✅ Você será redirecionado para /dashboard
   - ✅ Verá o nome do usuário no canto superior
   - ✅ Menu lateral funcionando
   - ✅ **INTEGRAÇÃO COMPLETA!** 🎊

---

## 🐛 PROBLEMAS COMUNS E SOLUÇÕES

### **❌ Erro: "EADDRINUSE: address already in use :::5000"**

**Problema:** Porta 5000 já está sendo usada

**Solução:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <número> /F

# Ou use porta alternativa no backend/.env:
PORT=5001
```

---

### **❌ Erro: "Network Error" no frontend**

**Problema:** Backend não está rodando ou CORS errado

**Soluções:**
1. Verificar se backend está rodando: http://localhost:5000/health
2. Verificar CORS no backend/.env:
```env
CORS_ORIGINS=http://localhost:5173
```

---

### **❌ Erro: "Cannot find module 'axios'"**

**Problema:** Dependências não instaladas

**Solução:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

### **❌ Tela branca no frontend**

**Problema:** Erro no JavaScript

**Solução:**
1. Abra console do navegador (F12)
2. Veja o erro vermelho
3. Verifique se axios está instalado
4. Verifique se .env está correto

---

### **❌ Erro: "Invalid token" ou "Token expired"**

**Problema:** Token JWT expirou ou é inválido

**Soluções:**
1. Fazer login novamente para obter novo token
2. Ou usar refresh token para renovar: `POST /api/auth/refresh`
3. Verificar se `JWT_SECRET` é o mesmo no .env

---

### **❌ Google OAuth não funciona**

**Problema:** Erro ao fazer login com Google

**Soluções:**
1. Verificar se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão configurados
2. Verificar se a URL de callback está cadastrada no Google Cloud Console
3. Ensure `GOOGLE_REDIRECT_URI` matches exactly: `http://localhost:5000/api/auth/google/callback`
4. Verificar se `SESSION_SECRET` está configurado no .env

---

### **❌ Email de recuperação de senha não é enviado**

**Problema:** Endpoint `/api/auth/esqueci-senha` retorna erro

**Soluções:**
1. Verificar se `RESEND_API_KEY` está configurado
2. Verificar se `EMAIL_FROM` é um email verificado no Resend
3. Verificar se `FRONTEND_URL` está correto (usado nos links do email)
4. Checar logs do backend para erro específico da Resend API

---

## 📊 VERIFICAÇÃO FINAL - CHECKLIST

Antes de testar, certifique-se:

```
✅ Backend:
   ✅ npm install executado
   ✅ npx prisma generate executado
   ✅ npx prisma db push executado
   ✅ Arquivo .env configurado com:
      ✅ NEON_DB_URL
      ✅ JWT_SECRET (mínimo 32 caracteres)
      ✅ JWT_EXPIRE_HOURS
      ✅ PORT=5000
      ✅ NODE_ENV=development
      ✅ CORS_ORIGINS=http://localhost:5173
      ✅ BCRYPT_ROUNDS
      ✅ SESSION_SECRET
   ✅ npm run dev rodando
   ✅ http://localhost:5000/health responde OK
   ✅ http://localhost:5000/api-docs carrega Swagger

✅ Frontend:
   ✅ npm install executado
   ✅ axios instalado
   ✅ .env.local (ou .env) com VITE_API_URL=http://localhost:5000/api
   ✅ npm run dev rodando
   ✅ http://localhost:5173 abre
   ✅ Console do navegador sem erros (F12)

✅ Banco de Dados:
   ✅ Neon PostgreSQL acessível via NEON_DB_URL
   ✅ Tabelas criadas (prisma db push realizado)
   ✅ Usuário admin criado
   ✅ Prisma Studio rodando (npm run db:studio) em http://localhost:5555

✅ Autenticação:
   ✅ Usuário admin criado com role='admin'
   ✅ Login básico funcionando
   ✅ Token JWT sendo retornado
   ✅ Refresh token funcionando (se implementado no frontend)
   ✅ Logout funcionando (sessão destruída)

✅ Google OAuth (Opcional):
   ✅ GOOGLE_CLIENT_ID configurado
   ✅ GOOGLE_CLIENT_SECRET configurado
   ✅ GOOGLE_REDIRECT_URI configurado
   ✅ URL de callback cadastrada no Google Cloud Console
   ✅ Login com Google funcionando

✅ Email (Opcional):
   ✅ RESEND_API_KEY configurado
   ✅ EMAIL_FROM verificado no Resend
   ✅ FRONTEND_URL correto
   ✅ Email de recuperação de senha sendo enviado

✅ Integração:
   ✅ CORS configurado no backend
   ✅ API_URL apontando para backend
   ✅ Login funcionando
   ✅ Requisições HTTP trafegando entre frontend e backend
   ✅ Token sendo armazenado e enviado em Headers
```

---

## 📡 ENDPOINTS DE AUTENTICAÇÃO DISPONÍVEIS

### **Autenticação Básica:**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/register` | Criar novo usuário |
| `POST` | `/api/auth/login` | Login com email/senha |
| `POST` | `/api/auth/refresh` | Renovar access token |
| `POST` | `/api/auth/google/logout` | Logout e destruir sessão |
| `GET` | `/api/auth/me` | Obter dados do usuário autenticado |

### **Recuperação de Senha:**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/esqueci-senha` | Solicitar reset de senha |
| `GET` | `/api/auth/validar-token-reset` | Validar token de reset |
| `POST` | `/api/auth/resetar-senha` | Resetar senha com token |

### **Google OAuth (Social Login):**

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/auth/google/login` | Iniciar fluxo OAuth (server-side) |
| `GET` | `/api/auth/google/callback` | Callback do Google OAuth |
| `POST` | `/api/auth/google` | Login com token Google (client-side) |

**Nota:** Use o Swagger em `http://localhost:5000/api-docs` para testar todos os endpoints!

---

## 🎓 CONCEITOS IMPORTANTES APRENDIDOS

### **1. Cliente-Servidor**
- Frontend = Cliente (faz pedidos)
- Backend = Servidor (responde pedidos)

### **2. HTTP Requests**
- GET → Buscar dados
- POST → Criar dados
- PUT → Atualizar dados
- DELETE → Deletar dados

### **3. CORS (Cross-Origin Resource Sharing)**
- Permite frontend em uma porta acessar backend em outra
- Configurado no backend para aceitar http://localhost:5173

### **4. Autenticação JWT**
- Frontend envia: email + senha
- Backend retorna: access_token (cartão VIP) + refresh_token
- Frontend guarda: localStorage
- Próximas requisições: envia token no header `Authorization: Bearer <token>`
- **Refresh Token:** Renovar access token expirado sem fazer login novamente
- **Password Version:** Invalidar todos os tokens se a senha for alterada

### **5. Environment Variables (.env)**
- Backend: PORT, JWT_SECRET, DB_URL, CORS, BCRYPT_ROUNDS
- Frontend: VITE_API_URL (deve começar com VITE_)
- Nunca commitar `.env` no git (adicionar no `.gitignore`)

### **6. Google OAuth (Social Login)**
- Permite login via conta Google
- Reduz necessidade de gerenciar senhas
- Requer configuração no Google Cloud Console
- Suporta dois fluxos: Server-Side Flow (mais seguro) e Client-Side Flow

### **7. Recuperação de Senha**
- Token com expiração de 1 hora
- Token de single-use (não pode ser reutilizado)
- Email enviado via Resend com template HTML
- Aviso de segurança se não foi solicitado

---

## 🚀 COMANDOS RÁPIDOS (RESUMO)

### **Iniciar tudo pela primeira vez:**

```bash
# Terminal 1 - Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

### **Iniciar depois (já configurado):**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

---

## 🎯 PRÓXIMOS PASSOS

Depois que tudo estiver funcionando:

1. ✅ Testar todas as páginas
2. ✅ Criar crianças, locais, doações
3. ✅ Testar check-ins
4. ✅ Ver relatórios
5. ✅ Testar funcionalidades admin vs user

---

**Criado em:** 2025-10-09
**Última atualização:** 2025-11-08
**Status:** ✅ Completo com autenticação JWT, Google OAuth e Resend Email
**Sua primeira aplicação fullstack funcionando!** 🎉

---

## 🔒 SECURITY BEST PRACTICES

### **Em Desenvolvimento:**
- ✅ JWT_SECRET pode ser qualquer valor
- ✅ CORS aberto para localhost:5173
- ✅ Rate limiting desativado
- ✅ Senhas podem ser simples (para teste)

### **Antes de Produção:**
- ⚠️ Gerar secrets aleatórios de 32+ caracteres
- ⚠️ Usar HTTPS/SSL obrigatoriamente
- ⚠️ Ativar rate limiting
- ⚠️ Configurar CORS apenas para domínios específicos
- ⚠️ Usar senhas fortes (mínimo 8 caracteres com maiúsculas, números, símbolos)
- ⚠️ Configurar EMAIL_FROM com domínio verificado
- ⚠️ Adicionar .env ao .gitignore (nunca fazer commit)
- ⚠️ Usar variáveis de ambiente no host/provider (Vercel, Railway, etc)
- ⚠️ Validar todos os inputs no backend
- ⚠️ Implementar logout em todos os dispositivos após mudança de senha

---

## 💡 DICA FINAL

Mantenha os dois terminais abertos lado a lado:

```
┌──────────────────┬──────────────────┐
│  TERMINAL 1      │  TERMINAL 2      │
│  Backend         │  Frontend        │
│  Porta 5000      │  Porta 5173      │
│                  │                  │
│  [logs do        │  [logs do        │
│   Express]       │   Vite]          │
└──────────────────┴──────────────────┘
```

Assim você vê os logs em tempo real e entende o fluxo! 🚀
