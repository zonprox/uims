import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@2026', 10);

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Super Administrator with full access',
    },
  });

  await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Administrator' },
  });

  await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: { name: 'Manager', description: 'Manager' },
  });

  await prisma.role.upsert({
    where: { name: 'Technician' },
    update: {},
    create: { name: 'Technician', description: 'Technician' },
  });

  await prisma.role.upsert({
    where: { name: 'Viewer' },
    update: {},
    create: { name: 'Viewer', description: 'Read-only access' },
  });

  await prisma.user.upsert({
    where: { email: 'admin@uims.local' },
    update: {},
    create: {
      email: 'admin@uims.local',
      firstName: 'System',
      lastName: 'Admin',
      passwordHash,
      roleId: superAdminRole.id,
      status: 'ACTIVE',
    },
  });

  await prisma.setting.upsert({
    where: { key: 'site_name' },
    update: {},
    create: {
      key: 'site_name',
      value: JSON.stringify('Unified IT Management System'),
      group: 'general',
      description: 'Name of the site',
    },
  });

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
