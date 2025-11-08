// Importa o PrismaClient do pacote @prisma/client.
// O PrismaClient é a classe gerada automaticamente a partir do seu `schema.prisma` que permite interagir com o banco de dados.
const { PrismaClient } = require('@prisma/client');

// Cria uma instância única do PrismaClient que será usada em toda a aplicação (padrão Singleton).
// Isso é crucial para a performance, pois evita abrir e fechar múltiplas conexões com o banco de dados a cada requisição.
const prisma = new PrismaClient({
  // Configuração de logs: uma prática recomendada para ter mais visibilidade em desenvolvimento e menos "ruído" em produção.
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error'] // Em ambiente de desenvolvimento, loga tudo: queries SQL, informações, avisos e erros.
    : ['error'], // Em produção, loga apenas os erros para não sobrecarregar os logs e não expor informações sensíveis.

  // Especifica a fonte de dados a ser usada. Embora já esteja no schema.prisma,
  // pode ser útil para cenários mais complexos, como múltiplos bancos de dados.
  datasources: {
    db: {
      url: process.env.NEON_DB_URL // Garante que a URL do banco de dados seja lida da variável de ambiente.
    }
  }
});

/**
 * Testa a conexão com o banco de dados.
 * É uma função de inicialização importante para garantir que a API não inicie se não conseguir se conectar ao banco.
 */
async function testConnection() {
  try {
    // O método `$connect()` estabelece a conexão com o banco de dados.
    await prisma.$connect();
    console.log('✅ Database connected successfully'); // Mensagem de sucesso.
  } catch (error) {
    // Se a conexão falhar, loga o erro e encerra o processo da aplicação.
    // Isso previne que a API rode em um estado inconsistente, sem acesso ao banco.
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// --- GRACEFUL SHUTDOWN ---
// Garante que a conexão com o banco de dados seja fechada de forma segura quando a aplicação for encerrada.
process.on('beforeExit', async () => {
  // O evento `beforeExit` é emitido quando o Node.js está prestes a sair.
  // Usamos isso para chamar o `$disconnect()` do Prisma, que fecha a conexão com o banco.
  await prisma.$disconnect();
});

// Exporta a instância do `prisma` e a função `testConnection` para serem usadas em outras partes da aplicação.
module.exports = { prisma, testConnection };