// backend/src/middleware/session.js
const session = require('express-session');

/**
 * Middleware de sessão para gerenciar state tokens OAuth
 * Usado para armazenar state CSRF entre /login e /callback
 */
module.exports = session({
  secret: process.env.SESSION_SECRET || 'chave-secreta-temporaria-dev-mudar-em-producao',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS apenas em produção
    httpOnly: true,
    maxAge: 10 * 60 * 1000, // 10 minutos (tempo entre /login e /callback)
    sameSite: 'lax', // Permite cookies em redirects same-site
  },
});
