import { PrismaClient, Plan, SubscriptionStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de CobraIA...');

  // ─── PLANTILLAS DEL SISTEMA ───────────────────────────
  // 5 plantillas de factura + 5 de estado de cuenta (pareadas)
  const templates = [
    { id: 1, name: 'Moderna',      type: 'invoice',   pairedWith: 6,  sortOrder: 1 },
    { id: 2, name: 'Clásica',      type: 'invoice',   pairedWith: 7,  sortOrder: 2 },
    { id: 3, name: 'Minimalista',  type: 'invoice',   pairedWith: 8,  sortOrder: 3 },
    { id: 4, name: 'Ejecutiva',    type: 'invoice',   pairedWith: 9,  sortOrder: 4 },
    { id: 5, name: 'Creativa',     type: 'invoice',   pairedWith: 10, sortOrder: 5 },
    { id: 6,  name: 'Moderna',     type: 'statement', pairedWith: 1,  sortOrder: 1 },
    { id: 7,  name: 'Clásica',     type: 'statement', pairedWith: 2,  sortOrder: 2 },
    { id: 8,  name: 'Minimalista', type: 'statement', pairedWith: 3,  sortOrder: 3 },
    { id: 9,  name: 'Ejecutiva',   type: 'statement', pairedWith: 4,  sortOrder: 4 },
    { id: 10, name: 'Creativa',    type: 'statement', pairedWith: 5,  sortOrder: 5 },
  ];

  for (const template of templates) {
    await prisma.systemTemplate.upsert({
      where: { id: template.id },
      update: {},
      create: {
        id:          template.id,
        name:        template.name,
        type:        template.type,
        pairedWith:  template.pairedWith,
        sortOrder:   template.sortOrder,
        isActive:    true,
      },
    });
  }
  console.log('✅ Plantillas creadas (5 factura + 5 estado de cuenta)');

  // ─── TENANT DEMO ──────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name:               'Demo CobraIA',
      slug:               'demo',
      email:              'demo@cobraia.co',
      companyName:        'Empresa Demo S.A.S',
      companySlogan:      'Facturando con inteligencia',
      brandColor:         '#1E40AF',
      templateId:         1,
      plan:               Plan.PRO,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      invoiceCurrency:    'COP',
      invoicePaymentDays: 30,
      settings:           {},
    },
  });
  console.log(`✅ Tenant demo creado: ${tenant.slug}`);

  // ─── USUARIO ADMIN ────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin1234!', 12);

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: {
      tenantId:     tenant.id,
      email:        'admin@demo.com',
      passwordHash,
      name:         'Administrador Demo',
      role:         UserRole.OWNER,
      isActive:     true,
    },
  });
  console.log(`✅ Usuario admin creado: ${user.email}`);

  // ─── SECUENCIA DE FACTURAS ────────────────────────────
  await prisma.tenantSequence.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId:   tenant.id,
      lastNumber: 0,
      prefix:     '',
      padding:    6,
    },
  });
  console.log('✅ Secuencia de facturas inicializada');

  // ─── CLIENTE DE PRUEBA ────────────────────────────────
  await prisma.client.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
    id:       '00000000-0000-0000-0000-000000000001',
    tenantId: tenant.id,
    name:     'Cliente de Prueba S.A.S',
    email:    'cliente@prueba.com',
    phone:    '3001234567',
    taxId:    '900123456-1',
    address:  'Calle 100 # 15-20',
    city:     'Bogotá',
    isActive: true,
    },
  });
  console.log('✅ Cliente de prueba creado');

  console.log('\n🚀 Seed completado exitosamente');
  console.log('─────────────────────────────────');
  console.log('Email:    admin@demo.com');
  console.log('Password: Admin1234!');
  console.log('Tenant:   demo');
  console.log('─────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });