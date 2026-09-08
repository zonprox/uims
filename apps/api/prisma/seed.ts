import { Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { seedAssets } from './seeders/assets.seeder';
import { seedAudit } from './seeders/audit.seeder';
import { seedDirectory } from './seeders/directory.seeder';
import { seedInventory } from './seeders/inventory.seeder';
import { seedLicenses } from './seeders/licenses.seeder';
import { seedNetwork } from './seeders/network.seeder';
import { seedNotifications } from './seeders/notifications.seeder';
import { seedOrganizations } from './seeders/organization.seeder';
import { seedRolesAndUsers } from './seeders/roles-users.seeder';
import { seedSettingsAndReports } from './seeders/settings-reports.seeder';
import { seedTaxonomy } from './seeders/taxonomy.seeder';

const logger = new Logger('DatabaseSeeder');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for database seeding');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function clearDatabase(client: PrismaClient) {
  logger.log('🧹 Clearing legacy records for clean enterprise seeding...');
  await client.licenseAssignment.deleteMany();
  await client.assetHistory.deleteMany();
  await client.notification.deleteMany();
  await client.auditLog.deleteMany();
  await client.directoryMembership.deleteMany();
  await client.directoryGroup.deleteMany();
  await client.iPAddress.deleteMany();
  await client.subnet.deleteMany();
  await client.inventoryItem.deleteMany();
  await client.asset.deleteMany();
  await client.license.deleteMany();
  await client.rolePermission.deleteMany().catch(() => {});
  await client.permission.deleteMany().catch(() => {});
  await client.position.deleteMany();
  await client.department.deleteMany();
  await client.organization.deleteMany();
}

async function main() {
  const startTime = Date.now();
  logger.log('🚀 Starting Modular Enterprise Database Seed for UIMS...');

  // 1. Clear database
  await clearDatabase(prisma);

  // 2. Taxonomy (Locations and Asset Categories)
  logger.log('🏢 Seeding Locations and Asset Categories...');
  const taxonomyResult = await seedTaxonomy(prisma);

  // 3. Enterprise Organizations & Departments
  logger.log('🏛️ Seeding Organizations, Departments and Positions...');
  await seedOrganizations(prisma);

  // 4. Roles and Unified System/AD Users
  logger.log('👤 Seeding Roles and Unified Enterprise Users...');
  const usersResult = await seedRolesAndUsers(prisma);

  // 5. Hardware Assets
  logger.log('💻 Seeding Hardware Assets Fleet...');
  await seedAssets(prisma, taxonomyResult, usersResult);

  // 6. Software Licenses and Assignments
  logger.log('📄 Seeding Software Licenses and User Assignments...');
  await seedLicenses(prisma, usersResult);

  // 7. Inventory Items
  logger.log('📦 Seeding Hardware Stockroom Inventory...');
  await seedInventory(prisma);

  // 8. Directory Groups
  logger.log('👥 Seeding Domain Distribution & Security Groups...');
  await seedDirectory(prisma);

  // 9. Subnets and IP Allocations
  logger.log('🌐 Seeding Network Subnets & IPAM Allocations...');
  await seedNetwork(prisma);

  // 10. Audit Logs
  logger.log('🔒 Seeding Enterprise Governance & Audit Logs...');
  await seedAudit(prisma);

  // 11. System Notifications
  logger.log('🔔 Seeding System Notifications & Telemetry Alerts...');
  await seedNotifications(prisma, usersResult);

  // 12. Settings and Report Schedules
  logger.log('⚙️ Seeding System Preferences & Report Schedules...');
  await seedSettingsAndReports(prisma);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.log(
    `✅ Enterprise Seed completed successfully in ${duration}s (100% unified architecture).`,
  );
}

main()
  .catch((e) => {
    logger.error('❌ Seed Execution Error:', e instanceof Error ? e.stack : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
