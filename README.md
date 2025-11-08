# 🚀 Projeto Rua do Céu

> **Última atualização**: 2025-11-08

O **Projeto Rua do Céu** é uma plataforma web fullstack desenvolvida para auxiliar organizações sociais no gerenciamento de crianças em situação de vulnerabilidade, oferecendo ferramentas robustas para registro de atendimentos, distribuição de doações e acompanhamento social com segurança e conformidade.

## ✨ Funcionalidades Principais

### Gestão de Crianças e Colaboradores
- ✅ Cadastro e acompanhamento de crianças em situação de vulnerabilidade.
- ✅ Gestão de colaboradores com sistema de aprovação e ativação.
- ✅ Perfis de usuário (Admin e Colaborador) com permissões granulares.
- ✅ Associação de colaboradores a múltiplos locais de atendimento.

### Operações e Atendimento
- ✅ Registro de check-ins de presença e ausência com rastreamento de estoque.
- ✅ Gestão de doações com controle de quantidade e consumo.
- ✅ Sistema de doações de aniversário com rastreamento de entrega.
- ✅ Check-ins em massa com validação transacional de estoque.
- ✅ Relatórios e dashboards com estatísticas detalhadas (urgência, cobertura).

### Saúde e Segurança
- ✅ Sistema de tags de saúde (alergias, condições médicas) com observações personalizadas.
- ✅ Histórico de atendimentos e distribuições por criança.
- ✅ Auditoria completa com rastreamento de IP e User-Agent.

### Autenticação e Segurança
- ✅ Autenticação segura com Google OAuth 2.0 e email/senha para Admin.
- ✅ Recuperação de senha com tokens de uso único (1 hora de validade).
- ✅ Invalidação global de sessões ao redefinir senha.
- ✅ Controle de acesso baseado em local (Location-Based Access Control).

---

## 💻 Tecnologias Utilizadas

| Categoria | Tecnologia |
|-----------|------------|
| **Frontend**| React, Vite, TypeScript, React Query, Tailwind CSS |
| **Backend** | Node.js, Express.js, Prisma, PostgreSQL |
| **Infra**   | Neon (Database), Vercel (Frontend), Render (Backend) |

---

## 🔐 Autenticação e Segurança

### Autenticação
- **Colaboradores**: Login com Google OAuth 2.0 (recomendado para facilidade de acesso)
- **Administradores**: Login com email e senha, com opção de associar Google ID
- **Recuperação de Senha**: Token de uso único com validade de 1 hora
- **Invalidação Global**: Ao redefinir senha, todos os tokens JWT existentes são invalidados

### Controle de Acesso
- **Papéis de Usuário**: Admin (acesso total) e Colaborador (acesso restrito por local)
- **Acesso por Local**: Colaboradores só acessam dados dos locais aos quais estão associados
- **Administradores**: Acesso irrestrito a todos os dados do sistema
- **Permissões Granulares**: Operações específicas restritas por papel (aprovação, exclusão, auditoria)

### Proteção de Dados
- **Helmets de Segurança**: Proteção contra XSS, clickjacking e outras vulnerabilidades web
- **CORS Configurável**: Restrição de origens permitidas
- **Rate Limiting**: Limitação de requisições em produção (prevenção de força bruta)
- **Audit Logs**: Rastreamento completo de operações com IP e User-Agent

---

## 👥 Gestão de Usuários

### Processo de Onboarding
1. **Cadastro**: Novo colaborador se registra via Google OAuth ou convite do Admin
2. **Aprovação Pendente**: Usuário criado com status `pendente`
3. **Associação a Locais**: Admin associa colaborador a um ou mais locais de trabalho
4. **Ativação**: Após aprovação, status muda para `aprovado` e usuário pode fazer login

### Permissões por Papel

| Operação | Admin | Colaborador |
|----------|-------|-------------|
| Gerenciar Colaboradores | ✅ | ❌ |
| Aprovar Colaboradores | ✅ | ❌ |
| Gerenciar Locais | ✅ | ❌ |
| Gerenciar Crianças (CRUD) | ✅ | ✅ |
| Deletar Crianças* | ✅ | ✅ |
| Gerenciar Doações (CRUD) | ✅ | ✅ |
| Deletar Doações* | ✅ | ✅ |
| Gerenciar Check-ins | ✅ | ✅ |
| Visualizar Relatórios | ✅ | ✅ |
| Visualizar Audit Logs | ✅ | ❌ |

> **Nota**: *Colaboradores podem deletar crianças e doações dos seus locais associados, desde que não haja check-ins relacionados para manter integridade histórica.

---

## 📊 Relatórios e Analytics

O sistema oferece relatórios detalhados para acompanhamento social:

### Ranking de Urgência
- Classifica crianças por tempo decorrido desde último atendimento
- Categorização por cor: Verde (0-30 dias) → Amarelo (31-90) → Laranja (91-180) → Vermelho (>180)
- Auxilia priorização de visitas e atendimentos

### Taxa de Cobertura
- Percentual de crianças ativas que receberam doações em um período
- Fórmula: `(crianças_atendidas / total_matriculado) × 100`
- Útil para avaliar efetividade do programa

### Histórico de Atendimentos
- Consolidação de todos os check-ins e doações recebidas por criança
- Facilita acompanhamento do histórico social e de suporte

---

## 📁 Estrutura do Projeto

O projeto é um monorepo com duas pastas principais:

-   `./frontend/`: Contém a aplicação React (Vite + TS).
-   `./backend/`: Contém a API Node.js (Express + Prisma).

---

## 🛡️ Segurança e Conformidade

### Recursos de Segurança
- **Autenticação Robusta**: Google OAuth 2.0 para colaboradores, JWT tokens para api
- **Validação de Dados**: Express-validator para validação de entrada
- **Proteção contra Vulnerabilidades**: Helmet.js (XSS, clickjacking, MIME sniffing)
- **Hash de Senhas**: Bcryptjs com salting para armazenamento seguro
- **Tokens com Versionamento**: Invalidação global ao redefinir senha
- **Rate Limiting**: Proteção contra força bruta em produção

### Conformidade e Auditoria
- **Audit Logs Completo**: Rastreamento de todas as operações (CREATE, UPDATE, DELETE)
- **Rastreamento de IP e User-Agent**: Identificação de origem das ações
- **Campos Capturados**: Valores antigos e novos de todos os registros modificados
- **Isolamento de Dados**: Colaboradores só acessam dados dos seus locais associados
- **Integridade Referencial**: Validações que impedem inconsistências (não deleta criança com histórico)

### Proteção de Dados Sensíveis
- **CORS Configurável**: Apenas origens autorizadas podem acessar a API
- **Cookies Seguros**: Configurados com flags de segurança apropriadas
- **Compressão**: Reduz tamanho das respostas para melhor performance
- **Logging Estruturado**: Morgan para rastreamento de requisições

---

## 🚀 Começando

Para instruções detalhadas sobre como configurar e executar o projeto localmente, consulte o **[Guia de Início Rápido](./GUIA-INICIAR-APLICACAO.md)**.

## ☁️ Deploy

Para instruções sobre como fazer o deploy da aplicação em produção utilizando Vercel, Render e Neon, consulte o **[Guia de Deploy](./DEPLOY.md)**.

## 📖 Documentação Completa

### Documentação Disponível

| Documento | Descrição |
|-----------|-----------|
| **[Guia de Início Rápido](./GUIA-INICIAR-APLICACAO.md)** | Instruções para configurar e executar o projeto localmente (frontend e backend) |
| **[Regras de Negócio](./REGRAS_DE_NEGOCIO.md)** | Especificação detalhada de todas as regras, fluxos e validações do sistema |
| **[Documentação Técnica](./DOCUMENTACAO.md)** | Arquitetura, endpoints da API, modelos de dados e decisões técnicas |
| **[Guia de Deploy](./DEPLOY.md)** | Instruções para deploy em produção (Vercel, Render, Neon) |
| **API Docs (Swagger)** | Documentação interativa disponível em `http://localhost:5000/api-docs` (após iniciar o backend) |

### Resumo de Recursos Disponíveis

- 📚 **Guias de Configuração**: Setup local, variáveis de ambiente, dependências
- 📋 **Regras de Negócio**: Fluxos de aprovação, gestão de locais, validações de estoque
- 🏗️ **Arquitetura**: Estrutura do projeto, relações de dados, middlewares
- 🚀 **Deploy**: Configuração de produção em nuvem
- 🔌 **API Reference**: Endpoints, métodos, autenticação, exemplos
