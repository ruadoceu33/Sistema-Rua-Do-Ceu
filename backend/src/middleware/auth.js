// Importa a biblioteca jsonwebtoken para trabalhar com tokens JWT e o Prisma Client para acessar o banco de dados.
const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/database');

/**
 * Middleware para autenticar um usuário via token JWT.
 * Este middleware é a porta de entrada para rotas protegidas.
 * Ele verifica se o token enviado no cabeçalho da requisição é válido e se o usuário correspondente tem permissão para prosseguir.
 */
const authenticateToken = async (req, res, next) => {
  try {
    // O token JWT geralmente é enviado no cabeçalho 'Authorization' no formato "Bearer <token>".
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extrai apenas a parte do token.

    // Se não houver token, a requisição é imediatamente rejeitada com status 401 (Não Autorizado).
    if (!token) {
      return res.status(401).json({
        error: {
          message: 'Access token required' // Token de acesso é necessário.
        }
      });
    }

    // Verifica a validade do token usando o segredo (JWT_SECRET) definido no .env.
    // Se o token for inválido ou expirado, a função `jwt.verify` lançará um erro.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Após decodificar o token, usamos o `userId` contido nele para buscar o usuário no banco de dados.
    // Isso garante que o usuário ainda existe e nos dá acesso a informações atualizadas, como seu papel (role) e status.
    const user = await prisma.profile.findUnique({
      where: { id: decoded.userId },
      select: { // Selecionamos apenas os campos necessários para evitar expor dados sensíveis.
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        password_version: true
      }
    });

    // Se o usuário não for encontrado no banco ou se a conta estiver inativa, o acesso é negado.
    if (!user || !user.ativo) {
      return res.status(401).json({
        error: {
          message: 'Invalid or inactive user' // Usuário inválido ou inativo.
        }
      });
    }

    // CAMADA EXTRA DE SEGURANÇA: Invalidação de sessão após troca de senha.
    // O token JWT contém a `passwordVersion` do usuário no momento em que foi gerado.
    // Comparamos essa versão com a `password_version` atual do usuário no banco.
    // Se forem diferentes, significa que a senha foi alterada, e este token antigo não é mais válido.
    if (decoded.passwordVersion !== user.password_version) {
      return res.status(401).json({
        error: {
          message: 'Sua senha foi alterada em outro dispositivo. Por favor, faça login novamente.',
          code: 'PASSWORD_CHANGED' // Um código de erro específico para o frontend tratar.
        }
      });
    }

    // Se tudo estiver correto, anexamos o objeto `user` ao objeto `req`.
    // Isso permite que os próximos middlewares e rotas na cadeia saibam quem é o usuário autenticado.
    req.user = user;

    // Buscar os locais do usuário para controle de acesso baseado em local
    // Admins têm acesso a todos os locais (array vazio = sem filtro)
    if (user.role === 'admin') {
      req.user.locais = []; // Array vazio indica acesso total
    } else {
      // Colaboradores: buscar locais vinculados
      const userLocais = await prisma.colaboradorLocal.findMany({
        where: { colaborador_id: user.id },
        select: { local_id: true }
      });
      req.user.locais = userLocais.map(ul => ul.local_id);
    }

    next(); // Passa a requisição para o próximo middleware ou para a rota final.

  } catch (error) {
    // Tratamento de erros específicos da biblioteca JWT.
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          message: 'Invalid token' // O token está malformado ou a assinatura não confere.
        }
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Token expired' // O token expirou e um novo precisa ser gerado (geralmente via refresh token).
        }
      });
    }

    // Para qualquer outro erro durante a autenticação, retorna um erro genérico de servidor.
    return res.status(500).json({
      error: {
        message: 'Authentication error' // Erro de autenticação.
      }
    });
  }
};

/**
 * Middleware para verificar se o usuário autenticado tem o papel (role) de 'admin'.
 * Este middleware deve ser usado DEPOIS do `authenticateToken`, pois depende do `req.user`.
 */
const requireAdmin = (req, res, next) => {
  // Verifica se o objeto `user` existe e se a `role` é 'admin'.
  if (!req.user || req.user.role !== 'admin') {
    // Se não for admin, retorna status 403 (Proibido), indicando que o usuário está autenticado mas não tem permissão.
    return res.status(403).json({
      error: {
        message: 'Admin access required' // Acesso de administrador é necessário.
      }
    });
  }
  next(); // Se for admin, permite que a requisição continue.
};

/**
 * Middleware para verificar se o usuário é administrador OU o dono do recurso que está tentando acessar.
 * Útil para rotas como `PUT /api/colaboradores/:id`, onde um usuário pode editar seus próprios dados ou um admin pode editar qualquer um.
 */
const requireOwnerOrAdmin = (req, res, next) => {
  const { id } = req.params; // Pega o ID do recurso a partir dos parâmetros da URL.

  // Garante que o usuário está autenticado.
  if (!req.user) {
    return res.status(403).json({
      error: {
        message: 'Authentication required' // Autenticação necessária.
      }
    });
  }

  // Permite o acesso se o usuário for 'admin' OU se o ID do usuário autenticado (`req.user.id`) for o mesmo do recurso solicitado (`id`).
  if (req.user.role !== 'admin' && req.user.id !== id) {
    return res.status(403).json({
      error: {
        message: 'Access denied. You can only access your own resources.' // Acesso negado.
      }
    });
  }

  next(); // Se a condição for satisfeita, a requisição prossegue.
};

/**
 * Middleware para verificar se o usuário tem acesso a um local específico
 * Usado quando a rota recebe local_id como parâmetro ou no body
 */
const requireLocalAccess = (req, res, next) => {
  // Admin tem acesso a tudo
  if (req.user.role === 'admin') {
    return next();
  }

  // Pegar local_id dos parâmetros, query ou body
  const localId = req.params.local_id || req.query.local_id || req.body.local_id;

  if (!localId) {
    // Se não há local_id na requisição, deixa passar (será tratado por filtro geral)
    return next();
  }

  // Verificar se o colaborador tem acesso a este local
  if (!req.user.locais.includes(localId)) {
    return res.status(403).json({
      error: {
        message: 'Você não tem acesso a este local',
        code: 'LOCAL_ACCESS_DENIED'
      }
    });
  }

  next();
};

/**
 * Helper function: Aplicar filtro de locais em queries do Prisma
 * Retorna objeto where para ser usado em findMany/findFirst/count
 *
 * Exemplo de uso:
 * const criancas = await prisma.crianca.findMany({
 *   where: {
 *     ...getLocalFilter(req.user),
 *     ativo: true
 *   }
 * });
 */
const getLocalFilter = (user) => {
  // Admin: sem filtro (retorna objeto vazio)
  if (user.role === 'admin' || user.locais.length === 0) {
    return {};
  }

  // Colaborador: filtrar pelos locais vinculados
  return {
    local_id: {
      in: user.locais
    }
  };
};

// Exporta os middlewares para serem utilizados em outros arquivos, principalmente nas rotas.
module.exports = {
  authenticateToken,
  requireAdmin,
  requireOwnerOrAdmin,
  requireLocalAccess,
  getLocalFilter
};