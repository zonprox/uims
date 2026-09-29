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
import { createSeederContext } from './seeders/seeder.utils';
import { seedSettingsAndReports } from './seeders/settings-reports.seeder';
import { seedTaxonomy } from './seeders/taxonomy.seeder';
import { seedVendors } from './seeders/vendors.seeder';

const logger = new Logger('DatabaseSeeder');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required for database seeding');
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function clearDatabase(client: PrismaClient) {
  logger.log('🧹 Clearing legacy records for clean enterprise seeding...');
  await client.$transaction(
    async (tx) => {
      await tx.reportSchedule.deleteMany();
      await tx.licenseAssignment.deleteMany();
      await tx.notification.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.refreshToken.deleteMany();
      await tx.directoryMembership.deleteMany();
      await tx.directoryGroup.deleteMany();
      await tx.switchPort.deleteMany();
      await tx.networkSwitch.deleteMany();
      await tx.networkRack.deleteMany();
      await tx.iPAddress.deleteMany();
      await tx.subnet.deleteMany();
      await tx.vLAN.deleteMany();
      await tx.inventoryItem.deleteMany();
      await tx.inventoryCategory.deleteMany();
      await tx.asset.deleteMany();
      await tx.assetCategory.deleteMany();
      await tx.license.deleteMany();
      await tx.rolePermission.deleteMany();
      await tx.permission.deleteMany();
      await tx.appUser.deleteMany();
      await tx.directoryUser.deleteMany();

      await tx.role.deleteMany();
      await tx.position.deleteMany();

      // Clear self-referential parentId on Department before table deletion
      await tx.department.updateMany({ data: { parentId: null } });
      await tx.department.deleteMany();

      // Clear self-referential parentId on Location before table deletion
      await tx.location.updateMany({ data: { parentId: null } });
      await tx.location.deleteMany();

      // Clear self-referential parentId on Organization before table deletion
      await tx.organization.updateMany({ data: { parentId: null } });
      await tx.organization.deleteMany();
      await tx.vendor.deleteMany();
    },
    { timeout: 30000 },
  );
}

async function main() {
  const startTime = Date.now();
  logger.log('🚀 Starting Modular Enterprise Database Seed for UIMS...');

  const ctx = createSeederContext();

  // 1. Clear database
  await clearDatabase(prisma);

  // 2. Enterprise Organizations, Spatial Locations, Departments & Positions
  logger.log('🏛️ Seeding Organizations, Spatial Locations, Departments and Positions...');
  const orgResult = await seedOrganizations(prisma, ctx);

  // 3. Taxonomy (Asset and Inventory Categories)
  logger.log('🏢 Seeding Asset and Inventory Categories...');
  const taxonomyResult = await seedTaxonomy(prisma, ctx);

  // 4. Roles and System Operator Accounts (AppUser)
  logger.log('👤 Seeding Roles and System Operator Accounts (AppUser)...');
  const appUsersResult = await seedRolesAndUsers(prisma, ctx);

  // 5. Corporate Directory Employees and Security Groups (DirectoryUser)
  logger.log('👥 Seeding Corporate Directory Users & Groups (DirectoryUser)...');
  const directoryUsersResult = await seedDirectory(prisma, appUsersResult.staffProfiles, ctx);

  // 6. Canonical Enterprise Vendors
  logger.log('🏢 Seeding Canonical Enterprise Vendors...');
  const vendorMap = await seedVendors(prisma, ctx);

  // 7. Hardware Assets (Assigned to DirectoryUser)
  logger.log('💻 Seeding Hardware Assets Fleet...');
  const createdAssets = await seedAssets(
    prisma,
    taxonomyResult,
    directoryUsersResult,
    orgResult,
    vendorMap,
    ctx,
  );
  if (createdAssets) {
    for (const [tag, record] of Object.entries(createdAssets)) {
      ctx.assets.set(tag, record.id);
      ctx.assets.set(record.id, record.id);
    }
  }

  // 8. Software Licenses and Assignments (Assigned to DirectoryUser)
  logger.log('📄 Seeding Software Licenses and User Assignments...');
  await seedLicenses(prisma, directoryUsersResult, vendorMap, ctx);

  // 9. Inventory Items
  logger.log('📦 Seeding Hardware Stockroom Inventory...');
  const createdInventory = await seedInventory(prisma, ctx);
  if (createdInventory) {
    for (const [sku, record] of Object.entries(createdInventory)) {
      ctx.inventory.set(sku, record.id);
      ctx.inventory.set(record.id, record.id);
    }
  }

  // 10. Subnets and IP Allocations
  logger.log('🌐 Seeding Network Subnets & IPAM Allocations...');
  await seedNetwork(prisma, ctx);

  // 11. Audit Logs
  logger.log('🔒 Seeding Enterprise Governance & Audit Logs...');
  await seedAudit(prisma, ctx);

  // 12. System Notifications (Assigned to AppUser)
  logger.log('🔔 Seeding System Notifications & Telemetry Alerts...');
  await seedNotifications(prisma, appUsersResult, ctx);

  // 13. Settings and Report Schedules
  logger.log('⚙️ Seeding System Preferences & Report Schedules...');
  await seedSettingsAndReports(prisma, ctx);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.log(
    `✅ Enterprise Seed completed successfully in ${duration}s (100% unified architecture).`,
  );
}

main()
  .catch((e: unknown) => {
    logger.error('❌ Seed Execution Error:', e instanceof Error ? e.stack : String(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
