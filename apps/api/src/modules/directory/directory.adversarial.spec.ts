import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AccountStatus } from '@prisma/client';
import { DirectoryService } from './directory.service';
import { AssetsService } from '../assets/assets.service';
import { LicensesService } from '../licenses/licenses.service';
import type { PrismaService } from '../../database/prisma.service';

interface MockDirectoryUser {
  id: string;
  employeeCode: string | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  jobTitle: string | null;
  company: string | null;
  groupCompany: string | null;
  plant: string | null;
  department: string | null;
  section: string | null;
  subSection: string | null;
  computerName: string | null;
  computerName2: string | null;
  adGroup: string | null;
  telephone: string | null;
  ouPath: string | null;
  managerName: string | null;
  isClosed: boolean;
  status: AccountStatus;
  source: string;
  assignedAssets?: Array<unknown>;
  licenseAssignments?: Array<unknown>;
  groupMemberships?: Array<unknown>;
}

interface MockPrismaClient {
  directoryUser: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  directoryGroup: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  directoryMembership: {
    upsert: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  asset: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  assetCategory: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  location: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  license: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  licenseAssignment: {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
}

describe('Milestone 1 Adversarial Challenge: Directory Operations & Relations', () => {
  let mockPrisma: MockPrismaClient;
  let directoryService: DirectoryService;
  let assetsService: AssetsService;
  let licensesService: LicensesService;

  beforeEach(() => {
    mockPrisma = {
      directoryUser: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      directoryGroup: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      directoryMembership: {
        upsert: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(1),
      },
      asset: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      assetCategory: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      location: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      license: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
      licenseAssignment: {
        create: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (callback: (tx: MockPrismaClient) => Promise<unknown>) => {
        return callback(mockPrisma);
      }),
    };

    directoryService = new DirectoryService(mockPrisma as unknown as PrismaService);
    assetsService = new AssetsService(mockPrisma as unknown as PrismaService);
    licensesService = new LicensesService(mockPrisma as unknown as PrismaService);
  });

  // =========================================================================
  // SUITE 1: DirectoryService.importBatch Stress & Malformed Rows
  // =========================================================================
  describe('Suite 1: DirectoryService.importBatch Adversarial Stress Harness', () => {
    it('Oracle: should safely handle empty, null, or undefined batch rows without throwing', async () => {
      const emptyResult = await directoryService.importBatch({ users: [] });
      expect(emptyResult).toEqual({
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      });

      const nullResult = await directoryService.importBatch({
        users: null as unknown as [],
      });
      expect(nullResult).toEqual({
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
      });
    });

    it('Oracle: should skip malformed rows (missing email, empty string, whitespace-only) and track skip count', async () => {
      const result = await directoryService.importBatch({
        users: [
          { email: '' },
          { email: '   ' },
          { employeeCode: 'EMP-NO-EMAIL' } as unknown as { email: string },
          { email: '\t\n ' },
        ],
      });

      expect(result.total).toBe(4);
      expect(result.skipped).toBe(4);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.directoryUser.create).not.toHaveBeenCalled();
      expect(mockPrisma.directoryUser.update).not.toHaveBeenCalled();
    });

    it('Oracle: should rigorously guarantee ZERO password generation and ZERO credential fields', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue(null);
      mockPrisma.directoryUser.create.mockResolvedValue({ id: 'dir-new-secure' });

      await directoryService.importBatch({
        users: [
          {
            email: 'audited.employee@company.corp',
            employeeCode: 'AUD-001',
            name: 'Security Test Subject',
            designation: 'Staff Analyst',
          },
        ],
      });

      expect(mockPrisma.directoryUser.create).toHaveBeenCalledTimes(1);
      const createPayload = mockPrisma.directoryUser.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };

      // Rigorous checks against password/credential fields
      expect(createPayload.data).not.toHaveProperty('password');
      expect(createPayload.data).not.toHaveProperty('passwordHash');
      expect(createPayload.data).not.toHaveProperty('salt');
      expect(createPayload.data).not.toHaveProperty('token');
      expect(createPayload.data).not.toHaveProperty('secret');
      expect(createPayload.data).not.toHaveProperty('adInitialPassword');
      expect(createPayload.data.source).toBe('LDAP');
      expect(createPayload.data.email).toBe('audited.employee@company.corp');
    });

    it('Oracle: should parse single-word, multi-word, and empty names with resilient fallbacks', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue(null);
      mockPrisma.directoryUser.create.mockImplementation(
        (args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: `dir-${Math.random()}`, ...args.data }),
      );

      await directoryService.importBatch({
        users: [
          { email: 'mononym@corp.com', name: 'Plato' },
          { email: 'triplet@corp.com', name: 'John Fitzgerald Kennedy' },
          { email: 'fallback@corp.com', name: '   ' },
          { email: 'clean.split@corp.com' },
        ],
      });

      expect(mockPrisma.directoryUser.create).toHaveBeenCalledTimes(4);

      // Single-word name
      const call1 = mockPrisma.directoryUser.create.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(call1.data.firstName).toBe('Plato');
      expect(call1.data.lastName).toBe('');
      expect(call1.data.displayName).toBe('Plato');

      // Multi-word name
      const call2 = mockPrisma.directoryUser.create.mock.calls[1][0] as {
        data: Record<string, unknown>;
      };
      expect(call2.data.firstName).toBe('John Fitzgerald');
      expect(call2.data.lastName).toBe('Kennedy');
      expect(call2.data.displayName).toBe('John Fitzgerald Kennedy');

      // Whitespace name fallback to email prefix
      const call3 = mockPrisma.directoryUser.create.mock.calls[2][0] as {
        data: Record<string, unknown>;
      };
      expect(call3.data.firstName).toBe('fallback');
      expect(call3.data.lastName).toBe('');
      expect(call3.data.displayName).toBe('fallback');

      // Missing name fallback to email prefix
      const call4 = mockPrisma.directoryUser.create.mock.calls[3][0] as {
        data: Record<string, unknown>;
      };
      expect(call4.data.firstName).toBe('clean.split');
      expect(call4.data.lastName).toBe('');
      expect(call4.data.displayName).toBe('clean.split');
    });

    it('Oracle: should normalize varied account closure representations (boolean, "Y", "true", DISABLED, SUSPENDED)', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue(null);
      mockPrisma.directoryUser.create.mockImplementation(
        (args: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: `dir-${Math.random()}`, ...args.data }),
      );

      await directoryService.importBatch({
        users: [
          { email: 'close1@corp.com', isClosed: true },
          { email: 'close2@corp.com', isClosed: 'Y' as unknown as boolean },
          { email: 'close3@corp.com', isClosed: 'true' as unknown as boolean },
          { email: 'close4@corp.com', status: 'DISABLED' as unknown as AccountStatus },
          { email: 'close5@corp.com', status: 'SUSPENDED' as unknown as AccountStatus },
          { email: 'active@corp.com', isClosed: false, status: AccountStatus.ACTIVE },
        ],
      });

      expect(mockPrisma.directoryUser.create).toHaveBeenCalledTimes(6);

      for (let i = 0; i < 5; i++) {
        const call = mockPrisma.directoryUser.create.mock.calls[i][0] as {
          data: Record<string, unknown>;
        };
        expect(call.data.status).toBe(AccountStatus.DISABLED);
        expect(call.data.isClosed).toBe(true);
      }

      const activeCall = mockPrisma.directoryUser.create.mock.calls[5][0] as {
        data: Record<string, unknown>;
      };
      expect(activeCall.data.status).toBe(AccountStatus.ACTIVE);
      expect(activeCall.data.isClosed).toBe(false);
    });

    it('Oracle: should update existing records when email OR employeeCode matches (duplicate detection)', async () => {
      const existingUser: MockDirectoryUser = {
        id: 'dir-exist-100',
        email: 'alice@company.com',
        employeeCode: 'EMP100',
        firstName: 'Alice',
        lastName: 'Smith',
        displayName: 'Alice Smith',
        jobTitle: 'Junior Engineer',
        company: 'BSL Core',
        groupCompany: 'BSL',
        plant: 'Plant 1',
        department: 'Production',
        section: 'Ops',
        subSection: null,
        computerName: null,
        computerName2: null,
        adGroup: null,
        telephone: null,
        ouPath: null,
        managerName: null,
        isClosed: false,
        status: AccountStatus.ACTIVE,
        source: 'LOCAL',
      };

      // First call finds existing by employeeCode even if email differs
      mockPrisma.directoryUser.findFirst
        .mockResolvedValueOnce(existingUser) // row 1 matched existing
        .mockResolvedValueOnce(null); // row 2 is new

      mockPrisma.directoryUser.update.mockResolvedValue({ id: 'dir-exist-100' });
      mockPrisma.directoryUser.create.mockResolvedValue({ id: 'dir-new-200' });

      const response = await directoryService.importBatch({
        users: [
          {
            email: 'alice.updated@company.com',
            employeeCode: 'EMP100', // matches existing
            name: 'Alice Cooper',
            designation: 'Senior Lead',
          },
          {
            email: 'bob@company.com',
            employeeCode: 'EMP200',
            name: 'Bob Ross',
          },
        ],
      });

      expect(response.total).toBe(2);
      expect(response.updated).toBe(1);
      expect(response.created).toBe(1);
      expect(response.skipped).toBe(0);
      expect(response.errors).toHaveLength(0);

      expect(mockPrisma.directoryUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dir-exist-100' },
          data: expect.objectContaining({
            jobTitle: 'Senior Lead',
            displayName: 'Alice Cooper',
          }),
        }),
      );
    });

    it('Oracle: should isolate row-level failures, log error diagnostics, and preserve batch invariant', async () => {
      mockPrisma.directoryUser.findFirst
        .mockResolvedValueOnce(null) // Row 1: creates successfully
        .mockRejectedValueOnce(new Error('Unique constraint violation on employeeCode')) // Row 3: DB error
        .mockResolvedValueOnce({ id: 'dir-row-4' }); // Row 4: updates successfully

      mockPrisma.directoryUser.create.mockResolvedValue({ id: 'dir-row-1' });
      mockPrisma.directoryUser.update.mockResolvedValue({ id: 'dir-row-4' });

      const response = await directoryService.importBatch({
        users: [
          { email: 'user1@corp.com', name: 'User One' }, // created
          { email: '' }, // skipped (empty)
          { email: 'user3@corp.com', employeeCode: 'DUP-CODE' }, // error
          { email: 'user4@corp.com', name: 'User Four' }, // updated
          { email: '   ' }, // skipped (whitespace)
        ],
      });

      // Verification of strict accounting invariant
      expect(response.total).toBe(5);
      expect(response.created).toBe(1);
      expect(response.updated).toBe(1);
      expect(response.skipped).toBe(2);
      expect(response.errors).toHaveLength(1);

      // Invariant: created + updated + skipped + errors.length === total
      expect(response.created + response.updated + response.skipped + response.errors.length).toBe(
        response.total,
      );

      // Verify detailed error diagnostic
      expect(response.errors[0]).toEqual({
        row: 3,
        email: 'user3@corp.com',
        error: 'Unique constraint violation on employeeCode',
      });
    });

    it('Oracle: should auto-link AD groups during batch import and survive AD group linking failure', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue(null);
      mockPrisma.directoryUser.create.mockResolvedValue({ id: 'dir-user-ad' });
      // Group linking fails on directoryMembership.upsert
      mockPrisma.directoryGroup.findFirst.mockResolvedValue({ id: 'grp-ad-1', name: 'SEC-Eng' });
      mockPrisma.directoryMembership.upsert.mockRejectedValue(new Error('LDAP connection timeout'));

      const response = await directoryService.importBatch({
        users: [
          {
            email: 'engineer@company.com',
            name: 'Eng Subject',
            adGroup: 'SEC-Eng',
          },
        ],
      });

      // The user import should still succeed (created = 1) because AD group failure is safely trapped
      expect(response.created).toBe(1);
      expect(response.errors).toHaveLength(0);
      expect(mockPrisma.directoryMembership.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // SUITE 2: DirectoryService.findAll Bounded Pagination Limits
  // =========================================================================
  describe('Suite 2: DirectoryService.findAll Bounded Pagination Limits', () => {
    beforeEach(() => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([]);
      mockPrisma.directoryUser.count.mockResolvedValue(250);
    });

    it('Oracle: limit=500 and limit=10000 must be clamped to ceiling of 100', async () => {
      const res500 = await directoryService.findAll({ limit: 500 });
      expect(res500.pageSize).toBe(100);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 100 }),
      );

      const res10000 = await directoryService.findAll({ pageSize: 10000 });
      expect(res10000.pageSize).toBe(100);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('Oracle: limit=0 and pageSize=0 must default safely to 50', async () => {
      const res0 = await directoryService.findAll({ limit: 0 });
      expect(res0.pageSize).toBe(50);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 50 }),
      );

      const resPageSize0 = await directoryService.findAll({ pageSize: 0 });
      expect(resPageSize0.pageSize).toBe(50);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 50 }),
      );
    });

    it('Oracle: negative limits (limit=-1, limit=-50) must be clamped to safe minimum (1)', async () => {
      const resNeg1 = await directoryService.findAll({ limit: -1 });
      expect(resNeg1.pageSize).toBe(1);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 1 }),
      );

      const resNeg50 = await directoryService.findAll({ pageSize: -50 });
      expect(resNeg50.pageSize).toBe(1);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    it('Oracle: nominal limits (limit=50, limit=25, limit=100) must be preserved exactly', async () => {
      const res50 = await directoryService.findAll({ limit: 50 });
      expect(res50.pageSize).toBe(50);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 50 }),
      );

      const res25 = await directoryService.findAll({ pageSize: 25 });
      expect(res25.pageSize).toBe(25);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 25 }),
      );

      const res100 = await directoryService.findAll({ limit: 100 });
      expect(res100.pageSize).toBe(100);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('Oracle: boundary page numbers (page=0, page=-5) must be clamped to page 1 with skip 0', async () => {
      const resPage0 = await directoryService.findAll({ page: 0, pageSize: 20 });
      expect(resPage0.page).toBe(1);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );

      const resPageNeg = await directoryService.findAll({ page: -5, pageSize: 20 });
      expect(resPageNeg.page).toBe(1);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('Oracle: skip calculation must satisfy (page - 1) * pageSize under valid offsets', async () => {
      const res = await directoryService.findAll({ page: 4, pageSize: 25 });
      expect(res.page).toBe(4);
      expect(res.pageSize).toBe(25);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 75, take: 25 }),
      );
    });

    it('Oracle: non-numeric garbage pagination inputs must resolve safely to defaults', async () => {
      const res = await directoryService.findAll({
        limit: 'not-a-number' as unknown as number,
        page: 'invalid' as unknown as number,
      });

      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(50);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 0, take: 50 }),
      );
    });

    it('Oracle: totalPages calculation must correctly compute ceiling of total/pageSize', async () => {
      mockPrisma.directoryUser.count.mockResolvedValue(0);
      const res0 = await directoryService.findAll({ pageSize: 50 });
      expect(res0.totalPages).toBe(0);

      mockPrisma.directoryUser.count.mockResolvedValue(101);
      const res101 = await directoryService.findAll({ pageSize: 50 });
      expect(res101.totalPages).toBe(3);

      mockPrisma.directoryUser.count.mockResolvedValue(100);
      const res100 = await directoryService.findAll({ pageSize: 50 });
      expect(res100.totalPages).toBe(2);
    });
  });

  // =========================================================================
  // SUITE 3: DirectoryService.getOrganizationalUnits & syncDomain Boundary
  // =========================================================================
  describe('Suite 3: DirectoryService.getOrganizationalUnits & syncDomain Boundary Testing', () => {
    it('Oracle: getOrganizationalUnits must return all 6 canonical OUs with zero metrics when database is empty', async () => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([]);
      mockPrisma.directoryGroup.findMany.mockResolvedValue([]);

      const ous = await directoryService.getOrganizationalUnits();

      expect(ous).toHaveLength(6);
      const canonicalIds = [
        'ou-corporate',
        'ou-it',
        'ou-engineering',
        'ou-production',
        'ou-operations',
        'ou-sales',
      ];
      expect(ous.map((ou) => ou.id)).toEqual(canonicalIds);

      for (const ou of ous) {
        expect(ou.userCount).toBe(0);
        expect(ou.workstationCount).toBe(0);
        expect(ou.groupCount).toBe(0);
        expect(ou.dn).toContain('DC=uims,DC=internal');
      }
    });

    it('Oracle: getOrganizationalUnits must filter safely when ouPath or computerName is null', async () => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([
        { ouPath: null, computerName: null },
        { ouPath: 'OU=IT,DC=uims,DC=internal', computerName: null },
        { ouPath: 'OU=IT,DC=uims,DC=internal', computerName: 'IT-DESK-01' },
        { ouPath: 'OU=Engineering,DC=uims,DC=internal', computerName: 'ENG-LAP-02' },
      ]);
      mockPrisma.directoryGroup.findMany.mockResolvedValue([
        { ouPath: null },
        { ouPath: 'OU=IT,DC=uims,DC=internal' },
      ]);

      const ous = await directoryService.getOrganizationalUnits();

      const itOU = ous.find((ou) => ou.id === 'ou-it');
      expect(itOU).toBeDefined();
      expect(itOU?.userCount).toBe(2);
      expect(itOU?.workstationCount).toBe(1); // Only 1 has non-null computerName
      expect(itOU?.groupCount).toBe(1);

      const engOU = ous.find((ou) => ou.id === 'ou-engineering');
      expect(engOU).toBeDefined();
      expect(engOU?.userCount).toBe(1);
      expect(engOU?.workstationCount).toBe(1);
      expect(engOU?.groupCount).toBe(0);
    });

    it('Oracle: syncDomain telemetry must return authentic replication counters and valid latency/timestamp', async () => {
      mockPrisma.directoryUser.count
        .mockResolvedValueOnce(312) // totalUsers
        .mockResolvedValueOnce(290); // activeUsers
      mockPrisma.directoryGroup.count.mockResolvedValueOnce(18); // totalGroups

      const syncResult = await directoryService.syncDomain();

      expect(syncResult.domain).toBe('uims.internal');
      expect(syncResult.controller).toBe('DC01-PRIMARY.corp.uims.internal');
      expect(syncResult.status).toBe('SYNCHRONIZED');
      expect(syncResult.replicatedObjects).toBe(330); // 312 + 18
      expect(syncResult.activeIdentities).toBe(290);
      expect(syncResult.latencyMs).toBeGreaterThanOrEqual(5);
      expect(syncResult.latencyMs).toBeLessThanOrEqual(20);

      // Verify timestamp is a valid ISO 8601 string
      const parsedTime = Date.parse(syncResult.lastSyncTimestamp);
      expect(Number.isNaN(parsedTime)).toBe(false);

      // Verify zero sensitive credentials in telemetry response
      const keys = Object.keys(syncResult);
      for (const key of keys) {
        expect(key.toLowerCase()).not.toContain('password');
        expect(key.toLowerCase()).not.toContain('secret');
        expect(key.toLowerCase()).not.toContain('token');
      }
    });

    it('Oracle: syncDomain must handle zero-identity database state without errors', async () => {
      mockPrisma.directoryUser.count
        .mockResolvedValueOnce(0) // totalUsers
        .mockResolvedValueOnce(0); // activeUsers
      mockPrisma.directoryGroup.count.mockResolvedValueOnce(0); // totalGroups

      const syncResult = await directoryService.syncDomain();

      expect(syncResult.replicatedObjects).toBe(0);
      expect(syncResult.activeIdentities).toBe(0);
      expect(syncResult.status).toBe('SYNCHRONIZED');
    });
  });

  // =========================================================================
  // SUITE 4: Relations: Assets & Licenses Associated with DirectoryUser
  // =========================================================================
  describe('Suite 4: Relations: Assets & Licenses Association with DirectoryUser', () => {
    it('Oracle: AssetsService.create must assign asset to DirectoryUser and format assigned info', async () => {
      const mockDirectoryUser: MockDirectoryUser = {
        id: 'dir-custodian-1',
        email: 'carol.danvers@company.com',
        employeeCode: 'EMP999',
        firstName: 'Carol',
        lastName: 'Danvers',
        displayName: 'Carol Danvers',
        jobTitle: 'Fleet Specialist',
        company: 'BSL Core',
        groupCompany: 'BSL',
        plant: 'Plant 1',
        department: 'Operations',
        section: 'Fleet',
        subSection: null,
        computerName: 'FLT-CD-01',
        computerName2: null,
        adGroup: 'SEC-Operations',
        telephone: '555-1234',
        ouPath: 'OU=Operations,DC=uims,DC=internal',
        managerName: null,
        isClosed: false,
        status: AccountStatus.ACTIVE,
        source: 'LDAP',
      };

      mockPrisma.asset.create.mockResolvedValue({
        id: 'asset-uuid-1',
        assetTag: 'AST-TEST-001',
        name: 'MacBook Pro 16',
        manufacturer: 'Apple',
        model: 'M3 Max',
        serialNumber: 'SN987654321',
        status: 'IN_USE',
        purchaseDate: new Date('2026-01-15'),
        purchaseCost: 3499,
        warrantyExpiry: new Date('2029-01-15'),
        categoryId: 'cat-1',
        locationId: 'loc-1',
        assignedToId: 'dir-custodian-1',
        specs: { cpu: 'M3 Max', ram: '64GB', storage: '2TB', os: 'macOS 15' },
        notes: 'Assigned to team lead',
        category: { id: 'cat-1', name: 'Laptops' },
        location: { id: 'loc-1', name: 'HQ Floor 4' },
        assignedTo: mockDirectoryUser,
      });

      const result = await assetsService.create({
        name: 'MacBook Pro 16',
        assetTag: 'AST-TEST-001',
        manufacturer: 'Apple',
        model: 'M3 Max',
        serialNumber: 'SN987654321',
        status: 'In Use',
        assignedToId: 'dir-custodian-1',
        purchaseCost: 3499,
      });

      // Verify that prisma.asset.create receives the DirectoryUser ID in assignedToId
      expect(mockPrisma.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToId: 'dir-custodian-1',
          }),
        }),
      );

      // Verify formatted output associates DirectoryUser details
      expect(result.assignedTo).toBe('Carol Danvers');
      expect(result.assignedEmail).toBe('carol.danvers@company.com');
      expect(result.tag).toBe('AST-TEST-001');
    });

    it('Oracle: AssetsService must gracefully format unassigned assets when assignedTo is null', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'asset-unassigned',
        assetTag: 'AST-UNASSIGNED',
        name: 'Dell UltraSharp 32',
        status: 'AVAILABLE',
        category: { name: 'Monitors' },
        location: { name: 'IT Storage' },
        assignedTo: null,
      });

      const result = await assetsService.findOne('asset-unassigned');

      expect(result.assignedTo).toBe('Unassigned');
      expect(result.assignedEmail).toBe('');
    });

    it('Oracle: LicensesService.assignUser must associate license assignment with DirectoryUser by email', async () => {
      const mockDirectoryUser: MockDirectoryUser = {
        id: 'dir-user-lic-1',
        email: 'developer@company.com',
        employeeCode: 'EMP-DEV-01',
        firstName: 'Dev',
        lastName: 'User',
        displayName: 'Dev User',
        jobTitle: 'Software Engineer',
        company: 'BSL Tech',
        groupCompany: 'BSL',
        plant: 'Plant 1',
        department: 'Engineering',
        section: 'Software',
        subSection: null,
        computerName: 'DEV-01',
        computerName2: null,
        adGroup: 'SEC-Engineers',
        telephone: null,
        ouPath: 'OU=Engineering,DC=uims,DC=internal',
        managerName: null,
        isClosed: false,
        status: AccountStatus.ACTIVE,
        source: 'LDAP',
      };

      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-jetbrains',
        name: 'JetBrains All Products Pack',
        totalSeats: 20,
        usedSeats: 5,
        assignments: [],
      });

      mockPrisma.directoryUser.findUnique.mockResolvedValue(mockDirectoryUser);

      mockPrisma.licenseAssignment.create.mockResolvedValue({
        id: 'assign-uuid-1',
        licenseId: 'lic-jetbrains',
        userId: 'dir-user-lic-1',
        assignedName: 'Dev User',
        assignedEmail: 'developer@company.com',
        department: 'Engineering',
        assignedAt: new Date(),
      });

      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-jetbrains',
        totalSeats: 20,
        usedSeats: 6,
      });

      const assignment = await licensesService.assignUser('lic-jetbrains', {
        name: 'Dev User',
        email: 'developer@company.com',
        department: 'Engineering',
      });

      // Verify directoryUser lookup
      expect(mockPrisma.directoryUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'developer@company.com' },
      });

      // Verify assignment created with DirectoryUser ID
      expect(mockPrisma.licenseAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          licenseId: 'lic-jetbrains',
          userId: 'dir-user-lic-1',
          assignedEmail: 'developer@company.com',
          assignedName: 'Dev User',
        }),
      });

      expect(assignment.userId).toBe('dir-user-lic-1');
    });

    it('Oracle: DirectoryService.findOne must include assignedAssets and licenseAssignments with accurate counts', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-full-profile',
        employeeCode: 'EMP-LEAD',
        email: 'teamlead@company.com',
        firstName: 'Sarah',
        lastName: 'Connor',
        displayName: 'Sarah Connor',
        assignedAssets: [
          { id: 'asset-1', name: 'MacBook Pro' },
          { id: 'asset-2', name: 'Dell 4K Monitor' },
        ],
        licenseAssignments: [
          { id: 'lic-assign-1', license: { name: 'GitHub Enterprise' } },
          { id: 'lic-assign-2', license: { name: 'Figma Organization' } },
          { id: 'lic-assign-3', license: { name: 'Slack Enterprise' } },
        ],
        groupMemberships: [],
      });

      const profile = await directoryService.findOne('dir-full-profile');

      expect(profile.id).toBe('dir-full-profile');
      expect(profile.fullName).toBe('Sarah Connor');
      expect(profile.assignedAssetsCount).toBe(2);
      expect(profile.assignedLicensesCount).toBe(3);
    });
  });
});
