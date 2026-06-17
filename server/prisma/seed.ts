import { PrismaClient, CategoriaServico, PerfilUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const senhaHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@salaobarbearia.com' },
    update: {},
    create: {
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
      update: {},
      create: {
        id: 'prof-001',
        nome: 'Carla Silva',
        especialidades: ['Corte Feminino', 'Escova', 'Coloração', 'Progressiva'],
        diasTrabalho: [1, 2, 3, 4, 5, 6],
        horarioInicio: '08:00',
        horarioFim: '18:00',
      },
    }),
    prisma.profissional.upsert({
      where: { id: 'prof-002' },
      update: {},
      create: {
        id: 'prof-002',
        nome: 'Rafael Oliveira',
        especialidades: ['Corte Masculino', 'Barba', 'Corte + Barba', 'Hidratação Capilar'],
        diasTrabalho: [1, 2, 3, 4, 5, 6],
        horarioInicio: '09:00',
        horarioFim: '19:00',
      },
    }),
    prisma.profissional.upsert({
      where: { id: 'prof-003' },
      update: {},
      create: {
        id: 'prof-003',
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
      update: {},
      create: {
        id: 1,
        nome: 'Corte Feminino',
        categoria: CategoriaServico.SALAO,
        valor: 65.00,
        duracaoMinutos: 45,
      },
    }),
    prisma.servico.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        nome: 'Escova',
        categoria: CategoriaServico.SALAO,
        valor: 50.00,
        duracaoMinutos: 40,
      },
    }),
    prisma.servico.upsert({
      where: { id: 3 },
      update: {},
      create: {
        id: 3,
        nome: 'Coloração',
        categoria: CategoriaServico.SALAO,
        valor: 120.00,
        duracaoMinutos: 90,
      },
    }),
    prisma.servico.upsert({
      where: { id: 4 },
      update: {},
      create: {
        id: 4,
        nome: 'Progressiva',
        categoria: CategoriaServico.SALAO,
        valor: 180.00,
        duracaoMinutos: 120,
      },
    }),
    prisma.servico.upsert({
      where: { id: 5 },
      update: {},
      create: {
        id: 5,
        nome: 'Manicure',
        categoria: CategoriaServico.SALAO,
        valor: 35.00,
        duracaoMinutos: 30,
      },
    }),
    prisma.servico.upsert({
      where: { id: 6 },
      update: {},
      create: {
        id: 6,
        nome: 'Pedicure',
        categoria: CategoriaServico.SALAO,
        valor: 35.00,
        duracaoMinutos: 30,
      },
    }),
    prisma.servico.upsert({
      where: { id: 7 },
      update: {},
      create: {
        id: 7,
        nome: 'Corte Masculino',
        categoria: CategoriaServico.BARBEARIA,
        valor: 45.00,
        duracaoMinutos: 30,
      },
    }),
    prisma.servico.upsert({
      where: { id: 8 },
      update: {},
      create: {
        id: 8,
        nome: 'Barba',
        categoria: CategoriaServico.BARBEARIA,
        valor: 30.00,
        duracaoMinutos: 20,
      },
    }),
    prisma.servico.upsert({
      where: { id: 9 },
      update: {},
      create: {
        id: 9,
        nome: 'Corte + Barba',
        categoria: CategoriaServico.BARBEARIA,
        valor: 65.00,
        duracaoMinutos: 45,
      },
    }),
    prisma.servico.upsert({
      where: { id: 10 },
      update: {},
      create: {
        id: 10,
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
      where: { chave: 'horario_funcionamento_inicio' },
      update: {},
      create: { chave: 'horario_funcionamento_inicio', valor: '08:00' },
    }),
    prisma.configuracao.upsert({
      where: { chave: 'horario_funcionamento_fim' },
      update: {},
      create: { chave: 'horario_funcionamento_fim', valor: '19:00' },
    }),
    prisma.configuracao.upsert({
      where: { chave: 'tempo_bloqueio_provisorio' },
      update: {},
      create: { chave: 'tempo_bloqueio_provisorio', valor: '15' },
    }),
    prisma.configuracao.upsert({
      where: { chave: 'horas_antecedencia_cancelamento' },
      update: {},
      create: { chave: 'horas_antecedencia_cancelamento', valor: '2' },
    }),
    prisma.configuracao.upsert({
      where: { chave: 'prazo_expiracao_credito_dias' },
      update: {},
      create: { chave: 'prazo_expiracao_credito_dias', valor: '365' },
    }),
    prisma.configuracao.upsert({
      where: { chave: 'mensagem_boas_vindas' },
      update: {},
      create: {
        chave: 'mensagem_boas_vindas',
        valor: 'Olá! Seja bem-vindo(a) ao Salão & Barbearia! 🎉 Vou te ajudar a agendar seu horário. Primeiro, me diga seu nome:',
      },
    }),
    prisma.configuracao.upsert({
      where: { chave: 'endereco_estabelecimento' },
      update: {},
      create: {
        chave: 'endereco_estabelecimento',
        valor: 'Rua Exemplo, 123 - Centro',
      },
    }),
  ]);
  console.log(`✅ ${configuracoes.length} configurações criadas`);

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
