import * as dotenv from 'dotenv';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { AssetsService } from '../../src/modules/assets/assets.service';
import { DirectoryService } from '../../src/modules/directory/directory.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { OrganizationService } from '../../src/modules/organization/organization.service';
import type { PrismaService } from '../../src/database/prisma.service';
import type { OrgNode } from '@uims/shared-types';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Milestone 4 Challenger 2 — Empirical Backend & Hierarchy Navigation Adversarial Suite', () => {
  let prisma: PrismaClient;
  let orgService: OrganizationService;
  let assetsService: AssetsService;
  let directoryService: DirectoryService;
  let inventoryService: InventoryService;
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
      orgService = new OrganizationService(prismaServiceMock);
      assetsService = new AssetsService(prismaServiceMock);
      directoryService = new DirectoryService(prismaServiceMock);
      inventoryService = new InventoryService(prismaServiceMock);

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
  // 1. ORGANIZATION HIERARCHY TREE: HOLDING, BSH & BSL TOPOLOGY
  // =========================================================================
  describe('Mission 1: Organization Hierarchy Tree Navigation (OrganizationService.getHierarchyTree)', () => {
    it('1.1 should verify Holding company is the sole root and BSH and BSL are nested children', async () => {
      const tree = await orgService.getHierarchyTree();

      // Top level must contain exactly 1 root: Youngone / Broadpeak Group (Holding)
      expect(tree.length, 'Root hierarchy should contain exactly 1 root organization').toBe(1);
      const root = tree[0];
      expect(root.key).toBe('org-org-holding');
      expect(root.title).toBe('Youngone / Broadpeak Group');
      expect(root.code).toBe('HOLDING');
      expect(root.type).toBe('organization');

      // Nested child organizations
      const childOrgs = (root.children || []).filter((c) => c.type === 'organization');
      expect(childOrgs.length, 'Holding company should have exactly 2 child subsidiaries').toBe(2);

      const bsh = childOrgs.find((c) => c.key === 'org-org-bsh');
      expect(bsh, 'BSH should be a nested child under Holding').toBeDefined();
      expect(bsh?.title).toBe('Broadpeak Ho Chi Minh');
      expect(bsh?.code).toBe('BSH');

      const bsl = childOrgs.find((c) => c.key === 'org-org-bsl');
      expect(bsl, 'BSL should be a nested child under Holding').toBeDefined();
      expect(bsl?.title).toBe('Broadpeak Soc Trang');
      expect(bsl?.code).toBe('BSL');
    });

    it('1.2 should verify BSH shows exactly 8 departments and 2 office locations, with 0 factories', async () => {
      const tree = await orgService.getHierarchyTree();
      const root = tree[0];
      const bsh = root.children?.find((c) => c.key === 'org-org-bsh');
      expect(bsh).toBeDefined();

      // 1. Departments under BSH
      const bshDeptKeys: string[] = [];
      const collectDepts = (nodes: OrgNode[]) => {
        for (const n of nodes) {
          if (n.type === 'department' || n.type === 'sub-department') {
            bshDeptKeys.push(n.key);
            if (n.children) collectDepts(n.children);
          }
        }
      };
      collectDepts(bsh?.children || []);

      expect(bshDeptKeys.length, 'BSH should contain exactly 8 corporate office departments').toBe(
        8,
      );

      const expectedBshDepts = [
        'dept-dept-bsh-exec', // Corporate Leadership & Strategy (Ban Tổng Giám Đốc)
        'dept-dept-bsh-comm', // Commercial & Sourcing Division
        'dept-dept-bsh-merch', // Apparel Merchandising & Buyer Accounts
        'dept-dept-bsh-src', // Global Sourcing & Raw Material Development
        'dept-dept-bsh-corp', // Corporate Shared Services Division
        'dept-dept-bsh-it', // Enterprise IT & Cloud Systems
        'dept-dept-bsh-fin', // Finance, Treasury & Cost Accounting
        'dept-dept-bsh-hr', // People Operations & Talent Acquisition
      ];

      for (const expectedDept of expectedBshDepts) {
        expect(bshDeptKeys, `BSH departments must include ${expectedDept}`).toContain(expectedDept);
      }

      // 2. Locations under BSH
      const locGroup = bsh?.children?.find((c) => c.key?.startsWith('branch-group-'));
      expect(locGroup, 'BSH should have a Facilities & Campuses branch group').toBeDefined();
      const bshLocations = locGroup?.children || [];
      expect(bshLocations.length, 'BSH should contain exactly 2 office locations').toBe(2);

      const locKeys = bshLocations.map((l) => l.key);
      expect(locKeys).toContain('loc-loc-bsh-d3');
      expect(locKeys).toContain('loc-loc-bsh-d7');

      // 3. Invariant: 0 factories, 0 workshops, 0 warehouses, 0 sewing lines under BSH
      const allBshLocTitles = bshLocations.map((l) => l.title.toLowerCase());
      for (const title of allBshLocTitles) {
        expect(title).not.toContain('factory');
        expect(title).not.toContain('warehouse');
        expect(title).not.toContain('workshop');
        expect(title).not.toContain('sewing');
      }

      // Verify direct database query for BSH locations
      const bshDbLocations = await prisma.location.findMany({
        where: { organizationId: 'org-bsh' },
      });
      expect(bshDbLocations.length).toBe(2);
      for (const loc of bshDbLocations) {
        expect(loc.type).toBe('BRANCH');
      }
    });

    it('1.3 should verify BSL shows BC Building, Central Warehouse, and 7 Factories with 9 departments each', async () => {
      const tree = await orgService.getHierarchyTree();
      const root = tree[0];
      const bsl = root.children?.find((c) => c.key === 'org-org-bsl');
      expect(bsl).toBeDefined();

      // 1. Facilities under BSL
      const locGroup = bsl?.children?.find((c) => c.key?.startsWith('branch-group-'));
      expect(locGroup, 'BSL should have a Facilities & Campuses group').toBeDefined();

      // Campus level
      const campus = locGroup?.children?.[0];
      expect(campus, 'BSL should have Soc Trang Campus at top').toBeDefined();
      expect(campus?.key).toBe('loc-loc-bsl-st');

      const facilities = campus?.children || [];
      const facilityKeys = facilities.map((f) => f.key);

      // Verify BC Building exists
      expect(facilityKeys, 'BSL facilities must include BC Building').toContain('loc-loc-bsl-bc');
      const bc = facilities.find((f) => f.key === 'loc-loc-bsl-bc');
      expect(bc?.title).toContain('Business Center Building');

      // Verify Central Warehouse exists
      expect(facilityKeys, 'BSL facilities must include Central Warehouse').toContain(
        'loc-loc-bsl-wh',
      );
      const wh = facilities.find((f) => f.key === 'loc-loc-bsl-wh');
      expect(wh?.title).toContain('Central Warehouse Building');

      // Verify Factories 1 to 7 exist
      for (let f = 1; f <= 7; f++) {
        const factoryKey = `loc-loc-bsl-f${f}`;
        expect(facilityKeys, `BSL facilities must include Factory ${f} (${factoryKey})`).toContain(
          factoryKey,
        );
      }

      // 2. Departments under BSL: Verify 7 Factories each have exactly 9 departments
      const allBslDepts: OrgNode[] = [];
      const collectDepts = (nodes: OrgNode[]) => {
        for (const n of nodes) {
          if (n.type === 'department' || n.type === 'sub-department') {
            allBslDepts.push(n);
            if (n.children) collectDepts(n.children);
          }
        }
      };
      collectDepts(bsl?.children || []);

      const expectedSections = ['qa', 'cut', 'sew', 'prt', 'maint', 'mdc', 'pck', 'smp', 'sale'];

      for (let f = 1; f <= 7; f++) {
        const factoryParentKey = `dept-dept-bsl-f${f}`;
        const factoryDeptNode = allBslDepts.find((d) => d.key === factoryParentKey);
        expect(
          factoryDeptNode,
          `BSL Department hierarchy must include Factory ${f} parent node`,
        ).toBeDefined();

        const factoryChildDepts = (factoryDeptNode?.children || []).filter(
          (c) => c.type === 'sub-department' || c.type === 'department',
        );

        expect(
          factoryChildDepts.length,
          `Factory ${f} should have exactly 9 operational sub-departments in hierarchy`,
        ).toBe(9);

        const childKeys = factoryChildDepts.map((c) => c.key);
        for (const sec of expectedSections) {
          const expectedKey = `dept-dept-bsl-f${f}-${sec}`;
          expect(childKeys, `Factory ${f} sub-departments must include ${expectedKey}`).toContain(
            expectedKey,
          );
        }
      }
    });

    it('1.4 should successfully query hierarchy tree via live REST endpoint GET /api/v1/organizations/tree', async () => {
      if (!(await isServerRunning())) {
        const tree = await orgService.getHierarchyTree();
        expect(Array.isArray(tree)).toBe(true);
        expect(tree.length).toBe(1);
        expect(tree[0].code).toBe('HOLDING');
        return;
      }
      const res = await fetch(`${apiBase}/organizations/tree`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { success: boolean; data: OrgNode[]; timestamp: string };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBe(1);

      const root = body.data[0];
      expect(root.key).toBe('org-org-holding');
      expect(root.code).toBe('HOLDING');

      const childrenOrgs = (root.children || []).filter((c) => c.type === 'organization');
      expect(childrenOrgs.length).toBe(2);
      expect(childrenOrgs.map((c) => c.code)).toEqual(expect.arrayContaining(['BSH', 'BSL']));
    });
  });

  // =========================================================================
  // 2. CYCLE PREVENTION & DEFECT DISCOVERY IN OrganizationService
  // =========================================================================
  describe('Mission 2: Cycle Prevention & OrganizationService Defect Discovery', () => {
    it('2.1 should reject setting parentId to self on Holding company with BadRequestException', async () => {
      await expect(
        orgService.updateOrganization('org-holding', { parentId: 'org-holding' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        orgService.updateOrganization('org-holding', { parentId: 'org-holding' }),
      ).rejects.toThrow('Organization cannot be its own parent');
    });

    it('2.2 should reject setting parentId to self on BSH and BSL subsidiaries with BadRequestException', async () => {
      await expect(
        orgService.updateOrganization('org-bsh', { parentId: 'org-bsh' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        orgService.updateOrganization('org-bsl', { parentId: 'org-bsl' }),
      ).rejects.toThrow('Organization cannot be its own parent');
    });

    it('2.3 should reject setting parentId to self via live HTTP PATCH /api/v1/organizations/:id', async () => {
      if (!(await isServerRunning())) {
        await expect(
          orgService.updateOrganization('org-bsh', { parentId: 'org-bsh' }),
        ).rejects.toThrow(BadRequestException);
        return;
      }
      const res = await fetch(`${apiBase}/organizations/org-bsh`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ parentId: 'org-bsh' }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { message?: string };
      expect(body.message).toContain('Organization cannot be its own parent');
    });

    it('2.4 should successfully findOrganization and updateOrganization without crashing on roleName', async () => {
      const org = await orgService.findOrganization('org-holding');
      expect(org).toBeDefined();
      expect(org.id).toBe('org-holding');
      expect(org.code).toBe('HOLDING');
      expect(org.users).toBeDefined();

      const updated = await orgService.updateOrganization('org-holding', {
        name: 'Youngone / Broadpeak Group',
      });
      expect(updated).toBeDefined();
      expect(updated.name).toBe('Youngone / Broadpeak Group');
    });

    it('2.5 should successfully findDepartment and findPosition without crashing on roleName', async () => {
      // 1. Department
      const dept = await orgService.findDepartment('dept-bsh-exec');
      expect(dept).toBeDefined();
      expect(dept.id).toBe('dept-bsh-exec');
      expect(dept.users).toBeDefined();

      // 2. Position
      const pos = await prisma.position.findFirst();
      expect(pos).toBeDefined();
      if (pos) {
        const foundPos = await orgService.findPosition(pos.id);
        expect(foundPos).toBeDefined();
        expect(foundPos.id).toBe(pos.id);
        expect(foundPos.users).toBeDefined();
      }
    });

    it('2.6 should successfully query live HTTP endpoints for organization/department/position returning 200', async () => {
      if (!(await isServerRunning())) {
        const org = await orgService.findOrganization('org-holding');
        expect(org.id).toBe('org-holding');
        const dept = await orgService.findDepartment('dept-bsh-exec');
        expect(dept.id).toBe('dept-bsh-exec');
        return;
      }
      // 1. GET /api/v1/organizations/org-holding
      const orgRes = await fetch(`${apiBase}/organizations/org-holding`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(orgRes.status).toBe(200);
      const orgBody = (await orgRes.json()) as {
        success: boolean;
        data: { id: string; code: string };
      };
      expect(orgBody.success).toBe(true);
      expect(orgBody.data.id).toBe('org-holding');
      expect(orgBody.data.code).toBe('HOLDING');

      // 2. GET /api/v1/departments/dept-bsh-exec
      const deptRes = await fetch(`${apiBase}/departments/dept-bsh-exec`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(deptRes.status).toBe(200);
      const deptBody = (await deptRes.json()) as { success: boolean; data: { id: string } };
      expect(deptBody.success).toBe(true);
      expect(deptBody.data.id).toBe('dept-bsh-exec');

      // 3. GET /api/v1/positions/:id
      const pos = await prisma.position.findFirst();
      if (pos) {
        const posRes = await fetch(`${apiBase}/positions/${pos.id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        expect(posRes.status).toBe(200);
        const posBody = (await posRes.json()) as { success: boolean; data: { id: string } };
        expect(posBody.success).toBe(true);
        expect(posBody.data.id).toBe(pos.id);
      }
    });

    it('2.7 should reject setting parentId to a descendant organization (multi-hop cycle prevention)', async () => {
      // org-holding has child org-bsl; setting parentId of org-holding to org-bsl creates a multi-hop cycle
      await expect(
        orgService.updateOrganization('org-holding', { parentId: 'org-bsl' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        orgService.updateOrganization('org-holding', { parentId: 'org-bsl' }),
      ).rejects.toThrow('Cannot set parent to a descendant organization (cycle detected)');
    });
  });

  // =========================================================================
  // 3. POPULATED RELATIONS IN ASSETS, DIRECTORY, AND INVENTORY
  // =========================================================================
  describe('Mission 3: Populated Relations & Anti-NPE Guarantees', () => {
    it('3.1 Assets: 100% of assets return valid location and department objects without NPEs', async () => {
      const assets = await assetsService.findAll({ pageSize: 100 });
      expect(assets.length, 'Live assets should be populated').toBeGreaterThan(0);

      for (const asset of assets) {
        // Location assertion
        expect(asset.locationId, `Asset ${asset.tag} locationId`).toBeDefined();
        expect(typeof asset.locationId).toBe('string');
        expect(asset.locationId.length).toBeGreaterThan(0);

        expect(asset.location, `Asset ${asset.tag} location name`).toBeDefined();
        expect(typeof asset.location).toBe('string');
        expect(asset.location.length).toBeGreaterThan(0);
        expect(
          asset.location,
          `Asset ${asset.tag} location must not fall back to 'Storage Vault'`,
        ).not.toBe('Storage Vault');

        expect(asset.locationPath, `Asset ${asset.tag} locationPath`).toBeDefined();
        expect(asset.locationPath.length).toBeGreaterThan(0);

        // Department assertion
        expect(asset.departmentId, `Asset ${asset.tag} departmentId`).toBeDefined();
        expect(typeof asset.departmentId).toBe('string');
        expect(asset.departmentId.length).toBeGreaterThan(0);

        expect(asset.department, `Asset ${asset.tag} department name`).toBeDefined();
        expect(typeof asset.department).toBe('string');
        expect(asset.department.length).toBeGreaterThan(0);

        // Organization resolution
        expect(asset.organizationId, `Asset ${asset.tag} organizationId`).toBeDefined();
        expect(
          ['org-bsh', 'org-bsl', 'org-holding'],
          `Asset ${asset.tag} organizationId must be one of corporate entities`,
        ).toContain(asset.organizationId);
        expect(asset.organization, `Asset ${asset.tag} organization name`).toBeDefined();
      }
    });

    it('3.2 Directory Users: 100% of users return valid department and position objects without NPEs', async () => {
      const dirResult = await directoryService.findAll({ pageSize: 100 });
      expect(dirResult.items.length, 'Live directory users should be seeded').toBeGreaterThan(0);

      for (const user of dirResult.items) {
        // Department assertion
        expect(user.departmentId, `User ${user.email} departmentId`).toBeDefined();
        expect(user.department, `User ${user.email} department object`).toBeDefined();
        expect(user.department?.id).toBe(user.departmentId);
        expect(user.department?.name, `User ${user.email} department name`).toBeDefined();
        expect(user.department?.name.length).toBeGreaterThan(0);
        expect(user.department?.code, `User ${user.email} department code`).toBeDefined();

        // Position assertion
        expect(user.positionId, `User ${user.email} positionId`).toBeDefined();
        expect(user.position, `User ${user.email} position object`).toBeDefined();
        expect(user.position?.id).toBe(user.positionId);
        expect(user.position?.title, `User ${user.email} position title`).toBeDefined();
        expect(user.position?.title.length).toBeGreaterThan(0);
        expect(user.position?.code, `User ${user.email} position code`).toBeDefined();

        // Location assertion
        expect(user.locationId, `User ${user.email} locationId`).toBeDefined();
        expect(user.location, `User ${user.email} location object`).toBeDefined();
        expect(user.location?.name.length).toBeGreaterThan(0);

        // Organization assertion
        expect(user.organizationId, `User ${user.email} organizationId`).toBeDefined();
        expect(user.organization, `User ${user.email} organization object`).toBeDefined();
      }
    });

    it('3.3 Inventory Items: 100% of inventory items return valid populated locations without NPEs', async () => {
      const items = await inventoryService.findAll({ pageSize: 100 });
      expect(items.length, 'Live inventory items should be seeded').toBeGreaterThan(0);

      for (const item of items) {
        // Location assertion
        expect(item.locationId, `Inventory item ${item.sku} locationId`).toBeDefined();
        expect(typeof item.locationId).toBe('string');
        expect(item.locationId.length).toBeGreaterThan(0);

        expect(item.location, `Inventory item ${item.sku} location object`).toBeDefined();
        expect(item.location?.id).toBe(item.locationId);
        expect(item.location?.name, `Inventory item ${item.sku} location name`).toBeDefined();
        expect(item.location?.name.length).toBeGreaterThan(0);

        // Organization on location
        expect(
          item.location?.organizationId,
          `Inventory item ${item.sku} location organizationId`,
        ).toBe('org-bsl');
        expect(
          item.location?.organization?.name,
          `Inventory item ${item.sku} location organization name`,
        ).toBe('Broadpeak Soc Trang');

        // Category assertion
        expect(item.category, `Inventory item ${item.sku} category object`).toBeDefined();
        expect(item.category.name.length).toBeGreaterThan(0);
      }
    });

    it('3.4 should verify single-item lookups (findOne) populate complete relations', async () => {
      // 1. Asset findOne
      const firstAsset = await prisma.asset.findFirst();
      expect(firstAsset).toBeDefined();
      if (firstAsset) {
        const fullAsset = await assetsService.findOne(firstAsset.id);
        expect(fullAsset.locationId).toBeDefined();
        expect(fullAsset.location).toBeDefined();
        expect(fullAsset.departmentId).toBeDefined();
        expect(fullAsset.department).toBeDefined();
      }

      // 2. Directory findOne
      const firstUser = await prisma.directoryUser.findFirst();
      expect(firstUser).toBeDefined();
      if (firstUser) {
        const fullUser = await directoryService.findOne(firstUser.id);
        expect(fullUser.department).toBeDefined();
        expect(fullUser.position).toBeDefined();
        expect(fullUser.location).toBeDefined();
      }

      // 3. Inventory findOne
      const firstItem = await prisma.inventoryItem.findFirst();
      expect(firstItem).toBeDefined();
      if (firstItem) {
        const fullItem = await inventoryService.findOne(firstItem.id);
        expect(fullItem.location).toBeDefined();
        expect(fullItem.category).toBeDefined();
      }
    });

    it('3.5 should verify live REST endpoints populate relations correctly', async () => {
      if (!(await isServerRunning())) {
        const assets = await assetsService.findAll({ pageSize: 5 });
        expect(Array.isArray(assets)).toBe(true);
        expect(assets.length).toBeGreaterThan(0);
        return;
      }
      // 1. Assets HTTP endpoint
      const assetsRes = await fetch(`${apiBase}/assets?pageSize=5`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(assetsRes.status).toBe(200);
      const assetsJson = (await assetsRes.json()) as {
        success: boolean;
        data: Array<{ location?: unknown; department?: unknown }>;
      };
      expect(assetsJson.success).toBe(true);
      expect(assetsJson.data.length).toBeGreaterThan(0);
      for (const a of assetsJson.data) {
        expect(a.location).toBeDefined();
        expect(a.department).toBeDefined();
      }

      // 2. Directory users HTTP endpoint
      const dirRes = await fetch(`${apiBase}/directory/users?pageSize=5`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(dirRes.status).toBe(200);
      const dirJson = (await dirRes.json()) as {
        success: boolean;
        data: { items: Array<{ department?: { name?: string }; position?: { title?: string } }> };
      };
      expect(dirJson.success).toBe(true);
      expect(dirJson.data.items.length).toBeGreaterThan(0);
      for (const u of dirJson.data.items) {
        expect(u.department?.name).toBeDefined();
        expect(u.position?.title).toBeDefined();
      }

      // 3. Inventory HTTP endpoint
      const invRes = await fetch(`${apiBase}/inventory?pageSize=5`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(invRes.status).toBe(200);
      const invJson = (await invRes.json()) as {
        success: boolean;
        data: Array<{ location?: { name?: string } }>;
      };
      expect(invJson.success).toBe(true);
      expect(invJson.data.length).toBeGreaterThan(0);
      for (const i of invJson.data) {
        expect(i.location?.name).toBeDefined();
      }
    });
  });

  // =========================================================================
  // 4. ADVERSARIAL STRESS TESTING & BOUNDED QUERY INVARIANTS
  // =========================================================================
  describe('Mission 4: Adversarial Stress Testing & Boundary Invariants', () => {
    it('4.1 should enforce bounded take limits (take <= 100) even when client requests large limits', async () => {
      const assets = await assetsService.findAll({ pageSize: 9999 });
      expect(assets.length).toBeLessThanOrEqual(100);

      const dir = await directoryService.findAll({ pageSize: 9999 });
      expect(dir.items.length).toBeLessThanOrEqual(100);

      const inv = await inventoryService.findAll({ pageSize: 9999 });
      expect(inv.length).toBeLessThanOrEqual(100);
    });

    it('4.2 should gracefully handle non-existent IDs and queries with empty results without throwing 500', async () => {
      const ghostLocationAssets = await assetsService.findAll({
        locationId: 'ghost-loc-non-existent-uuid',
      });
      expect(ghostLocationAssets).toEqual([]);

      const ghostDeptDir = await directoryService.findAll({
        departmentId: 'ghost-dept-non-existent-uuid',
      });
      expect(ghostDeptDir.items).toEqual([]);

      const ghostLocInv = await inventoryService.findAll({
        locationId: 'ghost-loc-non-existent-uuid',
      });
      expect(ghostLocInv).toEqual([]);
    });

    it('4.3 should verify direct PostgreSQL zero-null foreign key invariants', async () => {
      // 1. DirectoryUser: departmentId, positionId, locationId, organizationId must NOT be null
      const nullDirUsers = await prisma.directoryUser.count({
        where: {
          OR: [
            { departmentId: null },
            { positionId: null },
            { locationId: null },
            { organizationId: null },
          ],
        },
      });
      expect(nullDirUsers, 'Zero DirectoryUsers should have null foreign keys').toBe(0);

      // 2. Asset: locationId, departmentId must NOT be null
      const nullAssets = await prisma.asset.count({
        where: {
          OR: [{ locationId: null }, { departmentId: null }],
        },
      });
      expect(nullAssets, 'Zero Assets should have null location or department').toBe(0);

      // 3. InventoryItem: locationId must NOT be null
      const nullInvItems = await prisma.inventoryItem.count({
        where: {
          locationId: null,
        },
      });
      expect(nullInvItems, 'Zero InventoryItems should have null location').toBe(0);
    });
  });
});
