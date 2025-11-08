const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { prisma } = require('../utils/database');
const { authenticateToken } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { validateBrazilianPhone } = require('../utils/phoneValidator');
const { enviarEmailRecuperacaoSenha } = require('../utils/emailService');
const { OAuth2Client } = require('google-auth-library');
const googleOAuth = require('../utils/googleOAuth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID do usuário
 *         nome:
 *           type: string
 *           description: Nome do usuário
 *         email:
 *           type: string
 *           format: email
 *           description: Email do usuário
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: Papel do usuário
 *         ativo:
 *           type: boolean
 *           description: Status do usuário
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - nome
 *         - email
 *         - password
 *       properties:
 *         nome:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *         telefone:
 *           type: string
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticar usuário
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Credenciais inválidas
 *       403:
 *         description: Usuário inativo
 */
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { email, password } = req.body;

    // Buscar usuário
    const user = await prisma.profile.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        password: true,
        telefone: true,
        role: true,
        ativo: true,
        status_aprovacao: true,
        password_version: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Email ou senha inválidos'
        }
      });
    }

    // Verificar senha primeiro (para não dar pista sobre existência de conta)
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          message: 'Email ou senha inválidos'
        }
      });
    }

    // Verificar status de aprovação (colaboradores precisam ser aprovados)
    if (user.role === 'user' && user.status_aprovacao !== 'aprovado') {
      return res.status(403).json({
        error: {
          message: 'Sua conta está pendente de aprovação por um administrador. Aguarde o contato da equipe.',
          code: 'PENDING_APPROVAL',
          status: user.status_aprovacao
        }
      });
    }

    // Verificar se conta está ativa
    if (!user.ativo) {
      return res.status(403).json({
        error: {
          message: 'Sua conta está desativada. Entre em contato com um administrador.',
          code: 'ACCOUNT_INACTIVE'
        }
      });
    }

    // Gerar tokens JWT incluindo password_version para invalidação
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        passwordVersion: user.password_version  // Usado para invalidar sessões antigas
      },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.JWT_EXPIRE_HOURS || 24}h` }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        passwordVersion: user.password_version
      },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.JWT_REFRESH_EXPIRE_DAYS || 7}d` }
    );

    res.json({
      message: 'Login realizado com sucesso',
      access_token: token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        telefone: user.telefone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Autenticar com Google OAuth
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *                 description: Token JWT do Google
 *     responses:
 *       200:
 *         description: Login/Cadastro bem-sucedido
 *       401:
 *         description: Token do Google inválido
 *       403:
 *         description: Conta pendente de aprovação ou desativada
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        error: {
          message: 'Token do Google é obrigatório',
          code: 'MISSING_CREDENTIAL'
        }
      });
    }

    // 1. Validar token com Google
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
    } catch (error) {
      console.error('Erro ao verificar token do Google:', error);
      // Se o erro for um objeto com 'message', logar também
      if (error && typeof error === 'object' && error.message) {
        console.error('Detalhes do erro do Google:', error.message);
      }
      return res.status(401).json({
        error: {
          message: 'Token do Google inválido',
          code: 'INVALID_GOOGLE_TOKEN'
        }
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // 2. Buscar ou criar usuário
    let user = await prisma.profile.findUnique({
      where: { email },
      include: {
        colaborador_locais: {
          include: { local: true }
        }
      }
    });

    // 3. Se não existe, criar (apenas para colaboradores)
    if (!user) {
      user = await prisma.profile.create({
        data: {
          nome: name,
          email: email,
          google_id: googleId,
          role: 'user',                    // Sempre user
          status_aprovacao: 'pendente',    // Precisa aprovação
          ativo: false,                    // Inativo até aprovar
          password: '',                    // Sem senha (Google OAuth)
          password_version: 1
        },
        include: {
          colaborador_locais: {
            include: { local: true }
          }
        }
      });

      // Retornar status pendente (sem JWT)
      return res.status(200).json({
        message: 'Conta criada! Aguardando aprovação do administrador.',
        needsApproval: true,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          status_aprovacao: user.status_aprovacao,
        }
      });
    }

    // 4. Se já existe, verificar permissões

    // Admin: pode logar sempre (se tiver Google ID ou não)
    if (user.role === 'admin') {
      // Atualizar google_id se ainda não tiver
      if (!user.google_id) {
        user = await prisma.profile.update({
          where: { id: user.id },
          data: { google_id: googleId },
          include: {
            colaborador_locais: {
              include: { local: true }
            }
          }
        });
      }

      const token = jwt.sign(
        {
          userId: user.id,
          role: user.role,
          passwordVersion: user.password_version
        },
        process.env.JWT_SECRET,
        { expiresIn: `${process.env.JWT_EXPIRE_HOURS || 24}h` }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, passwordVersion: user.password_version },
        process.env.JWT_SECRET,
        { expiresIn: `${process.env.JWT_REFRESH_EXPIRE_DAYS || 7}d` }
      );

      return res.json({
        message: 'Login realizado com sucesso',
        access_token: token,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
          locais: user.colaborador_locais?.map(cl => cl.local) || []
        }
      });
    }

    // Colaborador: verificar aprovação
    if (user.status_aprovacao !== 'aprovado') {
      return res.status(200).json({
        message: 'Sua conta está pendente de aprovação.',
        needsApproval: true,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          status_aprovacao: user.status_aprovacao,
        }
      });
    }

    if (!user.ativo) {
      return res.status(403).json({
        error: {
          message: 'Sua conta está desativada. Entre em contato com o administrador.',
          code: 'ACCOUNT_INACTIVE'
        }
      });
    }

    // 5. Atualizar google_id se ainda não tiver
    if (!user.google_id) {
      user = await prisma.profile.update({
        where: { id: user.id },
        data: { google_id: googleId },
        include: {
          colaborador_locais: {
            include: { local: true }
          }
        }
      });
    }

    // 6. Gerar tokens JWT
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        passwordVersion: user.password_version
      },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.JWT_EXPIRE_HOURS || 24}h` }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, passwordVersion: user.password_version },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.JWT_REFRESH_EXPIRE_DAYS || 7}d` }
    );

    res.json({
      message: 'Login realizado com sucesso',
      access_token: token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        locais: user.colaborador_locais?.map(cl => cl.local) || []
      }
    });

  } catch (error) {
    console.error('Erro no login Google:', error);
    res.status(500).json({
      error: {
        message: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      }
    });
  }
});

// ============================================
// NOVOS ENDPOINTS: Google OAuth Server-Side Flow
// ============================================

/**
 * @swagger
 * /api/auth/google/login:
 *   get:
 *     summary: Iniciar fluxo OAuth do Google (redirect)
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redireciona para página de login do Google
 */
router.get('/google/login', (req, res) => {
  try {
    // Gerar token state para CSRF protection
    const state = googleOAuth.generateStateToken();

    // Salvar state na sessão (para validar no callback)
    req.session.oauthState = state;

    // Gerar URL de autorização do Google
    const authUrl = googleOAuth.generateAuthUrl(state);

    console.log('🔐 Iniciando fluxo OAuth - redirecionando para Google');

    // Redirecionar usuário para Google
    res.redirect(authUrl);
  } catch (error) {
    console.error('Erro ao iniciar OAuth:', error);
    res.status(500).json({
      error: {
        message: 'Erro ao iniciar autenticação com Google',
        code: 'OAUTH_INIT_ERROR'
      }
    });
  }
});

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Callback do Google OAuth (recebe authorization code)
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redireciona para frontend com tokens
 *       400:
 *         description: Erro na validação (state inválido, code ausente, etc)
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // 1. Validar state token (CSRF protection)
    if (!state || state !== req.session.oauthState) {
      console.error('❌ State token inválido ou ausente');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=invalid_state`);
    }

    // Limpar state da sessão (uso único)
    delete req.session.oauthState;

    // 2. Validar authorization code
    if (!code) {
      console.error('❌ Authorization code ausente');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=no_code`);
    }

    // 3. Trocar code por tokens
    const tokens = await googleOAuth.exchangeCodeForTokens(code);

    // 4. Buscar informações do usuário
    const userInfo = await googleOAuth.getTokenInfo(tokens.access_token);
    const { id: googleId, email, name, picture } = userInfo;

    console.log('✅ Usuário autenticado pelo Google:', email);

    // 5. Buscar ou criar usuário no banco
    let user = await prisma.profile.findUnique({
      where: { email },
      include: {
        colaborador_locais: {
          include: { local: true }
        }
      }
    });

    // 6. Se não existe, criar novo usuário (colaborador)
    if (!user) {
      user = await prisma.profile.create({
        data: {
          nome: name,
          email: email,
          google_id: googleId,
          role: 'user',
          status_aprovacao: 'pendente',
          ativo: false,
          password: '',
          password_version: 1
        },
        include: {
          colaborador_locais: {
            include: { local: true }
          }
        }
      });

      console.log('📝 Nova conta criada (aguardando aprovação):', email);

      // Redirecionar para página de aprovação pendente
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/aguardando-aprovacao`);
    }

    // 7. Verificar permissões

    // Admin: pode logar sempre
    if (user.role === 'admin') {
      // Atualizar google_id se ainda não tiver
      if (!user.google_id) {
        user = await prisma.profile.update({
          where: { id: user.id },
          data: { google_id: googleId },
          include: {
            colaborador_locais: {
              include: { local: true }
            }
          }
        });
      }

      // Gerar JWT tokens
      const accessToken = jwt.sign(
        {
          userId: user.id,
          role: user.role,
          passwordVersion: user.password_version
        },
        process.env.JWT_SECRET,
        { expiresIn: `${process.env.JWT_EXPIRE_HOURS || 24}h` }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, passwordVersion: user.password_version },
        process.env.JWT_SECRET,
        { expiresIn: `${process.env.JWT_REFRESH_EXPIRE_DAYS || 7}d` }
      );

      console.log('✅ Admin autenticado com sucesso:', email);

      // Redirecionar para frontend com tokens
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}`);
    }

    // Colaborador: verificar aprovação
    if (user.status_aprovacao !== 'aprovado') {
      console.log('⏳ Conta pendente de aprovação:', email);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/aguardando-aprovacao`);
    }

    if (!user.ativo) {
      console.log('❌ Conta desativada:', email);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=account_inactive`);
    }

    // 8. Atualizar google_id se necessário
    if (!user.google_id) {
      user = await prisma.profile.update({
        where: { id: user.id },
        data: { google_id: googleId },
        include: {
          colaborador_locais: {
            include: { local: true }
          }
        }
      });
    }

    // 9. Gerar JWT tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        role: user.role,
        passwordVersion: user.password_version
      },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.JWT_EXPIRE_HOURS || 24}h` }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, passwordVersion: user.password_version },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.JWT_REFRESH_EXPIRE_DAYS || 7}d` }
    );

    console.log('✅ Colaborador autenticado com sucesso:', email);

    // Redirecionar para frontend com tokens
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}`);

  } catch (error) {
    console.error('❌ Erro no callback OAuth:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?error=oauth_error`);
  }
});

/**
 * @swagger
 * /api/auth/google/logout:
 *   post:
 *     summary: Fazer logout (destruir sessão OAuth)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 */
router.post('/google/logout', (req, res) => {
  try {
    // Destruir sessão (se existir)
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Erro ao destruir sessão:', err);
        }
      });
    }

    res.json({
      message: 'Logout realizado com sucesso',
      success: true
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      error: {
        message: 'Erro ao fazer logout',
        code: 'LOGOUT_ERROR'
      }
    });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Atualizar token de acesso
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token atualizado com sucesso
 *       401:
 *         description: Token inválido
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      console.log('❌ Refresh: Token não fornecido');
      return res.status(401).json({
        error: {
          message: 'Refresh token required'
        }
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    console.log('🔍 Refresh token decoded:', { userId: decoded.userId, hasPasswordVersion: !!decoded.passwordVersion });

    const user = await prisma.profile.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.ativo) {
      return res.status(401).json({
        error: {
          message: 'Invalid refresh token'
        }
      });
    }

    // Validar passwordVersion (invalida refresh tokens após troca de senha)
    if (decoded.passwordVersion !== user.password_version) {
      console.log('❌ Refresh: passwordVersion inválido', {
        tokenVersion: decoded.passwordVersion,
        userVersion: user.password_version
      });
      return res.status(401).json({
        error: {
          message: 'Sua senha foi alterada. Por favor, faça login novamente.',
          code: 'PASSWORD_CHANGED'
        }
      });
    }

    console.log('✅ Refresh: Token válido, gerando novo access token');
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, passwordVersion: user.password_version },
      process.env.JWT_SECRET,
      { expiresIn: `${process.env.JWT_EXPIRE_HOURS || 24}h` }
    );

    res.json({
      access_token: newToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        telefone: user.telefone
      }
    });
  } catch (error) {
    console.log('❌ Refresh: Erro ao processar token', error.message);
    return res.status(401).json({
      error: {
        message: 'Invalid refresh token'
      }
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obter perfil do usuário autenticado
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autenticado
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.profile.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found'
        }
      });
    }

    res.json({
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      role: user.role,
      ativo: user.ativo,
      created_at: user.created_at,
      updated_at: user.updated_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

/**
 * @swagger
 * /api/auth/esqueci-senha:
 *   post:
 *     summary: Solicitar recuperação de senha
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email de recuperação enviado
 */
router.post('/esqueci-senha', [
  body('email').isEmail().withMessage('Email inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { email } = req.body;

    // Buscar usuário
    const user = await prisma.profile.findUnique({
      where: { email }
    });

    // IMPORTANTE: Por segurança, sempre retornar sucesso
    // (não revelar se o email existe ou não no sistema)
    if (!user) {
      return res.json({
        message: 'Se este email estiver cadastrado, você receberá instruções para redefinir sua senha.'
      });
    }

    // Criar token de recuperação (expira em 1 hora)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const resetToken = await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        expira_em: expiresAt
      }
    });

    // Enviar email de recuperação
    enviarEmailRecuperacaoSenha(user.nome, user.email, resetToken.token)
      .then(result => {
        if (result.success) {
          console.log(`✅ Email de recuperação enviado para ${user.email}`);
        } else {
          console.error(`❌ Falha ao enviar email de recuperação para ${user.email}:`, result.error);
        }
      })
      .catch(err => {
        console.error(`❌ Erro ao enviar email de recuperação para ${user.email}:`, err);
      });

    res.json({
      message: 'Se este email estiver cadastrado, você receberá instruções para redefinir sua senha.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

/**
 * @swagger
 * /api/auth/validar-token-reset:
 *   get:
 *     summary: Validar token de reset de senha
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token válido
 *       400:
 *         description: Token inválido ou expirado
 */
router.get('/validar-token-reset', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: {
          message: 'Token é obrigatório',
          code: 'TOKEN_REQUIRED'
        }
      });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: token.toString() }
    });

    if (!resetToken) {
      return res.status(400).json({
        error: {
          message: 'Token inválido',
          code: 'INVALID_TOKEN'
        }
      });
    }

    if (resetToken.usado) {
      return res.status(400).json({
        error: {
          message: 'Este token já foi utilizado',
          code: 'TOKEN_ALREADY_USED'
        }
      });
    }

    if (new Date() > resetToken.expira_em) {
      return res.status(400).json({
        error: {
          message: 'Este token expirou. Solicite um novo link de recuperação.',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    res.json({
      message: 'Token válido',
      valid: true
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

/**
 * @swagger
 * /api/auth/resetar-senha:
 *   post:
 *     summary: Resetar senha com token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - novaSenha
 *             properties:
 *               token:
 *                 type: string
 *               novaSenha:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Senha resetada com sucesso
 *       400:
 *         description: Token inválido ou senha inválida
 */
router.post('/resetar-senha', [
  body('token').notEmpty().withMessage('Token é obrigatório'),
  body('novaSenha').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { token, novaSenha } = req.body;

    // Buscar token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken) {
      return res.status(400).json({
        error: {
          message: 'Token inválido',
          code: 'INVALID_TOKEN'
        }
      });
    }

    if (resetToken.usado) {
      return res.status(400).json({
        error: {
          message: 'Este token já foi utilizado',
          code: 'TOKEN_ALREADY_USED'
        }
      });
    }

    if (new Date() > resetToken.expira_em) {
      return res.status(400).json({
        error: {
          message: 'Este token expirou. Solicite um novo link de recuperação.',
          code: 'TOKEN_EXPIRED'
        }
      });
    }

    // Hash da nova senha
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(novaSenha, saltRounds);

    // Atualizar senha e incrementar password_version (invalida todas as sessões)
    await prisma.$transaction([
      prisma.profile.update({
        where: { id: resetToken.user_id },
        data: {
          password: hashedPassword,
          password_version: { increment: 1 }  // Incrementa para invalidar tokens JWT antigos
        }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usado: true }
      })
    ]);

    console.log(`✅ Senha resetada com sucesso para usuário ${resetToken.user.email}`);

    res.json({
      message: 'Senha alterada com sucesso! Você pode fazer login com sua nova senha. Todas as sessões ativas foram encerradas.',
      success: true
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

module.exports = router;