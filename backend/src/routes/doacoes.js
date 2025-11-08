const express = require('express');
const { body, validationResult } = require('express-validator');

const { prisma } = require('../utils/database');
const { authenticateToken, requireAdmin, requireLocalAccess, getLocalFilter } = require('../middleware/auth');
const { auditMiddleware } = require('../middleware/audit');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Doacao:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID da doação
 *         doador:
 *           type: string
 *           example: "João Silva"
 *           description: Nome do doador
 *         tipo_doacao:
 *           type: string
 *           example: "Alimentos"
 *           description: Tipo da doação
 *         descricao:
 *           type: string
 *           example: "Caixa de leite e pão"
 *           description: Descrição dos itens doados
 *         quantidade:
 *           type: integer
 *           example: 10
 *           description: Quantidade total doada
 *         unidade:
 *           type: string
 *           example: "unidades"
 *           description: Unidade de medida
 *         total_consumido:
 *           type: integer
 *           example: 3
 *           description: Quantidade já consumida (calculado pela soma dos check-ins)
 *         quantidade_restante:
 *           type: integer
 *           example: 7
 *           description: Quantidade restante em estoque (calculado como quantidade - total_consumido)
 *         data_doacao:
 *           type: string
 *           format: date-time
 *           example: "2023-12-01T10:30:00Z"
 *           description: Data da doação
 *         local_id:
 *           type: string
 *           example: "550e8400-e29b-41d4-a716-446655440000"
 *           description: ID do local
 *         local:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             nome:
 *               type: string
 *             endereco:
 *               type: string
 *           description: Dados do local (quando incluído)
 *         _count:
 *           type: object
 *           properties:
 *             checkins:
 *               type: integer
 *               example: 3
 *           description: Contadores relacionados
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
 *   - name: Doações
 *     description: Gestão de doações
 */

/**
 * @swagger
 * /api/doacoes:
 *   get:
 *     summary: Listar todas as doações com controle de estoque
 *     tags: [Doações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Itens por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Busca por doador, descrição ou tipo
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *         description: Filtrar por ID do local
 *       - in: query
 *         name: tipoDoacao
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de doação
 *     responses:
 *       200:
 *         description: Lista de doações com informações de estoque calculadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Doacao'
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
// Listar doações
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const localId = req.query.localId;
    const tipoDoacao = req.query.tipoDoacao;

    const where = {
      ...getLocalFilter(req.user) // SEGURANÇA: Filtrar por locais do usuário
    };
    if (search) {
      where.OR = [
        { doador: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } },
        { tipo_doacao: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (localId) where.local_id = localId;
    if (tipoDoacao) where.tipo_doacao = tipoDoacao;

    const [doacoes, total] = await Promise.all([
      prisma.doacao.findMany({
        where,
        skip,
        take: limit,
        orderBy: { data_doacao: 'desc' },
        include: {
          local: {
            select: { id: true, nome: true, endereco: true }
          },
          checkins: {
            select: { quantidade_consumida: true, presente: true }
          },
          destinatarios: {
            include: {
              crianca: {
                select: { id: true, nome: true, data_nascimento: true }
              }
            }
          }
        }
      }),
      prisma.doacao.count({ where })
    ]);

    // Calcular quantidade restante para cada doação
    const doacoesComEstoque = doacoes.map(doacao => {
      // Somar quantidade consumida APENAS de check-ins com presentes
      const totalConsumido = doacao.checkins
        .filter(checkin => checkin.presente === true)
        .reduce((sum, checkin) => {
          // Se quantidade_consumida for null, assumir 1 unidade (check-ins antigos)
          return sum + (checkin.quantidade_consumida || 1);
        }, 0);

      // Calcular quantidade restante (NUNCA negativo)
      const quantidade_restante = doacao.quantidade ? Math.max(0, doacao.quantidade - totalConsumido) : null;

      // Remover array de checkins e adicionar campos calculados
      const { checkins, ...doacaoSemCheckins } = doacao;
      return {
        ...doacaoSemCheckins,
        total_consumido: totalConsumido,
        quantidade_restante,
        _count: {
          checkins: doacao.checkins.length
        }
      };
    });

    res.json({
      data: doacoesComEstoque,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('List doacoes error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/doacoes/{id}:
 *   get:
 *     summary: Obter doação por ID
 *     tags: [Doações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da doação
 *     responses:
 *       200:
 *         description: Doação encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Doacao'
 *       404:
 *         description: Doação não encontrada
 */

// Obter doação por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const doacao = await prisma.doacao.findFirst({
      where: {
        id,
        ...getLocalFilter(req.user) // SEGURANÇA: Só busca se pertencer ao local do usuário
      },
      include: {
        local: true,
        checkins: {
          orderBy: { data_checkin: 'desc' },
          select: {
            id: true,
            data_checkin: true,
            quantidade_consumida: true,
            presente: true,
            crianca: {
              select: { id: true, nome: true }
            }
          }
        },
        destinatarios: {
          include: {
            crianca: {
              select: { id: true, nome: true, data_nascimento: true }
            }
          }
        }
      }
    });

    if (!doacao) {
      return res.status(404).json({ error: { message: 'Doação not found' } });
    }

    // Calcular quantidade restante APENAS de check-ins com presentes
    const totalConsumido = doacao.checkins
      .filter(checkin => checkin.presente === true)
      .reduce((sum, checkin) => {
        return sum + (checkin.quantidade_consumida || 1);
      }, 0);

    const quantidade_restante = doacao.quantidade ? doacao.quantidade - totalConsumido : null;

    res.json({
      ...doacao,
      total_consumido: totalConsumido,
      quantidade_restante,
      _count: {
        checkins: doacao.checkins.length
      }
    });
  } catch (error) {
    console.error('Get doacao error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/doacoes:
 *   post:
 *     summary: Criar nova doação
 *     tags: [Doações]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - doador
 *               - tipo_doacao
 *               - local_id
 *             properties:
 *               doador:
 *                 type: string
 *                 example: "João Silva"
 *                 description: Nome do doador
 *               tipo_doacao:
 *                 type: string
 *                 example: "Alimentos"
 *                 description: Tipo da doação
 *               descricao:
 *                 type: string
 *                 example: "Caixa de leite e pão"
 *                 description: Descrição dos itens doados
 *               quantidade:
 *                 type: integer
 *                 example: 10
 *                 description: Quantidade doada
 *               unidade:
 *                 type: string
 *                 example: "unidades"
 *                 description: Unidade de medida
 *               local_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *                 description: ID do local
 *     responses:
 *       201:
 *         description: Doação criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Doacao'
 *       400:
 *         description: Erro de validação
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Local não encontrado
 */
// Criar doação
router.post('/', [
  authenticateToken,
  requireLocalAccess, // SEGURANÇA: Verifica acesso ao local
  body('doador').trim().isLength({ min: 2 }).withMessage('Doador deve ter pelo menos 2 caracteres'),
  body('tipo_doacao').trim().notEmpty().withMessage('Tipo de doação é obrigatório'),
  body('quantidade').optional().isInt({ min: 1 }).withMessage('Quantidade deve ser um número positivo'),
  body('unidade').optional().trim().notEmpty().withMessage('Unidade não pode ser vazia'),
  body('local_id').isUUID().withMessage('Local ID inválido'),
  body('criancas_destinatarias').optional().isArray().withMessage('Crianças destinatárias deve ser um array'),
  body('criancas_destinatarias.*').optional().isUUID().withMessage('ID de criança inválido')
], auditMiddleware('doacoes', 'INSERT'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { doador, tipo_doacao, descricao, quantidade, unidade, local_id, criancas_destinatarias } = req.body;

    // Verificar se local existe
    const local = await prisma.local.findUnique({ where: { id: local_id } });
    if (!local) {
      return res.status(400).json({ error: { message: 'Local not found' } });
    }

    // Validações para Presente de Aniversário
    if (tipo_doacao === 'Presente de Aniversário') {
      if (!criancas_destinatarias || criancas_destinatarias.length === 0) {
        return res.status(400).json({
          error: { message: 'Presente de Aniversário deve ter pelo menos uma criança destinatária' }
        });
      }

      // Verificar se todas as crianças existem e pertencem ao local
      const criancas = await prisma.crianca.findMany({
        where: {
          id: { in: criancas_destinatarias },
          local_id: local_id,
          ativo: true
        }
      });

      if (criancas.length !== criancas_destinatarias.length) {
        return res.status(400).json({
          error: { message: 'Uma ou mais crianças não foram encontradas ou não pertencem ao local selecionado' }
        });
      }

      // Validar que a quantidade corresponde ao número de destinatários
      if (quantidade && quantidade < criancas_destinatarias.length) {
        return res.status(400).json({
          error: { message: 'Quantidade de presentes deve ser no mínimo igual ao número de destinatários' }
        });
      }
    }

    // Criar doação com transaction
    const doacao = await prisma.$transaction(async (tx) => {
      const novaDoacacao = await tx.doacao.create({
        data: {
          doador,
          tipo_doacao,
          descricao,
          quantidade,
          unidade,
          local_id,
          data_doacao: new Date()
        },
        include: {
          local: {
            select: { id: true, nome: true }
          }
        }
      });

      // Se for Presente de Aniversário, criar registros de destinatários
      if (tipo_doacao === 'Presente de Aniversário' && criancas_destinatarias) {
        await tx.doacaoDestinatario.createMany({
          data: criancas_destinatarias.map(crianca_id => ({
            doacao_id: novaDoacacao.id,
            crianca_id: crianca_id,
            entregue: false
          }))
        });
      }

      return novaDoacacao;
    });

    res.status(201).json(doacao);
  } catch (error) {
    console.error('Create doacao error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/doacoes/{id}:
 *   put:
 *     summary: Atualizar doação
 *     tags: [Doações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da doação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               doador:
 *                 type: string
 *                 example: "João Silva Atualizado"
 *                 description: Nome do doador
 *               tipo_doacao:
 *                 type: string
 *                 example: "Roupas"
 *                 description: Tipo da doação
 *               descricao:
 *                 type: string
 *                 example: "Caixa com roupas de inverno"
 *                 description: Descrição dos itens doados
 *               quantidade:
 *                 type: integer
 *                 example: 5
 *                 description: Quantidade doada
 *               unidade:
 *                 type: string
 *                 example: "caixas"
 *                 description: Unidade de medida
 *               local_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440001"
 *                 description: ID do local
 *     responses:
 *       200:
 *         description: Doação atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Doacao'
 *       400:
 *         description: Erro de validação
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (requer admin)
 *       404:
 *         description: Doação não encontrada
 */
// Atualizar doação
router.put('/:id', [
  authenticateToken,
  body('doador').optional({ nullable: true }).trim().isLength({ min: 2 }).withMessage('Doador deve ter pelo menos 2 caracteres'),
  body('tipo_doacao').optional({ nullable: true }).trim().notEmpty().withMessage('Tipo de doação não pode ser vazio'),
  body('quantidade').optional({ nullable: true }).custom((value) => {
    // Aceitar null ou undefined (campos vazios)
    if (value === null || value === undefined) return true;
    // Se fornecido, deve ser inteiro positivo
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('Quantidade deve ser um número positivo');
    }
    return true;
  }),
  body('unidade').optional({ nullable: true }).custom((value) => {
    // Aceitar null ou undefined (campos vazios)
    if (value === null || value === undefined || value === '') return true;
    // Se fornecido, deve ter conteúdo após trim
    if (typeof value === 'string' && value.trim().length === 0) {
      throw new Error('Unidade não pode ser vazia');
    }
    return true;
  }),
  body('local_id').optional({ nullable: true }).custom((value) => {
    // Aceitar null ou undefined
    if (value === null || value === undefined || value === '') return true;
    // Se fornecido, deve ser UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new Error('Local ID inválido');
    }
    return true;
  })
], auditMiddleware('doacoes', 'UPDATE'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { id } = req.params;
    const { doador, tipo_doacao, descricao, quantidade, unidade, local_id } = req.body;

    const existingDoacao = await prisma.doacao.findUnique({ where: { id } });
    if (!existingDoacao) {
      return res.status(404).json({ error: { message: 'Doação not found' } });
    }

    // SEGURANÇA: Colaborador só pode editar doações dos seus locais
    if (req.user.role !== 'admin') {
      if (!req.user.locais.includes(existingDoacao.local_id)) {
        return res.status(403).json({
          error: { message: 'Você não tem acesso a este local' }
        });
      }
      // Se tentar mudar o local, verificar se tem acesso ao novo local também
      if (local_id && local_id !== existingDoacao.local_id && !req.user.locais.includes(local_id)) {
        return res.status(403).json({
          error: { message: 'Você não tem acesso ao local de destino' }
        });
      }
    }

    // Verificar se local existe (se fornecido)
    if (local_id) {
      const local = await prisma.local.findUnique({ where: { id: local_id } });
      if (!local) {
        return res.status(400).json({ error: { message: 'Local not found' } });
      }
    }

    const updateData = {};
    if (doador !== undefined) updateData.doador = doador;
    if (tipo_doacao !== undefined) updateData.tipo_doacao = tipo_doacao;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (unidade !== undefined) updateData.unidade = unidade;
    if (local_id !== undefined) updateData.local_id = local_id;

    // Se quantidade foi fornecida, ADICIONAR ao estoque restante, não substituir
    if (quantidade !== undefined) {
      // Buscar doação com checkins para calcular estoque restante
      const doacaoComCheckins = await prisma.doacao.findUnique({
        where: { id },
        include: {
          checkins: {
            select: { quantidade_consumida: true, presente: true }
          }
        }
      });

      // Calcular total já consumido (apenas check-ins com presentes)
      const totalConsumido = doacaoComCheckins.checkins
        .filter(checkin => checkin.presente === true)
        .reduce((sum, checkin) => {
          return sum + (checkin.quantidade_consumida || 1);
        }, 0);

      // Se a doação NÃO tinha quantidade antes (doação antiga sem estoque)
      // então a quantidade enviada é a quantidade TOTAL, não uma adição
      if (doacaoComCheckins.quantidade === null || doacaoComCheckins.quantidade === undefined) {
        updateData.quantidade = quantidade;
        console.log(`📦 Primeira definição de estoque:
          - Doação não tinha quantidade definida
          - Definindo quantidade: ${quantidade}`);
      } else {
        // Doação JÁ tinha quantidade - então estamos ADICIONANDO à quantidade TOTAL
        const estoqueRestante = Math.max(0, doacaoComCheckins.quantidade - totalConsumido);
        updateData.quantidade = doacaoComCheckins.quantidade + quantidade;

        console.log(`📦 Atualização de estoque:
          - Quantidade total anterior: ${doacaoComCheckins.quantidade}
          - Já consumido: ${totalConsumido}
          - Restante antes: ${estoqueRestante}
          - Adicionando: ${quantidade}
          - Nova quantidade total: ${updateData.quantidade}
          - Novo restante: ${updateData.quantidade - totalConsumido}`);
      }
    }

    const doacao = await prisma.doacao.update({
      where: { id },
      data: updateData,
      include: {
        local: {
          select: { id: true, nome: true }
        }
      }
    });

    res.json(doacao);
  } catch (error) {
    console.error('Update doacao error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/doacoes/{id}/destinatarios:
 *   get:
 *     summary: Obter destinatários de um presente de aniversário
 *     tags: [Doações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da doação
 *     responses:
 *       200:
 *         description: Lista de destinatários
 *       404:
 *         description: Doação não encontrada
 */
// Obter destinatários de uma doação
router.get('/:id/destinatarios', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const doacao = await prisma.doacao.findUnique({
      where: { id },
      include: {
        destinatarios: {
          include: {
            crianca: {
              select: { id: true, nome: true, data_nascimento: true }
            }
          },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!doacao) {
      return res.status(404).json({ error: { message: 'Doação not found' } });
    }

    res.json({
      doacao_id: doacao.id,
      tipo_doacao: doacao.tipo_doacao,
      destinatarios: doacao.destinatarios
    });
  } catch (error) {
    console.error('Get destinatarios error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/doacoes/{id}/marcar-entregue:
 *   post:
 *     summary: Marcar presente como entregue para um destinatário
 *     tags: [Doações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da doação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - crianca_id
 *             properties:
 *               crianca_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Presente marcado como entregue
 *       404:
 *         description: Doação ou destinatário não encontrado
 */
// Marcar presente como entregue
router.post('/:id/marcar-entregue', [
  authenticateToken,
  body('crianca_id').isUUID().withMessage('ID de criança inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { id } = req.params;
    const { crianca_id } = req.body;

    const destinatario = await prisma.doacaoDestinatario.findFirst({
      where: {
        doacao_id: id,
        crianca_id: crianca_id
      }
    });

    if (!destinatario) {
      return res.status(404).json({
        error: { message: 'Destinatário não encontrado para esta doação' }
      });
    }

    const updated = await prisma.doacaoDestinatario.update({
      where: { id: destinatario.id },
      data: { entregue: true },
      include: {
        crianca: {
          select: { id: true, nome: true, data_nascimento: true }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Marcar entregue error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/doacoes/{id}:
 *   delete:
 *     summary: Deletar doação
 *     tags: [Doações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da doação
 *     responses:
 *       200:
 *         description: Doação deletada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Doação deleted successfully"
 *       400:
 *         description: Não é possível deletar doação com check-ins associados
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Acesso negado (requer admin)
 *       404:
 *         description: Doação não encontrada
 */
// Deletar doação
router.delete('/:id', [
  authenticateToken,
  auditMiddleware('doacoes', 'DELETE')
], async (req, res) => {
  try {
    const { id } = req.params;

    const doacao = await prisma.doacao.findUnique({
      where: { id },
      include: { _count: { select: { checkins: true } } }
    });

    if (!doacao) {
      return res.status(404).json({ error: { message: 'Doação not found' } });
    }

    // SEGURANÇA: Colaborador só pode deletar doações dos seus locais
    if (req.user.role !== 'admin') {
      if (!req.user.locais.includes(doacao.local_id)) {
        return res.status(403).json({
          error: { message: 'Você não tem acesso a este local' }
        });
      }
    }

    if (doacao._count.checkins > 0) {
      return res.status(400).json({
        error: { message: 'Cannot delete donation with associated checkins' }
      });
    }

    await prisma.doacao.delete({ where: { id } });

    res.json({ message: 'Doação deleted successfully' });
  } catch (error) {
    console.error('Delete doacao error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/doacoes/{id}/historico-consumo:
 *   get:
 *     summary: Obter histórico de consumo de uma doação
 *     tags: [Doações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da doação
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Histórico de consumo da doação
 *       404:
 *         description: Doação não encontrada
 */
router.get('/:id/historico-consumo', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      data_inicio,
      data_fim
    } = req.query;

    // Verificar se a doação existe
    const doacao = await prisma.doacao.findUnique({
      where: { id },
      select: {
        id: true,
        doador: true,
        tipo_doacao: true,
        descricao: true,
        quantidade: true,
        unidade: true,
        data_doacao: true
      }
    });

    if (!doacao) {
      return res.status(404).json({ error: { message: 'Doação not found' } });
    }

    // Construir filtros - apenas presentes
    const where = {
      doacao_id: id,
      presente: true
    };

    // Filtro por período
    if (data_inicio || data_fim) {
      where.data_checkin = {};
      if (data_inicio) {
        where.data_checkin.gte = new Date(data_inicio);
      }
      if (data_fim) {
        // Adicionar 1 dia para incluir todo o dia final
        const dataFimAjustada = new Date(data_fim);
        dataFimAjustada.setDate(dataFimAjustada.getDate() + 1);
        where.data_checkin.lt = dataFimAjustada;
      }
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Buscar histórico e total em paralelo
    const [historico, total] = await Promise.all([
      prisma.checkin.findMany({
        where,
        include: {
          crianca: {
            select: {
              id: true,
              nome: true,
              idade: true
            }
          },
          local: {
            select: {
              id: true,
              nome: true
            }
          }
        },
        orderBy: { data_checkin: 'desc' },
        take: limitNum,
        skip
      }),
      prisma.checkin.count({ where })
    ]);

    // Calcular total consumido APENAS de check-ins com presentes
    const totalConsumido = await prisma.checkin.aggregate({
      where: {
        doacao_id: id,
        presente: true
      },
      _sum: {
        quantidade_consumida: true
      }
    });

    // Contar crianças únicas APENAS de check-ins com presentes
    const criancasUnicas = await prisma.checkin.findMany({
      where: {
        doacao_id: id,
        presente: true
      },
      distinct: ['crianca_id'],
      select: { crianca_id: true }
    });

    // Formatar resposta
    const historicoFormatado = historico.map(item => ({
      id: item.id,
      data_consumo: item.data_checkin,
      crianca: item.crianca,
      local: item.local,
      quantidade_consumida: item.quantidade_consumida,
      observacoes: item.observacoes,
      presente: item.presente
    }));

    res.json({
      doacao,
      historico: historicoFormatado,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      },
      resumo: {
        total_entregas: total,
        total_consumido: totalConsumido._sum.quantidade_consumida || 0,
        quantidade_restante: doacao.quantidade - (totalConsumido._sum.quantidade_consumida || 0),
        total_criancas: criancasUnicas.length
      }
    });
  } catch (error) {
    console.error('Get consumption history error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

module.exports = router;