import 'dotenv/config';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AccessAssignmentStatus,
  AccessSubjectType,
  AccessValidityType,
  DoorDocumentType,
  DoorSecurityLevel,
  DoorStatus,
  NonADUserStatus,
  PrismaClient,
} from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Challenger M2-1: Physical Access Control Empirical Verification Suite', () => {
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
  // 1. Exact Database Record Counts
  // ==========================================================================
  describe('1. Exact Database Record Counts', () => {
    it('should verify database is reachable', () => {
      expect(isDbAvailable).toBe(true);
    });

    it('should verify exact count: 8 AccessDoor records', async () => {
      const doorCount = await prisma.accessDoor.count();
      expect(doorCount).toBe(8);
    });

    it('should verify exact count: 5 NonADUser records', async () => {
      const nonADCount = await prisma.nonADUser.count();
      expect(nonADCount).toBe(5);
    });

    it('should verify exact count: 4 DoorAccessDocumentScan records', async () => {
      const scanCount = await prisma.doorAccessDocumentScan.count();
      expect(scanCount).toBe(4);
    });

    it('should verify exact count: 12 DoorAccessAssignment records', async () => {
      const assignmentCount = await prisma.doorAccessAssignment.count();
      expect(assignmentCount).toBe(12);
    });
  });

  // ==========================================================================
  // 2. Relational Integrity & Business Logic Invariants
  // ==========================================================================
  describe('2. Relational Integrity & Invariants', () => {
    it('should verify every DoorAccessAssignment links to an existing AccessDoor', async () => {
      const assignments = await prisma.doorAccessAssignment.findMany({
        select: { id: true, doorId: true },
      });
      expect(assignments.length).toBe(12);

      const doorIds = new Set(
        (await prisma.accessDoor.findMany({ select: { id: true } })).map((d) => d.id),
      );

      for (const a of assignments) {
        expect(doorIds.has(a.doorId)).toBe(true);
      }
    });

    it('should verify subject exclusivity: exactly one of directoryUserId or nonADUserId is present', async () => {
      const assignments = await prisma.doorAccessAssignment.findMany({
        select: {
          id: true,
          subjectType: true,
          directoryUserId: true,
          nonADUserId: true,
        },
      });

      const directoryUserIds = new Set(
        (await prisma.directoryUser.findMany({ select: { id: true } })).map((u) => u.id),
      );
      const nonADUserIds = new Set(
        (await prisma.nonADUser.findMany({ select: { id: true } })).map((u) => u.id),
      );

      let directoryUserAssignmentsCount = 0;
      let nonADUserAssignmentsCount = 0;

      for (const a of assignments) {
        if (a.subjectType === AccessSubjectType.DIRECTORY_USER) {
          expect(a.directoryUserId).not.toBeNull();
          expect(a.nonADUserId).toBeNull();
          expect(directoryUserIds.has(a.directoryUserId as string)).toBe(true);
          directoryUserAssignmentsCount++;
        } else if (a.subjectType === AccessSubjectType.NON_AD_USER) {
          expect(a.nonADUserId).not.toBeNull();
          expect(a.directoryUserId).toBeNull();
          expect(nonADUserIds.has(a.nonADUserId as string)).toBe(true);
          nonADUserAssignmentsCount++;
        } else {
          throw new Error(`Unexpected subjectType: ${String(a.subjectType)}`);
        }
      }

      // Check distribution: 6 DirectoryUser and 6 NonADUser (total 12)
      expect(directoryUserAssignmentsCount).toBe(6);
      expect(nonADUserAssignmentsCount).toBe(6);
    });

    it('should verify every assignment links to a valid GRANT document scan', async () => {
      const assignments = await prisma.doorAccessAssignment.findMany({
        include: { grantDocument: true },
      });

      for (const a of assignments) {
        expect(a.grantDocumentId).not.toBeNull();
        expect(a.grantDocument).not.toBeNull();
        expect(a.grantDocument?.documentType).toBe(DoorDocumentType.GRANT);
      }
    });

    it('should verify revoked assignments integrity: revocationDocument exists and status === REVOKED', async () => {
      const revokedAssignments = await prisma.doorAccessAssignment.findMany({
        where: { status: AccessAssignmentStatus.REVOKED },
        include: { revocationDocument: true },
      });

      // Seeder specifies 2 revoked assignments for David Miller (KPMG Auditor)
      expect(revokedAssignments.length).toBe(2);

      for (const a of revokedAssignments) {
        expect(a.status).toBe(AccessAssignmentStatus.REVOKED);
        expect(a.revocationDocumentId).not.toBeNull();
        expect(a.revocationDocument).not.toBeNull();
        expect(a.revocationDocument?.documentType).toBe(DoorDocumentType.REVOCATION);
        expect(a.revokedAt).not.toBeNull();
        expect(a.revokedById).not.toBeNull();
        expect(a.revocationReason).toBeTruthy();
      }
    });

    it('should verify active assignments do not possess a revocation document or revocation date', async () => {
      const activeAssignments = await prisma.doorAccessAssignment.findMany({
        where: { status: AccessAssignmentStatus.ACTIVE },
      });

      expect(activeAssignments.length).toBe(9);

      for (const a of activeAssignments) {
        expect(a.status).toBe(AccessAssignmentStatus.ACTIVE);
        expect(a.revocationDocumentId).toBeNull();
        expect(a.revokedAt).toBeNull();
        expect(a.revocationReason).toBeNull();
      }
    });

    it('should verify expired assignments have status EXPIRED and past validTo date', async () => {
      const expiredAssignments = await prisma.doorAccessAssignment.findMany({
        where: { status: AccessAssignmentStatus.EXPIRED },
      });

      expect(expiredAssignments.length).toBe(1);
      const expired = expiredAssignments[0];
      expect(expired.status).toBe(AccessAssignmentStatus.EXPIRED);
      expect(expired.validTo).not.toBeNull();
      expect(new Date(expired.validTo as Date).getTime()).toBeLessThan(Date.now());
    });
  });

  // ==========================================================================
  // 3. Mock Scan Files on Disk & SHA-256 Crypto Verification
  // ==========================================================================
  describe('3. Mock Scan Files on Disk & SHA-256 Crypto Verification', () => {
    it('should verify all 4 mock scan files exist on disk with matching SHA-256 and byte sizes', async () => {
      const scans = await prisma.doorAccessDocumentScan.findMany();
      expect(scans.length).toBe(4);

      // Base directory is apps/api/
      const apiDir = path.resolve(__dirname, '..');

      for (const scan of scans) {
        // Resolve path on disk
        const absolutePath = path.isAbsolute(scan.filePath)
          ? scan.filePath
          : path.resolve(apiDir, scan.filePath);

        expect(fs.existsSync(absolutePath)).toBe(true);

        const fileBuffer = fs.readFileSync(absolutePath);
        expect(fileBuffer.length).toBe(scan.fileSize);

        // Verify SHA-256 hash
        const computedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        expect(computedHash).toBe(scan.fileHash);

        // Verify valid PDF header
        const header = fileBuffer.subarray(0, 8).toString('utf-8');
        expect(header.startsWith('%PDF-1.')).toBe(true);

        // Verify URL format
        expect(scan.fileUrl).toBe(`/api/v1/access-control/documents/file/${scan.fileName}`);
      }
    });

    it('should verify distribution of document scan types: 3 GRANT and 1 REVOCATION', async () => {
      const grantScans = await prisma.doorAccessDocumentScan.count({
        where: { documentType: DoorDocumentType.GRANT },
      });
      const revocationScans = await prisma.doorAccessDocumentScan.count({
        where: { documentType: DoorDocumentType.REVOCATION },
      });

      expect(grantScans).toBe(3);
      expect(revocationScans).toBe(1);
    });
  });

  // ==========================================================================
  // 4. Schema Constraints & Stress Testing
  // ==========================================================================
  describe('4. Schema Constraints & Stress Testing', () => {
    it('should verify all doors have unique doorCodes and valid security levels', async () => {
      const doors = await prisma.accessDoor.findMany();
      expect(doors.length).toBe(8);

      const doorCodes = new Set(doors.map((d) => d.doorCode));
      expect(doorCodes.size).toBe(8);

      const validSecurityLevels: Array<DoorSecurityLevel> = [
        DoorSecurityLevel.STANDARD,
        DoorSecurityLevel.RESTRICTED,
        DoorSecurityLevel.HIGH,
        DoorSecurityLevel.CRITICAL,
      ];

      const validStatuses: Array<DoorStatus> = [
        DoorStatus.ACTIVE,
        DoorStatus.MAINTENANCE,
        DoorStatus.INACTIVE,
      ];

      for (const d of doors) {
        expect(validSecurityLevels).toContain(d.securityLevel);
        expect(validStatuses).toContain(d.status);
        expect(d.name).toBeTruthy();
        expect(d.building).toBeTruthy();
        expect(d.floor).toBeTruthy();
      }
    });

    it('should verify all non-AD users have unique badgeNumbers and valid company names', async () => {
      const users = await prisma.nonADUser.findMany();
      expect(users.length).toBe(5);

      const badges = new Set(users.map((u) => u.badgeNumber));
      expect(badges.size).toBe(5);

      const validStatuses: Array<NonADUserStatus> = [
        NonADUserStatus.ACTIVE,
        NonADUserStatus.INACTIVE,
        NonADUserStatus.BLACKLISTED,
      ];

      for (const u of users) {
        expect(validStatuses).toContain(u.status);
        expect(u.fullName).toBeTruthy();
        expect(u.identityNumber).toBeTruthy();
        expect(u.company).toBeTruthy();
      }
    });

    it('should verify AccessControl permissions are assigned to Admin role', async () => {
      const permissions = await prisma.permission.findMany({
        where: { subject: 'AccessControl' },
      });
      expect(permissions.length).toBeGreaterThanOrEqual(7);

      const adminRole = await prisma.role.findFirst({
        where: { name: { in: ['Admin', 'Super Admin'] } },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });

      expect(adminRole).not.toBeNull();
      const adminAccessControlPerms = adminRole?.permissions.filter(
        (rp) => rp.permission.subject === 'AccessControl',
      );
      expect(adminAccessControlPerms?.length).toBeGreaterThanOrEqual(7);
    });

    it('should reject insertion of duplicate doorCode via PostgreSQL unique constraint', async () => {
      let threwError = false;
      try {
        await prisma.accessDoor.create({
          data: {
            doorCode: 'DR-DC-01', // already exists
            name: 'Duplicate Door Attempt',
            building: 'Tower',
            floor: '1F',
          },
        });
      } catch (err: unknown) {
        threwError = true;
        expect(err).toBeDefined();
      }
      expect(threwError).toBe(true);
    });

    it('should reject insertion of duplicate badgeNumber for NonADUser', async () => {
      let threwError = false;
      try {
        await prisma.nonADUser.create({
          data: {
            badgeNumber: 'EXT-B0892', // already exists
            fullName: 'Duplicate Badge User',
            identityNumber: '000111222333',
            company: 'Faux Tech',
          },
        });
      } catch (err: unknown) {
        threwError = true;
        expect(err).toBeDefined();
      }
      expect(threwError).toBe(true);
    });

    it('should reject insertion of DoorAccessAssignment with non-existent doorId', async () => {
      let threwError = false;
      try {
        await prisma.doorAccessAssignment.create({
          data: {
            doorId: '00000000-0000-0000-0000-000000000000', // Non-existent door
            subjectType: AccessSubjectType.NON_AD_USER,
            accessType: AccessValidityType.PERMANENT,
            status: AccessAssignmentStatus.ACTIVE,
          },
        });
      } catch (err: unknown) {
        threwError = true;
        expect(err).toBeDefined();
      }
      expect(threwError).toBe(true);
    });
  });
});
