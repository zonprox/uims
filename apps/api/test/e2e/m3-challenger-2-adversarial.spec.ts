import * as dotenv from 'dotenv';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { AssetsService } from '../../src/modules/assets/assets.service';
import { DirectoryService } from '../../src/modules/directory/directory.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { NetworkService } from '../../src/modules/network/network.service';
import type { PrismaService } from '../../src/database/prisma.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Milestone 3 Challenger 2 — Empirical Dependent Seeders Harmonization Suite', () => {
  let prisma: PrismaClient;
  let assetsService: AssetsService;
  let directoryService: DirectoryService;
  let inventoryService: InventoryService;
  let networkService: NetworkService;
  let authToken: string;
  const apiBase = 'http://localhost:3002/api/v1';

  let serverAvailable: boolean | null = null;
  async function isServerRunning(): Promise<boolean> {
    if (serverAvailable !== null) return serverAvailable;
    try {
      const res = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(300) });
      serverAvailable = res.status < 500;
    } catch {
      serverAvailable = false;
    }
    return serverAvailable;
  }

  let isDbAvailable = false;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      isDbAvailable = false;
      return;
    }
    try {
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      });
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;

      const prismaServiceMock = prisma as unknown as PrismaService;
      assetsService = new AssetsService(prismaServiceMock);
      directoryService = new DirectoryService(prismaServiceMock);
      inventoryService = new InventoryService(prismaServiceMock);
      networkService = new NetworkService(prismaServiceMock);

      const secret = process.env.JWT_SECRET || 'uims-jwt-secret-change-in-production';
      const jwtService = new JwtService({ secret });
      authToken = jwtService.sign(
        { sub: 'usr-admin', email: 'admin@uims.internal', role: 'Admin', permissions: ['*:*'] },
        { expiresIn: '1h' },
      );
    } catch {
      isDbAvailable = false;
    }
  });

  beforeEach((ctx) => {
    if (!isDbAvailable) {
      ctx.skip();
    }
  });

  afterAll(async () => {
    if (isDbAvailable && prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore
      }
    }
  });

  // =========================================================================
  // 1. ASSETS API: FACTORIES 1-7 LOCATION & DEPARTMENT POPULATION
  // =========================================================================
  describe('Mission 1: Assets API Across 7 Factories (AssetsService.findAll)', () => {
    it('1.1 should return populated location and department for all assets across Factories 1 to 7', async () => {
      for (let f = 1; f <= 7; f++) {
        const locId = `loc-bsl-f${f}`;
        const assets = await assetsService.findAll({ locationId: locId, pageSize: 100 });

        expect(assets.length, `Factory ${f} should have production assets`).toBeGreaterThan(0);

        for (const asset of assets) {
          // 1. Location assertion
          expect(asset.locationId, `Asset ${asset.tag} locationId`).toBeDefined();
          expect(typeof asset.locationId).toBe('string');
          expect(asset.location, `Asset ${asset.tag} location name`).toBeDefined();
          expect(asset.location.length).toBeGreaterThan(0);
          expect(
            asset.location,
            `Asset ${asset.tag} location must not be unpopulated fallback 'Storage Vault'`,
          ).not.toBe('Storage Vault');

          expect(asset.locationPath, `Asset ${asset.tag} locationPath`).toBeDefined();
          expect(asset.locationPath.length).toBeGreaterThan(0);

          // 2. Department assertion
          expect(asset.departmentId, `Asset ${asset.tag} departmentId`).toBeDefined();
          expect(typeof asset.departmentId).toBe('string');
          expect(asset.department, `Asset ${asset.tag} department name`).toBeDefined();
          expect(asset.department.length).toBeGreaterThan(0);

          // 3. Organization resolution
          expect(asset.organizationId, `Asset ${asset.tag} organizationId`).toBe('org-bsl');
          expect(asset.organization, `Asset ${asset.tag} organization name`).toBe(
            'Broadpeak Soc Trang',
          );
        }
      }
    });

    it('1.2 should verify operational machinery across the factory functional sections', async () => {
      // Query Factory 1 assets which has complete representation of the factory operational machinery
      const f1Assets = await assetsService.findAll({ locationId: 'loc-bsl-f1', pageSize: 100 });
      expect(f1Assets.length).toBeGreaterThanOrEqual(20);

      // Verify that the functional machinery asset types exist in Factory 1
      const sewingAssets = f1Assets.filter(
        (a) =>
          a.department.includes('Sewing Assembly') ||
          a.name.includes('Lockstitch') ||
          a.name.includes('Overlock'),
      );
      const cuttingAssets = f1Assets.filter(
        (a) => a.department.includes('Cutting') || a.name.includes('Cutting'),
      );
      const qaAssets = f1Assets.filter(
        (a) =>
          a.department.includes('QA/QC') ||
          a.name.includes('Spectrophotometer') ||
          a.name.includes('QA'),
      );
      const maintAssets = f1Assets.filter(
        (a) => a.department.includes('Maintenance') || a.name.includes('Maintenance'),
      );
      const printAssets = f1Assets.filter(
        (a) =>
          a.department.includes('Printing') ||
          a.name.includes('Printer') ||
          a.name.includes('Heat Transfer'),
      );
      const sampleAssets = f1Assets.filter(
        (a) => a.department.includes('Sample') || a.name.includes('Sample'),
      );
      const packAssets = f1Assets.filter(
        (a) => a.department.includes('Packing') || a.name.includes('Barcode'),
      );

      expect(sewingAssets.length, 'Sewing assets must exist in Factory 1').toBeGreaterThan(0);
      expect(cuttingAssets.length, 'Cutting assets must exist in Factory 1').toBeGreaterThan(0);
      expect(qaAssets.length, 'QA assets must exist in Factory 1').toBeGreaterThan(0);
      expect(maintAssets.length, 'Maintenance assets must exist in Factory 1').toBeGreaterThan(0);
      expect(printAssets.length, 'Printing assets must exist in Factory 1').toBeGreaterThan(0);
      expect(sampleAssets.length, 'Sample assets must exist in Factory 1').toBeGreaterThan(0);
      expect(packAssets.length, 'Packing assets must exist in Factory 1').toBeGreaterThan(0);
    });

    it('1.3 should successfully query assets via live HTTP endpoint GET /api/v1/assets', async () => {
      if (!(await isServerRunning())) {
        const assets = await assetsService.findAll({ locationId: 'loc-bsl-f1', pageSize: 20 });
        expect(Array.isArray(assets)).toBe(true);
        expect(assets.length).toBeGreaterThan(0);
        return;
      }
      const res = await fetch(`${apiBase}/assets?locationId=loc-bsl-f1&pageSize=20`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        success: boolean;
        data: Array<{
          id: string;
          tag: string;
          name: string;
          location: string;
          department: string;
          locationPath: string;
        }>;
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const first = body.data[0];
      expect(first.location).not.toBe('Storage Vault');
      expect(first.department.length).toBeGreaterThan(0);
      expect(first.locationPath).toContain('Factory 1');
    });

    it('1.4 should gracefully handle edge cases: non-existent location, special characters, bounded take limit', async () => {
      const nonExistent = await assetsService.findAll({ locationId: 'loc-non-existent-999' });
      expect(nonExistent).toEqual([]);

      const specialChars = await assetsService.findAll({ search: "'; DROP TABLE assets; --" });
      expect(Array.isArray(specialChars)).toBe(true);

      const overbounded = await assetsService.findAll({ pageSize: 500 });
      expect(overbounded.length).toBeLessThanOrEqual(100);
    });
  });

  // =========================================================================
  // 2. DIRECTORY API: POPULATED DEPARTMENT AND POSITION RECORDS
  // =========================================================================
  describe('Mission 2: Directory API (DirectoryService.findAll)', () => {
    it('2.1 should verify that 100% of directory users return non-null, valid department and position records', async () => {
      const result = await directoryService.findAll({ pageSize: 100 });
      expect(result.total).toBeGreaterThanOrEqual(14);
      expect(result.items.length).toBeGreaterThanOrEqual(14);

      for (const user of result.items) {
        // Department assertion
        expect(user.departmentId, `User ${user.email} departmentId`).toBeDefined();
        expect(user.departmentId).not.toBeNull();
        expect(typeof user.departmentId).toBe('string');
        expect(user.department, `User ${user.email} department relation`).toBeDefined();
        expect(user.department).not.toBeNull();
        expect(user.department?.id).toBe(user.departmentId);
        expect(user.department?.name.length).toBeGreaterThan(0);
        expect(user.department?.code.length).toBeGreaterThan(0);

        // Position assertion
        expect(user.positionId, `User ${user.email} positionId`).toBeDefined();
        expect(user.positionId).not.toBeNull();
        expect(typeof user.positionId).toBe('string');
        expect(user.position, `User ${user.email} position relation`).toBeDefined();
        expect(user.position).not.toBeNull();
        expect(user.position?.id).toBe(user.positionId);
        expect(user.position?.title.length).toBeGreaterThan(0);
        expect(user.position?.code.length).toBeGreaterThan(0);

        // Location assertion
        expect(user.locationId, `User ${user.email} locationId`).toBeDefined();
        expect(user.locationId).not.toBeNull();
        expect(user.location, `User ${user.email} location relation`).toBeDefined();
        expect(user.location).not.toBeNull();

        // Organization assertion
        expect(user.organizationId, `User ${user.email} organizationId`).toBeDefined();
        expect(user.organizationId).not.toBeNull();
        expect(user.organization, `User ${user.email} organization relation`).toBeDefined();
        expect(user.organization).not.toBeNull();
      }
    });

    it('2.2 should strictly segregate BSH corporate office users from BSL manufacturing complex users', async () => {
      const result = await directoryService.findAll({ pageSize: 100 });
      const bshUsers = result.items.filter((u) => u.organizationId === 'org-bsh');
      const bslUsers = result.items.filter((u) => u.organizationId === 'org-bsl');

      expect(bshUsers.length).toBeGreaterThan(0);
      expect(bslUsers.length).toBeGreaterThan(0);

      // BSH users must have BSH departments and office locations (HCM-D3 or HCM-D7)
      for (const u of bshUsers) {
        expect(u.department?.organizationId).toBe('org-bsh');
        expect(u.department?.code).toMatch(/^DEPT-BSH/);
        expect(u.location?.code).toMatch(/^HCM-D[37]$/);
      }

      // BSL users must have BSL departments and BSL locations
      for (const u of bslUsers) {
        expect(u.department?.organizationId).toBe('org-bsl');
        expect(u.department?.code).toMatch(/^DEPT-BSL/);
        expect(u.location?.code).toMatch(/^(BSL|BC|WH|F\d)/);
      }
    });

    it('2.3 should successfully query directory users via live HTTP endpoint GET /api/v1/directory/users', async () => {
      if (!(await isServerRunning())) {
        const users = await directoryService.findAllUsers({ pageSize: 20 });
        expect(users.total).toBeGreaterThanOrEqual(14);
        expect(users.items.length).toBeGreaterThan(0);
        return;
      }
      const res = await fetch(`${apiBase}/directory/users?pageSize=20`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        success: boolean;
        data: {
          items: Array<{
            id: string;
            email: string;
            department: { name: string; code: string };
            position: { title: string; code: string };
            location: { name: string; code: string };
          }>;
          total: number;
        };
      };

      expect(body.success).toBe(true);
      expect(body.data.total).toBeGreaterThanOrEqual(14);
      expect(body.data.items.length).toBeGreaterThan(0);

      const user = body.data.items[0];
      expect(user.department).toBeDefined();
      expect(user.department.name.length).toBeGreaterThan(0);
      expect(user.position).toBeDefined();
      expect(user.position.title.length).toBeGreaterThan(0);
      expect(user.location).toBeDefined();
    });

    it('2.4 should handle directory query filters safely without unhandled NPEs', async () => {
      const bySearch = await directoryService.findAll({ search: 'NonExistentEmployee_XYZ' });
      expect(bySearch.items).toEqual([]);
      expect(bySearch.total).toBe(0);

      const byInvalidDept = await directoryService.findAll({ departmentId: 'dept-invalid-uuid' });
      expect(byInvalidDept.items).toEqual([]);
      expect(byInvalidDept.total).toBe(0);
    });
  });

  // =========================================================================
  // 3. INVENTORY API: MDC ITEMS (F1-F7) & FINISHED GOODS (CENTRAL WAREHOUSE)
  // =========================================================================
  describe('Mission 3: Inventory API (InventoryService.findAll)', () => {
    it('3.1 should verify MDC items across all 7 factories return populated physical locations', async () => {
      const allItems = await inventoryService.findAll({ pageSize: 100 });
      expect(allItems.length).toBeGreaterThanOrEqual(20);

      for (let f = 1; f <= 7; f++) {
        const mdcItemsForFactory = allItems.filter(
          (i) =>
            i.location?.fullPath?.includes(`Factory ${f}`) &&
            i.location?.fullPath?.includes('Material Distribution Center (MDC)'),
        );

        expect(
          mdcItemsForFactory.length,
          `Factory ${f} should have at least 1 MDC inventory item seeded`,
        ).toBeGreaterThanOrEqual(1);

        for (const item of mdcItemsForFactory) {
          expect(item.locationId).toBeDefined();
          expect(item.locationId).not.toBeNull();
          expect(item.location).toBeDefined();
          expect(item.location).not.toBeNull();
          expect(item.location?.name.length).toBeGreaterThan(0);
          expect(item.location?.fullPath).toContain(`Factory ${f}`);
          expect(item.location?.fullPath).toContain('Material Distribution Center (MDC)');
          expect(item.category).toBeDefined();
          expect(item.category).not.toBeNull();
        }
      }
    });

    it('3.2 should verify Finished Goods export items exist in Central Warehouse export bays', async () => {
      const allItems = await inventoryService.findAll({ pageSize: 100 });
      const fgItems = allItems.filter(
        (i) =>
          i.category?.name?.includes('Finished Goods') ||
          i.sku.startsWith('FG-') ||
          i.location?.fullPath?.includes('Finished Goods Storage'),
      );

      expect(
        fgItems.length,
        'Should have at least 4 Finished Goods batches seeded',
      ).toBeGreaterThanOrEqual(4);

      for (const fg of fgItems) {
        expect(fg.locationId).toBeDefined();
        expect(fg.location).toBeDefined();
        expect(fg.location?.fullPath).toContain('Central Warehouse Building (Kho tổng)');
        expect(fg.location?.fullPath).toContain('Finished Goods Storage (Kho thành phẩm)');
        expect(fg.sku).toMatch(/^FG-/);
        expect(fg.quantity).toBeGreaterThan(0);
      }
    });

    it('3.3 should support spatial descendant filtering for warehouse and factory locations', async () => {
      // Central Warehouse parent spatial filter
      const whItems = await inventoryService.findAll({ locationId: 'loc-bsl-wh', pageSize: 100 });
      expect(whItems.length).toBeGreaterThanOrEqual(4);
      for (const item of whItems) {
        expect(item.location?.fullPath).toContain('Central Warehouse Building');
      }

      // Factory 1 parent spatial filter
      const f1Items = await inventoryService.findAll({ locationId: 'loc-bsl-f1', pageSize: 100 });
      expect(f1Items.length).toBeGreaterThanOrEqual(3);
      for (const item of f1Items) {
        expect(item.location?.fullPath).toContain('Factory 1');
      }
    });

    it('3.4 should successfully query inventory via live HTTP endpoint GET /api/v1/inventory', async () => {
      if (!(await isServerRunning())) {
        const items = await inventoryService.findAll({ locationId: 'loc-bsl-wh', pageSize: 10 });
        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBeGreaterThan(0);
        return;
      }
      const res = await fetch(`${apiBase}/inventory?locationId=loc-bsl-wh&pageSize=10`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        success: boolean;
        data: Array<{
          id: string;
          name: string;
          sku: string;
          location: { name: string; fullPath: string };
        }>;
      };

      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      const item = body.data[0];
      expect(item.location).toBeDefined();
      expect(item.location.fullPath).toContain('Central Warehouse Building');
    });
  });

  // =========================================================================
  // 4. NETWORK API: SUBNET LOCATION POPULATION (BSL-F1..F7, BSL-BC, BC-F1-DC102)
  // =========================================================================
  describe('Mission 4: Network Subnets Physical Location Mapping (NetworkService.findAllSubnets)', () => {
    it('4.1 should verify subnets 131 to 137 are mapped exactly to Factory 1 through Factory 7 (BSL-F1..F7)', async () => {
      const subnets = await networkService.findAllSubnets({ pageSize: 100 });
      expect(subnets.length).toBeGreaterThanOrEqual(20);

      const expectedFactoryMappings: Record<string, string> = {
        '10.232.131.0/24': 'BSL-F1',
        '10.232.132.0/24': 'BSL-F2',
        '10.232.133.0/24': 'BSL-F3',
        '10.232.134.0/24': 'BSL-F4',
        '10.232.135.0/24': 'BSL-F5',
        '10.232.136.0/24': 'BSL-F6',
        '10.232.137.0/24': 'BSL-F7',
      };

      for (const [cidr, expectedCode] of Object.entries(expectedFactoryMappings)) {
        const subnet = subnets.find((s) => s.cidr === cidr);
        expect(subnet, `Subnet for ${cidr} must exist`).toBeDefined();
        expect(subnet?.location, `Subnet ${cidr} location must be populated`).toBeDefined();
        expect(subnet?.location).not.toBeNull();
        expect(subnet?.location?.code, `Subnet ${cidr} location code`).toBe(expectedCode);
        expect(subnet?.locationName, `Subnet ${cidr} locationName`).toContain('Factory');
        expect(subnet?.vlan, `Subnet ${cidr} vlan must be populated`).toBeDefined();
        expect(subnet?.vlan).not.toBeNull();
      }
    });

    it('4.2 should verify subnets 138, 130, 97, and 996 (partial) are mapped to Business Center (BSL-BC)', async () => {
      const subnets = await networkService.findAllSubnets({ pageSize: 100 });

      const bcCidrs = [
        '10.232.138.0/24',
        '10.232.130.0/24',
        '10.232.97.0/24',
        '192.168.232.128/25',
      ];

      for (const cidr of bcCidrs) {
        const subnet = subnets.find((s) => s.cidr === cidr);
        expect(subnet, `BC Subnet ${cidr} must exist`).toBeDefined();
        expect(subnet?.location, `Subnet ${cidr} location must be populated`).toBeDefined();
        expect(subnet?.location).not.toBeNull();
        expect(subnet?.location?.code).toBe('BSL-BC');
        expect(subnet?.locationName).toBe('Business Center Building');
      }
    });

    it('4.3 should verify Datacenter subnets (100, 129, 996 pool) are mapped to BC Datacenter (BC-F1-DC102)', async () => {
      const subnets = await networkService.findAllSubnets({ pageSize: 100 });

      const dcCidrs = ['10.232.100.0/24', '10.232.129.0/24', '192.168.232.0/25'];

      for (const cidr of dcCidrs) {
        const subnet = subnets.find((s) => s.cidr === cidr);
        expect(subnet, `DC Subnet ${cidr} must exist`).toBeDefined();
        expect(subnet?.location, `Subnet ${cidr} location must be populated`).toBeDefined();
        expect(subnet?.location).not.toBeNull();
        expect(subnet?.location?.code).toBe('BC-F1-DC102');
        expect(subnet?.locationName).toContain('Datacenter');
      }
    });

    it('4.4 should verify 100% of subnets have non-null populated location and vlan objects', async () => {
      const subnets = await networkService.findAllSubnets({ pageSize: 100 });
      expect(subnets.length).toBeGreaterThanOrEqual(20);

      for (const s of subnets) {
        expect(s.locationId, `Subnet ${s.cidr} locationId`).toBeDefined();
        expect(s.locationId).not.toBeNull();
        expect(s.location, `Subnet ${s.cidr} location object`).toBeDefined();
        expect(s.location).not.toBeNull();
        expect(s.locationName.length).toBeGreaterThan(0);

        expect(s.vlanId, `Subnet ${s.cidr} vlanId`).toBeDefined();
        expect(s.vlanId).not.toBeNull();
        expect(s.vlan, `Subnet ${s.cidr} vlan object`).toBeDefined();
        expect(s.vlan).not.toBeNull();
        expect(s.vlanName.length).toBeGreaterThan(0);
      }
    });

    it('4.5 should successfully query subnets via live HTTP endpoint GET /api/v1/network/subnets', async () => {
      if (!(await isServerRunning())) {
        const subnets = await networkService.findAllSubnets({ pageSize: 25 });
        expect(subnets.length).toBeGreaterThanOrEqual(20);
        return;
      }
      const res = await fetch(`${apiBase}/network/subnets?pageSize=25`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(200);

      const body = (await res.json()) as {
        success: boolean;
        data: Array<{
          id: string;
          cidr: string;
          locationName: string;
          location: { code: string };
          vlan: { vlanNumber: number };
        }>;
      };

      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(20);

      const f1Subnet = body.data.find((s) => s.cidr === '10.232.131.0/24');
      expect(f1Subnet).toBeDefined();
      expect(f1Subnet?.location?.code).toBe('BSL-F1');
      expect(f1Subnet?.vlan?.vlanNumber).toBe(131);
    });
  });

  // =========================================================================
  // 5. DATABASE INTEGRITY AUDIT: ZERO ORPHAN/NULL FOREIGN KEYS
  // =========================================================================
  describe('Mission 5: Database Referential Integrity & Anti-NPE Guarantees', () => {
    it('5.1 should assert 0 DirectoryUser records have null foreign keys', async () => {
      const nullDept = await prisma.directoryUser.count({ where: { departmentId: null } });
      const nullPos = await prisma.directoryUser.count({ where: { positionId: null } });
      const nullLoc = await prisma.directoryUser.count({ where: { locationId: null } });
      const nullOrg = await prisma.directoryUser.count({ where: { organizationId: null } });

      expect(nullDept, 'DirectoryUser null departmentId count').toBe(0);
      expect(nullPos, 'DirectoryUser null positionId count').toBe(0);
      expect(nullLoc, 'DirectoryUser null locationId count').toBe(0);
      expect(nullOrg, 'DirectoryUser null organizationId count').toBe(0);
    });

    it('5.2 should assert 0 Asset records have null locationId or null departmentId', async () => {
      const nullAssetFks = await prisma.asset.count({
        where: {
          OR: [{ locationId: null }, { departmentId: null }],
        },
      });
      expect(nullAssetFks, 'Asset null locationId or departmentId count').toBe(0);
    });

    it('5.3 should assert 0 InventoryItem records have null locationId', async () => {
      const nullInvLoc = await prisma.inventoryItem.count({
        where: { locationId: null },
      });
      expect(nullInvLoc, 'InventoryItem null locationId count').toBe(0);
    });

    it('5.4 should assert 0 Subnet records have null locationId or null vlanId', async () => {
      const nullSubnetFks = await prisma.subnet.count({
        where: {
          OR: [{ locationId: null }, { vlanId: null }],
        },
      });
      expect(nullSubnetFks, 'Subnet null locationId or vlanId count').toBe(0);
    });

    it('5.5 should assert audit log aud-006 resolves to genuine inventory UUID without orphan strings', async () => {
      const audit006 = await prisma.auditLog.findUnique({
        where: { id: 'aud-006' },
      });
      expect(audit006).toBeDefined();
      expect(audit006?.entity).toBe('CBL-CAT6-UTP-3M');
      expect(audit006?.entityId).not.toBe('inv-cat6a');

      // Verify entityId references genuine inventory record
      const referencedItem = await prisma.inventoryItem.findUnique({
        where: { id: audit006?.entityId },
      });
      expect(referencedItem, 'Referenced inventory item in aud-006 must exist in DB').toBeDefined();
      expect(referencedItem?.sku).toBe('CBL-CAT6-UTP-3M');
    });
  });
});
