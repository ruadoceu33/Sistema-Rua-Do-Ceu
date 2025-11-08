/**
 * Script para criar usuário administrador inicial no banco de dados
 *
 * Este script cria um admin com email confirmado e status aprovado,
 * pronto para fazer login no sistema.
 *
 * Uso: npm run db:seed
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Credenciais do admin inicial (NUNCA commitar em produção!)
const ADMIN_CREDENTIALS = {
  nome: 'Sayo',
  email: 'ruadoceu33@gmail.com',
  password: 'qweasd123432',
  telefone: '(00) 00000-0000',
  role: 'admin',
};

async function main() {
  console.log('🌱 Iniciando seed do administrador...\n');

  try {
    // Verificar se o email já existe
    const usuarioExistente = await prisma.profile.findUnique({
      where: { email: ADMIN_CREDENTIALS.email },
    });

    if (usuarioExistente) {
      console.log(`⚠️  Usuário com email ${ADMIN_CREDENTIALS.email} já existe no banco de dados.`);
      console.log(`📧 Email: ${usuarioExistente.email}`);
      console.log(`👤 Nome: ${usuarioExistente.nome}`);
      console.log(`🔑 Role: ${usuarioExistente.role}`);
      console.log(`✅ Status: ${usuarioExistente.status_aprovacao}\n`);

      console.log('💡 Se deseja recriar o admin, delete-o manualmente e execute este script novamente.');
      return;
    }

    // Hash da senha
    console.log('🔐 Gerando hash da senha...');
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, saltRounds);

    // Criar admin no banco
    console.log('👤 Criando administrador no banco de dados...');
    const admin = await prisma.profile.create({
      data: {
        nome: ADMIN_CREDENTIALS.nome,
        email: ADMIN_CREDENTIALS.email,
        password: hashedPassword,
        telefone: ADMIN_CREDENTIALS.telefone,
        role: ADMIN_CREDENTIALS.role,
        ativo: true,                          // Admin já ativo
        status_aprovacao: 'aprovado',         // Admin pré-aprovado
        password_version: 1,
      },
    });

    console.log('\n✅ Administrador criado com sucesso!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 CREDENCIAIS DO ADMINISTRADOR');
    console.log('═══════════════════════════════════════════════════');
    console.log(`👤 Nome:     ${admin.nome}`);
    console.log(`📧 Email:    ${admin.email}`);
    console.log(`🔑 Senha:    ${ADMIN_CREDENTIALS.password}`);
    console.log(`🎭 Role:     ${admin.role}`);
    console.log(`✅ Status:   ${admin.status_aprovacao}`);
    console.log(`🔓 Ativo:    ${admin.ativo ? 'Sim' : 'Não'}`);
    console.log(`🆔 ID:       ${admin.id}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('\n🚀 O administrador já pode fazer login no sistema!\n');

    // Verificação de segurança
    console.log('⚠️  ATENÇÃO DE SEGURANÇA:');
    console.log('   - Nunca compartilhe estas credenciais');
    console.log('   - Altere a senha após o primeiro login');
    console.log('   - Em produção, use variáveis de ambiente para credenciais');
    console.log('   - Este script não deve ser executado em produção com credenciais hardcoded\n');

  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error);

    if (error.code === 'P2002') {
      console.error('\n💡 Este erro geralmente indica que já existe um usuário com este email.');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('✨ Seed finalizado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal durante o seed:', error);
    process.exit(1);
  });
