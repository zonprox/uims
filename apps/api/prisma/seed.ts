import * as path from 'node:path';
import * as dotenv from 'dotenv';

// Automatically load root .env when executing directly via tsx
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

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
  await client.reportSchedule.deleteMany();
  await client.licenseAssignment.deleteMany();
  await client.assetHistory.deleteMany();
  await client.notification.deleteMany();
  await client.auditLog.deleteMany();
  await client.refreshToken.deleteMany();
  await client.directoryMembership.deleteMany();
  await client.directoryGroup.deleteMany();
  await client.iPAddress.deleteMany();
  await client.subnet.deleteMany();
  await client.vLAN.deleteMany();
  await client.inventoryItem.deleteMany();
  await client.inventoryCategory.deleteMany();
  await client.asset.deleteMany();
  await client.networkCredential.deleteMany();
  await client.assetCategory.deleteMany();
  await client.license.deleteMany();
  await client.rolePermission.deleteMany();
  await client.permission.deleteMany();
  await client.appUser.deleteMany();
  await client.directoryUser.deleteMany();

  await client.role.deleteMany();
  await client.position.deleteMany();

  // Clear self-referential parentId on Department before table deletion
  await client.department.updateMany({ data: { parentId: null } });
  await client.department.deleteMany();

  await client.location.deleteMany();
  await client.organization.deleteMany();
  await client.vendor.deleteMany();
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

  // 4. Roles and System Operator Accounts (AppUser)
  logger.log('👤 Seeding Roles and System Operator Accounts (AppUser)...');
  const appUsersResult = await seedRolesAndUsers(prisma);

  // 5. Corporate Directory Employees and Security Groups (DirectoryUser)
  logger.log('👥 Seeding Corporate Directory Users & Groups (DirectoryUser)...');
  const directoryUsersResult = await seedDirectory(prisma, appUsersResult.staffProfiles);

  // 6. Hardware Assets (Assigned to DirectoryUser)
  logger.log('💻 Seeding Hardware Assets Fleet...');
  await seedAssets(prisma, taxonomyResult, directoryUsersResult);

  // 7. Software Licenses and Assignments (Assigned to DirectoryUser)
  logger.log('📄 Seeding Software Licenses and User Assignments...');
  await seedLicenses(prisma, directoryUsersResult);

  // 8. Inventory Items
  logger.log('📦 Seeding Hardware Stockroom Inventory...');
  await seedInventory(prisma);

  // 9. Subnets and IP Allocations
  logger.log('🌐 Seeding Network Subnets & IPAM Allocations...');
  await seedNetwork(prisma);

  // 10. Audit Logs
  logger.log('🔒 Seeding Enterprise Governance & Audit Logs...');
  await seedAudit(prisma);

  // 11. System Notifications (Assigned to AppUser)
  logger.log('🔔 Seeding System Notifications & Telemetry Alerts...');
  await seedNotifications(prisma, appUsersResult);

  // 12. Settings and Report Schedules
  logger.log('⚙️ Seeding System Preferences & Report Schedules...');
  await seedSettingsAndReports(prisma);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.log(
    `✅ Enterprise Seed completed successfully in ${duration}s (100% unified architecture).`,
  );
}

main()
  .catch((e: unknown) => {
    logger.error('❌ Seed Execution Error:', e instanceof Error ? e.stack : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
