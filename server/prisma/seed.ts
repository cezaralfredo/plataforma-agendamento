import { PrismaClient, CategoriaServico, PerfilUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const senhaHash = await bcrypt.hash('admin123', 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {
      nome: 'Salão & Barbearia Demo',
      ativo: true,
    },
    create: {
      id: 'default',
      nome: 'Salão & Barbearia Demo',
      slug: 'demo',
      plano: 'BASIC',
      asaasSandbox: true,
      evolutionInstanceName: 'agendamento-demo',
      whatsappAdminNumber: process.env.WHATSAPP_ADMIN_NUMBER || '',
    },
  });
  console.log(`Tenant criado: ${tenant.slug} (${tenant.id})`);

  const admin = await prisma.usuario.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@salaobarbearia.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      nome: 'Administrador',
      email: 'admin@salaobarbearia.com',
      senha: senhaHash,
      perfil: PerfilUsuario.SUPER_ADMIN,
    },
  });
  console.log(`✅ Admin criado: ${admin.email}`);

  const profissionais = await Promise.all([
    prisma.profissional.upsert({
      where: { id: 'prof-001' },
      update: { tenantId: tenant.id },
      create: {
        id: 'prof-001',
        tenantId: tenant.id,
        nome: 'Carla Silva',
        especialidades: ['Corte Feminino', 'Escova', 'Coloração', 'Progressiva'],
        diasTrabalho: [1, 2, 3, 4, 5, 6],
        horarioInicio: '08:00',
        horarioFim: '18:00',
      },
    }),
    prisma.profissional.upsert({
      where: { id: 'prof-002' },
      update: { tenantId: tenant.id },
      create: {
        id: 'prof-002',
        tenantId: tenant.id,
        nome: 'Rafael Oliveira',
        especialidades: ['Corte Masculino', 'Barba', 'Corte + Barba', 'Hidratação Capilar'],
        diasTrabalho: [1, 2, 3, 4, 5, 6],
        horarioInicio: '09:00',
        horarioFim: '19:00',
      },
    }),
    prisma.profissional.upsert({
      where: { id: 'prof-003' },
      update: { tenantId: tenant.id },
      create: {
        id: 'prof-003',
        tenantId: tenant.id,
        nome: 'Juliana Costa',
        especialidades: ['Manicure', 'Pedicure', 'Escova', 'Corte Feminino'],
        diasTrabalho: [1, 2, 3, 4, 5],
        horarioInicio: '08:00',
        horarioFim: '17:00',
      },
    }),
  ]);
  console.log(`✅ ${profissionais.length} profissionais criados`);

  const servicos = await Promise.all([
    prisma.servico.upsert({
      where: { id: 1 },
      update: { tenantId: tenant.id },
      create: {
        id: 1,
        tenantId: tenant.id,
        nome: 'Corte Feminino',
        categoria: CategoriaServico.SALAO,
        valor: 65.00,
        duracaoMinutos: 45,
      },
    }),
    prisma.servico.upsert({
      where: { id: 2 },
      update: { tenantId: tenant.id },
      create: {
        id: 2,
        tenantId: tenant.id,
        nome: 'Escova',
        categoria: CategoriaServico.SALAO,
        valor: 50.00,
        duracaoMinutos: 40,
      },
    }),
    prisma.servico.upsert({
      where: { id: 3 },
      update: { tenantId: tenant.id },
      create: {
        id: 3,
        tenantId: tenant.id,
        nome: 'Coloração',
        categoria: CategoriaServico.SALAO,
        valor: 120.00,
        duracaoMinutos: 90,
      },
    }),
    prisma.servico.upsert({
      where: { id: 4 },
      update: { tenantId: tenant.id },
      create: {
        id: 4,
        tenantId: tenant.id,
        nome: 'Progressiva',
        categoria: CategoriaServico.SALAO,
        valor: 180.00,
        duracaoMinutos: 120,
      },
    }),
    prisma.servico.upsert({
      where: { id: 5 },
      update: { tenantId: tenant.id },
      create: {
        id: 5,
        tenantId: tenant.id,
        nome: 'Manicure',
        categoria: CategoriaServico.SALAO,
        valor: 35.00,
        duracaoMinutos: 30,
      },
    }),
    prisma.servico.upsert({
      where: { id: 6 },
      update: { tenantId: tenant.id },
      create: {
        id: 6,
        tenantId: tenant.id,
        nome: 'Pedicure',
        categoria: CategoriaServico.SALAO,
        valor: 35.00,
        duracaoMinutos: 30,
      },
    }),
    prisma.servico.upsert({
      where: { id: 7 },
      update: { tenantId: tenant.id },
      create: {
        id: 7,
        tenantId: tenant.id,
        nome: 'Corte Masculino',
        categoria: CategoriaServico.BARBEARIA,
        valor: 45.00,
        duracaoMinutos: 30,
      },
    }),
    prisma.servico.upsert({
      where: { id: 8 },
      update: { tenantId: tenant.id },
      create: {
        id: 8,
        tenantId: tenant.id,
        nome: 'Barba',
        categoria: CategoriaServico.BARBEARIA,
        valor: 30.00,
        duracaoMinutos: 20,
      },
    }),
    prisma.servico.upsert({
      where: { id: 9 },
      update: { tenantId: tenant.id },
      create: {
        id: 9,
        tenantId: tenant.id,
        nome: 'Corte + Barba',
        categoria: CategoriaServico.BARBEARIA,
        valor: 65.00,
        duracaoMinutos: 45,
      },
    }),
    prisma.servico.upsert({
      where: { id: 10 },
      update: { tenantId: tenant.id },
      create: {
        id: 10,
        tenantId: tenant.id,
        nome: 'Hidratação Capilar',
        categoria: CategoriaServico.BARBEARIA,
        valor: 55.00,
        duracaoMinutos: 40,
      },
    }),
  ]);
  console.log(`✅ ${servicos.length} serviços criados`);

  const configuracoes = await Promise.all([
    prisma.configuracao.upsert({
      where: { tenantId_chave: { tenantId: tenant.id, chave: 'horario_funcionamento_inicio' } },
      update: {},
      create: { tenantId: tenant.id, chave: 'horario_funcionamento_inicio', valor: '08:00' },
    }),
    prisma.configuracao.upsert({
      where: { tenantId_chave: { tenantId: tenant.id, chave: 'horario_funcionamento_fim' } },
      update: {},
      create: { tenantId: tenant.id, chave: 'horario_funcionamento_fim', valor: '19:00' },
    }),
    prisma.configuracao.upsert({
      where: { tenantId_chave: { tenantId: tenant.id, chave: 'tempo_bloqueio_provisorio' } },
      update: {},
      create: { tenantId: tenant.id, chave: 'tempo_bloqueio_provisorio', valor: '15' },
    }),
    prisma.configuracao.upsert({
      where: { tenantId_chave: { tenantId: tenant.id, chave: 'horas_antecedencia_cancelamento' } },
      update: {},
      create: { tenantId: tenant.id, chave: 'horas_antecedencia_cancelamento', valor: '2' },
    }),
    prisma.configuracao.upsert({
      where: { tenantId_chave: { tenantId: tenant.id, chave: 'prazo_expiracao_credito_dias' } },
      update: {},
      create: { tenantId: tenant.id, chave: 'prazo_expiracao_credito_dias', valor: '365' },
    }),
    prisma.configuracao.upsert({
      where: { tenantId_chave: { tenantId: tenant.id, chave: 'mensagem_boas_vindas' } },
      update: {},
      create: {
        tenantId: tenant.id,
        chave: 'mensagem_boas_vindas',
        valor: 'Olá! Seja bem-vindo(a) ao Salão & Barbearia! 🎉 Vou te ajudar a agendar seu horário. Primeiro, me diga seu nome:',
      },
    }),
    prisma.configuracao.upsert({
      where: { tenantId_chave: { tenantId: tenant.id, chave: 'endereco_estabelecimento' } },
      update: {},
      create: {
        tenantId: tenant.id,
        chave: 'endereco_estabelecimento',
        valor: 'Rua Exemplo, 123 - Centro',
      },
    }),
  ]);
  console.log(`✅ ${configuracoes.length} configurações criadas`);

  console.log('🎉 Seed concluído com sucesso!');
  console.log('');
  console.log('📋 Credenciais do admin:');
  console.log('   Email: admin@salaobarbearia.com');
  console.log('   Senha: admin123');
  console.log(`   Slug do tenant: ${tenant.slug}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
