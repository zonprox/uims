import 'dotenv/config';
import * as crypto from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  decryptDirectoryPassword,
  isDirectoryPasswordEncrypted,
} from '../src/common/crypto/directory-crypto';

describe.skip('Challenger M1 Preview: Empirical PostgreSQL Edge-Case Verification Suite [SUPERSEDED by m1-1-adversarial-schema-stress.spec.ts & m1-2-rebuild-db-invariants.spec.ts]', () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;
  let isDbAvailable = false;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';
    try {
      pool = new Pool({
        connectionString,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 3000,
      });
      adapter = new PrismaPg(pool);
      prisma = new PrismaClient({ adapter });
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
    } catch (err: unknown) {
      isDbAvailable = false;
      console.error('Database connection failed in test setup:', err);
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  });

  // ==========================================================================
  // Domain 1: AppUsers Edge Cases & Demo Accounts
  // ==========================================================================
  describe('Domain 1: AppUsers Empirical Verification', () => {
    it('should verify total AppUsers count is 21', async () => {
      expect(isDbAvailable).toBe(true);
      const totalCount = await prisma.appUser.count();
      expect(totalCount).toBe(21);
    });

    it('should verify AppUsers status distribution covers ACTIVE, SUSPENDED, and INACTIVE', async () => {
      const activeCount = await prisma.appUser.count({ where: { status: 'ACTIVE' } });
      const suspendedCount = await prisma.appUser.count({ where: { status: 'SUSPENDED' } });
      const inactiveCount = await prisma.appUser.count({ where: { status: 'INACTIVE' } });

      expect(activeCount).toBe(19);
      expect(suspendedCount).toBe(1);
      expect(inactiveCount).toBe(1);

      // Verify specific edge-case users
      const quangTran = await prisma.appUser.findUnique({ where: { username: 'quang.tran' } });
      expect(quangTran).not.toBeNull();
      expect(quangTran?.status).toBe('SUSPENDED');
      expect(quangTran?.isLocked).toBe(false);

      const huongLe = await prisma.appUser.findUnique({ where: { username: 'huong.le' } });
      expect(huongLe).not.toBeNull();
      expect(huongLe?.status).toBe('INACTIVE');
      expect(huongLe?.mustChangePassword).toBe(true);
    });

    it('should verify locked active user (isLocked = true) exists', async () => {
      const thaoPham = await prisma.appUser.findUnique({ where: { username: 'thao.pham' } });
      expect(thaoPham).not.toBeNull();
      expect(thaoPham?.status).toBe('ACTIVE');
      expect(thaoPham?.isLocked).toBe(true);
    });

    it('should verify non-null lastLoginAt for active operator accounts', async () => {
      const usersWithLastLogin = await prisma.appUser.findMany({
        where: { lastLoginAt: { not: null } },
        select: { username: true, lastLoginAt: true },
      });

      expect(usersWithLastLogin.length).toBeGreaterThanOrEqual(3);
      const usernamesWithLogin = usersWithLastLogin.map((u) => u.username);
      expect(usernamesWithLogin).toContain('admin');
      expect(usernamesWithLogin).toContain('manager');
      expect(usernamesWithLogin).toContain('user');

      for (const u of usersWithLastLogin) {
        expect(u.lastLoginAt).toBeInstanceOf(Date);
        expect(u.lastLoginAt!.getTime()).toBeLessThanOrEqual(Date.now());
      }
    });

    it('should verify all 4 core demo accounts are active with salted bcrypt hashes', async () => {
      const demoUsers = await prisma.appUser.findMany({
        where: { username: { in: ['admin', 'manager', 'user', 'viewer'] } },
        include: { role: true },
      });

      expect(demoUsers.length).toBe(4);
      for (const u of demoUsers) {
        expect(u.status).toBe('ACTIVE');
        expect(u.isLocked).toBe(false);
        // Salted bcrypt 12 rounds check
        expect(u.passwordHash).toMatch(/^\$2[aby]\$12\$/);
      }

      // Verify role names
      const roleMap = new Map(demoUsers.map((u) => [u.username, u.role.name]));
      expect(roleMap.get('admin')).toBe('Admin');
      expect(roleMap.get('manager')).toBe('Manager');
      expect(roleMap.get('user')).toBe('User');
      expect(roleMap.get('viewer')).toBe('Viewer');
    });
  });

  // ==========================================================================
  // Domain 2: DirectoryUsers & Credential Encryption
  // ==========================================================================
  describe('Domain 2: DirectoryUsers & Credential Encryption Verification', () => {
    it('should verify total DirectoryUsers count and DISABLED account exists', async () => {
      const totalCount = await prisma.directoryUser.count();
      expect(totalCount).toBeGreaterThanOrEqual(30);

      const disabledUsers = await prisma.directoryUser.findMany({
        where: { status: 'DISABLED' },
      });
      expect(disabledUsers.length).toBeGreaterThanOrEqual(1);

      const hoangNguyen = await prisma.directoryUser.findUnique({
        where: { email: 'hoang.nguyen@youngonevn.com' },
      });
      expect(hoangNguyen).not.toBeNull();
      expect(hoangNguyen?.status).toBe('DISABLED');
      expect(hoangNguyen?.domainJoinStatus).toBe('NOT_JOINED');
      expect(hoangNguyen?.accountExpiresAt).not.toBeNull();
      expect(hoangNguyen?.accountExpiresAt!.getTime()).toBeLessThan(Date.now());
    });

    it('should verify contractor with expiring account exists', async () => {
      const tuanVu = await prisma.directoryUser.findUnique({
        where: { email: 'tuan.vu@youngonevn.com' },
      });
      expect(tuanVu).not.toBeNull();
      expect(tuanVu?.status).toBe('ACTIVE');
      expect(tuanVu?.domainJoinStatus).toBe('JOINED');
      expect(tuanVu?.accountExpiresAt).not.toBeNull();
      expect(tuanVu?.accountExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should verify onboarding user with PENDING domain join status exists', async () => {
      const huongDo = await prisma.directoryUser.findUnique({
        where: { email: 'huong.do@youngonevn.com' },
      });
      expect(huongDo).not.toBeNull();
      expect(huongDo?.status).toBe('ACTIVE');
      expect(huongDo?.domainJoinStatus).toBe('PENDING');
      expect(huongDo?.domainJoined).toBe(false);
    });

    it('should verify all seeded emailPassword and adInitialPassword start with enc:v1: and decrypt roundtrip cleanly', async () => {
      const usersWithCredentials = await prisma.directoryUser.findMany({
        where: {
          OR: [{ emailPassword: { not: null } }, { adInitialPassword: { not: null } }],
        },
        select: {
          email: true,
          emailPassword: true,
          adInitialPassword: true,
        },
      });

      expect(usersWithCredentials.length).toBeGreaterThanOrEqual(20);

      for (const u of usersWithCredentials) {
        if (u.emailPassword) {
          expect(u.emailPassword.startsWith('enc:v1:')).toBe(true);
          expect(isDirectoryPasswordEncrypted(u.emailPassword)).toBe(true);

          // Decrypt and verify
          const decrypted = decryptDirectoryPassword(u.emailPassword);
          expect(decrypted).not.toBeNull();
          expect(decrypted!.length).toBe(16);
          // Zero leak of plaintext
          expect(u.emailPassword).not.toBe(decrypted);
        }

        if (u.adInitialPassword) {
          expect(u.adInitialPassword.startsWith('enc:v1:')).toBe(true);
          expect(isDirectoryPasswordEncrypted(u.adInitialPassword)).toBe(true);

          // Decrypt and verify
          const decrypted = decryptDirectoryPassword(u.adInitialPassword);
          expect(decrypted).not.toBeNull();
          expect(decrypted!.length).toBe(16);
          // Zero leak of plaintext
          expect(u.adInitialPassword).not.toBe(decrypted);
        }
      }
    });
  });

  // ==========================================================================
  // Domain 3: Hardware Assets Fleet & Warranty Buckets
  // ==========================================================================
  describe('Domain 3: Hardware Assets Empirical Verification', () => {
    it('should verify total assets count is 102 with 5 required statuses', async () => {
      const totalCount = await prisma.asset.count();
      expect(totalCount).toBe(102);

      const allAssets = await prisma.asset.findMany({
        select: { status: true, parentId: true },
      });
      expect(allAssets.length).toBe(102);

      const statusCounts = allAssets.reduce(
        (acc, a) => {
          acc[a.status] = (acc[a.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Status distribution across entire asset inventory (device models + physical units)
      expect(statusCounts.AVAILABLE).toBe(44);
      expect(statusCounts.IN_USE).toBe(52);
      expect(statusCounts.MAINTENANCE).toBe(2);
      expect(statusCounts.RETIRED).toBe(2);
      expect(statusCounts.LOST).toBe(2);

      // Verify composition: 25 device model parents, 77 physical units
      const parentModels = allAssets.filter((a) => a.parentId === null);
      const physicalUnits = allAssets.filter((a) => a.parentId !== null);
      expect(parentModels.length).toBe(25);
      expect(physicalUnits.length).toBe(77);
    });

    it('should verify specific maintenance, retired, and lost asset subcodes exist', async () => {
      const units = await prisma.asset.findMany({
        where: {
          assetTag: {
            in: [
              'AST-DELL-MAINT-01',
              'AST-PREC-MAINT-01',
              'AST-DELL-RET-01',
              'AST-OPT-RET-01',
              'AST-MBP-LOST-01',
              'AST-TP-LOST-01',
            ],
          },
        },
        select: { assetTag: true, status: true, warrantyExpiry: true },
      });

      expect(units.length).toBe(6);
      const unitMap = new Map(units.map((u) => [u.assetTag, u]));

      expect(unitMap.get('AST-DELL-MAINT-01')?.status).toBe('MAINTENANCE');
      expect(unitMap.get('AST-PREC-MAINT-01')?.status).toBe('MAINTENANCE');
      expect(unitMap.get('AST-DELL-RET-01')?.status).toBe('RETIRED');
      expect(unitMap.get('AST-OPT-RET-01')?.status).toBe('RETIRED');
      expect(unitMap.get('AST-MBP-LOST-01')?.status).toBe('LOST');
      expect(unitMap.get('AST-TP-LOST-01')?.status).toBe('LOST');
    });

    it('should verify warranty expiry dates span expired (< now), 30-day expiring, and active (> 30d)', async () => {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiredAssets = await prisma.asset.findMany({
        where: {
          parentId: { not: null },
          warrantyExpiry: { lt: now },
        },
      });

      const expiringSoonAssets = await prisma.asset.findMany({
        where: {
          parentId: { not: null },
          warrantyExpiry: { gte: now, lte: in30Days },
        },
      });

      const activeWarrantyAssets = await prisma.asset.findMany({
        where: {
          parentId: { not: null },
          warrantyExpiry: { gt: in30Days },
        },
      });

      // Verify empirical warranty breakdown
      expect(expiredAssets.length).toBe(18);
      expect(expiringSoonAssets.length).toBe(10);
      expect(activeWarrantyAssets.length).toBe(49);
      expect(expiredAssets.length + expiringSoonAssets.length + activeWarrantyAssets.length).toBe(
        77,
      );

      // Verify specific boundary items in each category
      const expiredTags = expiredAssets.map((a) => a.assetTag);
      expect(expiredTags).toContain('AST-DELL-005');
      expect(expiredTags).toContain('AST-DELL-RET-01');
      expect(expiredTags).toContain('AST-TP-LOST-01');

      const expiringTags = expiringSoonAssets.map((a) => a.assetTag);
      expect(expiringTags).toContain('AST-DELL-004');
      expect(expiringTags).toContain('AST-PREC-MAINT-01');

      const activeTags = activeWarrantyAssets.map((a) => a.assetTag);
      expect(activeTags).toContain('AST-DELL-MAINT-01');
      expect(activeTags).toContain('AST-MBP-LOST-01');
    });
  });

  // ==========================================================================
  // Domain 4: Software Licenses (Depleted, Overallocated, Expired)
  // ==========================================================================
  describe('Domain 4: Software Licenses Empirical Verification', () => {
    it('should verify depleted licenses with 100% seat utilization (usedSeats === totalSeats)', async () => {
      const sapLicense = await prisma.license.findUnique({
        where: { id: 'lic-sap' },
        include: { assignments: true },
      });
      expect(sapLicense).not.toBeNull();
      expect(sapLicense?.totalSeats).toBe(6);
      expect(sapLicense?.assignments.length).toBe(6);

      const figmaLicense = await prisma.license.findUnique({
        where: { id: 'lic-figma' },
        include: { assignments: true },
      });
      expect(figmaLicense).not.toBeNull();
      expect(figmaLicense?.totalSeats).toBe(12);
      expect(figmaLicense?.assignments.length).toBe(12);
    });

    it('should verify overallocated license (usedSeats > totalSeats)', async () => {
      const jetbrains = await prisma.license.findUnique({
        where: { id: 'lic-jetbrains' },
        include: { assignments: true },
      });
      expect(jetbrains).not.toBeNull();
      expect(jetbrains?.totalSeats).toBe(8);
      expect(jetbrains?.assignments.length).toBe(9);
      expect(jetbrains!.assignments.length).toBeGreaterThan(jetbrains!.totalSeats);
    });

    it('should verify expired license (status = EXPIRED, expiry in past, autoRenew = false)', async () => {
      const autodesk = await prisma.license.findUnique({
        where: { id: 'lic-autodesk' },
      });
      expect(autodesk).not.toBeNull();
      expect(autodesk?.status).toBe('EXPIRED');
      expect(autodesk?.autoRenew).toBe(false);
      expect(autodesk?.expiryDate).not.toBeNull();
      expect(autodesk?.expiryDate!.getTime()).toBeLessThan(Date.now());
    });

    it('should verify expiring soon license (status = EXPIRING_SOON, expiring <= 30d)', async () => {
      const adobe = await prisma.license.findUnique({
        where: { id: 'lic-adobe' },
      });
      expect(adobe).not.toBeNull();
      expect(adobe?.status).toBe('EXPIRING_SOON');
      expect(adobe?.autoRenew).toBe(false);
      expect(adobe?.expiryDate).not.toBeNull();
      expect(adobe?.expiryDate!.getTime()).toBeGreaterThan(Date.now());
      const daysUntilExpiry = (adobe!.expiryDate!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      expect(daysUntilExpiry).toBeLessThanOrEqual(30);
    });
  });

  // ==========================================================================
  // Domain 5: Inventory Stockroom Threshold Boundary Conditions
  // ==========================================================================
  describe('Domain 5: Inventory Stockroom Threshold Verification', () => {
    it('should verify exact threshold boundary condition: quantity === minThreshold (30/30)', async () => {
      const zebraLabels = await prisma.inventoryItem.findUnique({
        where: { sku: 'LBL-ZBR-100X150' },
      });
      expect(zebraLabels).not.toBeNull();
      expect(zebraLabels?.quantity).toBe(30);
      expect(zebraLabels?.minThreshold).toBe(30);
      expect(zebraLabels?.quantity).toBe(zebraLabels?.minThreshold);
    });

    it('should verify low-stock items with 0 < quantity < minThreshold', async () => {
      const resinRibbon = await prisma.inventoryItem.findUnique({
        where: { sku: 'RBN-ZBR-110X300' },
      });
      expect(resinRibbon).not.toBeNull();
      expect(resinRibbon?.quantity).toBe(8);
      expect(resinRibbon?.minThreshold).toBe(15);
      expect(resinRibbon!.quantity).toBeLessThan(resinRibbon!.minThreshold);
      expect(resinRibbon!.quantity).toBeGreaterThan(0);

      const cutterBlades = await prisma.inventoryItem.findUnique({
        where: { sku: 'BLD-GB-CUT-8IN' },
      });
      expect(cutterBlades).not.toBeNull();
      expect(cutterBlades?.quantity).toBe(3);
      expect(cutterBlades?.minThreshold).toBe(6);
      expect(cutterBlades!.quantity).toBeLessThan(cutterBlades!.minThreshold);
      expect(cutterBlades!.quantity).toBeGreaterThan(0);
    });

    it('should verify zero-stock / stockout item: quantity === 0', async () => {
      const honeywellBattery = await prisma.inventoryItem.findUnique({
        where: { sku: 'BAT-HW-EDA51-LI' },
      });
      expect(honeywellBattery).not.toBeNull();
      expect(honeywellBattery?.quantity).toBe(0);
      expect(honeywellBattery?.minThreshold).toBe(4);
      expect(honeywellBattery?.quantity).toBe(0);
    });
  });

  // ==========================================================================
  // Domain 6: Network Subnet Utilization & IPAM IPAddress Rows
  // ==========================================================================
  describe('Domain 6: Network Subnet Utilization & IPAM IPAddress Records', () => {
    it('should verify HCM Corporate subnet (10.233.100.0/23) has >= 80% utilization and exact IPAddress rows', async () => {
      const hcmSubnet = await prisma.subnet.findUnique({
        where: { cidr: '10.233.100.0/23' },
      });
      expect(hcmSubnet).not.toBeNull();
      expect(hcmSubnet?.totalIps).toBe(510);
      expect(hcmSubnet?.usedIps).toBe(418);

      const utilization = (hcmSubnet!.usedIps / hcmSubnet!.totalIps) * 100;
      expect(utilization).toBeGreaterThanOrEqual(80.0);
      expect(utilization).toBeCloseTo(81.96, 1);

      // Verify actual matching IPAddress records exist in database
      const ipCount = await prisma.iPAddress.count({
        where: { subnetId: hcmSubnet!.id },
      });
      expect(ipCount).toBe(418);
    });

    it('should verify BSL Access Control subnet (10.232.130.0/24) has >= 90% utilization and exact IPAddress rows', async () => {
      const accessSubnet = await prisma.subnet.findUnique({
        where: { cidr: '10.232.130.0/24' },
      });
      expect(accessSubnet).not.toBeNull();
      expect(accessSubnet?.totalIps).toBe(254);
      expect(accessSubnet?.usedIps).toBe(235);

      const utilization = (accessSubnet!.usedIps / accessSubnet!.totalIps) * 100;
      expect(utilization).toBeGreaterThanOrEqual(90.0);
      expect(utilization).toBeCloseTo(92.52, 1);

      // Verify actual matching IPAddress records exist in database
      const ipCount = await prisma.iPAddress.count({
        where: { subnetId: accessSubnet!.id },
      });
      expect(ipCount).toBe(235);
    });

    it('should verify total IPAddress records count in database equals 657', async () => {
      const totalIps = await prisma.iPAddress.count();
      // 418 (HCM) + 235 (Access Control) + 4 (Management switch IPs) = 657
      expect(totalIps).toBe(657);
    });
  });

  // ==========================================================================
  // Domain 7: Audit Trail & Cryptographic HMAC-SHA256 Signatures
  // ==========================================================================
  describe('Domain 7: Audit Logs Empirical Verification', () => {
    it('should verify all 11 seeded governance audit records contain valid 64-char HMAC-SHA256 signatures', async () => {
      const seededLogs = await prisma.auditLog.findMany({
        where: { id: { startsWith: 'aud-' } },
      });
      expect(seededLogs.length).toBe(11);

      for (const log of seededLogs) {
        expect(log.hash).not.toBeNull();
        expect(typeof log.hash).toBe('string');
        expect(log.hash!.length).toBe(64);
        expect(log.hash).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it('should verify seeded audit logs have structured oldValue and newValue diffs', async () => {
      const seededLogs = await prisma.auditLog.findMany({
        where: { id: { startsWith: 'aud-' } },
      });

      for (const log of seededLogs) {
        // Either oldValue or newValue must be populated
        const hasStructuredPayload = log.oldValue !== null || log.newValue !== null;
        expect(hasStructuredPayload).toBe(true);

        if (log.oldValue) {
          expect(typeof log.oldValue).toBe('object');
        }
        if (log.newValue) {
          expect(typeof log.newValue).toBe('object');
        }
      }

      // Check specific update log (aud-003: license assignment)
      const aud003 = seededLogs.find((l) => l.id === 'aud-003');
      expect(aud003).toBeDefined();
      expect(aud003?.oldValue).not.toBeNull();
      expect(aud003?.newValue).not.toBeNull();
      const oldVal = aud003?.oldValue as Record<string, unknown>;
      const newVal = aud003?.newValue as Record<string, unknown>;
      expect(oldVal.status).toBe('AVAILABLE');
      expect(newVal.status).toBe('IN_USE');

      // Check aud-007 (Asset Maintenance transition)
      const aud007 = seededLogs.find((l) => l.id === 'aud-007');
      expect(aud007).toBeDefined();
      expect(aud007?.oldValue).not.toBeNull();
      expect(aud007?.newValue).not.toBeNull();
      const oldVal007 = aud007?.oldValue as Record<string, unknown>;
      const newVal007 = aud007?.newValue as Record<string, unknown>;
      expect(oldVal007.status).toBe('IN_USE');
      expect(newVal007.status).toBe('MAINTENANCE');
    });

    it('should verify zero plaintext passwords or secrets in audit payloads', async () => {
      const seededLogs = await prisma.auditLog.findMany({
        where: { id: { startsWith: 'aud-' } },
      });

      for (const log of seededLogs) {
        const payloadStr = JSON.stringify({
          oldValue: log.oldValue,
          newValue: log.newValue,
          diffPayload: log.diffPayload,
          details: log.details,
        });

        expect(payloadStr).not.toContain('passwordHash');
        expect(payloadStr).not.toContain('jwt_secret');
        expect(payloadStr).not.toContain('audit_signing_key');
        expect(payloadStr).not.toContain('license_encryption_key');
      }
    });
  });

  // ==========================================================================
  // Domain 8: Organization & Topology Inactive Branches & Junior Positions
  // ==========================================================================
  describe('Domain 8: Organization Topology Edge Cases', () => {
    it('should verify inactive branch BSD exists with status INACTIVE', async () => {
      const bsdOrg = await prisma.organization.findUnique({
        where: { code: 'BSD' },
      });
      expect(bsdOrg).not.toBeNull();
      expect(bsdOrg?.status).toBe('INACTIVE');
    });

    it('should verify archived legacy department DEPT-BSL-LEGACY-CUT has status INACTIVE', async () => {
      const legacyDept = await prisma.department.findUnique({
        where: { code: 'DEPT-BSL-LEGACY-CUT' },
      });
      expect(legacyDept).not.toBeNull();
      expect(legacyDept?.status).toBe('INACTIVE');
    });

    it('should verify junior positions exist with level Junior', async () => {
      const juniorPositions = await prisma.position.findMany({
        where: { level: 'Junior' },
      });
      expect(juniorPositions.length).toBeGreaterThanOrEqual(2);
      const codes = juniorPositions.map((p) => p.code);
      expect(codes).toContain('POS-BSL-F1-CUT-INT');
      expect(codes).toContain('POS-BSH-IT-JR');
    });
  });
});
