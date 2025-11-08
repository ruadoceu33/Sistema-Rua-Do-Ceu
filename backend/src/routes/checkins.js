// Importa o Express para criar o roteador e o express-validator para validação.
const express = require('express');
const { body, validationResult } = require('express-validator');

// Importa o Prisma Client, middlewares de autenticação e auditoria.
const { prisma } = require('../utils/database');
const { authenticateToken, requireAdmin, requireLocalAccess, getLocalFilter } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

// --- DOCUMENTAÇÃO SWAGGER ---
/**
 * @swagger
 * components:
 *   schemas:
 *     Checkin:
 *       type: object
 *       description: Representa um registro de presença (check-in) de uma criança em um local.
 *       properties:
 *         id: { type: string, description: "ID único do check-in." }
 *         crianca_id: { type: string, description: "ID da criança." }
 *         local_id: { type: string, description: "ID do local." }
 *         doacao_id: { type: string, description: "ID da doação associada (opcional)." }
 *         quantidade_consumida: { type: integer, description: "Quantidade consumida da doação." }
 *         presente: { type: boolean, description: "Indica se a criança estava presente." }
 *         data_checkin: { type: string, format: "date-time", description: "Data e hora do check-in." }
 */

/**
 * @swagger
 * /api/checkins:
 *   get:
 *     summary: Lista todos os check-ins com filtros e paginação.
 *     tags: [Check-ins]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [
 *       { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
 *       { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
 *       { in: 'query', name: 'criancaId', schema: { type: 'string' } },
 *       { in: 'query', name: 'localId', schema: { type: 'string' } },
 *       { in: 'query', name: 'startDate', schema: { type: 'string', format: 'date' } },
 *       { in: 'query', name: 'endDate', schema: { type: 'string', format: 'date' } }
 *     ]
 *     responses:
 *       200: { description: "Lista paginada de check-ins." }
 */
// Rota para LISTAR todos os check-ins.
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Lógica de filtros e paginação similar à rota de crianças.
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { criancaId, localId, doacaoId, startDate, endDate } = req.query;

    const where = {
      ...getLocalFilter(req.user) // SEGURANÇA: Filtrar por locais do usuário
    };
    if (criancaId) where.crianca_id = criancaId;
    if (localId) where.local_id = localId;
    if (doacaoId) where.doacao_id = doacaoId;
    if (startDate) where.data_checkin = { ...where.data_checkin, gte: new Date(startDate) };
    if (endDate) where.data_checkin = { ...where.data_checkin, lte: new Date(endDate) };

    const [checkins, total] = await Promise.all([
      prisma.checkin.findMany({
        where,
        skip,
        take: limit,
        orderBy: { data_checkin: 'desc' },
        include: { // Inclui dados das crianças, locais e doações para enriquecer a resposta.
          crianca: { select: { id: true, nome: true } },
          local: { select: { id: true, nome: true } },
          doacao: { select: { id: true, tipo_doacao: true, descricao: true } }
        }
      }),
      prisma.checkin.count({ where })
    ]);

    res.json({ data: checkins, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('List checkins error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/checkins/bulk:
 *   post:
 *     summary: Cria múltiplos check-ins em uma única requisição (em lote).
 *     description: Ideal para registrar a presença de uma turma inteira. Valida o estoque de doações de forma transacional.
 *     tags: [Check-ins]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checkins:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     crianca_id: { type: 'string' }
 *                     local_id: { type: 'string' }
 *                     doacao_id: { type: 'string' }
 *                     presente: { type: 'boolean' }
 *     responses:
 *       201: { description: "Check-ins criados com sucesso." }
 *       400: { description: "Erro de validação ou estoque insuficiente." }
 */
// Rota para CRIAR múltiplos check-ins em lote (BULK).
router.post('/bulk', [
  authenticateToken,
  requireLocalAccess, // SEGURANÇA: Verifica acesso aos locais
  // Validações para o array de check-ins.
  body('checkins').isArray({ min: 1 }).withMessage('O campo checkins deve ser um array com pelo menos um item.'),
  body('checkins.*.crianca_id').isUUID(),
  body('checkins.*.local_id').isUUID(),
  body('checkins.*.doacao_id').optional({ nullable: true }).isUUID(),
  auditMiddleware('checkins', 'INSERT')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { checkins } = req.body;

    // SEGURANÇA: Validar que todas as crianças e locais pertencem aos locais do usuário
    if (req.user.role !== 'admin') {
      const localIds = [...new Set(checkins.map(c => c.local_id))];
      const invalidLocals = localIds.filter(localId => !req.user.locais.includes(localId));

      if (invalidLocals.length > 0) {
        return res.status(403).json({
          error: { message: 'Você não tem acesso a um ou mais locais nesta requisição', code: 'LOCAL_ACCESS_DENIED' }
        });
      }
    }

    // --- LÓGICA DE VALIDAÇÃO DE ESTOQUE ---
    // Agrupa todas as quantidades solicitadas por doação para verificar o estoque de uma só vez.
    const doacoesUsadas = {};
    for (const checkin of checkins) {
      if (checkin.doacao_id && checkin.presente !== false) {
        const qtd = checkin.quantidade_consumida || 1; // Se não especificado, assume o consumo de 1 unidade.
        doacoesUsadas[checkin.doacao_id] = (doacoesUsadas[checkin.doacao_id] || 0) + qtd;
      }
    }

    // Para cada doação que será utilizada, verifica se há estoque suficiente.
    for (const doacaoId in doacoesUsadas) {
      const doacao = await prisma.doacao.findUnique({
        where: { id: doacaoId },
        include: { checkins: { where: { presente: true }, select: { quantidade_consumida: true } } }
      });

      if (!doacao) {
        return res.status(400).json({ error: { message: `Doação com ID ${doacaoId} não encontrada.` } });
      }

      if (doacao.quantidade) { // Apenas valida se a doação tem um controle de quantidade.
        const totalConsumido = doacao.checkins.reduce((sum, ck) => sum + (ck.quantidade_consumida || 1), 0);
        const estoqueDisponivel = doacao.quantidade - totalConsumido;
        const estoqueSolicitado = doacoesUsadas[doacaoId];

        if (estoqueSolicitado > estoqueDisponivel) {
          return res.status(400).json({
            error: {
              message: 'Estoque insuficiente',
              details: { doacao: doacao.descricao, disponivel: estoqueDisponivel, solicitado: estoqueSolicitado }
            }
          });
        }
      }
    }

    // Gera um ID de sessão único para agrupar todos os check-ins deste lote.
    const { randomUUID } = require('crypto');
    const sessaoId = randomUUID();

    // --- TRANSAÇÃO DO BANCO DE DADOS ---
    // Usa `prisma.$transaction` para garantir que todas as operações de criação de check-ins
    // sejam executadas com sucesso, ou nenhuma delas será. Isso é chamado de atomicidade.
    const createdCheckins = await prisma.$transaction(
      checkins.map(checkin =>
        prisma.checkin.create({
          data: {
            ...checkin,
            sessao_id: sessaoId,
            presente: checkin.presente !== undefined ? checkin.presente : true,
            quantidade_consumida: checkin.presente !== false ? (checkin.quantidade_consumida || (checkin.doacao_id ? 1 : null)) : null,
            data_checkin: new Date()
          }
        })
      )
    );

    // Atualizar status de entrega para presentes de aniversário
    for (const checkin of checkins) {
      if (checkin.doacao_id && checkin.presente !== false) {
        const doacao = await prisma.doacao.findUnique({
          where: { id: checkin.doacao_id },
          select: { tipo_doacao: true }
        });

        if (doacao && doacao.tipo_doacao === 'Presente de Aniversário') {
          await prisma.doacaoDestinatario.updateMany({
            where: {
              doacao_id: checkin.doacao_id,
              crianca_id: checkin.crianca_id
            },
            data: {
              entregue: true
            }
          });
        }
      }
    }

    res.status(201).json({
      message: `${createdCheckins.length} check-ins criados com sucesso`,
      sessao_id: sessaoId,
      data: createdCheckins
    });
  } catch (error) {
    console.error('Bulk create checkins error:', error);
    res.status(500).json({ error: { message: 'Internal server error', details: error.message } });
  }
});

/**
 * @swagger
 * /api/checkins:
 *   post:
 *     summary: Cria um único check-in.
 *     description: Cria um check-in individual para registrar presença de uma criança. Valida estoque se houver doação associada.
 *     tags: [Check-ins]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - crianca_id
 *               - local_id
 *             properties:
 *               crianca_id: { type: string, format: uuid }
 *               local_id: { type: string, format: uuid }
 *               doacao_id: { type: string, format: uuid, nullable: true }
 *               quantidade_consumida: { type: integer, default: 1 }
 *               presente: { type: boolean, default: true }
 *               observacoes: { type: string }
 *     responses:
 *       201: { description: "Check-in criado com sucesso." }
 *       400: { description: "Erro de validação ou estoque insuficiente." }
 */
// Rota para CRIAR um check-in individual.
router.post('/', [
  authenticateToken,
  requireLocalAccess, // SEGURANÇA: Verifica acesso ao local
  body('crianca_id').isUUID().withMessage('ID da criança inválido.'),
  body('local_id').isUUID().withMessage('ID do local inválido.'),
  body('doacao_id').optional({ nullable: true }).isUUID().withMessage('ID da doação inválido.'),
  body('quantidade_consumida').optional().isInt({ min: 1 }).withMessage('Quantidade deve ser um número inteiro positivo.'),
  body('presente').optional().isBoolean().withMessage('Campo presente deve ser verdadeiro ou falso.'),
  body('observacoes').optional().isString(),
  auditMiddleware('checkins', 'INSERT')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { crianca_id, local_id, doacao_id, quantidade_consumida, presente, observacoes } = req.body;

    // Se houver doação associada e a criança está presente, validar estoque
    if (doacao_id && presente !== false) {
      const qtdConsumida = quantidade_consumida || 1;

      const doacao = await prisma.doacao.findUnique({
        where: { id: doacao_id },
        include: {
          checkins: {
            where: { presente: true },
            select: { quantidade_consumida: true }
          }
        }
      });

      if (!doacao) {
        return res.status(400).json({ error: { message: 'Doação não encontrada.' } });
      }

      // Validar estoque apenas se a doação tem controle de quantidade
      if (doacao.quantidade) {
        const totalConsumido = doacao.checkins.reduce((sum, ck) => sum + (ck.quantidade_consumida || 1), 0);
        const estoqueDisponivel = doacao.quantidade - totalConsumido;

        if (qtdConsumida > estoqueDisponivel) {
          return res.status(400).json({
            error: {
              message: 'Estoque insuficiente',
              details: {
                doacao: doacao.descricao,
                disponivel: estoqueDisponivel,
                solicitado: qtdConsumida
              }
            }
          });
        }
      }
    }

    // Criar o check-in
    const checkin = await prisma.checkin.create({
      data: {
        crianca_id,
        local_id,
        doacao_id: doacao_id || null,
        quantidade_consumida: presente !== false && doacao_id ? (quantidade_consumida || 1) : null,
        presente: presente !== undefined ? presente : true,
        observacoes: observacoes || null,
        data_checkin: new Date()
      },
      include: {
        crianca: { select: { id: true, nome: true } },
        local: { select: { id: true, nome: true } },
        doacao: { select: { id: true, tipo_doacao: true, descricao: true } }
      }
    });

    // Se for um presente de aniversário, marcar como entregue na tabela DoacaoDestinatario
    if (doacao_id && presente !== false) {
      const doacao = await prisma.doacao.findUnique({
        where: { id: doacao_id },
        select: { tipo_doacao: true }
      });

      if (doacao && doacao.tipo_doacao === 'Presente de Aniversário') {
        await prisma.doacaoDestinatario.updateMany({
          where: {
            doacao_id: doacao_id,
            crianca_id: crianca_id
          },
          data: {
            entregue: true
          }
        });
      }
    }

    res.status(201).json({
      message: 'Check-in criado com sucesso',
      data: checkin
    });
  } catch (error) {
    console.error('Create checkin error:', error);
    res.status(500).json({ error: { message: 'Internal server error', details: error.message } });
  }
});

/**
 * @swagger
 * /api/checkins/{id}:
 *   delete:
 *     summary: Deleta um check-in específico.
 *     description: Apenas administradores podem deletar check-ins para corrigir erros.
 *     tags: [Check-ins]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: 'path', name: 'id', required: true, schema: { type: 'string' } } ]
 *     responses:
 *       200: { description: "Check-in deletado com sucesso." }
 *       403: { description: "Acesso negado (requer admin)." }
 *       404: { description: "Check-in não encontrado." }
 */
// Rota para DELETAR um check-in.
router.delete('/:id', [
  authenticateToken,
  auditMiddleware('checkins', 'DELETE')
], async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar check-in para verificar acesso ao local
    const checkin = await prisma.checkin.findUnique({ where: { id } });

    if (!checkin) {
      return res.status(404).json({ error: { message: 'Checkin not found' } });
    }

    // SEGURANÇA: Colaborador só pode deletar check-ins dos seus locais
    if (req.user.role !== 'admin') {
      if (!req.user.locais.includes(checkin.local_id)) {
        return res.status(403).json({
          error: { message: 'Você não tem acesso a este local' }
        });
      }
    }

    await prisma.checkin.delete({ where: { id } });

    res.json({ message: 'Checkin deleted successfully' });
  } catch (error) {
    console.error('Delete checkin error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/checkins/stats/summary:
 *   get:
 *     summary: Obtém estatísticas agregadas sobre os check-ins.
 *     tags: [Check-ins]
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: "Um resumo das estatísticas de check-ins." }
 */
// Rota para obter ESTATÍSTICAS sobre os check-ins.
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { localId, startDate, endDate } = req.query;
    const where = {
      ...getLocalFilter(req.user) // SEGURANÇA: Filtrar por locais do usuário
    };
    if (localId) where.local_id = localId;
    if (startDate) where.data_checkin = { ...where.data_checkin, gte: new Date(startDate) };
    if (endDate) where.data_checkin = { ...where.data_checkin, lte: new Date(endDate) };

    // Executa várias consultas de agregação em paralelo.
    const [
      totalCheckins,      // Contagem total de check-ins.
      uniqueChildren,     // Contagem de crianças únicas que fizeram check-in.
      checkinsByLocal,    // Agrupamento de check-ins por local.
      recentCheckins      // Os 10 check-ins mais recentes.
    ] = await Promise.all([
      prisma.checkin.count({ where }),
      prisma.checkin.groupBy({ by: ['crianca_id'], where, _count: true }),
      prisma.checkin.groupBy({ by: ['local_id'], where, _count: true, orderBy: { _count: { crianca_id: 'desc' } } }),
      prisma.checkin.findMany({
        where,
        take: 10,
        orderBy: { data_checkin: 'desc' },
        include: { crianca: { select: { id: true, nome: true } }, local: { select: { id: true, nome: true } } }
      })
    ]);

    res.json({
      totalCheckins,
      uniqueChildren: uniqueChildren.length,
      checkinsByLocal,
      recentCheckins
    });
  } catch (error) {
    console.error('Checkin stats error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

module.exports = router;