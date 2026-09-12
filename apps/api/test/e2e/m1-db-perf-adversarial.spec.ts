import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LicensesService } from '../../src/modules/licenses/licenses.service';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { RolesService } from '../../src/modules/roles/roles.service';
import { DirectoryService } from '../../src/modules/directory/directory.service';
import type { PrismaService } from '../../src/database/prisma.service';

describe('M1 Empirical Challenger — Database Aggregations (TD-003) & Batch Import (PERF-002)', () => {
  // =========================================================================
  // TD-003: LicensesService.getStats() Aggregation & Edge Cases
  // =========================================================================
  describe('TD-003: LicensesService.getStats() Aggregation & Edge Cases', () => {
    let service: LicensesService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        $queryRaw: vi.fn(),
        license: {
          count: vi.fn(),
          aggregate: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
      };
      service = new LicensesService(mockPrisma as unknown as PrismaService);
    });

    it('Edge Case 1: Empty table (Zero records) - should return zero stats without NaN or errors', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ totalSpend: 0 }]);
      mockPrisma.license.count.mockResolvedValue(0);
      mockPrisma.license.aggregate.mockResolvedValue({
        _sum: { totalSeats: null, usedSeats: null },
      });

      const stats = await service.getStats();

      expect(stats.total).toBe(0);
      expect(stats.annualSpend).toBe(0);
      expect(stats.utilization).toBe(0);
      expect(stats.expiringCount).toBe(0);
      expect(Number.isNaN(stats.annualSpend)).toBe(false);
      expect(Number.isNaN(stats.utilization)).toBe(false);
    });

    it('Edge Case 2: Null costPerSeat in DB / raw query - should handle safely without NaN', async () => {
      // Scenario A: $queryRaw returns null for totalSpend (e.g. all rows had null cost)
      mockPrisma.$queryRaw.mockResolvedValue([{ totalSpend: null }]);
      mockPrisma.license.count.mockResolvedValue(2);
      mockPrisma.license.aggregate.mockResolvedValue({
        _sum: { totalSeats: 50, usedSeats: 20 },
      });
      // Fallback findMany with null / undefined costPerSeat
      mockPrisma.license.findMany.mockResolvedValue([
        { usedSeats: 10, costPerSeat: null },
        { usedSeats: 10, costPerSeat: undefined },
      ]);

      const stats = await service.getStats();

      expect(stats.total).toBe(2);
      expect(stats.annualSpend).toBe(0);
      expect(stats.utilization).toBe(40); // 20/50 = 40%
      expect(Number.isNaN(stats.annualSpend)).toBe(false);
    });

    it('Edge Case 3: 0 used seats with positive costPerSeat - spend & utilization are 0', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ totalSpend: 0 }]);
      mockPrisma.license.count.mockResolvedValue(5);
      mockPrisma.license.aggregate.mockResolvedValue({
        _sum: { totalSeats: 100, usedSeats: 0 },
      });

      const stats = await service.getStats();

      expect(stats.total).toBe(5);
      expect(stats.annualSpend).toBe(0);
      expect(stats.utilization).toBe(0);
      expect(Number.isNaN(stats.annualSpend)).toBe(false);
    });

    it('Edge Case 4: Decimal values - should preserve exact floating point precision', async () => {
      // 3 seats @ $19.99 = $59.97 + 4 seats @ $12.50 = $50.00 -> $109.97
      mockPrisma.$queryRaw.mockResolvedValue([{ totalSpend: 109.97 }]);
      mockPrisma.license.count.mockResolvedValue(2);
      mockPrisma.license.aggregate.mockResolvedValue({
        _sum: { totalSeats: 10, usedSeats: 7 },
      });

      const stats = await service.getStats();

      expect(stats.annualSpend).toBeCloseTo(109.97, 2);
      expect(stats.utilization).toBe(70); // 7/10 = 70%
      expect(Number.isNaN(stats.annualSpend)).toBe(false);
    });

    it('Edge Case 5: Negative values (Credits / adjustments) - should not crash or produce NaN', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ totalSpend: -150.5 }]);
      mockPrisma.license.count.mockResolvedValue(1);
      mockPrisma.license.aggregate.mockResolvedValue({
        _sum: { totalSeats: 10, usedSeats: 2 },
      });

      const stats = await service.getStats();

      expect(stats.annualSpend).toBe(-150.5);
      expect(Number.isNaN(stats.annualSpend)).toBe(false);
    });

    it('Edge Case 6: $queryRaw throws an exception - falls back gracefully to bounded findMany', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('PostgreSQL connection drop'));
      mockPrisma.license.count.mockResolvedValue(3);
      mockPrisma.license.aggregate.mockResolvedValue({
        _sum: { totalSeats: 30, usedSeats: 15 },
      });
      mockPrisma.license.findMany.mockResolvedValue([
        { usedSeats: 5, costPerSeat: 20 },
        { usedSeats: 10, costPerSeat: 30 },
      ]);

      const stats = await service.getStats();

      expect(stats.total).toBe(3);
      expect(stats.annualSpend).toBe(5 * 20 + 10 * 30); // 100 + 300 = 400
      expect(stats.utilization).toBe(50);
      expect(mockPrisma.license.findMany).toHaveBeenCalledWith({
        take: 100,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: { usedSeats: true, costPerSeat: true },
      });
      expect(Number.isNaN(stats.annualSpend)).toBe(false);
    });

    it('Edge Case 7: $queryRaw returns empty array [] - falls back without error', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.license.count.mockResolvedValue(1);
      mockPrisma.license.aggregate.mockResolvedValue({
        _sum: { totalSeats: 10, usedSeats: 5 },
      });
      mockPrisma.license.findMany.mockResolvedValue([{ usedSeats: 5, costPerSeat: 45 }]);

      const stats = await service.getStats();

      expect(stats.annualSpend).toBe(225);
      expect(Number.isNaN(stats.annualSpend)).toBe(false);
    });
  });

  // =========================================================================
  // TD-003: ReportsService SQL & Aggregations Edge Cases
  // =========================================================================
  describe('TD-003: ReportsService SQL & Aggregations Edge Cases', () => {
    let service: ReportsService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        $queryRaw: vi.fn(),
        asset: {
          aggregate: vi.fn(),
          count: vi.fn(),
        },
        license: {
          aggregate: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        reportSchedule: {
          count: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
      };
      service = new ReportsService(mockPrisma as unknown as PrismaService);
    });

    describe('getReportSuites()', () => {
      it('should handle completely empty database without throwing or returning NaN in formatted strings', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ totalSpend: 0 }]);
        mockPrisma.license.aggregate.mockResolvedValue({
          _sum: { totalSeats: null, usedSeats: null },
        });
        mockPrisma.asset.aggregate.mockResolvedValue({
          _sum: { purchaseCost: null },
        });

        const suites = await service.getReportSuites();

        expect(suites).toHaveLength(5);
        // Report r1 (Lifecycle) uses fallback valuation $482,000
        expect(suites[0].stats.primary).toBe('$482,000');
        // Report r2 (SaaS) uses fallback spend $42,500/yr and fallback 88.5%
        expect(suites[1].stats.primary).toBe('$42,500/yr');
        expect(suites[1].stats.secondary).toBe('88.5% Seat Usage');
        expect(suites.every((s) => !s.stats.primary.includes('NaN'))).toBe(true);
      });

      it('should format decimal and negative values cleanly in report suites', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ totalSpend: 12345.67 }]);
        mockPrisma.license.aggregate.mockResolvedValue({
          _sum: { totalSeats: 200, usedSeats: 150 },
        });
        mockPrisma.asset.aggregate.mockResolvedValue({
          _sum: { purchaseCost: 876543.21 },
        });

        const suites = await service.getReportSuites();

        expect(suites[0].stats.primary).toBe('$876,543');
        expect(suites[1].stats.primary).toBe('$12,346/yr');
        expect(suites[1].stats.secondary).toBe('75.0% Seat Usage');
      });

      it('should handle $queryRaw failure gracefully and use findMany fallback in getReportSuites', async () => {
        mockPrisma.$queryRaw.mockRejectedValue(new Error('Syntax error'));
        mockPrisma.license.aggregate.mockRejectedValue(new Error('Agg error'));
        mockPrisma.asset.aggregate.mockResolvedValue({
          _sum: { purchaseCost: 100000 },
        });
        mockPrisma.license.findMany.mockResolvedValue([
          { totalSeats: 50, usedSeats: 25, costPerSeat: 40 },
        ]);

        const suites = await service.getReportSuites();

        expect(suites[0].stats.primary).toBe('$100,000');
        expect(suites[1].stats.primary).toBe('$1,000/yr'); // 25 * 40 = 1000
        expect(suites[1].stats.secondary).toBe('50.0% Seat Usage');
      });
    });

    describe('getStats()', () => {
      it('should handle empty database without NaN or division by zero in getStats', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ totalSpend: 0 }]);
        mockPrisma.reportSchedule.count.mockResolvedValue(0);
        mockPrisma.asset.count.mockResolvedValue(0);

        const stats = await service.getStats();

        expect(stats.scheduledReports).toBe('1 Active'); // Math.max(1, 0)
        expect(stats.annualCostSavings).toBe('$42,500'); // 0 * 0.15 || 42500
        expect(stats.globalSlaMet).toBe('98.2%'); // totalAssets = 0 -> default '98.2'
        expect(stats.auditReadiness).toBe('100%');
        expect(stats.annualCostSavings.includes('NaN')).toBe(false);
        expect(stats.globalSlaMet.includes('NaN')).toBe(false);
      });

      it('should compute cost savings from SQL aggregate decimals accurately', async () => {
        mockPrisma.$queryRaw.mockResolvedValue([{ totalSpend: 50000.75 }]);
        mockPrisma.reportSchedule.count.mockResolvedValue(3);
        mockPrisma.asset.count
          .mockResolvedValueOnce(100) // totalAssets
          .mockResolvedValueOnce(94); // inUseAssets

        const stats = await service.getStats();

        // 50000.75 * 0.15 = 7500.1125 -> Math.round -> 7500
        expect(stats.scheduledReports).toBe('3 Active');
        expect(stats.annualCostSavings).toBe('$7,500');
        expect(stats.globalSlaMet).toBe('94.0%');
      });

      it('should fallback cleanly when $queryRaw throws in getStats', async () => {
        mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failure'));
        mockPrisma.reportSchedule.count.mockResolvedValue(2);
        mockPrisma.license.findMany.mockResolvedValue([{ usedSeats: 10, costPerSeat: 100 }]);
        mockPrisma.asset.count.mockResolvedValueOnce(50).mockResolvedValueOnce(45);

        const stats = await service.getStats();

        // 10 * 100 = 1000 * 0.15 = 150
        expect(stats.scheduledReports).toBe('2 Active');
        expect(stats.annualCostSavings).toBe('$150');
        expect(stats.globalSlaMet).toBe('90.0%');
      });
    });
  });

  // =========================================================================
  // TD-003: RolesService.getStats() User Counts
  // =========================================================================
  describe('TD-003: RolesService.getStats() User Counts', () => {
    let service: RolesService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        role: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        permission: {
          count: vi.fn(),
        },
        appUser: {
          count: vi.fn(),
        },
      };
      service = new RolesService(mockPrisma as unknown as PrismaService);
    });

    it('should handle empty database (zero users) with 100% coverage and zero NaN', async () => {
      mockPrisma.role.findMany.mockResolvedValue([]);
      mockPrisma.permission.count.mockResolvedValue(0);
      mockPrisma.appUser.count.mockResolvedValue(0);

      const stats = await service.getStats();

      expect(stats.totalRoles).toBe(0);
      expect(stats.systemRolesCount).toBe(0);
      expect(stats.customRolesCount).toBe(0);
      expect(stats.totalPermissionsCount).toBe(0);
      expect(stats.superAdminsCount).toBe(0);
      expect(stats.assignedUsersCoverage).toBe(100); // 0 users -> 100% defense
      expect(Number.isNaN(stats.assignedUsersCoverage)).toBe(false);
    });

    it('should query Prisma appUser.count with { roleId: { not: null } } directly', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { name: 'Admin', _count: { users: 5 } },
        { name: 'Custom Auditor', _count: { users: 3 } },
      ]);
      mockPrisma.permission.count.mockResolvedValue(30);
      mockPrisma.appUser.count
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(1) // superAdminsCount
        .mockResolvedValueOnce(8); // assignedUsers

      const stats = await service.getStats();

      expect(stats.totalRoles).toBe(2);
      expect(stats.systemRolesCount).toBe(1);
      expect(stats.customRolesCount).toBe(1);
      expect(stats.assignedUsersCoverage).toBe(80); // 8/10 = 80%
      expect(mockPrisma.appUser.count).toHaveBeenCalledWith({
        where: { roleId: { not: null } },
      });
    });

    it('should fallback to in-memory role count if appUser.count query fails', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { name: 'Admin', _count: { users: 4 } },
        { name: 'Auditor', _count: { users: 2 } },
      ]);
      mockPrisma.permission.count.mockResolvedValue(20);
      mockPrisma.appUser.count
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(1) // superAdminsCount
        .mockRejectedValueOnce(new Error('Index corruption on roleId')); // assignedUsers query fails

      const stats = await service.getStats();

      // Fallback: roles.reduce -> 4 + 2 = 6 -> 6/10 = 60%
      expect(stats.assignedUsersCoverage).toBe(60);
      expect(Number.isNaN(stats.assignedUsersCoverage)).toBe(false);
    });
  });

  // =========================================================================
  // PERF-002: Directory CSV Batch Import (importBatch)
  // =========================================================================
  describe('PERF-002: Directory CSV Batch Import (importBatch)', () => {
    let service: DirectoryService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
        directoryUser: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        directoryGroup: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        directoryMembership: {
          upsert: vi.fn().mockResolvedValue({}),
          count: vi.fn().mockResolvedValue(1),
        },
        department: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn(),
        },
        organization: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn(),
        },
        location: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn(),
        },
        position: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn(),
        },
      };
      service = new DirectoryService(mockPrisma as unknown as PrismaService);
    });

    it('Pre-fetched Maps: should batch query referenced entities once per chunk and eliminate N+1 queries', async () => {
      // Mock pre-fetch results for 5 rows sharing departments, orgs, locations, positions, AD groups
      mockPrisma.department.findMany.mockResolvedValue([
        { id: 'dept-eng', name: 'Engineering' },
        { id: 'dept-fin', name: 'Finance' },
      ]);
      mockPrisma.organization.findMany.mockResolvedValue([{ id: 'org-bsl', name: 'BSL' }]);
      mockPrisma.location.findMany.mockResolvedValue([
        { id: 'loc-p1', name: 'Plant 1' },
        { id: 'loc-hq', name: 'HQ' },
      ]);
      mockPrisma.position.findMany.mockResolvedValue([
        { id: 'pos-tech', title: 'Tech' },
        { id: 'pos-acc', title: 'Accountant' },
      ]);
      mockPrisma.directoryGroup.findMany.mockResolvedValue([
        { id: 'grp-eng', name: 'SEC-Eng' },
        { id: 'grp-fin', name: 'SEC-Fin' },
      ]);
      mockPrisma.directoryUser.findMany.mockResolvedValue([]); // all new
      mockPrisma.directoryUser.create.mockImplementation((args: any) =>
        Promise.resolve({ id: `user-${Math.random()}`, ...args.data }),
      );

      const rows = [
        {
          email: 'u1@company.com',
          employeeCode: 'E1',
          department: 'Engineering',
          company: 'BSL',
          plant: 'Plant 1',
          designation: 'Tech',
          adGroup: 'SEC-Eng',
        },
        {
          email: 'u2@company.com',
          employeeCode: 'E2',
          department: 'Engineering',
          company: 'BSL',
          plant: 'Plant 1',
          designation: 'Tech',
          adGroup: 'SEC-Eng',
        },
        {
          email: 'u3@company.com',
          employeeCode: 'E3',
          department: 'Finance',
          company: 'BSL',
          plant: 'HQ',
          designation: 'Accountant',
          adGroup: 'SEC-Fin',
        },
        {
          email: 'u4@company.com',
          employeeCode: 'E4',
          department: 'Finance',
          company: 'BSL',
          plant: 'HQ',
          designation: 'Accountant',
          adGroup: 'SEC-Fin',
        },
        {
          email: 'u5@company.com',
          employeeCode: 'E5',
          department: 'Engineering',
          company: 'BSL',
          plant: 'Plant 1',
          designation: 'Tech',
          adGroup: 'SEC-Eng',
        },
      ];

      const result = await service.importBatch({ users: rows });

      expect(result.total).toBe(5);
      expect(result.created).toBe(5);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify batch pre-fetch calls: EXACTLY 1 batch call each, NOT 5 sequential calls
      expect(mockPrisma.department.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.organization.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.location.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.position.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.directoryGroup.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenCalledTimes(1);

      // Verify ZERO sequential findFirst calls were made since all were resolved from pre-fetch cache
      expect(mockPrisma.department.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.organization.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.location.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.position.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.directoryGroup.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.directoryUser.findFirst).not.toHaveBeenCalled();

      // Verify that created users received relational foreign key IDs resolved from cache
      const firstCreateData = mockPrisma.directoryUser.create.mock.calls[0][0].data;
      expect(firstCreateData.departmentId).toBe('dept-eng');
      expect(firstCreateData.organizationId).toBe('org-bsl');
      expect(firstCreateData.locationId).toBe('loc-p1');
      expect(firstCreateData.positionId).toBe('pos-tech');
    });

    it('Transaction Rollback on Constraint Failure: failed row rolls back while other rows succeed', async () => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([]);

      // Simulate Row 1 succeeds, Row 2 fails with DB constraint violation, Row 3 succeeds
      mockPrisma.directoryUser.create
        .mockResolvedValueOnce({ id: 'u-1', email: 'valid1@company.com' })
        .mockRejectedValueOnce(new Error('Unique constraint failed on employeeCode (E-DUP)'))
        .mockResolvedValueOnce({ id: 'u-3', email: 'valid3@company.com' });

      const rows = [
        { email: 'valid1@company.com', employeeCode: 'E-01', name: 'User One' },
        { email: 'fail2@company.com', employeeCode: 'E-DUP', name: 'User Two Duplicate' },
        { email: 'valid3@company.com', employeeCode: 'E-03', name: 'User Three' },
      ];

      const result = await service.importBatch({ users: rows });

      expect(result.total).toBe(3);
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        row: 2,
        email: 'fail2@company.com',
        error: 'Unique constraint failed on employeeCode (E-DUP)',
      });

      // Verify each row write was executed in its own $transaction
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
    });

    it('Transaction Batching: updates existing records inside transaction and links AD group using tx', async () => {
      const existingUser = {
        id: 'u-exist',
        email: 'existing@company.com',
        employeeCode: 'E-EXIST',
        firstName: 'OldFirst',
        lastName: 'OldLast',
        phone: '123',
        ouPath: 'OU=Old',
        managerName: 'OldMgr',
      };

      mockPrisma.directoryUser.findMany.mockResolvedValue([existingUser]);
      mockPrisma.directoryGroup.findMany.mockResolvedValue([
        { id: 'grp-1', name: 'SEC-UpdatedGroup', memberCount: 2 },
      ]);
      mockPrisma.directoryUser.update.mockResolvedValue({ ...existingUser, firstName: 'NewFirst' });

      const txClient = {
        directoryUser: { update: mockPrisma.directoryUser.update },
        directoryGroup: {
          findFirst: vi.fn(),
          update: mockPrisma.directoryGroup.update,
        },
        directoryMembership: {
          upsert: mockPrisma.directoryMembership.upsert,
          count: mockPrisma.directoryMembership.count,
        },
      };
      mockPrisma.$transaction = vi.fn(async (cb: (tx: any) => Promise<any>) => cb(txClient));

      const result = await service.importBatch({
        users: [
          {
            email: 'existing@company.com',
            employeeCode: 'E-EXIST',
            name: 'NewFirst OldLast',
            adGroup: 'SEC-UpdatedGroup',
          },
        ],
      });

      expect(result.total).toBe(1);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(0);

      // Verify txClient was passed to update
      expect(txClient.directoryUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-exist' },
          data: expect.objectContaining({
            displayName: 'NewFirst OldLast',
          }),
        }),
      );

      // Verify AD group membership was upserted using the transaction client
      expect(txClient.directoryMembership.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_groupId: {
              userId: 'u-exist',
              groupId: 'grp-1',
            },
          },
        }),
      );
    });

    it('Edge Case: handles empty emails or blank inputs without triggering transactions', async () => {
      const result = await service.importBatch({
        users: [{ email: '' }, { email: '   ' }, { name: 'No email user' }],
      });

      expect(result.total).toBe(3);
      expect(result.skipped).toBe(3);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('Resilience: fallback to sequential lookup when batch findMany throws', async () => {
      // Simulate batch user lookup throwing an error
      mockPrisma.directoryUser.findMany.mockRejectedValue(new Error('Batch query timeout'));
      mockPrisma.directoryUser.findFirst.mockResolvedValue(null); // sequential lookup works
      mockPrisma.directoryUser.create.mockResolvedValue({ id: 'u-seq' });

      const result = await service.importBatch({
        users: [{ email: 'fallback@company.com', employeeCode: 'E-FB' }],
      });

      expect(result.total).toBe(1);
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockPrisma.directoryUser.findFirst).toHaveBeenCalled();
    });
  });
});
