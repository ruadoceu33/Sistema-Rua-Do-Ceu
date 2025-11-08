// backend/src/utils/googleOAuth.js
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
);

module.exports = {
  /**
   * Gera URL de autorização do Google
   * @param {string} state - Token state para CSRF protection
   * @returns {string} URL de autorização
   */
  generateAuthUrl: (state) => {
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      state: state,
      prompt: 'select_account', // Força seleção de conta
    });
  },

  /**
   * Troca authorization code por tokens
   * @param {string} code - Authorization code do Google
   * @returns {Promise<Object>} Tokens (access_token, refresh_token, etc)
   */
  exchangeCodeForTokens: async (code) => {
    const { tokens } = await client.getToken(code);
    return tokens;
  },

  /**
   * Busca informações do usuário usando access token
   * @param {string} accessToken - Access token do Google
   * @returns {Promise<Object>} Dados do usuário (id, email, name, picture)
   */
  getTokenInfo: async (accessToken) => {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    return await response.json();
  },

  /**
   * Gera token state aleatório para CSRF protection
   * @returns {string} Token state hexadecimal
   */
  generateStateToken: () => crypto.randomBytes(32).toString('hex'),
};
