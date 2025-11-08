const express = require('express');
const { body, validationResult } = require('express-validator');

const { prisma } = require('../utils/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');
const { validateBrazilianPhone } = require('../utils/phoneValidator');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Local:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID do local
 *         nome:
 *           type: string
 *           example: "Centro Comunitário São José"
 *           description: Nome do local
 *         endereco:
 *           type: string
 *           example: "Rua Principal, 123, Centro"
 *           description: Endereço completo
 *         capacidade:
 *           type: integer
 *           example: 50
 *           description: Capacidade máxima de pessoas
 *         responsavel:
 *           type: string
 *           example: "João Silva"
 *           description: Nome do responsável
 *         telefone:
 *           type: string
 *           example: "11999999999"
 *           description: Telefone de contato
 *         ativo:
 *           type: boolean
 *           example: true
 *           description: Status do local
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data de atualização
 */

/**
 * @swagger
 * tags:
 *   - name: Locais
 *     description: Gestão de locais do projeto
 */

/**
 * @swagger
 * /api/locais:
 *   get:
 *     summary: Listar todos os locais
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de locais
 */
// Listar locais
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const where = {};
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { endereco: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [locais, total] = await Promise.all([
      prisma.local.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              criancas: true,
              doacoes: true,
              checkins: true,
              colaborador_locais: true
            }
          }
        }
      }),
      prisma.local.count({ where })
    ]);

    res.json({
      data: locais,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('List locais error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

// Obter local por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const local = await prisma.local.findUnique({
      where: { id },
      include: {
        criancas: {
          where: { ativo: true },
          orderBy: { nome: 'asc' }
        },
        colaborador_locais: {
          include: {
            colaborador: {
              select: { id: true, nome: true, email: true }
            }
          }
        },
        _count: {
          select: {
            criancas: true,
            doacoes: true,
            checkins: true
          }
        }
      }
    });

    if (!local) {
      return res.status(404).json({ error: { message: 'Local not found' } });
    }

    res.json(local);
  } catch (error) {
    console.error('Get local error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/locais:
 *   post:
 *     summary: Criar novo local
 *     tags: [Locais]
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
 *               - endereco
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Centro Comunitário São José"
 *                 description: Nome do local
 *               endereco:
 *                 type: string
 *                 example: "Rua Principal, 123, Centro"
 *                 description: Endereço completo
 *               capacidade:
 *                 type: integer
 *                 example: 50
 *                 description: Capacidade máxima de pessoas
 *               responsavel:
 *                 type: string
 *                 example: "João Silva"
 *                 description: Nome do responsável
 *               telefone:
 *                 type: string
 *                 example: "11999999999"
 *                 description: Telefone de contato
 *     responses:
 *       201:
 *         description: Local criado com sucesso
 *       400:
 *         description: Erro de validação
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (requer admin)
 */
// Criar local
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('nome').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('endereco').notEmpty().withMessage('Endereço é obrigatório'),
  body('telefone').optional().custom(validateBrazilianPhone)
], auditMiddleware('locais', 'INSERT'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { nome, endereco, responsavel, telefone } = req.body;

    const local = await prisma.local.create({
      data: {
        nome,
        endereco,
        responsavel,
        telefone
      }
    });

    res.status(201).json(local);
  } catch (error) {
    console.error('Create local error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/locais/{id}:
 *   get:
 *     summary: Obter local por ID
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do local
 *     responses:
 *       200:
 *         description: Local encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 nome:
 *                   type: string
 *                 endereco:
 *                   type: string
 *                 capacidade:
 *                   type: integer
 *                 responsavel:
 *                   type: string
 *                 telefone:
 *                   type: string
 *                 ativo:
 *                   type: boolean
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Local não encontrado
 */

/**
 * @swagger
 * /api/locais/{id}:
 *   put:
 *     summary: Atualizar local
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do local
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Centro Comunitário Atualizado"
 *               endereco:
 *                 type: string
 *                 example: "Rua Atualizada, 456"
 *               capacidade:
 *                 type: integer
 *                 example: 100
 *               responsavel:
 *                 type: string
 *                 example: "Responsável Atualizado"
 *               telefone:
 *                 type: string
 *                 example: "11888888888"
 *               ativo:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Local atualizado com sucesso
 *       400:
 *         description: Erro de validação
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (requer admin)
 *       404:
 *         description: Local não encontrado
 */
// Atualizar local
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  body('nome').optional().trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('endereco').optional().notEmpty().withMessage('Endereço não pode ser vazio'),
  body('telefone').optional().custom(validateBrazilianPhone)
], auditMiddleware('locais', 'UPDATE'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { id } = req.params;
    const { nome, endereco, responsavel, telefone } = req.body;

    const existingLocal = await prisma.local.findUnique({ where: { id } });
    if (!existingLocal) {
      return res.status(404).json({ error: { message: 'Local not found' } });
    }

    const updateData = {};
    if (nome !== undefined) updateData.nome = nome;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (responsavel !== undefined) updateData.responsavel = responsavel;
    if (telefone !== undefined) updateData.telefone = telefone;

    const local = await prisma.local.update({
      where: { id },
      data: updateData
    });

    res.json(local);
  } catch (error) {
    console.error('Update local error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/locais/{id}:
 *   delete:
 *     summary: Deletar local
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do local
 *     responses:
 *       200:
 *         description: Local deletado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Local deleted successfully"
 *       400:
 *         description: Não é possível deletar local com crianças ou check-ins associados
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (requer admin)
 *       404:
 *         description: Local não encontrado
 */
// Deletar local
router.delete('/:id', [
  authenticateToken,
  requireAdmin,
  auditMiddleware('locais', 'DELETE')
], async (req, res) => {
  try {
    const { id } = req.params;

    const local = await prisma.local.findUnique({
      where: { id },
      include: { _count: { select: { criancas: true, checkins: true } } }
    });

    if (!local) {
      return res.status(404).json({ error: { message: 'Local not found' } });
    }

    if (local._count.criancas > 0 || local._count.checkins > 0) {
      return res.status(400).json({
        error: { message: 'Cannot delete local with associated children or checkins' }
      });
    }

    await prisma.local.delete({ where: { id } });

    res.json({ message: 'Local deleted successfully' });
  } catch (error) {
    console.error('Delete local error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

module.exports = router;