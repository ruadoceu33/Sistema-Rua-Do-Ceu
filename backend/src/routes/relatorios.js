const express = require('express');
const { query, validationResult } = require('express-validator');

const { prisma } = require('../utils/database');
const { authenticateToken, requireAdmin, getLocalFilter } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/relatorios/dashboard:
 *   get:
 *     summary: Obter dados do dashboard
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do dashboard
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const localFilter = getLocalFilter(req.user); // SEGURANÇA: Filtrar por locais do usuário

    const [
      totalChildren,
      activeChildren,
      totalLocals,
      totalColaboradores,
      activeColaboradores,
      totalCheckins,
      totalDoacoes
    ] = await Promise.all([
      prisma.crianca.count({ where: localFilter }),
      prisma.crianca.count({ where: { ...localFilter, ativo: true } }),
      req.user.role === 'admin' ? prisma.local.count() : Promise.resolve(req.user.locais.length),
      prisma.profile.count(),
      prisma.profile.count({ where: { ativo: true } }),
      prisma.checkin.count({ where: localFilter }),
      prisma.doacao.count({ where: localFilter })
    ]);

    // Checkins dos últimos 30 dias (apenas presentes)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCheckins = await prisma.checkin.count({
      where: {
        ...localFilter, // SEGURANÇA: Filtrar por locais do usuário
        data_checkin: {
          gte: thirtyDaysAgo
        },
        presente: true // CORREÇÃO: Contar apenas check-ins onde criança estava presente
      }
    });

    // Crianças por local (filtrado pelos locais do usuário)
    const whereLocal = req.user.role === 'admin' ? {} : { id: { in: req.user.locais } };
    const childrenByLocal = await prisma.local.findMany({
      where: whereLocal, // SEGURANÇA: Apenas locais do usuário
      select: {
        id: true,
        nome: true,
        _count: {
          select: {
            criancas: true
          }
        }
      }
    });

    // Doações por tipo (simplificado)
    let doacoesByTipo = [];
    try {
      doacoesByTipo = await prisma.doacao.groupBy({
        by: ['tipo_doacao'],
        where: localFilter, // SEGURANÇA: Filtrar por locais do usuário
        _count: {
          _all: true
        }
      });
    } catch (e) {
      console.log('Erro ao agrupar doações:', e.message);
      doacoesByTipo = [];
    }

    // Ordenar childrenByLocal por contagem (maior para menor)
    const sortedChildrenByLocal = childrenByLocal.sort((a, b) =>
      b._count.criancas - a._count.criancas
    );

    // Ordenar doacoesByTipo por contagem (maior para menor)
    const sortedDoacoesByTipo = doacoesByTipo.sort((a, b) =>
      b._count._all - a._count._all
    );

    res.json({
      summary: {
        totalChildren,
        activeChildren,
        totalLocals,
        totalColaboradores,
        activeColaboradores,
        totalCheckins,
        recentCheckins,
        totalDoacoes
      },
      childrenByLocal: sortedChildrenByLocal,
      checkinsByMonth: [], // Temporariamente vazio até resolver query SQL
      doacoesByTipo: sortedDoacoesByTipo
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/criancas:
 *   get:
 *     summary: Relatório de crianças
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *       - in: query
 *         name: idadeMin
 *         schema:
 *           type: integer
 *       - in: query
 *         name: idadeMax
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Relatório de crianças
 */
router.get('/criancas', [
  authenticateToken,
  query('localId').optional().isUUID().withMessage('Local ID inválido'),
  query('idadeMin').optional().isInt({ min: 0 }).withMessage('Idade mínima inválida'),
  query('idadeMax').optional().isInt({ min: 0 }).withMessage('Idade máxima inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { localId, idadeMin, idadeMax } = req.query;

    const where = {
      ...getLocalFilter(req.user), // SEGURANÇA: Filtrar por locais do usuário
      ativo: true
    };
    if (localId) where.local_id = localId;
    if (idadeMin) where.idade = { gte: parseInt(idadeMin) };
    if (idadeMax) {
      where.idade = { ...where.idade, lte: parseInt(idadeMax) };
    }

    const [criancas, total, byAgeGroup, byLocal] = await Promise.all([
      prisma.crianca.findMany({
        where,
        include: {
          local: { select: { id: true, nome: true } },
          _count: { select: { checkins: true } }
        },
        orderBy: { nome: 'asc' }
      }),
      prisma.crianca.count({ where }),
      // Buscar todas para agrupar por idade (processamento em JS)
      prisma.crianca.findMany({
        where,
        select: { idade: true }
      }),
      // Agrupar por local
      prisma.local.findMany({
        select: {
          id: true,
          nome: true,
          _count: {
            select: {
              criancas: true
            }
          }
        }
      })
    ]);

    // Processar agrupamento por faixa etária em JavaScript
    const ageGroups = {
      '0-4 anos': 0,
      '5-9 anos': 0,
      '10-14 anos': 0,
      '15+ anos': 0
    };

    byAgeGroup.forEach(crianca => {
      if (crianca.idade < 5) ageGroups['0-4 anos']++;
      else if (crianca.idade <= 9) ageGroups['5-9 anos']++;
      else if (crianca.idade <= 14) ageGroups['10-14 anos']++;
      else ageGroups['15+ anos']++;
    });

    const byAgeGroupFormatted = Object.entries(ageGroups).map(([age_group, count]) => ({
      age_group,
      count: BigInt(count) // Formato compatível com SQL anterior
    }));

    // Ordenar byLocal por contagem (maior para menor)
    const sortedByLocal = byLocal.sort((a, b) =>
      b._count.criancas - a._count.criancas
    );

    res.json({
      summary: { total },
      children: criancas,
      byAgeGroup: byAgeGroupFormatted,
      byLocal: sortedByLocal
    });
  } catch (error) {
    console.error('Children report error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/checkins:
 *   get:
 *     summary: Relatório de checkins
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relatório de checkins
 */
router.get('/checkins', [
  authenticateToken,
  query('startDate').optional().isISO8601().withMessage('Data inicial inválida'),
  query('endDate').optional().isISO8601().withMessage('Data final inválida'),
  query('localId').optional().isUUID().withMessage('Local ID inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { startDate, endDate, localId } = req.query;

    const where = {
      ...getLocalFilter(req.user) // SEGURANÇA: Filtrar por locais do usuário
    };
    if (localId) where.local_id = localId;

    if (startDate || endDate) {
      where.data_checkin = {};
      if (startDate) where.data_checkin.gte = new Date(startDate);
      if (endDate) where.data_checkin.lte = new Date(endDate);
    }

    const [checkins, total, byLocal, byMonth, uniqueChildren] = await Promise.all([
      prisma.checkin.findMany({
        where,
        include: {
          crianca: { select: { id: true, nome: true } },
          local: { select: { id: true, nome: true } },
          doacao: { select: { id: true, tipo_doacao: true } }
        },
        orderBy: { data_checkin: 'desc' }
      }),
      prisma.checkin.count({ where }),
      // Agrupar por local
      prisma.checkin.groupBy({
        by: ['local_id'],
        where,
        _count: {
          _all: true
        }
      }),
      // Buscar checkins para agrupar por mês (processamento em JS)
      prisma.checkin.findMany({
        where,
        select: {
          data_checkin: true,
          crianca_id: true
        }
      }),
      // Contar crianças únicas
      prisma.checkin.groupBy({
        by: ['crianca_id'],
        where,
        _count: true
      })
    ]);

    // Buscar nomes dos locais para agrupamento
    const localNames = await prisma.local.findMany({
      where: localId ? { id: localId } : undefined,
      select: { id: true, nome: true }
    });

    const localNamesMap = localNames.reduce((acc, local) => {
      acc[local.id] = local.nome;
      return acc;
    }, {});

    const byLocalWithNames = byLocal
      .map(item => ({
        ...item,
        local_name: localNamesMap[item.local_id] || 'Unknown'
      }))
      .sort((a, b) => b._count._all - a._count._all);

    // Processar agrupamento por mês em JavaScript
    const monthlyData = {};
    byMonth.forEach(checkin => {
      const date = new Date(checkin.data_checkin);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: new Date(monthKey),
          count: 0,
          unique_children: new Set()
        };
      }

      monthlyData[monthKey].count++;
      monthlyData[monthKey].unique_children.add(checkin.crianca_id);
    });

    const byMonthFormatted = Object.values(monthlyData)
      .map(item => ({
        month: item.month,
        count: BigInt(item.count),
        unique_children: BigInt(item.unique_children.size)
      }))
      .sort((a, b) => a.month - b.month);

    res.json({
      summary: {
        total,
        uniqueChildren: uniqueChildren.length
      },
      checkins,
      byLocal: byLocalWithNames,
      byMonth: byMonthFormatted
    });
  } catch (error) {
    console.error('Checkins report error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/doacoes:
 *   get:
 *     summary: Relatório de doações
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relatório de doações
 */
router.get('/doacoes', [
  authenticateToken,
  query('startDate').optional().isISO8601().withMessage('Data inicial inválida'),
  query('endDate').optional().isISO8601().withMessage('Data final inválida'),
  query('localId').optional().isUUID().withMessage('Local ID inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { startDate, endDate, localId } = req.query;

    const where = {
      ...getLocalFilter(req.user) // SEGURANÇA: Filtrar por locais do usuário
    };
    if (localId) where.local_id = localId;

    if (startDate || endDate) {
      where.data_doacao = {};
      if (startDate) where.data_doacao.gte = new Date(startDate);
      if (endDate) where.data_doacao.lte = new Date(endDate);
    }

    const [doacoes, total, byTipo, byLocal, byMonth] = await Promise.all([
      prisma.doacao.findMany({
        where,
        include: {
          local: { select: { id: true, nome: true } },
          _count: { select: { checkins: true } }
        },
        orderBy: { data_doacao: 'desc' }
      }),
      prisma.doacao.count({ where }),
      // Agrupar por tipo
      prisma.doacao.groupBy({
        by: ['tipo_doacao'],
        where,
        _count: {
          _all: true
        },
        _sum: { quantidade: true }
      }),
      // Agrupar por local
      prisma.doacao.groupBy({
        by: ['local_id'],
        where,
        _count: {
          _all: true
        },
        _sum: { quantidade: true }
      }),
      // Buscar doações para agrupar por mês (processamento em JS)
      prisma.doacao.findMany({
        where,
        select: {
          data_doacao: true,
          quantidade: true
        }
      })
    ]);

    // Buscar nomes dos locais para agrupamento
    const localNames = await prisma.local.findMany({
      where: localId ? { id: localId } : undefined,
      select: { id: true, nome: true }
    });

    const localNamesMap = localNames.reduce((acc, local) => {
      acc[local.id] = local.nome;
      return acc;
    }, {});

    // Ordenar byTipo por contagem (maior para menor)
    const sortedByTipo = byTipo.sort((a, b) => b._count._all - a._count._all);

    const byLocalWithNames = byLocal
      .map(item => ({
        ...item,
        local_name: localNamesMap[item.local_id] || 'Unknown'
      }))
      .sort((a, b) => b._count._all - a._count._all);

    // Processar agrupamento por mês em JavaScript
    const monthlyDoacoes = {};
    byMonth.forEach(doacao => {
      const date = new Date(doacao.data_doacao);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

      if (!monthlyDoacoes[monthKey]) {
        monthlyDoacoes[monthKey] = {
          month: new Date(monthKey),
          count: 0,
          total_quantity: 0
        };
      }

      monthlyDoacoes[monthKey].count++;
      monthlyDoacoes[monthKey].total_quantity += doacao.quantidade || 0;
    });

    const byMonthFormatted = Object.values(monthlyDoacoes)
      .map(item => ({
        month: item.month,
        count: BigInt(item.count),
        total_quantity: BigInt(item.total_quantity)
      }))
      .sort((a, b) => a.month - b.month);

    res.json({
      summary: { total },
      doacoes,
      byTipo: sortedByTipo,
      byLocal: byLocalWithNames,
      byMonth: byMonthFormatted
    });
  } catch (error) {
    console.error('Doacoes report error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/atividade:
 *   get:
 *     summary: Obter atividades recentes
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Número de dias para buscar atividades (padrão 7)
 *     responses:
 *       200:
 *         description: Atividades recentes unificadas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   action:
 *                     type: string
 *                   details:
 *                     type: string
 *                   time:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [user, donation, checkin, birthday]
 *                   created_at:
 *                     type: string
 */
router.get('/atividade', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const userId = req.user.userId;
    const userRole = req.user.role;

    // Buscar locais do colaborador (se não for admin)
    let allowedLocalIds = null;
    if (userRole !== 'admin') {
      const colaboradorLocais = await prisma.colaboradorLocal.findMany({
        where: { colaborador_id: userId },
        select: { local_id: true }
      });
      allowedLocalIds = colaboradorLocais.map(cl => cl.local_id);

      // Se colaborador não tem locais designados, retornar vazio
      if (allowedLocalIds.length === 0) {
        return res.json([]);
      }
    }

    // Filtro de local baseado em role
    const localFilter = allowedLocalIds ? { local_id: { in: allowedLocalIds } } : {};

    // Buscar atividades recentes
    const [recentChildren, recentDoacoes, recentCheckins] = await Promise.all([
      prisma.crianca.findMany({
        where: {
          created_at: { gte: startDate },
          ...localFilter
        },
        include: {
          local: { select: { nome: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 10
      }),
      prisma.doacao.findMany({
        where: {
          created_at: { gte: startDate },
          ...localFilter
        },
        include: {
          local: { select: { nome: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 10
      }),
      prisma.checkin.findMany({
        where: {
          created_at: { gte: startDate },
          ...localFilter,
          presente: true // CORREÇÃO: Mostrar apenas check-ins onde criança estava presente
        },
        include: {
          crianca: { select: { nome: true } },
          local: { select: { nome: true } }
        },
        orderBy: { created_at: 'desc' },
        take: 10
      })
    ]);

    // Função para calcular tempo relativo
    function formatTimeAgo(dateString) {
      const now = new Date();
      const date = new Date(dateString);
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return 'Agora mesmo';
      if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`;

      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
    }

    // Unificar e formatar atividades
    const activities = [];

    // Adicionar crianças
    recentChildren.forEach(crianca => {
      activities.push({
        id: crianca.id,
        action: 'Nova criança cadastrada',
        details: `${crianca.nome}${crianca.local ? ' em ' + crianca.local.nome : ''}`,
        time: formatTimeAgo(crianca.created_at),
        type: 'user',
        created_at: crianca.created_at.toISOString()
      });
    });

    // Adicionar doações
    recentDoacoes.forEach(doacao => {
      activities.push({
        id: doacao.id,
        action: 'Nova doação registrada',
        details: `${doacao.tipo_doacao} - ${doacao.doador}${doacao.local ? ' em ' + doacao.local.nome : ''}`,
        time: formatTimeAgo(doacao.created_at),
        type: 'donation',
        created_at: doacao.created_at.toISOString()
      });
    });

    // Adicionar check-ins
    recentCheckins.forEach(checkin => {
      activities.push({
        id: checkin.id,
        action: 'Check-in realizado',
        details: `${checkin.crianca?.nome || 'Criança'}${checkin.local ? ' em ' + checkin.local.nome : ''}`,
        time: formatTimeAgo(checkin.created_at),
        type: 'checkin',
        created_at: checkin.created_at.toISOString()
      });
    });

    // Ordenar por data mais recente
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Retornar apenas as 15 mais recentes
    res.json(activities.slice(0, 15));
  } catch (error) {
    console.error('Activity report error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/aniversarios:
 *   get:
 *     summary: Obter aniversariantes
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de aniversariantes
 */
router.get('/aniversarios', authenticateToken, async (req, res) => {
  try {
    const month = req.query.month ? parseInt(req.query.month) : undefined;
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const criancas = await prisma.crianca.findMany({
      where: {
        ...getLocalFilter(req.user), // SEGURANÇA: Filtrar por locais do usuário
        ativo: true
      },
      include: {
        local: { select: { nome: true } }
      }
    });

    // Filtrar por mês se fornecido
    const filtered = month !== undefined
      ? criancas.filter(c => new Date(c.data_nascimento).getMonth() === month)
      : criancas;

    res.json(filtered);
  } catch (error) {
    console.error('Birthday report error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/analise-doacoes:
 *   get:
 *     summary: Análise completa de doações com KPIs
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Análise completa com KPIs
 */
router.get('/analise-doacoes', [
  authenticateToken,
  query('startDate').optional().trim().if(val => val !== '').isISO8601().withMessage('Data inicial inválida'),
  query('endDate').optional().trim().if(val => val !== '').isISO8601().withMessage('Data final inválida'),
  query('localId').optional().trim().if(val => val !== '').isUUID().withMessage('Local ID inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { startDate, endDate, localId } = req.query;

    const localFilter = getLocalFilter(req.user); // SEGURANÇA: Filtrar por locais do usuário

    const whereDoacao = { ...localFilter };
    const whereCrianca = { ...localFilter };
    const whereCheckin = { ...localFilter };

    if (localId) {
      whereDoacao.local_id = localId;
      whereCrianca.local_id = localId;
      whereCheckin.local_id = localId;
    }

    if (startDate || endDate) {
      whereDoacao.data_doacao = {};
      whereCheckin.data_checkin = {};
      if (startDate) {
        whereDoacao.data_doacao.gte = new Date(startDate);
        whereCheckin.data_checkin.gte = new Date(startDate);
      }
      if (endDate) {
        whereDoacao.data_doacao.lte = new Date(endDate);
        whereCheckin.data_checkin.lte = new Date(endDate);
      }
    }

    // Buscar KPIs
    const [
      totalDoacoes,
      totalQuantidade,
      criancasAtendidas,
      criancasMatriculadas,
      distribuicaoPorTipo,
      doacoesPorLocal,
      tendenciaMensal
    ] = await Promise.all([
      prisma.doacao.count({ where: whereDoacao }),
      prisma.doacao.aggregate({
        where: whereDoacao,
        _sum: { quantidade: true }
      }),
      prisma.checkin.findMany({
        where: whereCheckin,
        distinct: ['crianca_id'],
        select: { crianca_id: true }
      }).then(checkins => checkins.length),
      prisma.crianca.count({ where: { ...whereCrianca, ativo: true } }),
      prisma.doacao.groupBy({
        by: ['tipo_doacao'],
        where: whereDoacao,
        _count: true,
        _sum: { quantidade: true }
      }).then(result => result.sort((a, b) => b._count - a._count)),
      prisma.doacao.groupBy({
        by: ['local_id'],
        where: whereDoacao,
        _count: true,
        _sum: { quantidade: true }
      }).then(result => result.sort((a, b) => b._count - a._count)),
      // Buscar doações para tendência mensal (processamento em JS)
      prisma.doacao.findMany({
        where: whereDoacao,
        select: {
          data_doacao: true,
          quantidade: true,
          local_id: true
        }
      })
    ]);

    // Buscar nomes dos locais
    const locais = await prisma.local.findMany({
      select: { id: true, nome: true }
    });
    const localMap = new Map(locais.map(l => [l.id, l.nome]));

    // Calcular taxa de cobertura
    const taxaCobertura = criancasMatriculadas > 0
      ? ((criancasAtendidas / criancasMatriculadas) * 100).toFixed(2)
      : 0;

    // Formatar resposta
    const doacoesPorLocalFormatado = doacoesPorLocal.map(item => ({
      local_id: item.local_id,
      local_nome: localMap.get(item.local_id) || 'Desconhecido',
      total_doacoes: Number(item._count),
      total_quantidade: Number(item._sum.quantidade || 0)
    }));

    const distribuicaoPorTipoFormatado = distribuicaoPorTipo.map(item => ({
      tipo_doacao: item.tipo_doacao,
      total: Number(item._count),
      quantidade: Number(item._sum.quantidade || 0)
    }));

    // Processar tendência mensal em JavaScript
    const tendenciaData = {};
    tendenciaMensal.forEach(doacao => {
      const date = new Date(doacao.data_doacao);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

      if (!tendenciaData[monthKey]) {
        tendenciaData[monthKey] = {
          mes: new Date(monthKey),
          total_doacoes: 0,
          total_quantidade: 0,
          locais_ativos: new Set()
        };
      }

      tendenciaData[monthKey].total_doacoes++;
      tendenciaData[monthKey].total_quantidade += doacao.quantidade || 0;
      if (doacao.local_id) {
        tendenciaData[monthKey].locais_ativos.add(doacao.local_id);
      }
    });

    const tendenciaMensalFormatada = Object.values(tendenciaData)
      .map(item => ({
        mes: item.mes,
        total_doacoes: Number(item.total_doacoes),
        total_quantidade: Number(item.total_quantidade),
        locais_ativos: Number(item.locais_ativos.size)
      }))
      .sort((a, b) => a.mes - b.mes);

    res.json({
      kpis: {
        total_doacoes: Number(totalDoacoes),
        total_quantidade: Number(totalQuantidade._sum.quantidade || 0),
        criancas_atendidas: Number(criancasAtendidas),
        criancas_matriculadas: Number(criancasMatriculadas),
        taxa_cobertura: parseFloat(taxaCobertura),
        tempo_medio_entre_doacao: 'N/A'
      },
      distribuicao_por_tipo: distribuicaoPorTipoFormatado,
      doacoes_por_local: doacoesPorLocalFormatado,
      tendencia_temporal: tendenciaMensalFormatada
    });
  } catch (error) {
    console.error('Análise doações error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/criancas-sem-doacao:
 *   get:
 *     summary: Crianças que nunca receberam doações
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
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
 *     responses:
 *       200:
 *         description: Lista de crianças sem doações
 */
router.get('/criancas-sem-doacao', [
  authenticateToken,
  query('localId').optional().isUUID().withMessage('Local ID inválido'),
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { localId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {
      ...getLocalFilter(req.user), // SEGURANÇA: Filtrar por locais do usuário
      ativo: true
    };
    if (localId) where.local_id = localId;

    // Buscar todas as crianças
    const criancas = await prisma.crianca.findMany({
      where,
      include: {
        local: { select: { id: true, nome: true } },
        checkins: {
          select: { id: true, data_checkin: true }
        }
      }
    });

    // Filtrar crianças que NUNCA tiveram checkins (nunca receberam doações)
    const criancasSemDoacao = criancas.filter(c => c.checkins.length === 0);

    // Paginação manual
    const total = criancasSemDoacao.length;
    const paginadas = criancasSemDoacao.slice(skip, skip + limit).map(c => ({
      id: c.id,
      nome: c.nome,
      data_nascimento: c.data_nascimento,
      local: c.local,
      data_cadastro: c.created_at,
      dias_sem_doacao: Math.floor((new Date() - new Date(c.created_at)) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      criancas: paginadas
    });
  } catch (error) {
    console.error('Crianças sem doação error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/ranking-urgencia:
 *   get:
 *     summary: Ranking de crianças há mais tempo sem doações
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Ranking de urgência
 */
router.get('/ranking-urgencia', [
  authenticateToken,
  query('localId').optional().trim().if(val => val !== '').isUUID().withMessage('Local ID inválido'),
  query('limit').optional().trim().if(val => val !== '').isInt({ min: 1, max: 100 }).withMessage('Limite inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { localId } = req.query;
    const limit = parseInt(req.query.limit) || 20;

    // Buscar crianças com checkins usando Prisma
    const where = {
      ...getLocalFilter(req.user), // SEGURANÇA: Filtrar por locais do usuário
      ativo: true
    };
    if (localId) where.local_id = localId;

    const criancas = await prisma.crianca.findMany({
      where,
      include: {
        local: {
          select: { nome: true }
        },
        checkins: {
          select: { data_checkin: true },
          orderBy: { data_checkin: 'desc' },
          take: 1 // Só pegar o último checkin
        }
      }
    });

    // Processar ranking em JavaScript
    const ranking = criancas.map(crianca => {
      const ultimoCheckin = crianca.checkins[0]?.data_checkin;
      const dataReferencia = ultimoCheckin || crianca.created_at;
      const diasSemDoacao = Math.floor((new Date() - new Date(dataReferencia)) / (1000 * 60 * 60 * 24));

      return {
        id: crianca.id,
        nome: crianca.nome,
        local_id: crianca.local_id,
        local_nome: crianca.local?.nome,
        ultima_doacao: ultimoCheckin,
        dias_sem_doacao: BigInt(diasSemDoacao)
      };
    })
    .sort((a, b) => Number(b.dias_sem_doacao - a.dias_sem_doacao))
    .slice(0, limit);

    // Mapear urgência por cores
    const rankingComUrgencia = ranking.map((item, index) => {
      const dias = parseInt(item.dias_sem_doacao);
      let urgencia = 'verde';
      if (dias > 180) urgencia = 'vermelho';
      else if (dias > 90) urgencia = 'laranja';
      else if (dias > 30) urgencia = 'amarelo';

      return {
        posicao: index + 1,
        crianca_id: item.id,
        crianca_nome: item.nome,
        local_id: item.local_id,
        local_nome: item.local_nome,
        ultima_doacao: item.ultima_doacao,
        dias_sem_doacao: dias,
        urgencia
      };
    });

    res.json({
      total: rankingComUrgencia.length,
      ranking: rankingComUrgencia
    });
  } catch (error) {
    console.error('Ranking urgência error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/taxa-cobertura:
 *   get:
 *     summary: Taxa de cobertura de doações por local
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Taxa de cobertura por local
 */
router.get('/taxa-cobertura', [
  authenticateToken,
  query('startDate').optional().trim().if(val => val !== '').isISO8601().withMessage('Data inicial inválida'),
  query('endDate').optional().trim().if(val => val !== '').isISO8601().withMessage('Data final inválida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { startDate, endDate } = req.query;

    const dateFIlter = {};
    if (startDate) dateFIlter.gte = new Date(startDate);
    if (endDate) dateFIlter.lte = new Date(endDate);

    // Buscar todos os locais com suas crianças
    const locais = await prisma.local.findMany({
      include: {
        criancas: {
          where: { ativo: true },
          select: { id: true }
        }
      }
    });

    // Para cada local, contar crianças que receberam doações
    const taxasCobertura = await Promise.all(
      locais.map(async (local) => {
        const criancasAtendidas = await prisma.checkin.findMany({
          where: {
            local_id: local.id,
            ...(Object.keys(dateFIlter).length > 0 && { data_checkin: dateFIlter })
          },
          distinct: ['crianca_id'],
          select: { crianca_id: true }
        });

        const totalCriancas = local.criancas.length;
        const atendidas = criancasAtendidas.length;
        const taxa = totalCriancas > 0 ? ((atendidas / totalCriancas) * 100).toFixed(2) : 0;

        return {
          local_id: local.id,
          local_nome: local.nome,
          total_criancas: totalCriancas,
          criancas_atendidas: atendidas,
          taxa_cobertura: parseFloat(taxa),
          status: parseFloat(taxa) >= 80 ? 'excelente' : parseFloat(taxa) >= 60 ? 'bom' : 'baixo'
        };
      })
    );

    res.json({
      periodo: {
        data_inicio: startDate || 'Toda a história',
        data_fim: endDate || 'Até hoje'
      },
      taxa_media: (taxasCobertura.reduce((sum, t) => sum + t.taxa_cobertura, 0) / taxasCobertura.length).toFixed(2),
      locais: taxasCobertura.sort((a, b) => b.taxa_cobertura - a.taxa_cobertura)
    });
  } catch (error) {
    console.error('Taxa cobertura error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/historico-crianca/:id:
 *   get:
 *     summary: Obter histórico detalhado de doações recebidas por criança
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         name: tipo
 *         schema:
 *           type: string
 *       - in: query
 *         name: descricao
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Histórico detalhado da criança
 */
router.get('/historico-crianca/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, tipo, descricao, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Buscar criança (com verificação de acesso por local)
    const crianca = await prisma.crianca.findFirst({
      where: {
        id,
        ...getLocalFilter(req.user) // SEGURANÇA: Verificar acesso ao local da criança
      },
      select: { id: true, nome: true, local: { select: { nome: true } } }
    });

    if (!crianca) {
      return res.status(404).json({ error: { message: 'Criança não encontrada' } });
    }

    // Construir filtros
    const whereCheckin = {
      crianca_id: id,
      doacao_id: { not: null }
    };

    if (startDate || endDate) {
      whereCheckin.data_checkin = {};
      if (startDate) whereCheckin.data_checkin.gte = new Date(startDate);
      if (endDate) whereCheckin.data_checkin.lte = new Date(endDate);
    }

    const whereDoacao = {};
    if (tipo && tipo !== 'todos') whereDoacao.tipo_doacao = tipo;

    // Busca inteligente por palavras múltiplas (case-insensitive)
    if (descricao) {
      const descricaoTrimmed = descricao.trim();
      if (descricaoTrimmed) {
        // Dividir em palavras e remover palavras muito curtas (< 2 caracteres)
        const palavras = descricaoTrimmed.split(/\s+/).filter(p => p.length >= 2);

        if (palavras.length === 1) {
          // Se for apenas 1 palavra, busca simples
          whereDoacao.descricao = {
            contains: palavras[0],
            mode: 'insensitive'
          };
        } else if (palavras.length > 1) {
          // Se forem múltiplas palavras, buscar TODAS (em qualquer ordem)
          whereDoacao.AND = palavras.map(palavra => ({
            descricao: {
              contains: palavra,
              mode: 'insensitive'
            }
          }));
        }
      }
    }

    // Buscar check-ins com doações (excluindo presentes de aniversário, que serão buscados separadamente)
    const [historico, total] = await Promise.all([
      prisma.checkin.findMany({
        where: whereCheckin,
        include: {
          doacao: {
            where: Object.keys(whereDoacao).length > 0 ? whereDoacao : undefined,
            select: {
              id: true,
              doador: true,
              tipo_doacao: true,
              descricao: true,
              quantidade: true,
              unidade: true,
              data_doacao: true
            }
          }
        },
        orderBy: { data_checkin: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.checkin.count({
        where: whereCheckin
      })
    ]);

    // Filtrar checkins que têm doação e NÃO são presentes de aniversário
    // (presentes são buscados via doacaoDestinatario para evitar duplicação)
    const historicoFiltrado = historico.filter(h =>
      h.doacao !== null && h.doacao.tipo_doacao !== 'Presente de Aniversário'
    );

    // Buscar presentes de aniversário recebidos
    const presentes = await prisma.doacaoDestinatario.findMany({
      where: {
        crianca_id: id,
        entregue: true,
        doacao: {
          tipo_doacao: 'Presente de Aniversário',
          ...(startDate || endDate ? {
            data_doacao: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) })
            }
          } : {})
        }
      },
      include: {
        doacao: {
          select: {
            id: true,
            doador: true,
            tipo_doacao: true,
            descricao: true,
            data_doacao: true
          }
        }
      },
      orderBy: { updated_at: 'desc' }
    });

    // Estatísticas resumidas - buscar todas as doações dos check-ins
    const resumo = await prisma.checkin.groupBy({
      by: ['doacao_id'],
      where: { crianca_id: id, doacao_id: { not: null } },
      _count: true
    });

    // Buscar tipos de doação para filtrar presentes
    const doacoes = await prisma.doacao.findMany({
      where: {
        id: { in: resumo.map(r => r.doacao_id) }
      },
      select: { id: true, tipo_doacao: true }
    });

    // Filtrar doações que NÃO são presentes (presentes são contados separadamente)
    const doacoesSemPresentes = doacoes.filter(d => d.tipo_doacao !== 'Presente de Aniversário');

    // Total correto: doações normais (sem presentes) + presentes separados
    const totalItensRecebidos = doacoesSemPresentes.length + presentes.length;

    // Agrupar por tipo de doação (sem presentes, eles são adicionados depois)
    const porTipo = doacoesSemPresentes.reduce((acc, d) => {
      acc[d.tipo_doacao] = (acc[d.tipo_doacao] || 0) + 1;
      return acc;
    }, {});

    // Adicionar presentes ao resumo por tipo
    if (presentes.length > 0) {
      porTipo['Presente de Aniversário'] = presentes.length;
    }

    res.json({
      crianca: {
        id: crianca.id,
        nome: crianca.nome,
        local: crianca.local?.nome
      },
      historico: historicoFiltrado.map(h => ({
        id: h.id,
        data_entrega: h.data_checkin,
        doacao: h.doacao,
        quantidade_consumida: h.quantidade_consumida,
        observacoes: h.observacoes,
        tipo: 'consumo'
      })).concat(presentes.map(p => ({
        id: p.id,
        data_entrega: p.updated_at,
        doacao: p.doacao,
        quantidade_consumida: 1,
        observacoes: null,
        tipo: 'presente'
      }))).sort((a, b) => new Date(b.data_entrega) - new Date(a.data_entrega)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalItensRecebidos,
        totalPages: Math.ceil(totalItensRecebidos / parseInt(limit))
      },
      resumo: {
        total_itens: totalItensRecebidos,
        por_tipo: porTipo
      }
    });
  } catch (error) {
    console.error('Histórico criança error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/prestacao-contas:
 *   get:
 *     summary: Relatório de prestação de contas de doações distribuídas
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *       - in: query
 *         name: descricao
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relatório de prestação de contas
 */
router.get('/prestacao-contas', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, localId, tipo, descricao } = req.query;

    const whereDoacao = {
      ...getLocalFilter(req.user) // SEGURANÇA: Filtrar por locais do usuário
    };
    if (localId) whereDoacao.local_id = localId;
    if (tipo && tipo !== 'todos') whereDoacao.tipo_doacao = tipo;

    // Busca inteligente por palavras múltiplas (case-insensitive)
    if (descricao) {
      const descricaoTrimmed = descricao.trim();
      if (descricaoTrimmed) {
        // Dividir em palavras e remover palavras muito curtas (< 2 caracteres)
        const palavras = descricaoTrimmed.split(/\s+/).filter(p => p.length >= 2);

        if (palavras.length === 1) {
          // Se for apenas 1 palavra, busca simples
          whereDoacao.descricao = {
            contains: palavras[0],
            mode: 'insensitive'
          };
        } else if (palavras.length > 1) {
          // Se forem múltiplas palavras, buscar TODAS (em qualquer ordem)
          whereDoacao.AND = palavras.map(palavra => ({
            descricao: {
              contains: palavra,
              mode: 'insensitive'
            }
          }));
        }
      }
    }
    if (startDate || endDate) {
      whereDoacao.data_doacao = {};
      if (startDate) whereDoacao.data_doacao.gte = new Date(startDate);
      if (endDate) whereDoacao.data_doacao.lte = new Date(endDate);
    }

    // Buscar doações com detalhes de distribuição
    const doacoes = await prisma.doacao.findMany({
      where: whereDoacao,
      include: {
        local: { select: { nome: true } },
        checkins: {
          include: {
            crianca: { select: { id: true, nome: true } }
          },
          orderBy: { data_checkin: 'desc' }
        },
        destinatarios: {
          include: {
            crianca: { select: { id: true, nome: true } }
          }
        }
      },
      orderBy: { data_doacao: 'desc' }
    });

    // Processar cada doação para calcular distribuição
    const relatorio = doacoes.map(doacao => {
      const totalConsumido = doacao.checkins.reduce((sum, c) => sum + c.quantidade_consumida, 0);
      const quantidadeRestante = Math.max(0, doacao.quantidade - totalConsumido);

      const criancasAtendidas = doacao.tipo_doacao === 'Presente de Aniversário'
        ? doacao.destinatarios.filter(d => d.entregue).map(d => ({
            id: d.crianca.id,
            nome: d.crianca.nome,
            data_entrega: d.updated_at,
            quantidade: 1
          }))
        : doacao.checkins.map(c => ({
            id: c.crianca.id,
            nome: c.crianca.nome,
            data_entrega: c.data_checkin,
            quantidade: c.quantidade_consumida
          }));

      const criancasPendentes = doacao.tipo_doacao === 'Presente de Aniversário'
        ? doacao.destinatarios.filter(d => !d.entregue).map(d => ({
            id: d.crianca.id,
            nome: d.crianca.nome
          }))
        : [];

      return {
        doacao_id: doacao.id,
        doador: doacao.doador,
        tipo_doacao: doacao.tipo_doacao,
        descricao: doacao.descricao,
        quantidade_total: doacao.quantidade,
        unidade: doacao.unidade,
        quantidade_distribuida: totalConsumido,
        quantidade_restante: quantidadeRestante,
        data_doacao: doacao.data_doacao,
        local: doacao.local?.nome,
        total_criancas_atendidas: criancasAtendidas.length,
        criancas_atendidas: criancasAtendidas,
        total_criancas_pendentes: criancasPendentes.length,
        criancas_pendentes: criancasPendentes,
        status: quantidadeRestante === 0 ? 'distribuido_completamente' :
                totalConsumido > 0 ? 'distribuicao_parcial' : 'nao_distribuido'
      };
    });

    // Separar presentes de doações de estoque
    const presentes = relatorio.filter(r => r.tipo_doacao === 'Presente de Aniversário');
    const estoques = relatorio.filter(r => r.tipo_doacao !== 'Presente de Aniversário');

    // Estatísticas de PRESENTES
    const totalPresentesRegistrados = presentes.length;
    const presentesEntregues = presentes.reduce((sum, p) => sum + p.total_criancas_atendidas, 0);
    const presentesPendentes = presentes.reduce((sum, p) => sum + p.total_criancas_pendentes, 0);

    // Estatísticas de ESTOQUES
    const totalEstoques = estoques.length;
    const estoquesDistribuidos = estoques.reduce((sum, e) => sum + e.quantidade_distribuida, 0);
    const estoquesRestantes = estoques.reduce((sum, e) => sum + e.quantidade_restante, 0);

    // Estatísticas GERAIS
    const totalCriancasAtendidas = new Set(relatorio.flatMap(r => r.criancas_atendidas.map(c => c.id))).size;
    const totalItensDistribuidos = presentes.reduce((sum, p) => sum + p.total_criancas_atendidas, 0) + estoquesDistribuidos;

    // Calcular itens restantes POR TIPO de doação (APENAS estoques, sem presentes)
    const restantesPorTipo = estoques.reduce((acc, r) => {
      const tipo = r.tipo_doacao || 'Outros';
      if (!acc[tipo]) {
        acc[tipo] = 0;
      }
      acc[tipo] += r.quantidade_restante;
      return acc;
    }, {});

    res.json({
      periodo: {
        data_inicio: startDate || 'Toda a história',
        data_fim: endDate || 'Até hoje'
      },
      resumo: {
        // Estatísticas de presentes
        presentes: {
          total_registrados: totalPresentesRegistrados,
          entregues: presentesEntregues,
          pendentes: presentesPendentes
        },
        // Estatísticas de estoques
        estoques: {
          total_doacoes: totalEstoques,
          distribuidos: estoquesDistribuidos,
          restantes: estoquesRestantes
        },
        // Itens restantes por tipo (apenas estoques)
        restantes_por_tipo: restantesPorTipo,
        // Totais gerais
        total_criancas_atendidas: totalCriancasAtendidas,
        total_itens_distribuidos: totalItensDistribuidos
      },
      doacoes: relatorio
    });
  } catch (error) {
    console.error('Prestação contas error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/aniversarios-mes:
 *   get:
 *     summary: Relatório de aniversariantes do mês com status de presente
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: integer
 *         description: Mês (0-11). Se não fornecido, busca todos os meses do ano.
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Ano (padrão é o ano atual)
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *         description: Filtrar por local específico
 *     responses:
 *       200:
 *         description: Lista de aniversariantes com status de presente
 */
router.get('/aniversarios-mes', authenticateToken, async (req, res) => {
  try {
    // Tornar month opcional - se não fornecido, busca todos os meses
    const month = req.query.month !== undefined ? parseInt(req.query.month) : undefined;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const { localId } = req.query;

    // Validar month apenas se fornecido
    if (month !== undefined && (isNaN(month) || month < 0 || month > 11)) {
      return res.status(400).json({ error: { message: 'Mês inválido' } });
    }

    const where = {
      ...getLocalFilter(req.user), // SEGURANÇA: Filtrar por locais do usuário
      ativo: true
    };
    if (localId) where.local_id = localId;

    // Buscar todas as crianças
    const criancas = await prisma.crianca.findMany({
      where,
      include: {
        local: { select: { nome: true } },
        presentes_recebidos: {
          where: {
            doacao: {
              tipo_doacao: 'Presente de Aniversário'
            }
          },
          include: {
            doacao: {
              select: {
                id: true,
                descricao: true,
                doador: true,
                data_doacao: true
              }
            }
          },
          orderBy: { updated_at: 'desc' }
        }
      }
    });

    // Filtrar aniversariantes do mês (se month for fornecido)
    const aniversariantes = month !== undefined
      ? criancas.filter(c => {
          const dataNasc = new Date(c.data_nascimento);
          return dataNasc.getMonth() === month;
        })
      : criancas; // Se month não fornecido, retorna todas as crianças

    // Mapear com status de presente
    const aniversariantesComStatus = aniversariantes.map(crianca => {
      const dataNasc = new Date(crianca.data_nascimento);
      const diaAniversario = dataNasc.getDate();

      const presentesAnoAtual = crianca.presentes_recebidos.filter(p => {
        const dataDoacao = new Date(p.doacao.data_doacao);
        return dataDoacao.getFullYear() === year;
      });

      const presenteEntregue = presentesAnoAtual.find(p => p.entregue);

      // Calcular idade atual (HOJE) - mesma lógica da página de Aniversários
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      let idadeAtual = anoAtual - dataNasc.getFullYear();
      const monthDiff = hoje.getMonth() - dataNasc.getMonth();
      const dayDiff = hoje.getDate() - dataNasc.getDate();

      // Se ainda não fez aniversário este ano, diminui 1
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
        idadeAtual--;
      }

      // Idade que fará no próximo aniversário
      const idadeCompleta = idadeAtual + 1;

      return {
        crianca_id: crianca.id,
        nome: crianca.nome,
        data_nascimento: crianca.data_nascimento,
        dia_aniversario: diaAniversario,
        idade_atual: idadeAtual,
        idade_completa: idadeCompleta,
        local: crianca.local?.nome,
        presente_status: presenteEntregue ? 'entregue' :
                        presentesAnoAtual.length > 0 ? 'aguardando_entrega' : 'nao_registrado',
        presente_detalhes: presenteEntregue ? {
          descricao: presenteEntregue.doacao.descricao,
          doador: presenteEntregue.doacao.doador,
          data_entrega: presenteEntregue.updated_at
        } : null
      };
    });

    // Ordenar por dia do mês
    aniversariantesComStatus.sort((a, b) => a.dia_aniversario - b.dia_aniversario);

    // Estatísticas
    const total = aniversariantesComStatus.length;
    const entregues = aniversariantesComStatus.filter(a => a.presente_status === 'entregue').length;
    const aguardando = aniversariantesComStatus.filter(a => a.presente_status === 'aguardando_entrega').length;
    const naoRegistrado = aniversariantesComStatus.filter(a => a.presente_status === 'nao_registrado').length;

    res.json({
      mes: month !== undefined ? month : 'todos',
      ano: year,
      resumo: {
        total_aniversariantes: total,
        presentes_entregues: entregues,
        presentes_aguardando: aguardando,
        presentes_nao_registrados: naoRegistrado
      },
      aniversariantes: aniversariantesComStatus
    });
  } catch (error) {
    console.error('Aniversários mês error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/frequencia:
 *   get:
 *     summary: Relatório de frequência de crianças
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: localId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relatório de frequência
 */
router.get('/frequencia', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, localId } = req.query;

    const localFilter = getLocalFilter(req.user); // SEGURANÇA: Filtrar por locais do usuário

    const whereCrianca = {
      ...localFilter,
      ativo: true
    };
    if (localId) whereCrianca.local_id = localId;

    const whereCheckin = { ...localFilter };
    if (localId) whereCheckin.local_id = localId;
    if (startDate || endDate) {
      whereCheckin.data_checkin = {};
      if (startDate) whereCheckin.data_checkin.gte = new Date(startDate);
      if (endDate) whereCheckin.data_checkin.lte = new Date(endDate);
    }

    // Buscar crianças com seus check-ins
    const criancas = await prisma.crianca.findMany({
      where: whereCrianca,
      include: {
        local: { select: { nome: true } },
        checkins: {
          where: whereCheckin,
          select: { data_checkin: true },
          orderBy: { data_checkin: 'desc' }
        }
      }
    });

    // Processar frequência
    const frequencia = criancas.map(crianca => {
      const totalCheckins = crianca.checkins.length;
      const ultimoCheckin = crianca.checkins[0]?.data_checkin;
      const diasSemPresenca = ultimoCheckin
        ? Math.floor((new Date() - new Date(ultimoCheckin)) / (1000 * 60 * 60 * 24))
        : null;

      let status = 'ausente';
      if (totalCheckins > 0) {
        if (diasSemPresenca <= 7) status = 'frequente';
        else if (diasSemPresenca <= 30) status = 'irregular';
        else status = 'ausente';
      }

      return {
        crianca_id: crianca.id,
        nome: crianca.nome,
        local: crianca.local?.nome,
        total_checkins: totalCheckins,
        ultimo_checkin: ultimoCheckin,
        dias_sem_presenca: diasSemPresenca,
        status
      };
    });

    // Ordenar por dias sem presença (maior para menor)
    frequencia.sort((a, b) => (b.dias_sem_presenca || Infinity) - (a.dias_sem_presenca || Infinity));

    // Estatísticas
    const frequentes = frequencia.filter(f => f.status === 'frequente').length;
    const irregulares = frequencia.filter(f => f.status === 'irregular').length;
    const ausentes = frequencia.filter(f => f.status === 'ausente').length;

    res.json({
      periodo: {
        data_inicio: startDate || 'Toda a história',
        data_fim: endDate || 'Até hoje'
      },
      resumo: {
        total_criancas: frequencia.length,
        frequentes,
        irregulares,
        ausentes
      },
      criancas: frequencia
    });
  } catch (error) {
    console.error('Frequência error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

/**
 * @swagger
 * /api/relatorios/exportar-excel:
 *   post:
 *     summary: Exportar dados de doações para Excel
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               localId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Arquivo Excel preparado
 */
router.post('/exportar-excel', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, localId, tipoRelatorio } = req.body;

    const where = {
      ...getLocalFilter(req.user) // SEGURANÇA: Filtrar por locais do usuário
    };
    if (localId) where.local_id = localId;
    if (startDate || endDate) {
      where.data_doacao = {};
      if (startDate) where.data_doacao.gte = new Date(startDate);
      if (endDate) where.data_doacao.lte = new Date(endDate);
    }

    let dados = [];

    if (tipoRelatorio === 'doacoes' || !tipoRelatorio) {
      dados = await prisma.doacao.findMany({
        where,
        include: {
          local: { select: { nome: true } },
          checkins: { select: { crianca: { select: { nome: true } }, quantidade_consumida: true } }
        },
        orderBy: { data_doacao: 'desc' }
      });
    }

    // Formatar para Excel
    const dadosFormatados = dados.map(doacao => ({
      'Data da Doação': new Date(doacao.data_doacao).toLocaleDateString('pt-BR'),
      'Doador': doacao.doador,
      'Tipo': doacao.tipo_doacao,
      'Descrição': doacao.descricao || 'N/A',
      'Quantidade': doacao.quantidade || 0,
      'Unidade': doacao.unidade || '',
      'Local': doacao.local?.nome || 'N/A',
      'Entregues': doacao.checkins.length,
      'Última Entrega': doacao.checkins.length > 0
        ? new Date(Math.max(...doacao.checkins.map(c => new Date(c.data_checkin)))).toLocaleDateString('pt-BR')
        : 'Nenhuma'
    }));

    res.json({
      success: true,
      message: 'Dados preparados para exportação',
      dados: dadosFormatados,
      total: dadosFormatados.length
    });
  } catch (error) {
    console.error('Exportar Excel error:', error);
    res.status(500).json({ error: { message: 'Internal server error' } });
  }
});

module.exports = router;