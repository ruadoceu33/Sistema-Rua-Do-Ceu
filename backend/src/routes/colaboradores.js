const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const { prisma } = require('../utils/database');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { validateBrazilianPhone } = require('../utils/phoneValidator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Colaborador:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         nome:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         telefone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, admin]
 *         ativo:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/colaboradores:
 *   get:
 *     summary: Listar todos os colaboradores
 *     tags: [Colaboradores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *       - in: query
 *         name: ativo
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de colaboradores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Colaborador'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role;
    const ativo = req.query.ativo;

    const where = {};

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    const [colaboradores, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          role: true,
          ativo: true,
          status_aprovacao: true,
          created_at: true,
          updated_at: true,
          colaborador_locais: {
            select: {
              local_id: true,
              local: {
                select: {
                  id: true,
                  nome: true
                }
              }
            }
          },
          _count: {
            select: {
              audit_logs: true
            }
          }
        }
      }),
      prisma.profile.count({ where })
    ]);

    res.json({
      data: colaboradores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List colaboradores error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

/**
 * @swagger
 * /api/colaboradores/pendentes:
 *   get:
 *     summary: Listar colaboradores com aprovação pendente
 *     tags: [Colaboradores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de colaboradores pendentes
 */
router.get('/pendentes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const colaboradores = await prisma.profile.findMany({
      where: {
        role: 'user',
        status_aprovacao: 'pendente'
      },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        ativo: true,
        status_aprovacao: true,
        created_at: true,
        updated_at: true
      }
    });

    res.json({
      data: colaboradores,
      total: colaboradores.length
    });
  } catch (error) {
    console.error('List pending colaboradores error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

/**
 * @swagger
 * /api/colaboradores/{id}/aprovar:
 *   put:
 *     summary: Aprovar colaborador pendente
 *     tags: [Colaboradores]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id/aprovar', [
  authenticateToken,
  requireAdmin,
  body('locais').isArray({ min: 1 }).withMessage('Pelo menos 1 local é obrigatório'),
  auditMiddleware('profiles', 'UPDATE')
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

    const { id } = req.params;
    const { locais } = req.body;

    const colaborador = await prisma.profile.findUnique({
      where: { id },
      select: { id: true, nome: true, email: true, status_aprovacao: true }
    });

    if (!colaborador) {
      return res.status(404).json({
        error: { message: 'Colaborador not found' }
      });
    }

    if (colaborador.status_aprovacao === 'aprovado') {
      return res.status(400).json({
        error: { message: 'Colaborador já está aprovado', code: 'ALREADY_APPROVED' }
      });
    }

    const locaisExistentes = await prisma.local.findMany({
      where: { id: { in: locais } },
      select: { id: true }
    });

    if (locaisExistentes.length !== locais.length) {
      return res.status(400).json({
        error: { message: 'Um ou mais locais não existem', code: 'INVALID_LOCAIS' }
      });
    }

    const colaboradorAtualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.profile.update({
        where: { id },
        data: { status_aprovacao: 'aprovado', ativo: true },
        select: {
          id: true, nome: true, email: true, telefone: true, role: true,
          ativo: true, status_aprovacao: true,
          created_at: true, updated_at: true
        }
      });

      await tx.colaboradorLocal.deleteMany({ where: { colaborador_id: id } });
      await tx.colaboradorLocal.createMany({
        data: locais.map(local_id => ({ colaborador_id: id, local_id }))
      });

      return updated;
    });

    res.json({
      message: 'Colaborador aprovado com sucesso!',
      colaborador: colaboradorAtualizado
    });
  } catch (error) {
    console.error('Approve colaborador error:', error);
    res.status(500).json({
      error: { message: 'Internal server error' }
    });
  }
});

/**
 * @swagger
 * /api/colaboradores/{id}:
 *   get:
 *     summary: Obter colaborador por ID
 *     tags: [Colaboradores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Colaborador encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Colaborador'
 *       404:
 *         description: Colaborador não encontrado
 */
router.get('/:id', authenticateToken, requireOwnerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const colaborador = await prisma.profile.findUnique({
      where: { id },
      include: {
        colaborador_locais: {
          include: {
            local: {
              select: {
                id: true,
                nome: true,
                endereco: true
              }
            }
          }
        },
        _count: {
          select: {
            audit_logs: true
          }
        }
      }
    });

    if (!colaborador) {
      return res.status(404).json({
        error: {
          message: 'Colaborador not found'
        }
      });
    }

    // Remover senha do response
    const { password, ...colaboradorWithoutPassword } = colaborador;

    res.json(colaboradorWithoutPassword);
  } catch (error) {
    console.error('Get colaborador error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

/**
 * @swagger
 * /api/colaboradores:
 *   post:
 *     summary: Criar novo colaborador
 *     tags: [Colaboradores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - password
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               telefone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       201:
 *         description: Colaborador criado com sucesso
 *       400:
 *         description: Erro de validação
 *       409:
 *         description: Email já existe
 */
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('nome').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
  body('telefone').optional().custom(validateBrazilianPhone),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role inválido'),
  body('locais').optional().isArray().withMessage('Locais deve ser um array')
], auditMiddleware('profiles', 'INSERT'), async (req, res) => {
  try {
    // BLOQUEIO DE SEGURANÇA: Criação de usuários desabilitada
    // Colaboradores entram via Google OAuth (aprovação do admin)
    // Admins são criados via seed do banco de dados
    return res.status(403).json({
      error: {
        message: 'Criação manual de usuários desabilitada. Colaboradores devem fazer login via Google OAuth.',
        code: 'USER_CREATION_DISABLED'
      }
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const { nome, email, password, telefone, role = 'user', locais } = req.body;

    // Verificar se colaborador já existe
    const existingColaborador = await prisma.profile.findUnique({
      where: { email }
    });

    if (existingColaborador) {
      return res.status(409).json({
        error: {
          message: 'Email already registered'
        }
      });
    }

    // Hash da senha
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const colaborador = await prisma.profile.create({
      data: {
        nome,
        email,
        password: hashedPassword,
        telefone,
        role,
        ativo: true
      },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        ativo: true,
        created_at: true,
        updated_at: true
      }
    });

    // Se locais foram enviados, criar vínculos
    if (locais && Array.isArray(locais) && locais.length > 0) {
      await prisma.colaboradorLocal.createMany({
        data: locais.map(local_id => ({
          colaborador_id: colaborador.id,
          local_id: local_id
        }))
      });
    }

    res.status(201).json(colaborador);
  } catch (error) {
    console.error('Create colaborador error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

/**
 * @swagger
 * /api/colaboradores/{id}:
 *   put:
 *     summary: Atualizar colaborador
 *     tags: [Colaboradores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               telefone:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *               ativo:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Colaborador atualizado com sucesso
 *       404:
 *         description: Colaborador não encontrado
 */
router.put('/:id', [
  authenticateToken,
  requireOwnerOrAdmin,
  body('nome').optional().trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('telefone').optional().custom(validateBrazilianPhone),
  body('role').optional().isIn(['user', 'admin']).withMessage('Role inválido'),
  body('ativo').optional().isBoolean().withMessage('Ativo deve ser booleano'),
  body('locais').optional().isArray().withMessage('Locais deve ser um array')
], auditMiddleware('profiles', 'UPDATE'), async (req, res) => {
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

    const { id } = req.params;
    const { nome, email, telefone, role, ativo, locais } = req.body;

    // Verificar se colaborador existe
    const existingColaborador = await prisma.profile.findUnique({
      where: { id }
    });

    if (!existingColaborador) {
      return res.status(404).json({
        error: {
          message: 'Colaborador not found'
        }
      });
    }

    // Se email está sendo alterado, verificar se já existe
    if (email && email !== existingColaborador.email) {
      const emailExists = await prisma.profile.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(409).json({
          error: {
            message: 'Email already registered'
          }
        });
      }
    }

    // BLOQUEIO DE SEGURANÇA: Role não pode ser alterado após criação
    if (role !== undefined && role !== existingColaborador.role) {
      return res.status(403).json({
        error: {
          message: 'Não é permitido alterar o tipo de usuário (role) por motivos de segurança',
          code: 'ROLE_CHANGE_FORBIDDEN'
        }
      });
    }

    const updateData = {};
    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) updateData.email = email;
    if (telefone !== undefined) updateData.telefone = telefone;
    if (ativo !== undefined && req.user.role === 'admin') updateData.ativo = ativo;

    const colaborador = await prisma.profile.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        ativo: true,
        created_at: true,
        updated_at: true
      }
    });

    // Se locais foram enviados, atualizar vínculos
    if (locais !== undefined && Array.isArray(locais) && req.user.role === 'admin') {
      // Deletar vínculos antigos
      await prisma.colaboradorLocal.deleteMany({
        where: { colaborador_id: id }
      });

      // Criar novos vínculos
      if (locais.length > 0) {
        await prisma.colaboradorLocal.createMany({
          data: locais.map(local_id => ({
            colaborador_id: id,
            local_id: local_id
          }))
        });
      }
    }

    res.json(colaborador);
  } catch (error) {
    console.error('Update colaborador error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

/**
 * @swagger
 * /api/colaboradores/{id}:
 *   delete:
 *     summary: Deletar colaborador
 *     tags: [Colaboradores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Colaborador deletado com sucesso
 *       404:
 *         description: Colaborador não encontrado
 */
router.delete('/:id', [
  authenticateToken,
  requireAdmin,
  auditMiddleware('profiles', 'DELETE')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Impedir autoexclusão
    if (id === req.user.id) {
      return res.status(400).json({
        error: {
          message: 'Cannot delete your own account'
        }
      });
    }

    const colaborador = await prisma.profile.findUnique({
      where: { id }
    });

    if (!colaborador) {
      return res.status(404).json({
        error: {
          message: 'Colaborador not found'
        }
      });
    }

    await prisma.profile.delete({
      where: { id }
    });

    res.json({
      message: 'Colaborador deleted successfully'
    });
  } catch (error) {
    console.error('Delete colaborador error:', error);
    res.status(500).json({
      error: {
        message: 'Internal server error'
      }
    });
  }
});

module.exports = router;