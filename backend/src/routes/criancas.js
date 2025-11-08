// Importa o Express para criar o roteador, e o express-validator para validação de dados.
const express = require('express');
const { body, validationResult } = require('express-validator');

// Importa o Prisma Client para interagir com o banco de dados.
const { prisma } = require('../utils/database');
// Importa os middlewares de autenticação para proteger as rotas.
const { authenticateToken, requireAdmin, requireLocalAccess, getLocalFilter } = require('../middleware/auth');
// Importa o middleware de auditoria para registrar as operações.
const { auditMiddleware } = require('../middleware/audit');
// Importa uma função utilitária para validar números de telefone brasileiros.
const { validateBrazilianPhone } = require('../utils/phoneValidator');

// Cria um novo roteador do Express para agrupar as rotas relacionadas a crianças.
const router = express.Router();

// --- DOCUMENTAÇÃO SWAGGER ---
// A seguir, temos blocos de comentários formatados em YAML que o Swagger usa para gerar a documentação da API.
// Isso descreve o que cada rota faz, quais parâmetros ela aceita e o que ela retorna.

/**
 * @swagger
 * components:
 *   schemas:
 *     Crianca:
 *       type: object
 *       description: Representa uma criança cadastrada no sistema.
 *       properties:
 *         id:
 *           type: string
 *           description: O ID único da criança (UUID).
 *         nome:
 *           type: string
 *           description: Nome completo da criança.
 *         data_nascimento:
 *           type: string
 *           format: date
 *           description: Data de nascimento no formato YYYY-MM-DD.
 *         idade:
 *           type: integer
 *           description: Idade da criança, calculada automaticamente.
 *         responsavel:
 *           type: string
 *           description: Nome do principal responsável.
 *         telefone_responsavel:
 *           type: string
 *           description: Telefone do principal responsável.
 *         endereco:
 *           type: string
 *           description: Endereço onde a criança reside.
 *         ativo:
 *           type: boolean
 *           description: Indica se o cadastro da criança está ativo no sistema.
 *         local_id:
 *           type: string
 *           description: ID do local de atendimento ao qual a criança está associada.
 */

/**
 * @swagger
 * /api/criancas:
 *   get:
 *     summary: Lista todas as crianças com paginação e filtros.
 *     tags: [Crianças]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página para a paginação.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de itens por página.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca para filtrar por nome da criança ou do responsável.
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *         description: Filtra as crianças por um local específico (usando o ID do local).
 *       - in: query
 *         name: ativo
 *         schema:
 *           type: boolean
 *         description: Filtra por crianças ativas ou inativas.
 *     responses:
 *       200:
 *         description: Uma lista paginada de crianças.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Crianca'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 */
// Rota para LISTAR todas as crianças (com filtros e paginação)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Extrai os parâmetros de consulta (query params) da URL.
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit; // Calcula quantos registros pular.
    const search = req.query.search || '';
    const localId = req.query.localId;
    const ativo = req.query.ativo;

    // Constrói a cláusula `where` para a consulta do Prisma com base nos filtros recebidos.
    const where = {
      ...getLocalFilter(req.user) // SEGURANÇA: Filtrar por locais do usuário
    };

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } }, // Busca case-insensitive no nome da criança.
        { responsavel: { contains: search, mode: 'insensitive' } } // E também no nome do responsável.
      ];
    }
    if (localId) where.local_id = localId;
    if (ativo !== undefined) where.ativo = ativo === 'true';

    // Executa duas consultas ao banco de dados em paralelo para otimização.
    const [criancas, total] = await Promise.all([
      // 1. Busca a lista de crianças com os filtros, paginação e ordenação.
      prisma.crianca.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }, // Ordena pelas mais recentes primeiro.
        include: { // Inclui dados de tabelas relacionadas para enriquecer a resposta.
          local: { select: { id: true, nome: true, endereco: true } },
          tags_saude: { include: { tag: { select: { id: true, nome: true, cor: true } } } },
          _count: { select: { checkins: true } } // Conta quantos check-ins a criança tem.
        }
      }),
      // 2. Conta o número total de registros que correspondem aos filtros (sem paginação).
      prisma.crianca.count({ where })
    ]);

    // Retorna os dados formatados com informações de paginação.
    res.json({
      data: criancas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('List criancas error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/criancas/{id}:
 *   get:
 *     summary: Obtém os detalhes de uma criança específica por ID.
 *     tags: [Crianças]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: O ID da criança.
 *     responses:
 *       200:
 *         description: Detalhes da criança encontrada.
 *       404:
 *         description: Criança não encontrada.
 */
// Rota para OBTER uma criança específica por ID.
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const crianca = await prisma.crianca.findFirst({
      where: {
        id,
        ...getLocalFilter(req.user) // SEGURANÇA: Só busca se pertencer ao local do usuário
      },
      include: { // Inclui dados relacionados para uma visão completa.
        local: true,
        tags_saude: { include: { tag: { select: { id: true, nome: true, cor: true } } } },
        checkins: { // Inclui o histórico de check-ins.
          orderBy: { data_checkin: 'desc' },
          include: { doacao: { select: { id: true, tipo_doacao: true, descricao: true } } }
        },
        _count: { select: { checkins: true } }
      }
    });

    if (!crianca) {
      return res.status(404).json({ error: { message: 'Criança not found' } });
    }

    res.json(crianca);
  } catch (error) {
    console.error('Get crianca error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/criancas:
 *   post:
 *     summary: Cria um novo cadastro de criança.
 *     tags: [Crianças]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Crianca' # Reutiliza o schema definido anteriormente.
 *     responses:
 *       201:
 *         description: Criança criada com sucesso.
 *       400:
 *         description: Erro de validação nos dados enviados.
 */
// Rota para CRIAR uma nova criança.
router.post('/', [
  // Array de middlewares que rodam antes da lógica da rota.
  authenticateToken, // 1. Garante que o usuário está autenticado.
  requireLocalAccess, // 2. SEGURANÇA: Verifica acesso ao local
  // 3. Validações dos campos do corpo da requisição.
  body('nome').trim().isLength({ min: 2 }).withMessage('Nome deve ter pelo menos 2 caracteres'),
  body('data_nascimento').isISO8601().withMessage('Data de nascimento inválida'),
  body('telefone_responsavel').optional().custom(validateBrazilianPhone), // Usa uma função de validação customizada.
  body('tags_saude').optional().isArray(),
  body('local_id').optional().isUUID().withMessage('Local ID inválido'),
  // 4. Middleware de auditoria para registrar a criação.
  auditMiddleware('criancas', 'INSERT')
], async (req, res) => {
  try {
    // Verifica se houve erros de validação definidos acima.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { nome, data_nascimento, tags_saude, local_id, ...outrosDados } = req.body;

    // REGRA DE NEGÓCIO: Calcular a idade com base na data de nascimento.
    const birthDate = new Date(data_nascimento);
    const today = new Date();
    const idade = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));

    // Validação: Se um `local_id` foi fornecido, verifica se ele realmente existe no banco.
    if (local_id) {
      const local = await prisma.local.findUnique({ where: { id: local_id } });
      if (!local) {
        return res.status(400).json({ error: { message: 'Local not found' } });
      }
    }

    // Cria a criança no banco de dados.
    const crianca = await prisma.crianca.create({
      data: {
        nome,
        data_nascimento: birthDate,
        idade,
        ...outrosDados,
        local_id,
        ativo: true // Por padrão, uma nova criança é criada como ativa.
      }
    });

    // Lógica para associar as tags de saúde (relação Many-to-Many).
    if (tags_saude && Array.isArray(tags_saude) && tags_saude.length > 0) {
      // Cria as entradas na tabela de junção `CriancaSaude`.
      await Promise.all(tags_saude.map(tagData => 
        prisma.criancaSaude.create({
          data: {
            crianca_id: crianca.id,
            tag_id: tagData.tag_id,
            observacao: tagData.observacao || null
          }
        })
      ));

      // Recarrega os dados da criança para incluir as tags recém-criadas na resposta.
      const criancaComTags = await prisma.crianca.findUnique({
        where: { id: crianca.id },
        include: { local: true, tags_saude: { include: { tag: true } } }
      });
      return res.status(201).json(criancaComTags);
    }

    // Se não houver tags, retorna a criança criada.
    res.status(201).json(crianca);
  } catch (error) {
    console.error('Create crianca error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/criancas/{id}:
 *   put:
 *     summary: Atualiza os dados de uma criança existente.
 *     tags: [Crianças]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: 'path', name: 'id', required: true, schema: { type: 'string' } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Crianca' }
 *     responses:
 *       200: { description: "Criança atualizada com sucesso." }
 *       404: { description: "Criança não encontrada." }
 */
// Rota para ATUALIZAR uma criança existente.
router.put('/:id', [
  authenticateToken,
  requireLocalAccess, // SEGURANÇA: Verifica acesso ao local (se local_id for alterado)
  // As validações são opcionais aqui, pois o cliente pode enviar apenas os campos que deseja alterar.
  body('nome').optional().trim().isLength({ min: 2 }),
  body('data_nascimento').optional().isISO8601(),
  body('tags_saude').optional().isArray(),
  body('local_id').optional().isUUID().withMessage('Local ID inválido'),
  auditMiddleware('criancas', 'UPDATE')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { id } = req.params;
    const { tags_saude, ...updateData } = req.body;

    // SEGURANÇA: Verificar se a criança existe E pertence aos locais do usuário
    const criancaExistente = await prisma.crianca.findFirst({
      where: {
        id,
        ...getLocalFilter(req.user)
      }
    });

    if (!criancaExistente) {
      return res.status(404).json({ error: { message: 'Criança not found' } });
    }

    // REGRA DE NEGÓCIO: Se a data de nascimento for atualizada, a idade também deve ser recalculada.
    if (updateData.data_nascimento) {
      const birthDate = new Date(updateData.data_nascimento);
      const today = new Date();
      updateData.idade = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      updateData.data_nascimento = birthDate;
    }

    // Atualiza os dados da criança no banco.
    const crianca = await prisma.crianca.update({
      where: { id },
      data: updateData
    });

    // Lógica para atualizar as tags de saúde: remove todas as antigas e adiciona as novas.
    if (tags_saude !== undefined && Array.isArray(tags_saude)) {
      await prisma.criancaSaude.deleteMany({ where: { crianca_id: id } });
      if (tags_saude.length > 0) {
        // Remove duplicatas antes de inserir (previne erro de unique constraint)
        const uniqueTags = tags_saude.filter((tag, index, self) =>
          index === self.findIndex(t => t.tag_id === tag.tag_id)
        );

        // Usa createMany com skipDuplicates para segurança extra
        await prisma.criancaSaude.createMany({
          data: uniqueTags.map(tagData => ({
            crianca_id: id,
            tag_id: tagData.tag_id,
            observacao: tagData.observacao || null
          })),
          skipDuplicates: true // Ignora duplicatas caso existam
        });
      }
    }

    // Recarrega a criança com todos os dados atualizados para retornar na resposta.
    const criancaAtualizada = await prisma.crianca.findUnique({
      where: { id },
      include: { local: true, tags_saude: { include: { tag: true } } }
    });

    res.json(criancaAtualizada);
  } catch (error) {
    // O Prisma lança um erro específico se o registro a ser atualizado não for encontrado.
    if (error.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Criança not found' } });
    }
    console.error('Update crianca error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/criancas/{id}:
 *   delete:
 *     summary: Deleta o cadastro de uma criança.
 *     description: Apenas administradores podem deletar. A criança não pode ter check-ins associados.
 *     tags: [Crianças]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: 'path', name: 'id', required: true, schema: { type: 'string' } } ]
 *     responses:
 *       200: { description: "Criança deletada com sucesso." }
 *       400: { description: "Não é possível deletar criança com check-ins." }
 *       403: { description: "Acesso negado (requer admin)." }
 *       404: { description: "Criança não encontrada." }
 */
// Rota para DELETAR uma criança.
router.delete('/:id', [
  authenticateToken, // Garante autenticação.
  auditMiddleware('criancas', 'DELETE') // Registra a operação de exclusão.
], async (req, res) => {
  try {
    const { id } = req.params;

    // REGRA DE NEGÓCIO: Antes de deletar, verifica se a criança tem registros dependentes (check-ins).
    const crianca = await prisma.crianca.findUnique({
      where: { id },
      include: { _count: { select: { checkins: true } } } // Conta os check-ins relacionados.
    });

    if (!crianca) {
      return res.status(404).json({ error: { message: 'Criança not found' } });
    }

    // SEGURANÇA: Colaborador só pode deletar crianças dos seus locais
    if (req.user.role !== 'admin') {
      if (!crianca.local_id || !req.user.locais.includes(crianca.local_id)) {
        return res.status(403).json({
          error: { message: 'Você não tem acesso a este local' }
        });
      }
    }

    // Se houver check-ins, a exclusão é bloqueada para manter a integridade dos dados históricos.
    if (crianca._count.checkins > 0) {
      return res.status(400).json({
        error: { message: 'Cannot delete child with associated checkins' }
      });
    }

    // Deleta as associações de tags de saúde primeiro.
    await prisma.criancaSaude.deleteMany({ where: { crianca_id: id } });

    // Finalmente, deleta a criança.
    await prisma.crianca.delete({ where: { id } });

    res.json({ message: 'Criança deleted successfully' });
  } catch (error) {
    console.error('Delete crianca error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/criancas/{id}/historico-doacoes:
 *   get:
 *     summary: Obtém o histórico de doações recebidas por uma criança.
 *     tags: [Crianças]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: 'path', name: 'id', required: true, schema: { type: 'string' } } ]
 *     responses:
 *       200: { description: "Histórico de doações da criança." }
 *       404: { description: "Criança não encontrada." }
 */
// Rota para obter o HISTÓRICO DE DOAÇÕES de uma criança específica.
router.get('/:id/historico-doacoes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // Lógica de paginação e filtros para o histórico.
    const { page = 1, limit = 20, ...filters } = req.query;

    // SEGURANÇA: Verificar se a criança existe E pertence aos locais do usuário
    const crianca = await prisma.crianca.findFirst({
      where: {
        id,
        ...getLocalFilter(req.user)
      }
    });

    if (!crianca) {
      return res.status(404).json({ error: { message: 'Criança not found' } });
    }

    // A lógica aqui busca `check-ins` que estão associados a uma doação.
    const where = { crianca_id: id, doacao_id: { not: null }, presente: true };
    // ... (lógica de aplicação de filtros de data, tipo, etc.)

    const [historico, total] = await Promise.all([
      prisma.checkin.findMany({
        where,
        include: { doacao: true, local: true },
        orderBy: { data_checkin: 'desc' },
        take: parseInt(limit),
        skip: (parseInt(page) - 1) * parseInt(limit)
      }),
      prisma.checkin.count({ where })
    ]);

    // ... (lógica para resumir os dados)

    res.json({ 
      crianca: { id: crianca.id, nome: crianca.nome },
      historico,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
      // resumo: ...
    });
  } catch (error) {
    console.error('Get donation history error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

// Exporta o roteador para ser usado no arquivo principal do servidor (server.js).
module.exports = router;