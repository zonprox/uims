/**
 * Milestone 4 — 12-Domain E2E Seeding Verification Suite
 *
 * Target File Location: apps/api/test/m4-e2e-verification.spec.ts
 *
 * Verifies genuine database records, referential integrity, cryptographic invariants,
 * bitwise IPAM subnet calculations, and operational telemetry across all 12 operational domains:
 *   1. Organizations (3 entities, hierarchy, tax IDs)
 *   2. Spatial Locations (330 locations, 0 orphaned, 24 critical facilities)
 *   3. Departments (93 departments, 85 BSL / 8 BSH, 0 orphaned parents)
 *   4. Positions (24 corporate positions linked to departments)
 *   5. Roles, Permissions & AppUsers (4 roles, 66 perms, 117 role-perms, 18 users with 12-round bcrypt)
 *   6. Directory Users & Groups (32 DirectoryUsers, 6 groups, 64 memberships, dual-group policy)
 *   7. Taxonomy (11 AssetCategories, 5 InventoryCategories, zero obsolete categories)
 *   8. Vendors (12 Enterprise Vendors with websites and emails)
 *   9. Hardware Assets (43 assets, 100% FK integrity, Dell PowerEdge R750 AST-1009 & R660 AST-1017)
 *  10. Inventory (27 items, non-negative quantities, valid thresholds, Cat6 patch cable CBL-CAT6-UTP-3M)
 *  11. Network Infrastructure (21 subnets with bitwise IPAM, 20 VLANs, 3 racks, 4 switches [16P/24P/48P], 128 ports with AST-1009/1017 uplinks)
 *  12. Licenses & Governance (7 AES-256-GCM encrypted licenses decrypting cleanly, 34 synchronized assignments, 6 audit logs, 5 notifications, 4 report schedules, settings)
 */

import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { decryptLicenseKey } from '../src/common/crypto/license-crypto';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

describe('Milestone 4 — 12-Domain E2E Seeding Verification Suite', () => {
  let prisma: PrismaClient;
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
        // Safe disconnection fallback
      }
    }
  });

  // =========================================================================
  // DOMAIN 1: ORGANIZATIONS
  // =========================================================================
  describe('Domain 1: Corporate Hierarchy & Organizations', () => {
    it('1.1 should verify exactly 3 organizations with correct hierarchy and tax IDs', async () => {
      const orgs = await prisma.organization.findMany({
        orderBy: [{ code: 'asc' }, { id: 'asc' }],
      });

      expect(orgs.length).toBe(3);

      const holding = orgs.find((o) => o.code === 'HOLDING');
      const bsl = orgs.find((o) => o.code === 'BSL');
      const bsh = orgs.find((o) => o.code === 'BSH');

      expect(holding).toBeDefined();
      expect(bsl).toBeDefined();
      expect(bsh).toBeDefined();

      // Holding Invariants
      expect(holding!.id).toBe('org-holding');
      expect(holding!.parentId).toBeNull();
      expect(holding!.name).toBe('Youngone / Broadpeak Group');
      expect(holding!.taxId).toBe('0100100100');
      expect(holding!.status).toBe('ACTIVE');

      // Subsidiaries reference Holding
      expect(bsl!.id).toBe('org-bsl');
      expect(bsl!.parentId).toBe(holding!.id);
      expect(bsl!.name).toBe('Broadpeak Soc Trang');
      expect(bsl!.taxId).toBe('2200194820');
      expect(bsl!.status).toBe('ACTIVE');

      expect(bsh!.id).toBe('org-bsh');
      expect(bsh!.parentId).toBe(holding!.id);
      expect(bsh!.name).toBe('Broadpeak Ho Chi Minh');
      expect(bsh!.taxId).toBe('0314892019');
      expect(bsh!.status).toBe('ACTIVE');
    });
  });

  // =========================================================================
  // DOMAIN 2: SPATIAL LOCATIONS
  // =========================================================================
  describe('Domain 2: Spatial Locations & Hierarchy', () => {
    it('2.1 should verify 330 locations, 0 orphaned locations, and all 24 critical facilities', async () => {
      const locations = await prisma.location.findMany({
        orderBy: [{ id: 'asc' }],
      });

      expect(locations.length).toBe(330);

      // Verify zero orphaned locations
      const locationIdSet = new Set(locations.map((l) => l.id));
      for (const loc of locations) {
        if (loc.parentId !== null) {
          expect(
            locationIdSet.has(loc.parentId),
            `Location ${loc.id} references non-existent parentId ${loc.parentId}`,
          ).toBe(true);
        }
      }

      // Verify root locations (parentId is null)
      const rootLocations = locations.filter((l) => l.parentId === null);
      expect(rootLocations.length).toBe(3);
      const rootIds = rootLocations.map((l) => l.id);
      expect(rootIds).toContain('loc-bsh-d7');
      expect(rootIds).toContain('loc-bsh-d3');
      expect(rootIds).toContain('loc-bsl-st');

      // Verify 24 critical locations are present
      const criticalLocationIds = [
        'loc-bsh-d7',
        'loc-bsh-d3',
        'loc-bsl-st',
        'loc-bsl-bc',
        'loc-bsl-bc-exec',
        'loc-bsl-bc-imex',
        'loc-bsl-bc-acc',
        'loc-bsl-bc-admin',
        'loc-bsl-bc-hr',
        'loc-bsl-bc-datacenter',
        'loc-bsl-bc-tech',
        'loc-bsl-lab-qa',
        'loc-bsl-wh',
        'loc-bsl-wh-raw',
        'loc-bsl-wh-fg',
        'loc-bsl-wh-sp',
        'loc-bsl-f1',
        'loc-bsl-f2',
        'loc-bsl-f3',
        'loc-bsl-f4',
        'loc-bsl-f5',
        'loc-bsl-f6',
        'loc-bsl-f7',
        'loc-bsl-wh-sp-bin09',
      ];

      for (const cid of criticalLocationIds) {
        expect(locationIdSet.has(cid), `Missing critical location ${cid}`).toBe(true);
      }
    });
  });

  // =========================================================================
  // DOMAIN 3: DEPARTMENTS
  // =========================================================================
  describe('Domain 3: Departments & Organizational Mapping', () => {
    it('3.1 should verify 93 departments linked to organizations with 0 orphaned parents', async () => {
      const departments = await prisma.department.findMany({
        orderBy: [{ code: 'asc' }, { id: 'asc' }],
      });

      expect(departments.length).toBe(93);

      const deptIdSet = new Set(departments.map((d) => d.id));
      let bslCount = 0;
      let bshCount = 0;

      for (const dept of departments) {
        expect(['org-bsl', 'org-bsh']).toContain(dept.organizationId);
        if (dept.organizationId === 'org-bsl') bslCount++;
        if (dept.organizationId === 'org-bsh') bshCount++;

        if (dept.parentId !== null) {
          expect(
            deptIdSet.has(dept.parentId),
            `Department ${dept.id} (${dept.code}) references non-existent parentId ${dept.parentId}`,
          ).toBe(true);
        }
      }

      expect(bslCount).toBe(85);
      expect(bshCount).toBe(8);

      // Verify core leadership departments exist
      const deptCodes = departments.map((d) => d.code);
      expect(deptCodes).toContain('DEPT-BSL-MGMT');
      expect(deptCodes).toContain('DEPT-BSL-IT');
      expect(deptCodes).toContain('DEPT-BSH-EXEC');
      expect(deptCodes).toContain('DEPT-BSH-IT');
    });
  });

  // =========================================================================
  // DOMAIN 4: POSITIONS
  // =========================================================================
  describe('Domain 4: Standardized Corporate Positions', () => {
    it('4.1 should verify exactly 24 positions linked to valid departments with valid levels', async () => {
      const positions = await prisma.position.findMany({
        include: { department: true },
        orderBy: [{ code: 'asc' }, { id: 'asc' }],
      });

      expect(positions.length).toBe(24);

      const validLevels = ['Executive', 'Director', 'Manager', 'Lead', 'Senior', 'Mid'];
      for (const pos of positions) {
        expect(pos.departmentId).not.toBeNull();
        expect(pos.department).toBeDefined();
        expect(validLevels).toContain(pos.level);
        expect(pos.status).toBe('ACTIVE');
      }

      const posCodes = positions.map((p) => p.code);
      expect(posCodes).toContain('POS-BSL-GM');
      expect(posCodes).toContain('POS-BSL-IT-MGR');
      expect(posCodes).toContain('POS-BSH-MD');
      expect(posCodes).toContain('POS-BSH-IT-ARCH');
    });
  });

  // =========================================================================
  // DOMAIN 5: ROLES, PERMISSIONS & APPUSERS
  // =========================================================================
  describe('Domain 5: RBAC Governance, Least Privilege & AppUsers', () => {
    it('5.1 should verify 4 roles, 66 permissions, and 117 role-permission mappings', async () => {
      const roles = await prisma.role.findMany({
        include: { permissions: true },
        orderBy: [{ name: 'asc' }],
      });

      expect(roles.length).toBe(4);
      const roleNames = roles.map((r) => r.name);
      expect(roleNames).toEqual(['Admin', 'Manager', 'User', 'Viewer']);

      const permissions = await prisma.permission.findMany();
      expect(permissions.length).toBe(66);

      const adminRole = roles.find((r) => r.name === 'Admin');
      const managerRole = roles.find((r) => r.name === 'Manager');
      const userRole = roles.find((r) => r.name === 'User');
      const viewerRole = roles.find((r) => r.name === 'Viewer');

      expect(adminRole!.permissions.length).toBe(66);
      expect(managerRole!.permissions.length).toBe(33);
      expect(userRole!.permissions.length).toBe(9);
      expect(viewerRole!.permissions.length).toBe(9);

      const totalRolePerms = await prisma.rolePermission.count();
      expect(totalRolePerms).toBe(117);
    });

    it('5.2 should verify 18 AppUsers with 100% 12-round bcrypt password hashes and 0 plaintext secrets', async () => {
      const appUsers = await prisma.appUser.findMany({
        include: { role: true },
        orderBy: [{ email: 'asc' }],
      });

      expect(appUsers.length).toBe(18);

      for (const user of appUsers) {
        expect(user.roleId).not.toBeNull();
        expect(user.role).toBeDefined();
        expect(user.status).toBe('ACTIVE');

        // Verify salted bcrypt with 12 rounds ($2a$12$ or $2b$12$)
        expect(
          user.passwordHash.startsWith('$2a$12$') || user.passwordHash.startsWith('$2b$12$'),
          `User ${user.email} does not possess 12-round bcrypt hash`,
        ).toBe(true);
        expect(user.passwordHash.length).toBe(60);

        // Verify no plaintext passwords or default secrets
        expect(user.passwordHash).not.toContain('Youngone@2026');
        expect(user.passwordHash).not.toContain('Admin@123');
      }

      const emails = appUsers.map((u) => u.email);
      expect(emails).toContain('admin@youngonevn.com');
      expect(emails).toContain('manager@youngonevn.com');
      expect(emails).toContain('user@youngonevn.com');
      expect(emails).toContain('viewer@youngonevn.com');
    });
  });

  // =========================================================================
  // DOMAIN 6: DIRECTORY USERS & GROUPS
  // =========================================================================
  describe('Domain 6: Active Directory Users, Groups & Memberships', () => {
    it('6.1 should verify 32 DirectoryUsers with 100% non-null relational foreign keys', async () => {
      const directoryUsers = await prisma.directoryUser.findMany({
        orderBy: [{ email: 'asc' }],
      });

      expect(directoryUsers.length).toBe(32);

      for (const du of directoryUsers) {
        expect(du.organizationId).not.toBeNull();
        expect(du.departmentId).not.toBeNull();
        expect(du.locationId).not.toBeNull();
        expect(du.positionId).not.toBeNull();
        expect(du.email).toContain('@youngonevn.com');
        expect(du.employeeCode).toBeTruthy();
      }
    });

    it('6.2 should verify 6 DirectoryGroups and 64 DirectoryMemberships adhering to dual-group policy', async () => {
      const groups = await prisma.directoryGroup.findMany({
        include: { memberships: true },
        orderBy: [{ id: 'asc' }],
      });

      expect(groups.length).toBe(6);

      const allWorkforce = groups.find((g) => g.id === 'grp-all-broadpeak');
      expect(allWorkforce).toBeDefined();
      expect(allWorkforce!.memberships.length).toBe(32);

      const totalMemberships = await prisma.directoryMembership.count();
      expect(totalMemberships).toBe(64);

      // Verify each DirectoryUser has exactly 2 memberships: All-Workforce + Functional Security Group
      const userMembershipCounts = await prisma.directoryMembership.groupBy({
        by: ['userId'],
        _count: { groupId: true },
      });

      expect(userMembershipCounts.length).toBe(32);
      for (const um of userMembershipCounts) {
        expect(um._count.groupId).toBe(2);
      }
    });
  });

  // =========================================================================
  // DOMAIN 7: TAXONOMY
  // =========================================================================
  describe('Domain 7: Asset and Inventory Taxonomy Categories', () => {
    it('7.1 should verify 11 Asset Categories and 5 Inventory Categories with zero obsolete categories', async () => {
      const assetCategories = await prisma.assetCategory.findMany({
        orderBy: [{ id: 'asc' }],
      });
      expect(assetCategories.length).toBe(11);
      const assetCatIds = assetCategories.map((c) => c.id);
      expect(assetCatIds).toContain('cat-laptop');
      expect(assetCatIds).toContain('cat-desktop');
      expect(assetCatIds).toContain('cat-server');
      expect(assetCatIds).toContain('cat-switch');
      expect(assetCatIds).toContain('cat-router');
      expect(assetCatIds).toContain('cat-ap');

      const invCategories = await prisma.inventoryCategory.findMany({
        orderBy: [{ id: 'asc' }],
      });
      expect(invCategories.length).toBe(5);
      const invCatIds = invCategories.map((c) => c.id);
      expect(invCatIds).toContain('inv-cat-fabrics');
      expect(invCatIds).toContain('inv-cat-accessories');
      expect(invCatIds).toContain('inv-cat-finished-goods');
      expect(invCatIds).toContain('inv-cat-spares');
      expect(invCatIds).toContain('inv-cat-it-consumables');

      // Obsolete categories must not exist
      expect(assetCatIds).not.toContain('cat-sewing');
      expect(assetCatIds).not.toContain('cat-cutting');
      expect(invCatIds).not.toContain('inv-cat-cables');
    });
  });

  // =========================================================================
  // DOMAIN 8: VENDORS
  // =========================================================================
  describe('Domain 8: Enterprise Vendors', () => {
    it('8.1 should verify 12 canonical enterprise vendors with valid websites and contact details', async () => {
      const vendors = await prisma.vendor.findMany({
        orderBy: [{ id: 'asc' }],
      });

      expect(vendors.length).toBe(12);

      for (const v of vendors) {
        expect(v.name).toBeTruthy();
        expect(v.contactEmail).toContain('@');
        expect(v.website).toMatch(/^https:\/\//);
      }

      const vendorIds = vendors.map((v) => v.id);
      expect(vendorIds).toContain('ven-dell');
      expect(vendorIds).toContain('ven-cisco');
      expect(vendorIds).toContain('ven-sap');
      expect(vendorIds).toContain('ven-msft');
      expect(vendorIds).toContain('ven-lectra');
      expect(vendorIds).toContain('ven-gerber');
    });
  });

  // =========================================================================
  // DOMAIN 9: HARDWARE PHYSICAL ASSETS
  // =========================================================================
  describe('Domain 9: Physical Hardware Assets & Enterprise Server Hosts', () => {
    it('9.1 should verify hardware assets fleet and mission-critical Dell PowerEdge servers', async () => {
      const assets = await prisma.asset.findMany({
        include: { category: true, location: true, department: true },
        orderBy: [{ assetTag: 'asc' }],
      });

      expect(assets.length).toBeGreaterThanOrEqual(32);
      expect(assets.length).toBe(43);

      for (const a of assets) {
        expect(a.categoryId).not.toBeNull();
        expect(a.category).toBeDefined();
        expect(a.locationId).not.toBeNull();
        expect(a.location).toBeDefined();
        expect(a.departmentId).not.toBeNull();
        expect(a.department).toBeDefined();
        expect(['IN_USE', 'AVAILABLE']).toContain(a.status);
      }

      // Critical Dell Enterprise Servers
      const ast1009 = assets.find((a) => a.assetTag === 'AST-1009');
      expect(ast1009).toBeDefined();
      expect(ast1009!.model).toBe('PowerEdge R750 2U');
      expect(ast1009!.serialNumber).toBe('7N991A2-BSL');
      expect(ast1009!.locationId).toBe('loc-bsl-bc-datacenter');
      expect(ast1009!.categoryId).toBe('cat-server');

      const ast1017 = assets.find((a) => a.assetTag === 'AST-1017');
      expect(ast1017).toBeDefined();
      expect(ast1017!.model).toBe('PowerEdge R660 1U');
      expect(ast1017!.serialNumber).toBe('9K114B3-BSL');
      expect(ast1017!.locationId).toBe('loc-bsl-bc-datacenter');
      expect(ast1017!.categoryId).toBe('cat-server');
    });
  });

  // =========================================================================
  // DOMAIN 10: INVENTORY
  // =========================================================================
  describe('Domain 10: Warehouse Stockroom Inventory', () => {
    it('10.1 should verify 27 inventory items with non-negative quantities and CBL-CAT6-UTP-3M', async () => {
      const items = await prisma.inventoryItem.findMany({
        include: { category: true, location: true },
        orderBy: [{ sku: 'asc' }],
      });

      expect(items.length).toBe(27);

      for (const item of items) {
        expect(item.quantity).toBeGreaterThanOrEqual(0);
        expect(item.minThreshold).toBeGreaterThanOrEqual(0);
        expect(item.unitCost).toBeGreaterThan(0);
        expect(item.categoryId).not.toBeNull();
        expect(item.category).toBeDefined();
        expect(item.locationId).not.toBeNull();
        expect(item.location).toBeDefined();
      }

      // Critical patch cable item
      const patchCable = items.find((i) => i.sku === 'CBL-CAT6-UTP-3M');
      expect(patchCable).toBeDefined();
      expect(patchCable!.quantity).toBe(150);
      expect(patchCable!.minThreshold).toBe(40);
      expect(patchCable!.unitCost).toBe(3.2);
      expect(patchCable!.locationId).toBe('loc-bsl-wh-sp-bin09');
      expect(patchCable!.categoryId).toBe('inv-cat-it-consumables');
    });
  });

  // =========================================================================
  // DOMAIN 11: NETWORK INFRASTRUCTURE
  // =========================================================================
  describe('Domain 11: Network Infrastructure & Telemetry', () => {
    it('11.1 should verify 21 subnets with bitwise IPAM calculation and 20 VLANs', async () => {
      const subnets = await prisma.subnet.findMany({
        include: { vlan: true },
        orderBy: [{ cidr: 'asc' }],
      });

      expect(subnets.length).toBe(21);

      for (const s of subnets) {
        expect(s.gateway).toBeTruthy();
        expect(s.networkAddress).toBeTruthy();
        expect(s.netmask).toBeTruthy();
        expect(s.broadcastAddress).toBeTruthy();
        expect(s.totalIps).toBeGreaterThan(0);
        expect(s.vlanId).not.toBeNull();
        expect(s.vlan).toBeDefined();
      }

      // Verify specific bitwise calculation for 10.232.100.0/24
      const serverSubnet = subnets.find((s) => s.cidr === '10.232.100.0/24');
      expect(serverSubnet).toBeDefined();
      expect(serverSubnet!.netmask).toBe('255.255.255.0');
      expect(serverSubnet!.networkAddress).toBe('10.232.100.0');
      expect(serverSubnet!.broadcastAddress).toBe('10.232.100.255');
      expect(serverSubnet!.totalIps).toBe(254);

      const vlans = await prisma.vLAN.findMany();
      expect(vlans.length).toBe(20);
    });

    it('11.2 should verify 3 racks and 4 switches with hardware port diversity (16P, 24P, 48P)', async () => {
      const racks = await prisma.networkRack.findMany({
        orderBy: [{ code: 'asc' }],
      });
      expect(racks.length).toBe(3);
      const rackCodes = racks.map((r) => r.code);
      expect(rackCodes).toEqual(['RACK-DC01', 'RACK-DC02', 'RACK-F1-IDF']);

      const switches = await prisma.networkSwitch.findMany({
        orderBy: [{ name: 'asc' }],
      });
      expect(switches.length).toBe(4);

      const coreSw = switches.find((s) => s.name === 'BSL-CORE-SW01');
      const distSw = switches.find((s) => s.name === 'BSL-DIST-SW01');
      const accSw = switches.find((s) => s.name === 'BSL-F1-ACC01');
      const idfSw = switches.find((s) => s.name === 'BSL-F1-IDF01');

      expect(coreSw!.totalPorts).toBe(48);
      expect(distSw!.totalPorts).toBe(24);
      expect(accSw!.totalPorts).toBe(24);
      expect(idfSw!.totalPorts).toBe(16);
    });

    it('11.3 should verify 128 switch ports with tri-state telemetry and genuine server uplinks to AST-1009/AST-1017', async () => {
      const ports = await prisma.switchPort.findMany({
        orderBy: [{ switchId: 'asc' }, { portNumber: 'asc' }],
      });

      expect(ports.length).toBe(128);

      const coreSw = await prisma.networkSwitch.findUnique({
        where: { serialNumber: 'FOC2488102' },
      });
      expect(coreSw).toBeDefined();

      const ast1009 = await prisma.asset.findUnique({ where: { assetTag: 'AST-1009' } });
      const ast1017 = await prisma.asset.findUnique({ where: { assetTag: 'AST-1017' } });
      expect(ast1009).toBeDefined();
      expect(ast1017).toBeDefined();

      const port1 = ports.find((p) => p.switchId === coreSw!.id && p.portNumber === 1);
      const port2 = ports.find((p) => p.switchId === coreSw!.id && p.portNumber === 2);

      expect(port1).toBeDefined();
      expect(port1!.connectedAssetId).toBe(ast1009!.id);
      expect(port1!.operStatus).toBe('ACTIVE');

      expect(port2).toBeDefined();
      expect(port2!.connectedAssetId).toBe(ast1017!.id);
      expect(port2!.operStatus).toBe('ACTIVE');

      // Verify presence of diverse operational statuses
      const operStatuses = new Set(ports.map((p) => p.operStatus));
      expect(operStatuses.has('ACTIVE')).toBe(true);
      expect(operStatuses.has('DOWN')).toBe(true);
      expect(operStatuses.has('CONNECTED_NO_SIGNAL')).toBe(true);
      expect(operStatuses.has('RESERVED')).toBe(true);
    });
  });

  // =========================================================================
  // DOMAIN 12: LICENSES, GOVERNANCE & OPS
  // =========================================================================
  describe('Domain 12: Software Licenses Cryptography & Operational Governance', () => {
    it('12.1 should verify 7 licenses with AES-256-GCM encryption decrypting cleanly', async () => {
      const licenses = await prisma.license.findMany({
        orderBy: [{ id: 'asc' }],
      });

      expect(licenses.length).toBe(7);

      for (const lic of licenses) {
        expect(lic.licenseKey.startsWith('enc:v1:')).toBe(true);
        const decrypted = decryptLicenseKey(lic.licenseKey, { throwOnError: true });
        expect(decrypted).toBeTruthy();
        expect(decrypted).not.toContain('FAILED');
      }

      const licIds = licenses.map((l) => l.id);
      expect(licIds).toEqual([
        'lic-adobe',
        'lic-cisco',
        'lic-fastreact',
        'lic-gerber',
        'lic-lectra',
        'lic-m365',
        'lic-sap',
      ]);
    });

    it('12.2 should verify 34 license assignments with 100% seat synchronization', async () => {
      const licenses = await prisma.license.findMany({
        include: { assignments: true },
        orderBy: [{ id: 'asc' }],
      });

      let totalActiveAssignments = 0;
      for (const lic of licenses) {
        const activeAssignments = lic.assignments.filter((a) => a.unassignedAt === null);
        expect(lic.usedSeats).toBe(activeAssignments.length);
        totalActiveAssignments += activeAssignments.length;
      }

      expect(totalActiveAssignments).toBe(34);
    });

    it('12.3 should verify seeded audit logs, notifications, report schedules, and system settings', async () => {
      // Seeded audit logs (aud-001 through aud-006)
      const seededAudits = await prisma.auditLog.findMany({
        where: { id: { startsWith: 'aud-' } },
        orderBy: [{ id: 'asc' }],
      });

      expect(seededAudits.length).toBe(6);
      const auditIds = seededAudits.map((a) => a.id);
      expect(auditIds).toEqual(['aud-001', 'aud-002', 'aud-003', 'aud-004', 'aud-005', 'aud-006']);

      const aud006 = seededAudits.find((a) => a.id === 'aud-006');
      expect(aud006!.entityType).toBe('Inventory');
      expect(aud006!.entity).toBe('CBL-CAT6-UTP-3M');

      // Notifications
      const notifications = await prisma.notification.findMany({
        orderBy: [{ id: 'asc' }],
      });
      expect(notifications.length).toBe(5);

      // Report Schedules
      const reports = await prisma.reportSchedule.findMany({
        orderBy: [{ id: 'asc' }],
      });
      expect(reports.length).toBe(4);
      const repIds = reports.map((r) => r.id);
      expect(repIds).toEqual([
        'rep-asset-val',
        'rep-license-audit',
        'rep-network-cap',
        'rep-stock-audit',
      ]);

      // System Settings
      const settings = await prisma.setting.findMany();
      expect(settings.length).toBeGreaterThanOrEqual(3);
      const settingKeys = settings.map((s) => s.key);
      expect(settingKeys).toContain('general');
      expect(settingKeys).toContain('security');
      expect(settingKeys).toContain('notifications');
    });
  });
});
