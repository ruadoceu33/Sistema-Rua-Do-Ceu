// Importa o Prisma Client para interagir com o banco de dados.
const { prisma } = require('../utils/database');

/**
 * Middleware de Auditoria - Uma Higher-Order Function.
 * Em vez de ser um middleware direto, esta é uma função que RETORNA um middleware.
 * Isso nos permite configurar o middleware para cada rota específica, passando o nome da tabela e a operação.
 * Ex: auditMiddleware('criancas', 'INSERT') cria um middleware específico para registrar a criação de crianças.
 *
 * @param {string} table_name - O nome da tabela que está sendo modificada (ex: 'criancas', 'doacoes').
 * @param {string} operation - A operação sendo realizada (ex: 'INSERT', 'UPDATE', 'DELETE').
 * @returns {Function} - Retorna a função de middleware do Express.
 */
const auditMiddleware = (table_name, operation) => {
  return async (req, res, next) => {
    // --- Interceptando a Resposta ---
    // Para registrar um log de auditoria completo, precisamos de informações tanto da REQUISIÇÃO (o que foi enviado)
    // quanto da RESPOSTA (o que foi efetivamente salvo, como o ID do novo registro).
    // A técnica aqui é "interceptar" o método `res.json` original.

    const originalJson = res.json; // Guarda uma referência ao método `res.json` original do Express.

    // Sobrescreve `res.json` com uma nova função.
    res.json = function(data) {
      // REGRA: Só registra o log se a operação foi bem-sucedida (status code 2xx).
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Dispara a função de log de forma assíncrona ("fire and forget").
        // Não usamos `await` aqui porque não queremos que a resposta ao usuário espere o log ser salvo.
        // O log de auditoria é importante, mas não deve impactar a performance da requisição principal.
        logAudit(req, table_name, operation, data).catch(console.error);
      }

      // Chama o método `res.json` original para que a resposta seja enviada ao cliente normalmente.
      return originalJson.call(this, data);
    };

    // Passa para o próximo middleware ou para a lógica da rota.
    next();
  };
};

/**
 * Função auxiliar que efetivamente cria e salva o log de auditoria no banco de dados.
 * É chamada pela função `res.json` sobrescrita.
 *
 * @param {object} req - O objeto da requisição (request) do Express.
 * @param {string} table_name - O nome da tabela (vindo da closure).
 * @param {string} operation - A operação (vinda da closure).
 * @param {object} responseData - Os dados que foram enviados na resposta (`res.json(data)`).
 */
async function logAudit(req, table_name, operation, responseData) {
  try {
    let record_id = null;
    let old_values = null;
    let new_values = null;

    // Tenta extrair o ID do registro afetado. A lógica pode variar dependendo da operação.
    // Para UPDATE e DELETE, o ID geralmente vem dos parâmetros da rota (`req.params.id`).
    // Para INSERT, o ID vem do corpo da resposta (`responseData.id`).
    if (req.params.id) {
      record_id = req.params.id;
    } else if (responseData && responseData.id) {
      record_id = responseData.id;
    }

    // Para operações de UPDATE, idealmente, deveríamos buscar o estado do registro ANTES da alteração.
    // Por simplicidade aqui, estamos capturando o corpo da requisição como `old_values`,
    // o que representa "o que o usuário tentou mudar". Uma implementação mais robusta buscaria os dados antigos no banco.
    if (operation === 'UPDATE' && record_id) {
      try {
        // O `req.body` contém os campos que o usuário enviou para atualização.
        old_values = req.body; // Simplificação. O ideal seria `await prisma[tabela].findUnique({ where: { id: record_id } })` antes do update.
      } catch (error) {
        console.error('Error fetching old values for audit:', error);
      }
    }

    // Para INSERT e UPDATE, os novos valores são o corpo da requisição.
    if (operation === 'INSERT' || operation === 'UPDATE') {
      new_values = req.body;
    }

    // Cria o registro de log no banco de dados.
    await prisma.auditLog.create({
      data: {
        table_name, // Nome da tabela
        operation,  // Operação (INSERT, UPDATE, DELETE)
        record_id,  // ID do registro afetado
        user_id: req.user?.id || null, // ID do usuário autenticado (se houver)
        old_values, // Valores antigos (para UPDATE)
        new_values, // Novos valores (para INSERT/UPDATE)
        // Captura informações do cliente para rastreabilidade.
        ip_address: {
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        },
        user_agent: req.get('User-Agent')
      }
    });
  } catch (error) {
    // Se a criação do log de auditoria falhar, apenas registramos o erro no console.
    // É uma decisão de design CRÍTICA não deixar que uma falha no log quebre a requisição principal do usuário.
    console.error('Audit log error:', error);
  }
}

// Exporta o middleware para ser usado nas rotas.
module.exports = { auditMiddleware };