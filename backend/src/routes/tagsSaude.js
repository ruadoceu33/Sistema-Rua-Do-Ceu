const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// Listar todas as tags (autenticado)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tags = await prisma.tagSaude.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: {
          select: { criancas: true }
        }
      }
    });

    res.json(tags);
  } catch (error) {
    console.error('Erro ao buscar tags de saúde:', error);
    res.status(500).json({
      error: {
        message: 'Erro ao buscar tags de saúde',
        details: error.message
      }
    });
  }
});

// Criar nova tag (somente admin)
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('nome').trim().notEmpty().withMessage('Nome da tag é obrigatório'),
    body('cor').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Dados inválidos',
          details: errors.array()
        }
      });
    }

    try {
      const { nome, cor } = req.body;

      // Verificar se já existe
      const existente = await prisma.tagSaude.findUnique({
        where: { nome }
      });

      if (existente) {
        return res.status(400).json({
          error: {
            message: 'Já existe uma tag com este nome'
          }
        });
      }

      const tag = await prisma.tagSaude.create({
        data: { nome, cor }
      });

      res.status(201).json(tag);
    } catch (error) {
      console.error('Erro ao criar tag de saúde:', error);
      res.status(500).json({
        error: {
          message: 'Erro ao criar tag de saúde',
          details: error.message
        }
      });
    }
  }
);

// Atualizar tag (somente admin)
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    body('nome').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'),
    body('cor').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Dados inválidos',
          details: errors.array()
        }
      });
    }

    try {
      const { id } = req.params;
      const { nome, cor } = req.body;

      // Se está mudando o nome, verificar se não existe outra tag com esse nome
      if (nome) {
        const existente = await prisma.tagSaude.findFirst({
          where: {
            nome,
            NOT: { id }
          }
        });

        if (existente) {
          return res.status(400).json({
            error: {
              message: 'Já existe uma tag com este nome'
            }
          });
        }
      }

      const tag = await prisma.tagSaude.update({
        where: { id },
        data: { nome, cor }
      });

      res.json(tag);
    } catch (error) {
      console.error('Erro ao atualizar tag de saúde:', error);
      res.status(500).json({
        error: {
          message: 'Erro ao atualizar tag de saúde',
          details: error.message
        }
      });
    }
  }
);

// Deletar tag (somente admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a tag está sendo usada
    const count = await prisma.criancaSaude.count({
      where: { tag_id: id }
    });

    if (count > 0) {
      return res.status(400).json({
        error: {
          message: `Esta tag está sendo usada por ${count} criança(s). Não é possível excluir.`
        }
      });
    }

    await prisma.tagSaude.delete({
      where: { id }
    });

    res.json({ message: 'Tag excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar tag de saúde:', error);
    res.status(500).json({
      error: {
        message: 'Erro ao deletar tag de saúde',
        details: error.message
      }
    });
  }
});

module.exports = router;
