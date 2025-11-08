// Importação de módulos essenciais para o funcionamento do servidor.
// Cada módulo tem uma responsabilidade específica, desde a criação do servidor até a segurança.
const express = require('express'); // Framework principal para criar o servidor e gerenciar rotas.
const cors = require('cors'); // Habilita o Cross-Origin Resource Sharing, permitindo que o frontend acesse a API.
const helmet = require('helmet'); // Adiciona uma camada de segurança, configurando cabeçalhos HTTP para proteger contra vulnerabilidades conhecidas.
const compression = require('compression'); // Comprime as respostas HTTP para melhorar a performance, economizando banda.
const morgan = require('morgan'); // Gera logs de todas as requisições HTTP, útil para debugar e monitorar.
const rateLimit = require('express-rate-limit'); // Limita a quantidade de requisições de um mesmo IP para prevenir ataques de força bruta.
const swaggerJsdoc = require('swagger-jsdoc'); // Gera a documentação da API a partir de comentários no código.
const swaggerUi = require('swagger-ui-express'); // Exibe a documentação da API em uma interface web interativa.
const cookieParser = require('cookie-parser'); // Analisa cookies anexados às requisições, necessário para o fluxo de autenticação OAuth.
const sessionMiddleware = require('./middleware/session'); // Gerencia sessões de usuário, crucial para o login com Google.
require('dotenv').config(); // Carrega variáveis de ambiente de um arquivo .env para o `process.env`.

// Importação dos arquivos de rotas. Cada arquivo agrupa os endpoints de um recurso específico (ex: crianças, doações).
const authRoutes = require('./routes/auth');
const colaboradoresRoutes = require('./routes/colaboradores');
const criancasRoutes = require('./routes/criancas');
const locaisRoutes = require('./routes/locais');
const doacoesRoutes = require('./routes/doacoes');
const checkinsRoutes = require('./routes/checkins');
const relatoriosRoutes = require('./routes/relatorios');
const tagsSaudeRoutes = require('./routes/tagsSaude');

// Cria uma instância do Express, que será o nosso servidor.
const app = express();

// --- CONFIGURAÇÃO DE MIDDLEWARES ---
// Middlewares são funções que executam em sequência para cada requisição que chega ao servidor.
// A ordem em que são declarados é muito importante.

// Middlewares de Segurança Essenciais
app.use(helmet()); // Protege contra vulnerabilidades web conhecidas (ex: XSS, clickjacking).
app.use(compression()); // Comprime o corpo das respostas para uma entrega mais rápida ao cliente.

// Configuração do CORS (Cross-Origin Resource Sharing)
// Define quais origens (domínios) podem fazer requisições para esta API.
const corsOptions = {
  // Lê as origens permitidas do .env ou usa um valor padrão para desenvolvimento.
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  // Permite que o navegador envie cookies e cabeçalhos de autorização.
  credentials: true
};
app.use(cors(corsOptions));

// Middlewares para análise do corpo da requisição (Body Parsing)
// Permitem que o Express entenda os dados enviados no corpo de requisições POST/PUT.
app.use(express.json({ limit: '10mb' })); // Para corpos de requisição em formato JSON. O limite é aumentado para permitir o envio de imagens em base64.
app.use(express.urlencoded({ extended: true })); // Para corpos de requisição em formato URL-encoded.

// Middlewares para Cookies e Sessão (essencial para o fluxo de OAuth 2.0 com Google)
app.use(cookieParser()); // Habilita a leitura e escrita de cookies.
app.use(sessionMiddleware); // Gerencia sessões, armazenando dados temporários no servidor durante o processo de login.

// Middleware de Logging
// Registra detalhes de cada requisição no console (método, URL, status, tempo de resposta).
app.use(morgan('combined'));

// Middleware de Limitação de Requisições (Rate Limiting)
// Protege a API contra um número excessivo de requisições, prevenindo ataques de negação de serviço (DoS) e força bruta.
// Ativado apenas em ambiente de produção para não atrapalhar o desenvolvimento.
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // Janela de tempo: 15 minutos.
    max: parseInt(process.env.RATE_LIMIT_REQUESTS) || 300, // Limite de 300 requisições por IP nesta janela.
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Envia cabeçalhos padronizados `RateLimit-*`.
    legacyHeaders: false, // Desabilita cabeçalhos antigos `X-RateLimit-*`.
  });
  app.use(limiter);
  console.log('🛡️  Rate limiting enabled (production mode)');
} else {
  console.log('⚠️  Rate limiting disabled (development mode)');
}

// Configuração do Swagger para Documentação da API
// O Swagger gera uma página web que descreve todos os endpoints da API, seus parâmetros e respostas.
const swaggerOptions = {
  definition: {
    openapi: '3.0.0', // Versão da especificação OpenAPI.
    info: {
      title: 'Projeto Rua do Céu API',
      version: '1.0.1',
      description: 'API para gerenciamento completo das operações do Projeto Rua do Céu.',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
        description: 'Servidor de Desenvolvimento',
      },
    ],
    // Define o esquema de segurança (autenticação JWT) para ser usado na documentação.
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Aponta para os arquivos que contêm as anotações do Swagger (nossas rotas).
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(swaggerOptions);

// --- ROTAS ESPECIAIS ---

// Rota de Health Check
// Um endpoint simples para verificar se a API está online e respondendo.
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rota para a Documentação da API (Swagger)
// Disponibiliza a interface do Swagger UI no endpoint /api-docs.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// --- ROTAS PRINCIPAIS DA API ---
// Associa cada conjunto de rotas a um prefixo. Ex: todas as rotas de autenticação começarão com /api/auth.
app.use('/api/auth', authRoutes);
app.use('/api/colaboradores', colaboradoresRoutes);
app.use('/api/criancas', criancasRoutes);
app.use('/api/locais', locaisRoutes);
app.use('/api/doacoes', doacoesRoutes);
app.use('/api/checkins', checkinsRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/tags-saude', tagsSaudeRoutes);

// --- TRATAMENTO DE ERROS E ROTAS NÃO ENCONTRADAS ---

// Middleware de Tratamento de Erros (Error Handling)
// Captura qualquer erro que ocorra nas rotas e envia uma resposta padronizada.
// Deve ser o último `app.use` com 4 argumentos.
app.use((err, req, res, next) => {
  console.error(err.stack); // Loga o erro completo no console para depuração.
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      // Em desenvolvimento, inclui o stack trace do erro na resposta para facilitar o debug.
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Handler para Rotas Não Encontradas (404)
// Se nenhuma rota correspondeu à requisição, este middleware é acionado.
app.use('*', (req, res) => {
  // Se a URL começar com /api-docs, redireciona para a página principal da documentação.
  if (req.originalUrl.startsWith('/api-docs')) {
    res.redirect('/api-docs');
  } else {
    // Para qualquer outra rota não encontrada, retorna um erro 404.
    res.status(404).json({
      error: {
        message: 'Route not found'
      }
    });
  }
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 5000; // Usa a porta definida no .env ou a porta 5000 como padrão.
const HOST = process.env.HOST || '0.0.0.0'; // Ouve em todos os endereços de IP disponíveis.

// Inicia o servidor para ouvir requisições na porta e host definidos.
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📚 Swagger docs available at http://${HOST}:${PORT}/api-docs`);
  console.log(`🏥 Health check at http://${HOST}:${PORT}/health`);
});

// Exporta a instância do app, útil para testes automatizados.
module.exports = app;