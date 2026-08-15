import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { seedAssets } from './seeders/assets.seeder';
import { seedAudit } from './seeders/audit.seeder';
import { seedDirectory } from './seeders/directory.seeder';
import { seedInventory } from './seeders/inventory.seeder';
import { seedLicenses } from './seeders/licenses.seeder';
import { seedNetwork } from './seeders/network.seeder';
import { seedNotifications } from './seeders/notifications.seeder';
import { seedRolesAndUsers } from './seeders/roles-users.seeder';
import { seedSettingsAndReports } from './seeders/settings-reports.seeder';
import { seedTaxonomy } from './seeders/taxonomy.seeder';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function clearDatabase(client: PrismaClient) {
  console.log('🧹 Clearing legacy records for clean enterprise seeding...');
  await client.licenseAssignment.deleteMany();
  await client.assetHistory.deleteMany();
  await client.notification.deleteMany();
  await client.auditLog.deleteMany();
  await client.directoryMembership.deleteMany();
  await client.directoryGroup.deleteMany();
  await client.directoryUser.deleteMany();
  await client.emailAccount.deleteMany();
  await client.iPAddress.deleteMany();
  await client.subnet.deleteMany();
  await client.inventoryItem.deleteMany();
  await client.asset.deleteMany();
  await client.license.deleteMany();
  await client.reportSchedule.deleteMany();
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Starting Modular Enterprise Database Seed for UIMS...');

  // 1. Clear database
  await clearDatabase(prisma);

  // 2. Roles and Users
  console.log('👤 Seeding Roles and System Users...');
  const usersResult = await seedRolesAndUsers(prisma);

  // 3. Taxonomy (Locations and Asset Categories)
  console.log('🏢 Seeding Locations and Asset Categories...');
  const taxonomyResult = await seedTaxonomy(prisma);

  // 4. Hardware Assets
  console.log('💻 Seeding Hardware Assets Fleet...');
  await seedAssets(prisma, taxonomyResult, usersResult);

  // 5. Software Licenses and Assignments
  console.log('📄 Seeding Software Licenses and User Assignments...');
  await seedLicenses(prisma, usersResult);

  // 6. Inventory Items
  console.log('📦 Seeding Hardware Stockroom Inventory...');
  await seedInventory(prisma);

  // 7. Directory Users, Groups and Emails
  console.log('👥 Seeding Directory Users, Groups & Mailboxes...');
  await seedDirectory(prisma);

  // 8. Subnets and IP Allocations
  console.log('🌐 Seeding Network Subnets & IPAM Allocations...');
  await seedNetwork(prisma);

  // 9. Audit Logs
  console.log('🔒 Seeding Enterprise Governance & Audit Logs...');
  await seedAudit(prisma);

  // 10. System Notifications
  console.log('🔔 Seeding System Notifications & Telemetry Alerts...');
  await seedNotifications(prisma, usersResult);

  // 11. Settings and Report Schedules
  console.log('⚙️ Seeding System Preferences & Report Schedules...');
  await seedSettingsAndReports(prisma);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Enterprise Seed completed successfully in ${duration}s (100% modular architecture).`);
}

main()
  .catch((e) => {
    console.error('❌ Seed Execution Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
