import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../src/database/prisma.service';
import { AuditService } from '../../src/modules/audit/audit.service';
import { resolveDescendantLocationIds } from '../../src/modules/organization/location-tree.util';
import { OrganizationService } from '../../src/modules/organization/organization.service';
import { UsersService } from '../../src/modules/users/users.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Milestone 2 Challenger 1 — Deterministic Ordering & Query Ceilings Adversarial Verification', () => {
  let prisma: PrismaClient;
  let auditService: AuditService;
  let usersService: UsersService;
  let orgService: OrganizationService;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for empirical challenger test suite');
    }
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });

    auditService = new AuditService(prisma as unknown as PrismaService);
    usersService = new UsersService(prisma as unknown as PrismaService);
    orgService = new OrganizationService(prisma as unknown as PrismaService);

    // Clean up any stale test fixtures before test execution
    await prisma.auditLog.deleteMany({
      where: { action: { startsWith: 'CHALLENGER_TEST_' } },
    });
    await prisma.appUser.deleteMany({
      where: { email: { contains: 'challenger_test_' } },
    });
  });

  afterAll(async () => {
    // Teardown test fixtures
    await prisma.auditLog.deleteMany({
      where: { action: { startsWith: 'CHALLENGER_TEST_' } },
    });
    await prisma.appUser.deleteMany({
      where: { email: { contains: 'challenger_test_' } },
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // MISSION 1: QUERY CEILING ENFORCEMENT & CLAMPING STRESS TESTING
  // =========================================================================
  describe('Mission 1: Query Ceiling Clamping (take: 500 / 2000 clamping to <= 100)', () => {
    let mockPrisma: Record<
      string,
      {
        findMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        update?: ReturnType<typeof vi.fn>;
      }
    >;
    let mockAuditService: AuditService;
    let mockUsersService: UsersService;
    let mockOrgService: OrganizationService;

    beforeEach(() => {
      mockPrisma = {
        auditLog: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        appUser: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        role: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        directoryGroup: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        organization: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        department: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        position: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        location: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          update: vi.fn().mockResolvedValue({}),
        },
      };

      mockAuditService = new AuditService(mockPrisma as unknown as PrismaService);
      mockUsersService = new UsersService(mockPrisma as unknown as PrismaService);
      mockOrgService = new OrganizationService(mockPrisma as unknown as PrismaService);
    });

    it('1.1 AuditService.findAll: strictly clamps excessive limit: 500 to take: 100', async () => {
      await mockAuditService.findAll({ limit: 500 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
      expect(callArgs.take).toBeLessThanOrEqual(100);
    });

    it('1.2 AuditService.findAll: strictly clamps excessive pageSize: 2000 to take: 100', async () => {
      await mockAuditService.findAll({ pageSize: 2000 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
      expect(callArgs.take).toBeLessThanOrEqual(100);
    });

    it('1.3 AuditService.findAll: handles negative limit by clamping to take: 1', async () => {
      await mockAuditService.findAll({ limit: -50 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(1);
    });

    it('1.4 AuditService.findAll: defaults to take: 50 when query parameters are absent', async () => {
      await mockAuditService.findAll();
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(50);
    });

    it('1.5 AuditService.exportCsv: enforces ceiling take: 100', async () => {
      await mockAuditService.exportCsv();
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });

    it('1.6 UsersService.findAll: strictly clamps excessive limit: 500 to take: 100', async () => {
      await mockUsersService.findAll({ limit: 500 });
      expect(mockPrisma.appUser.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.appUser.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
      expect(callArgs.take).toBeLessThanOrEqual(100);
    });

    it('1.7 UsersService.findAll: strictly clamps excessive pageSize: 2000 to take: 100', async () => {
      await mockUsersService.findAll({ pageSize: 2000 });
      expect(mockPrisma.appUser.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.appUser.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
      expect(callArgs.take).toBeLessThanOrEqual(100);
    });

    it('1.8 UsersService.findAll: clamps negative pageSize: -10 to take: 1', async () => {
      await mockUsersService.findAll({ pageSize: -10 });
      expect(mockPrisma.appUser.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.appUser.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(1);
    });

    it('1.9 UsersService.getRoles: enforces ceiling take: 100', async () => {
      await mockUsersService.getRoles();
      expect(mockPrisma.role.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.role.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });

    it('1.10 UsersService.findAllGroups: enforces bounded take <= 100 (delegated & direct)', async () => {
      // Delegated via DirectoryService
      await mockUsersService.findAllGroups();
      expect(mockPrisma.directoryGroup.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.directoryGroup.findMany.mock.calls[0][0];
      expect(callArgs.take).toBeLessThanOrEqual(100);

      // Direct fallback when directoryService is undefined
      const directUsersService = new UsersService(
        mockPrisma as unknown as PrismaService,
        undefined,
        null as unknown as undefined,
      );
      // Explicitly set directoryService to undefined to test fallback
      (directUsersService as unknown as { directoryService?: unknown }).directoryService =
        undefined;
      await directUsersService.findAllGroups();
      const fallbackCallArgs = mockPrisma.directoryGroup.findMany.mock.calls[1][0];
      expect(fallbackCallArgs.take).toBe(100);
    });

    it('1.11 OrganizationService.findAllOrganizations: enforces ceiling take: 100', async () => {
      await mockOrgService.findAllOrganizations();
      expect(mockPrisma.organization.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.organization.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });

    it('1.12 OrganizationService.findAllDepartments: enforces ceiling take: 100', async () => {
      await mockOrgService.findAllDepartments();
      expect(mockPrisma.department.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.department.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });

    it('1.13 OrganizationService.findAllPositions: enforces ceiling take: 100', async () => {
      await mockOrgService.findAllPositions();
      expect(mockPrisma.position.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.position.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });

    it('1.14 OrganizationService.getLocationTree: enforces ceiling take: 100', async () => {
      await mockOrgService.getLocationTree();
      expect(mockPrisma.location.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.location.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });

    it('1.15 OrganizationService.computeFullPath: enforces ceiling take: 100', async () => {
      mockPrisma.location.findMany.mockResolvedValueOnce([
        { id: 'loc-1', name: 'Root Campus', parentId: null },
      ]);
      const path = await mockOrgService.computeFullPath('loc-1');
      expect(path).toBe('Root Campus');
      expect(mockPrisma.location.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.location.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });

    it('1.16 OrganizationService.findAllLocations: enforces ceiling take: 100', async () => {
      await mockOrgService.findAllLocations();
      expect(mockPrisma.location.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.location.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(100);
    });

    it('1.17 OrganizationService.getHierarchyTree: enforces ceiling take: 50 (<= 100)', async () => {
      await mockOrgService.getHierarchyTree();
      expect(mockPrisma.organization.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrisma.organization.findMany.mock.calls[0][0];
      expect(callArgs.take).toBe(50);
      expect(callArgs.take).toBeLessThanOrEqual(100);
    });

    it('1.18 location-tree.util fallback: enforces ceiling take: 100', async () => {
      const mockFallbackPrisma = {
        location: {
          findMany: vi.fn().mockResolvedValue([{ id: 'loc-test', parentId: null }]),
        },
      } as unknown as PrismaService;

      const result = await resolveDescendantLocationIds(mockFallbackPrisma, 'loc-test');
      expect(result).toEqual(['loc-test']);
      expect(mockFallbackPrisma.location.findMany).toHaveBeenCalledWith({
        select: { id: true, parentId: true },
        take: 100,
        orderBy: { id: 'asc' },
      });
    });
  });

  // =========================================================================
  // MISSION 2: DETERMINISTIC COMPOSITE TIE-BREAKER ORDERING SPECIFICATIONS
  // =========================================================================
  describe('Mission 2: Deterministic Composite Ordering Clause Specifications', () => {
    let mockPrisma: Record<
      string,
      {
        findMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        update?: ReturnType<typeof vi.fn>;
      }
    >;
    let mockAuditService: AuditService;
    let mockUsersService: UsersService;
    let mockOrgService: OrganizationService;

    beforeEach(() => {
      mockPrisma = {
        auditLog: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        appUser: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        role: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        directoryGroup: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        organization: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        department: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        position: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        location: {
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
          update: vi.fn().mockResolvedValue({}),
        },
      };

      mockAuditService = new AuditService(mockPrisma as unknown as PrismaService);
      mockUsersService = new UsersService(mockPrisma as unknown as PrismaService);
      mockOrgService = new OrganizationService(mockPrisma as unknown as PrismaService);
    });

    it('2.1 AuditService.findAll specifies composite orderBy: [{ timestamp: "desc" }, { id: "desc" }]', async () => {
      await mockAuditService.findAll();
      const callArgs = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ timestamp: 'desc' }, { id: 'desc' }]);
    });

    it('2.2 AuditService.exportCsv specifies composite orderBy: [{ timestamp: "desc" }, { id: "asc" }]', async () => {
      await mockAuditService.exportCsv();
      const callArgs = mockPrisma.auditLog.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ timestamp: 'desc' }, { id: 'asc' }]);
    });

    it('2.3 UsersService.findAll specifies composite orderBy: [{ createdAt: "desc" }, { id: "asc" }]', async () => {
      await mockUsersService.findAll();
      const callArgs = mockPrisma.appUser.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    });

    it('2.4 UsersService.getRoles specifies composite orderBy: [{ name: "asc" }, { id: "asc" }]', async () => {
      await mockUsersService.getRoles();
      const callArgs = mockPrisma.role.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    });

    it('2.5 UsersService.findAllGroups specifies deterministic tie-breaker sorting', async () => {
      // Delegated via DirectoryService
      await mockUsersService.findAllGroups();
      const delegatedCallArgs = mockPrisma.directoryGroup.findMany.mock.calls[0][0];
      expect(delegatedCallArgs.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);

      // Fallback direct query
      const directUsersService = new UsersService(
        mockPrisma as unknown as PrismaService,
        undefined,
        null as unknown as undefined,
      );
      (directUsersService as unknown as { directoryService?: unknown }).directoryService =
        undefined;
      await directUsersService.findAllGroups();
      const fallbackCallArgs = mockPrisma.directoryGroup.findMany.mock.calls[1][0];
      expect(fallbackCallArgs.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
    });

    it('2.6 OrganizationService.findAllOrganizations specifies composite orderBy: [{ name: "asc" }, { id: "asc" }]', async () => {
      await mockOrgService.findAllOrganizations();
      const callArgs = mockPrisma.organization.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    });

    it('2.7 OrganizationService.findAllDepartments specifies composite orderBy: [{ name: "asc" }, { id: "asc" }]', async () => {
      await mockOrgService.findAllDepartments();
      const callArgs = mockPrisma.department.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    });

    it('2.8 OrganizationService.findAllPositions specifies composite orderBy: [{ title: "asc" }, { id: "asc" }]', async () => {
      await mockOrgService.findAllPositions();
      const callArgs = mockPrisma.position.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ title: 'asc' }, { id: 'asc' }]);
    });

    it('2.9 OrganizationService.getLocationTree specifies composite orderBy: [{ name: "asc" }, { id: "asc" }]', async () => {
      await mockOrgService.getLocationTree();
      const callArgs = mockPrisma.location.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    });

    it('2.10 OrganizationService.computeFullPath specifies unique orderBy: { id: "asc" }', async () => {
      mockPrisma.location.findMany.mockResolvedValueOnce([
        { id: 'loc-1', name: 'Campus', parentId: null },
      ]);
      await mockOrgService.computeFullPath('loc-1');
      const callArgs = mockPrisma.location.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ id: 'asc' });
    });

    it('2.11 OrganizationService.findAllLocations specifies composite orderBy: [{ name: "asc" }, { id: "asc" }]', async () => {
      await mockOrgService.findAllLocations();
      const callArgs = mockPrisma.location.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    });

    it('2.12 OrganizationService.getHierarchyTree specifies composite ordering on roots and sub-relations', async () => {
      await mockOrgService.getHierarchyTree();
      const callArgs = mockPrisma.organization.findMany.mock.calls[0][0];
      expect(callArgs.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
      expect(callArgs.include.locations.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
      expect(callArgs.include.departments.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
      expect(callArgs.include.departments.include.positions.orderBy).toEqual([
        { title: 'asc' },
        { id: 'asc' },
      ]);
    });
  });

  // =========================================================================
  // MISSION 3: LIVE POSTGRESQL PAGINATION DRIFT STRESS TEST (IDENTICAL TIMESTAMPS)
  // =========================================================================
  describe('Mission 3: Live PostgreSQL Pagination Drift Under Identical Timestamps', () => {
    const FIXED_TIMESTAMP = new Date('2026-09-13T10:30:00.000Z');
    const TOTAL_LOGS = 120;
    const PAGE_SIZE = 25;

    beforeAll(async () => {
      // Seed exactly 120 audit logs sharing the EXACT SAME millisecond timestamp
      const testLogs = [];
      for (let i = 0; i < TOTAL_LOGS; i++) {
        testLogs.push({
          id: `challenger-audit-drift-${String(i).padStart(3, '0')}`,
          action: 'CHALLENGER_TEST_PAGINATION_DRIFT',
          entity: 'adversarial_test_entity',
          severity: 'Info',
          status: 'Success',
          timestamp: FIXED_TIMESTAMP,
          details: `Adversarial test log item ${i}`,
        });
      }

      await prisma.auditLog.createMany({
        data: testLogs,
      });
    });

    afterAll(async () => {
      await prisma.auditLog.deleteMany({
        where: { action: 'CHALLENGER_TEST_PAGINATION_DRIFT' },
      });
    });

    it('3.1 should retrieve all 120 records across 5 paginated requests with 0 duplicates and 0 missing items', async () => {
      const totalPages = Math.ceil(TOTAL_LOGS / PAGE_SIZE); // 5 pages (25, 25, 25, 25, 20)
      const collectedRecords: Array<{ id: string; timestamp: string }> = [];
      const pageIdSets: Array<Set<string>> = [];

      for (let page = 1; page <= totalPages; page++) {
        const pageItems = await auditService.findAll({
          action: 'CHALLENGER_TEST_PAGINATION_DRIFT',
          page,
          pageSize: PAGE_SIZE,
        });

        const pageIds = pageItems.map((item) => item.id);
        pageIdSets.push(new Set(pageIds));
        collectedRecords.push(...pageItems);

        if (page < totalPages) {
          expect(pageItems).toHaveLength(PAGE_SIZE);
        } else {
          expect(pageItems).toHaveLength(TOTAL_LOGS - (totalPages - 1) * PAGE_SIZE);
        }
      }

      // Total records collected must exactly equal 120
      expect(collectedRecords).toHaveLength(TOTAL_LOGS);

      // Verify mutual disjointness: ZERO duplicate records across different pages
      for (let i = 0; i < pageIdSets.length; i++) {
        for (let j = i + 1; j < pageIdSets.length; j++) {
          const intersection = [...pageIdSets[i]].filter((id) => pageIdSets[j].has(id));
          expect(intersection).toHaveLength(0);
        }
      }

      // Verify completeness: Every single generated ID must be present
      const uniqueCollectedIds = new Set(collectedRecords.map((r) => r.id));
      expect(uniqueCollectedIds.size).toBe(TOTAL_LOGS);
      for (let i = 0; i < TOTAL_LOGS; i++) {
        const expectedId = `challenger-audit-drift-${String(i).padStart(3, '0')}`;
        expect(uniqueCollectedIds.has(expectedId)).toBe(true);
      }
    });

    it('3.2 should maintain strictly monotonic descending ID sequence when all timestamps are identical', async () => {
      const allItems = [];
      for (let page = 1; page <= 5; page++) {
        const pageItems = await auditService.findAll({
          action: 'CHALLENGER_TEST_PAGINATION_DRIFT',
          page,
          pageSize: PAGE_SIZE,
        });
        allItems.push(...pageItems);
      }

      // Since orderBy is [{ timestamp: 'desc' }, { id: 'desc' }],
      // and all timestamps are identical, the items must be sorted strictly by id DESC:
      // challenger-audit-drift-119, challenger-audit-drift-118, ..., challenger-audit-drift-000
      for (let i = 0; i < allItems.length - 1; i++) {
        const currentId = allItems[i].id;
        const nextId = allItems[i + 1].id;
        expect(currentId.localeCompare(nextId)).toBeGreaterThan(0);
      }

      expect(allItems[0].id).toBe('challenger-audit-drift-119');
      expect(allItems[allItems.length - 1].id).toBe('challenger-audit-drift-000');
    });
  });

  // =========================================================================
  // MISSION 4: LIVE POSTGRESQL USERS DRIFT STRESS TEST (IDENTICAL CREATEDAT)
  // =========================================================================
  describe('Mission 4: Live PostgreSQL Users Pagination Drift Under Identical CreatedAt', () => {
    const FIXED_CREATED_AT = new Date('2026-09-13T11:00:00.000Z');
    const TOTAL_USERS = 60;
    const PAGE_SIZE = 15;

    beforeAll(async () => {
      // Seed 60 users sharing identical createdAt timestamp
      const testUsers = [];
      for (let i = 0; i < TOTAL_USERS; i++) {
        testUsers.push({
          id: `challenger-user-drift-${String(i).padStart(3, '0')}`,
          username: `challenger_drift_user_${i}`,
          email: `challenger_test_drift_${i}@uims.internal`,
          passwordHash: '$2b$10$hashedstringforadversarialtest',
          firstName: 'ChallengerDrift',
          lastName: `User${i}`,
          createdAt: FIXED_CREATED_AT,
        });
      }

      await prisma.appUser.createMany({
        data: testUsers,
      });
    });

    afterAll(async () => {
      await prisma.appUser.deleteMany({
        where: { email: { contains: 'challenger_test_drift_' } },
      });
    });

    it('4.1 should retrieve all 60 users across 4 pages with zero duplicates and zero dropped users', async () => {
      const totalPages = Math.ceil(TOTAL_USERS / PAGE_SIZE); // 4 pages of 15
      const collectedUsers: Array<{ id: string }> = [];
      const pageIdSets: Array<Set<string>> = [];

      for (let page = 1; page <= totalPages; page++) {
        const result = await usersService.findAll({
          search: 'ChallengerDrift',
          page,
          pageSize: PAGE_SIZE,
        });

        expect(result.items).toHaveLength(PAGE_SIZE);
        expect(result.total).toBe(TOTAL_USERS);

        const ids = result.items.map((u) => u.id);
        pageIdSets.push(new Set(ids));
        collectedUsers.push(...result.items);
      }

      expect(collectedUsers).toHaveLength(TOTAL_USERS);

      // Verify mutual disjointness: ZERO duplicate users across pages
      for (let i = 0; i < pageIdSets.length; i++) {
        for (let j = i + 1; j < pageIdSets.length; j++) {
          const intersection = [...pageIdSets[i]].filter((id) => pageIdSets[j].has(id));
          expect(intersection).toHaveLength(0);
        }
      }

      // Verify completeness
      const uniqueIds = new Set(collectedUsers.map((u) => u.id));
      expect(uniqueIds.size).toBe(TOTAL_USERS);
      for (let i = 0; i < TOTAL_USERS; i++) {
        expect(uniqueIds.has(`challenger-user-drift-${String(i).padStart(3, '0')}`)).toBe(true);
      }
    });

    it('4.2 should maintain strictly monotonic ascending ID sequence when all createdAt are identical', async () => {
      const allUsers = [];
      for (let page = 1; page <= 4; page++) {
        const result = await usersService.findAll({
          search: 'ChallengerDrift',
          page,
          pageSize: PAGE_SIZE,
        });
        allUsers.push(...result.items);
      }

      // Since orderBy is [{ createdAt: 'desc' }, { id: 'asc' }],
      // all users must appear strictly sorted by id ASC:
      // challenger-user-drift-000, challenger-user-drift-001, ..., challenger-user-drift-059
      for (let i = 0; i < allUsers.length - 1; i++) {
        const currentId = allUsers[i].id;
        const nextId = allUsers[i + 1].id;
        expect(currentId.localeCompare(nextId)).toBeLessThan(0);
      }

      expect(allUsers[0].id).toBe('challenger-user-drift-000');
      expect(allUsers[allUsers.length - 1].id).toBe('challenger-user-drift-059');
    });
  });

  // =========================================================================
  // MISSION 5: MATHEMATICAL DRIFT DEMONSTRATION & COUNTER-EXAMPLE PROOF
  // =========================================================================
  describe('Mission 5: Mathematical Pagination Drift Counter-Example Simulation', () => {
    it('5.1 verifies that an unstable sort order without tie-breaker produces phantom duplicates / missing items across slices', () => {
      // Create 10 items sharing the exact same primary key value "2026-09-13"
      const dataset = [
        { id: 'A', date: '2026-09-13' },
        { id: 'B', date: '2026-09-13' },
        { id: 'C', date: '2026-09-13' },
        { id: 'D', date: '2026-09-13' },
        { id: 'E', date: '2026-09-13' },
        { id: 'F', date: '2026-09-13' },
        { id: 'G', date: '2026-09-13' },
        { id: 'H', date: '2026-09-13' },
        { id: 'I', date: '2026-09-13' },
        { id: 'J', date: '2026-09-13' },
      ];

      // Simulate non-deterministic DB engine plan variation between page 1 and page 2:
      // In PostgreSQL, ORDER BY date alone has undefined tie resolution order.
      // Suppose on Page 1 evaluation, heap scan order yields: [A, B, C, D, E, F, G, H, I, J] -> Slice(0, 5) = [A, B, C, D, E]
      // Suppose on Page 2 evaluation, parallel worker or buffer cache returns: [E, F, G, H, I, J, A, B, C, D] -> Slice(5, 10) = [J, A, B, C, D]
      const unstablePage1 = ['A', 'B', 'C', 'D', 'E'];
      const unstablePage2 = ['J', 'A', 'B', 'C', 'D'];

      // Observable failure: 'A', 'B', 'C', 'D' appear twice (phantom duplicates); 'F', 'G', 'H', 'I' are never seen (dropped)
      const duplicateIds = unstablePage1.filter((id) => unstablePage2.includes(id));
      expect(duplicateIds.length).toBeGreaterThan(0); // Proves pagination drift exists without tie-breaker!

      // Now with secondary unique tie-breaker (id ASC):
      // The sort relation R is a strict total order: (d1, id1) < (d2, id2) iff d1 < d2 OR (d1 == d2 AND id1 < id2)
      const stableSorted = [...dataset].sort((a, b) => a.id.localeCompare(b.id));
      const stablePage1 = stableSorted.slice(0, 5).map((x) => x.id);
      const stablePage2 = stableSorted.slice(5, 10).map((x) => x.id);

      const stableDuplicates = stablePage1.filter((id) => stablePage2.includes(id));
      expect(stableDuplicates).toHaveLength(0); // Proves ZERO drift with secondary tie-breaker!
      expect([...stablePage1, ...stablePage2]).toHaveLength(10);
      expect(new Set([...stablePage1, ...stablePage2]).size).toBe(10);
    });
  });
});
