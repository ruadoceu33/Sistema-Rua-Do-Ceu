const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envia email de recuperação de senha
 * @param {string} nome - Nome do usuário
 * @param {string} email - Email do destinatário
 * @param {string} token - Token único de recuperação
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
async function enviarEmailRecuperacaoSenha(nome, email, token) {
  const linkReset = `${process.env.FRONTEND_URL}/resetar-senha?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [email],
      subject: '🔐 Recuperação de Senha - Projeto Rua do Céu',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              background: white;
              padding: 40px 30px;
            }
            .content p {
              margin: 0 0 16px 0;
              font-size: 16px;
            }
            .button {
              display: inline-block;
              padding: 16px 40px;
              background: #f5576c;
              color: white !important;
              text-decoration: none;
              border-radius: 8px;
              margin: 24px 0;
              font-weight: 600;
              font-size: 16px;
              transition: background 0.3s;
            }
            .button:hover {
              background: #e04455;
            }
            .alert {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 16px;
              margin: 24px 0;
              border-radius: 6px;
            }
            .alert strong {
              display: block;
              margin-bottom: 8px;
              color: #856404;
            }
            .alert ul {
              margin: 8px 0;
              padding-left: 24px;
              color: #856404;
            }
            .alert li {
              margin: 4px 0;
            }
            .link-box {
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 6px;
              padding: 16px;
              margin: 20px 0;
              word-break: break-all;
            }
            .link-box code {
              font-size: 13px;
              color: #495057;
            }
            .footer {
              text-align: center;
              padding: 20px 30px;
              background: #f8f9fa;
              font-size: 13px;
              color: #6c757d;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              background: #dc3545;
              color: #fff;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Recuperação de Senha</h1>
              <div class="badge">AÇÃO NECESSÁRIA</div>
            </div>
            <div class="content">
              <p>Olá, <strong>${nome}</strong>!</p>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta no Projeto Rua do Céu.</p>

              <center>
                <a href="${linkReset}" class="button">Redefinir Minha Senha</a>
              </center>

              <p style="margin-top: 24px; font-size: 14px; color: #6c757d;">
                Ou copie e cole este link no seu navegador:
              </p>
              <div class="link-box">
                <code>${linkReset}</code>
              </div>

              <div class="alert">
                <strong>⚠️ Informações Importantes:</strong>
                <ul>
                  <li>Este link <strong>expira em 1 hora</strong></li>
                  <li>Após redefinir a senha, você será desconectado de todos os dispositivos</li>
                  <li>O link só pode ser usado <strong>uma única vez</strong></li>
                  <li>Se você não solicitou esta alteração, ignore este email e sua senha permanecerá a mesma</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p style="margin: 0; font-weight: 600; color: #dc3545;">🔒 Se você não solicitou a recuperação de senha, recomendamos alterar sua senha imediatamente por segurança.</p>
              <p style="margin: 8px 0 0 0; color: #adb5bd;">© ${new Date().getFullYear()} Projeto Rua do Céu - Todos os direitos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Erro ao enviar email de recuperação:', error);
      return { success: false, error };
    }

    console.log('✅ Email de recuperação enviado com sucesso:', { email, id: data.id });
    return { success: true, data };
  } catch (error) {
    console.error('❌ Exceção ao enviar email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  enviarEmailRecuperacaoSenha,
};
