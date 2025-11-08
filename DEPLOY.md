# 🚀 Guia Completo de Deploy - Projeto Rua do Céu

Este guia contém instruções passo-a-passo para fazer o deploy completo da aplicação (Frontend + Backend + Database) em serviços gratuitos na nuvem.

## 📋 Arquitetura de Deploy

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Vercel         │         │  Render          │         │  Neon           │
│  (Frontend)     │────────▶│  (Backend API)   │────────▶│  (PostgreSQL)   │
│  React + Vite   │  HTTPS  │  Node.js + Prisma│  SSL    │  Database       │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

**Stack:**
- **Frontend:** Vercel (Free Tier) - React + Vite + TypeScript
- **Backend:** Render (Free Tier) - Node.js + Express.js + Prisma
- **Database:** Neon (Free Tier) - PostgreSQL Serverless

---

## 🗄️ Passo 1: Configurar Database (Neon)

### 1.1 Criar Conta e Projeto

1. Acesse [Neon.tech](https://neon.tech/) e crie uma conta gratuita
2. Clique em **"Create a project"**
3. Configure:
   - **Project name:** `projeto-rua-do-ceu`
   - **Database name:** `ruadoceu`
   - **Region:** Escolha a mais próxima (ex: AWS US East)
4. Clique em **"Create project"**

### 1.2 Obter Connection String

1. No dashboard do projeto, clique na aba **"Connection Details"**
2. Copie a **Connection string** (formato Prisma):
   ```
   postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
   ```
3. **Guarde esta URL** - você vai precisar para backend e local

### 1.3 Verificar Schema

O schema do Prisma já está configurado em `backend/prisma/schema.prisma`. Após o deploy do backend, o Prisma criará automaticamente todas as tabelas.

**Tabelas criadas:**
- `profile` - Usuários e colaboradores
- `local` - Locais de atendimento
- `crianca` - Crianças cadastradas
- `doacao` - Doações recebidas
- `checkin` - Check-ins realizados
- `colaborador_local` - Relacionamento colaborador-local
- `audit_log` - Logs de auditoria
- `user_2fa` - Configuração 2FA

---

## 🔧 Passo 2: Deploy do Backend (Render)

### 2.1 Preparar Repositório GitHub

1. **Verifique se o código está commitado:**
   ```bash
   git status
   ```

2. **Se houver alterações, commite:**
   ```bash
   git add .
   git commit -m "Preparado para deploy - Backend e Frontend"
   ```

3. **Crie e suba para a branch Semi-Completo:**
   ```bash
   git checkout -b Semi-Completo
   git push origin Semi-Completo
   ```

### 2.2 Criar Web Service no Render

1. Acesse [Render.com](https://render.com/) e faça login
2. No dashboard, clique em **"New +"** → **"Web Service"**
3. Clique em **"Connect GitHub"** e autorize o Render
4. Selecione o repositório do projeto
5. Configure o serviço:

   | Campo | Valor |
   |-------|-------|
   | **Name** | `projeto-rua-do-ceu-api` |
   | **Region** | Oregon (US West) ou mais próximo |
   | **Branch** | `Semi-Completo` |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npx prisma generate` |
   | **Start Command** | `npm start` |
   | **Instance Type** | `Free` |

6. Clique em **"Advanced"** para expandir opções avançadas

### 2.3 Configurar Variáveis de Ambiente

Na seção **"Environment Variables"**, adicione:

```env
NEON_DB_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
JWT_SECRET=GERE_UM_SECRET_SUPER_SEGURO_MINIMO_32_CARACTERES
JWT_EXPIRE_HOURS=24
JWT_REFRESH_EXPIRE_DAYS=7
NODE_ENV=production
PORT=5000
CORS_ORIGINS=https://seu-frontend.vercel.app
BCRYPT_ROUNDS=12
```

**⚠️ IMPORTANTE:**

- **NEON_DB_URL:** Cole a URL que você obteve no Passo 1.2
- **JWT_SECRET:** Gere um segredo forte:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Copie o resultado e cole aqui
- **CORS_ORIGINS:** Por enquanto deixe como `https://seu-frontend.vercel.app`, você vai atualizar depois

### 2.4 Fazer Deploy

1. Clique em **"Create Web Service"**
2. O Render iniciará o build automaticamente
3. Acompanhe o progresso na aba **"Logs"**
4. Aguarde até ver: `✓ Build successful` e `Server running on port 5000`
5. Seu backend estará disponível em: `https://projeto-rua-do-ceu-api.onrender.com`

### 2.5 Testar Backend

```bash
# Health check
curl https://projeto-rua-do-ceu-api.onrender.com/health

# Resposta esperada:
# {"status":"healthy","timestamp":"2025-10-09T..."}
```

**⚠️ Observação:** Na primeira requisição, pode demorar ~30 segundos (cold start do free tier).

---

## 💻 Passo 3: Deploy do Frontend (Vercel)

### 3.1 Preparar Projeto Frontend

1. **Verifique se `.env.example` existe em `frontend/`:**
   ```bash
   cat frontend/.env.example
   ```

2. **Deve conter:**
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_NODE_ENV=development
   ```

### 3.2 Criar Projeto na Vercel

1. Acesse [Vercel.com](https://vercel.com/) e faça login com GitHub
2. Clique em **"Add New..."** → **"Project"**
3. Selecione o repositório do projeto
4. Configure o projeto:

   | Campo | Valor |
   |-------|-------|
   | **Framework Preset** | `Vite` |
   | **Root Directory** | `frontend` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |
   | **Install Command** | `npm install` |

### 3.3 Configurar Variáveis de Ambiente

Na seção **"Environment Variables"**, adicione:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://projeto-rua-do-ceu-api.onrender.com/api` |
| `VITE_NODE_ENV` | `production` |

**⚠️ IMPORTANTE:** Use a URL do seu backend Render (obtida no Passo 2.4) + `/api`

### 3.4 Fazer Deploy

1. Clique em **"Deploy"**
2. A Vercel iniciará o build automaticamente
3. Aguarde até ver: **"Your project is live!"**
4. Seu frontend estará disponível em: `https://projeto-rua-do-ceu.vercel.app`

### 3.5 Atualizar CORS no Backend

Agora que você tem a URL do frontend, precisa atualizar o backend:

1. Volte ao dashboard do Render
2. Acesse seu Web Service → **"Environment"**
3. Edite a variável `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://projeto-rua-do-ceu.vercel.app
   ```
4. Clique em **"Save Changes"**
5. O Render fará redeploy automático (~2 minutos)

---

## ✅ Passo 4: Testar Aplicação Completa

### 4.1 Acessar Aplicação

Abra seu navegador e acesse: `https://projeto-rua-do-ceu.vercel.app`

### 4.2 Primeiro Login

Como o banco está vazio, você precisa criar o primeiro usuário admin:

**Opção 1: Via API (Recomendado)**

```bash
curl -X POST https://projeto-rua-do-ceu-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Administrador",
    "email": "admin@ruadoceu.com",
    "senha": "Admin@2025",
    "telefone": "11999999999",
    "role": "admin"
  }'
```

**Opção 2: Via Neon Console**

1. Acesse seu projeto Neon → **"SQL Editor"**
2. Execute:
   ```sql
   INSERT INTO profile (id, nome, email, senha, telefone, role, ativo, created_at, updated_at)
   VALUES (
     gen_random_uuid(),
     'Administrador',
     'admin@ruadoceu.com',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYILuxuR1yy', -- senha: Admin123
     '11999999999',
     'admin',
     true,
     NOW(),
     NOW()
   );
   ```

### 4.3 Fazer Login

1. Na tela de login, use:
   - **Email:** `admin@ruadoceu.com`
   - **Senha:** `Admin@2025` (ou `Admin123` se usou SQL)
2. Clique em **"Entrar"**
3. Você deve ser redirecionado para o Dashboard

### 4.4 Verificar Funcionalidades

Teste cada página:
- ✅ **Dashboard:** Estatísticas carregando
- ✅ **Crianças:** Criar, editar, listar
- ✅ **Locais:** Criar, editar, listar
- ✅ **Doações:** Criar, editar, listar
- ✅ **Check-ins:** Criar, editar, listar
- ✅ **Colaboradores:** Criar, editar, listar (admin apenas)
- ✅ **Aniversários:** Listar aniversariantes

---

## 🔄 Passo 5: Deploy Automático (CI/CD)

### 5.1 Configurar Auto-Deploy no Render

1. Dashboard do Render → Seu Web Service
2. Acesse **"Settings"** → **"Build & Deploy"**
3. Em **"Auto-Deploy"**, selecione `Yes`
4. Salve as alterações

### 5.2 Configurar Auto-Deploy na Vercel

1. Dashboard da Vercel → Seu Projeto
2. Acesse **"Settings"** → **"Git"**
3. **"Production Branch"** deve estar como `Semi-Completo`
4. A Vercel já faz auto-deploy por padrão

**Agora:** Todo push para a branch `Semi-Completo` fará deploy automático!

---

## ⚠️ Limitações do Free Tier

### Render (Backend)
- **Cold Start:** Após 15min de inatividade, o servidor hiberna
  - Primeira requisição após hibernar demora ~30-45 segundos
  - Solução: Use um serviço de ping (ex: UptimeRobot) para manter ativo
- **750 horas/mês:** Suficiente para 1 app rodando 24/7
- **Recursos:** 512MB RAM, CPU compartilhada
- **Build time:** Máximo 15 minutos por deploy

### Vercel (Frontend)
- **100GB bandwidth/mês:** Mais que suficiente para tráfego moderado
- **Build time:** 6000 minutos/mês (100h)
- **Sem cold start:** Sempre rápido (CDN global)

### Neon (Database)
- **Compute time:** 191.9 horas/mês (~8 dias)
  - Após esgotar, banco fica readonly até próximo mês
  - Solução: Upgrade para plano pago ($19/mês) se necessário
- **Storage:** 512MB incluído
- **Connections:** Máximo 100 conexões simultâneas

---

## 🐛 Troubleshooting

### Backend não inicia no Render

**Erro:** `Application failed to respond`

**Solução:**
1. Verifique logs: Dashboard → "Logs"
2. Confirme que `PORT=5000` está nas variáveis de ambiente
3. Verifique se `start-server.js` ou `src/server.js` usa `process.env.PORT`

### Frontend não conecta no Backend

**Erro:** `Network Error` ou `CORS error`

**Solução:**
1. Verifique `VITE_API_URL` no Vercel (deve terminar com `/api`)
2. Confirme `CORS_ORIGINS` no Render (URL exata do frontend, sem barra final)
3. Teste backend diretamente:
   ```bash
   curl https://seu-backend.onrender.com/health
   ```

### Prisma não gera schema

**Erro:** `Error: Schema file not found`

**Solução:**
1. Confirme que `backend/prisma/schema.prisma` existe
2. Adicione ao Build Command:
   ```
   npm install && npx prisma generate && npx prisma db push
   ```

### Database connection failed

**Erro:** `Can't reach database server`

**Solução:**
1. Verifique se `NEON_DB_URL` está correta
2. Confirme que inclui `?sslmode=require` no final
3. Teste conexão:
   ```bash
   npx prisma db pull
   ```

### Cold start muito lento

**Problema:** Backend demora 30-60s após inatividade

**Soluções:**
1. **UptimeRobot:** Configure ping a cada 14 minutos
2. **Cron-job.org:** Configure job HTTP GET
3. **Upgrade para plano pago:** $7/mês (sem hibernação)

---

## 📊 Monitoramento

### Logs do Backend (Render)
```
Dashboard → Seu Web Service → "Logs"
```

### Logs do Frontend (Vercel)
```
Dashboard → Seu Projeto → "Deployments" → Clique no deploy → "Function Logs"
```

### Database Metrics (Neon)
```
Dashboard → Seu Projeto → "Monitoring"
```

---

## 🔒 Segurança

### Variáveis de Ambiente

✅ **Nunca commite arquivos `.env`**
✅ **Use `.env.example` apenas com placeholders**
✅ **JWT_SECRET deve ter no mínimo 32 caracteres**
✅ **Senhas devem ser fortes (mínimo 8 chars, maiúsculas, números)**

### HTTPS

✅ **Render e Vercel já incluem SSL/TLS automático**
✅ **Todas as requisições são HTTPS por padrão**

### CORS

✅ **Configure apenas as origens necessárias**
✅ **Nunca use `*` em produção**

---

## 📚 Recursos Úteis

- [Documentação Render](https://render.com/docs)
- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Neon](https://neon.tech/docs)
- [Documentação Prisma](https://www.prisma.io/docs)
- [API Docs (Swagger)](https://seu-backend.onrender.com/api-docs)

---

## 🎉 Deploy Completo!

Sua aplicação está rodando em produção!

**URLs:**
- **Frontend:** `https://projeto-rua-do-ceu.vercel.app`
- **Backend:** `https://projeto-rua-do-ceu-api.onrender.com`
- **API Docs:** `https://projeto-rua-do-ceu-api.onrender.com/api-docs`

**Próximos passos:**
1. Configure domínio customizado (opcional)
2. Configure monitoramento (UptimeRobot)
3. Configure backups do banco (Neon suporta backups automáticos)
4. Implemente analytics (Google Analytics, Plausible, etc.)

---

**Criado com ❤️ para o Projeto Rua do Céu**
