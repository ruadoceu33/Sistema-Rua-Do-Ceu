const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  try {
    // 1. Criar usuários admin e colaboradores
    console.log('📝 Criando usuários...');

    const adminPassword = await bcrypt.hash('admin123', 12);
    const userPassword = await bcrypt.hash('user123', 12);

    const adminUser = await prisma.profile.upsert({
      where: { email: 'admin@ruadoceu.org' },
      update: {},
      create: {
        nome: 'Administrador Sistema',
        email: 'admin@ruadoceu.org',
        password: adminPassword,
        telefone: '11999999999',
        role: 'admin',
        ativo: true,
      },
    });

    const colabUser = await prisma.profile.upsert({
      where: { email: 'colaborador@ruadoceu.org' },
      update: {},
      create: {
        nome: 'João Colaborador',
        email: 'colaborador@ruadoceu.org',
        password: userPassword,
        telefone: '11888888888',
        role: 'user',
        ativo: true,
      },
    });

    console.log('✅ Usuários criados:', { admin: adminUser.email, colaborador: colabUser.email });

    // 2. Criar locais
    console.log('📍 Criando locais...');

    const local1 = await prisma.local.create({
      data: {
        nome: 'Centro Comunitário Rua do Céu',
        endereco: 'Rua das Estrelas, 123 - São Paulo/SP',
        capacidade: 50,
        responsavel: 'Maria Silva',
        telefone: '11777777777',
        ativo: true,
      },
    });

    const local2 = await prisma.local.create({
      data: {
        nome: 'Espaço Esperança',
        endereco: 'Avenida da Esperança, 456 - São Paulo/SP',
        capacidade: 30,
        responsavel: 'José Santos',
        telefone: '11666666666',
        ativo: true,
      },
    });

    console.log('✅ Locais criados:', [local1.nome, local2.nome]);

    // 3. Criar crianças
    console.log('👶 Criando crianças...');

    const criancas = await Promise.all([
      prisma.crianca.create({
        data: {
          nome: 'Ana Clara',
          data_nascimento: new Date('2015-03-15'),
          idade: 8,
          responsavel: 'Maria Oliveira',
          telefone_responsavel: '11955555555',
          endereco: 'Rua das Flores, 100',
          escola: 'Escola Municipal Primavera',
          numero_escola: '12345',
          observacoes: 'Alergia a amendoim',
          ativo: true,
          local_id: local1.id,
        },
      }),
      prisma.crianca.create({
        data: {
          nome: 'Pedro Henrique',
          data_nascimento: new Date('2016-07-22'),
          idade: 7,
          responsavel: 'Carlos Santos',
          telefone_responsavel: '11944444444',
          endereco: 'Rua das Árvores, 200',
          escola: 'Escola Municipal Futuro',
          numero_escola: '54321',
          observacoes: 'Gosta de desenhar',
          ativo: true,
          local_id: local1.id,
        },
      }),
      prisma.crianca.create({
        data: {
          nome: 'Maria Eduarda',
          data_nascimento: new Date('2014-11-08'),
          idade: 9,
          responsavel: 'Fernanda Lima',
          telefone_responsavel: '11933333333',
          endereco: 'Rua das Crianças, 300',
          escola: 'Escola Municipal Alegria',
          numero_escola: '98765',
          observacoes: 'Excelente aluna',
          ativo: true,
          local_id: local2.id,
        },
      }),
    ]);

    console.log(`✅ ${criancas.length} crianças criadas`);

    // 4. Criar doações
    console.log('🎁 Criando doações...');

    const doacoes = await Promise.all([
      prisma.doacao.create({
        data: {
          doador: 'Empresa ABC Ltda',
          tipo_doacao: 'Alimentos',
          descricao: 'Cestas básicas',
          quantidade: 10,
          unidade: 'unidades',
          local_id: local1.id,
        },
      }),
      prisma.doacao.create({
        data: {
          doador: 'Doador Anônimo',
          tipo_doacao: 'Roupas',
          descricao: 'Roupas de inverno',
          quantidade: 20,
          unidade: 'peças',
          local_id: local1.id,
        },
      }),
      prisma.doacao.create({
        data: {
          doador: 'Farmácia Saúde',
          tipo_doacao: 'Medicamentos',
          descricao: 'Kit primeiros socorros',
          quantidade: 5,
          unidade: 'kits',
          local_id: local2.id,
        },
      }),
    ]);

    console.log(`✅ ${doacoes.length} doações criadas`);

    // 5. Criar check-ins
    console.log('✅ Criando check-ins...');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const checkins = await Promise.all([
      prisma.checkin.create({
        data: {
          crianca_id: criancas[0].id,
          local_id: local1.id,
          data_checkin: today,
          observacoes: 'Chegou bem e animada',
          doacao_id: doacoes[0].id,
        },
      }),
      prisma.checkin.create({
        data: {
          crianca_id: criancas[1].id,
          local_id: local1.id,
          data_checkin: today,
          observacoes: 'Participou das atividades',
        },
      }),
      prisma.checkin.create({
        data: {
          crianca_id: criancas[2].id,
          local_id: local2.id,
          data_checkin: yesterday,
          observacoes: 'Fez amizades novas',
        },
      }),
    ]);

    console.log(`✅ ${checkins.length} check-ins criados`);

    // 6. Associar colaboradores aos locais
    console.log('🤝 Associando colaboradores aos locais...');

    await Promise.all([
      prisma.colaboradorLocal.create({
        data: {
          colaborador_id: colabUser.id,
          local_id: local1.id,
        },
      }),
      prisma.colaboradorLocal.create({
        data: {
          colaborador_id: colabUser.id,
          local_id: local2.id,
        },
      }),
    ]);

    console.log('✅ Colaboradores associados aos locais');

    // 7. Relatório final
    console.log('\n📊 Resumo da seed:');
    console.log(`👤 Usuários: 2 (1 admin, 1 colaborador)`);
    console.log(`📍 Locais: 2`);
    console.log(`👶 Crianças: 3`);
    console.log(`🎁 Doações: 3`);
    console.log(`✅ Check-ins: 3`);
    console.log(`🤝 Associações colaborador-local: 2`);

    console.log('\n🎉 Seed concluída com sucesso!');
    console.log('\n🔐 Credenciais de acesso:');
    console.log('Admin: admin@ruadoceu.org / admin123');
    console.log('Colaborador: colaborador@ruadoceu.org / user123');

  } catch (error) {
    console.error('❌ Erro durante a seed:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });