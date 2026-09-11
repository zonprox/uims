import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AssetStatus, LicenseType } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssetsService } from './assets/assets.service';
import { LicensesService } from './licenses/licenses.service';
import type { CredentialVaultService } from './network/credential-vault.service';
import { NetworkService } from './network/network.service';

describe('Milestone 2 - Business Automation Adversarial & Empirical Verification Suite', () => {
  // =========================================================================
  // 1. Dynamic License Seat Derivation & Capacity Limits
  // =========================================================================
  describe('LicensesService - Dynamic Seat Derivation & Capacity Invariants', () => {
    let licensesService: LicensesService;
    let mockPrisma: {
      $transaction: ReturnType<typeof vi.fn>;
      license: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      licenseAssignment: {
        findFirst: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      directoryUser: {
        findUnique: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
        license: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        licenseAssignment: {
          findFirst: vi.fn(),
          count: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        directoryUser: {
          findUnique: vi.fn(),
        },
      };

      licensesService = new LicensesService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
      );
    });

    it('EMPIRICAL-LIC-1: creating an active assignment increments dynamic usedSeats atomically', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        name: 'IntelliJ IDEA Ultimate',
        totalSeats: 20,
        usedSeats: 5,
        type: LicenseType.SUBSCRIPTION,
      });

      mockPrisma.directoryUser.findUnique.mockResolvedValue({
        id: 'user-emp-1',
        email: 'developer@enterprise.internal',
        firstName: 'Elena',
        lastName: 'Rostova',
        displayName: 'Elena Rostova',
        department: { name: 'Backend Engineering' },
      });

      mockPrisma.licenseAssignment.findFirst.mockResolvedValue(null); // No existing active assignment
      mockPrisma.licenseAssignment.count
        .mockResolvedValueOnce(5) // current active seats check before assignment
        .mockResolvedValueOnce(6); // dynamicUsedSeats count after creating new assignment

      mockPrisma.licenseAssignment.create.mockResolvedValue({
        id: 'asgn-emp-1',
        licenseId: 'lic-1',
        userId: 'user-emp-1',
        assignedName: 'Elena Rostova',
        assignedEmail: 'developer@enterprise.internal',
        department: 'Backend Engineering',
        assignedAt: new Date(),
        unassignedAt: null,
      });

      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-1',
        name: 'IntelliJ IDEA Ultimate',
        totalSeats: 20,
        usedSeats: 6,
        assignments: [],
      });

      const assignment = await licensesService.assignUser('lic-1', {
        userId: 'user-emp-1',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.licenseAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          licenseId: 'lic-1',
          userId: 'user-emp-1',
          assignedName: 'Elena Rostova',
          assignedEmail: 'developer@enterprise.internal',
          department: 'Backend Engineering',
          unassignedAt: null,
        }),
      });

      expect(mockPrisma.license.update).toHaveBeenCalledWith({
        where: { id: 'lic-1' },
        data: { usedSeats: 6 },
        include: { assignments: true },
      });

      expect(assignment.id).toBe('asgn-emp-1');
    });

    it('EMPIRICAL-LIC-2: soft-revoking an assignment decrements dynamic usedSeats by setting unassignedAt', async () => {
      mockPrisma.licenseAssignment.findFirst.mockResolvedValue({
        id: 'asgn-to-revoke',
        licenseId: 'lic-1',
        userId: 'user-emp-1',
        unassignedAt: null,
      });

      mockPrisma.licenseAssignment.update.mockResolvedValue({
        id: 'asgn-to-revoke',
        licenseId: 'lic-1',
        unassignedAt: new Date(),
      });

      mockPrisma.licenseAssignment.count.mockResolvedValue(4); // 5 - 1 = 4 remaining active assignments

      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-1',
        usedSeats: 4,
      });

      const result = await licensesService.revokeUser('lic-1', 'asgn-to-revoke');

      expect(mockPrisma.licenseAssignment.update).toHaveBeenCalledWith({
        where: { id: 'asgn-to-revoke' },
        data: { unassignedAt: expect.any(Date) },
      });

      expect(mockPrisma.licenseAssignment.count).toHaveBeenCalledWith({
        where: {
          licenseId: 'lic-1',
          unassignedAt: null,
        },
      });

      expect(mockPrisma.license.update).toHaveBeenCalledWith({
        where: { id: 'lic-1' },
        data: { usedSeats: 4 },
      });

      expect(result).toEqual({
        success: true,
        licenseId: 'lic-1',
        assignmentId: 'asgn-to-revoke',
        usedSeats: 4,
      });
    });

    it('EMPIRICAL-LIC-3: attempting assignment beyond totalSeats throws BadRequestException with descriptive capacity message', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-capped',
        name: 'Autodesk AutoCAD Enterprise',
        totalSeats: 5,
        usedSeats: 5,
        type: LicenseType.PERPETUAL,
      });

      mockPrisma.directoryUser.findUnique.mockResolvedValue({
        id: 'user-denied',
        email: 'engineer@enterprise.internal',
        firstName: 'John',
        lastName: 'Doe',
      });

      mockPrisma.licenseAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.licenseAssignment.count.mockResolvedValue(5); // 5 active assignments == totalSeats (5)

      await expect(
        licensesService.assignUser('lic-capped', {
          userId: 'user-denied',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        licensesService.assignUser('lic-capped', {
          userId: 'user-denied',
        }),
      ).rejects.toThrow(/License seat capacity exceeded: 5\/5 seats currently in use/);

      expect(mockPrisma.licenseAssignment.create).not.toHaveBeenCalled();
    });

    it('EMPIRICAL-LIC-4: assigning already actively assigned user throws BadRequestException', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        name: 'GitHub Enterprise',
        totalSeats: 100,
        usedSeats: 10,
        type: LicenseType.SUBSCRIPTION,
      });

      mockPrisma.directoryUser.findUnique.mockResolvedValue({
        id: 'user-dup',
        email: 'alex@enterprise.internal',
      });

      // User already has an active assignment (unassignedAt: null)
      mockPrisma.licenseAssignment.findFirst.mockResolvedValue({
        id: 'asgn-existing',
        licenseId: 'lic-1',
        userId: 'user-dup',
        unassignedAt: null,
      });

      await expect(
        licensesService.assignUser('lic-1', {
          userId: 'user-dup',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        licensesService.assignUser('lic-1', {
          userId: 'user-dup',
        }),
      ).rejects.toThrow(/already actively assigned to license/);
    });

    it('EMPIRICAL-LIC-6: unlimited licenses (OPEN_SOURCE / OEM) allow assignments beyond totalSeats cap', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-unlimited',
        name: 'PostgreSQL Enterprise Extensions',
        totalSeats: 2,
        usedSeats: 2,
        type: LicenseType.OPEN_SOURCE,
      });

      mockPrisma.directoryUser.findUnique.mockResolvedValue({
        id: 'user-oss-1',
        email: 'dev@company.com',
      });

      mockPrisma.licenseAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.licenseAssignment.count
        .mockResolvedValueOnce(2) // currentActiveSeats (2 >= totalSeats)
        .mockResolvedValueOnce(3); // dynamicUsedSeats after assignment

      mockPrisma.licenseAssignment.create.mockResolvedValue({
        id: 'asgn-oss-1',
        licenseId: 'lic-unlimited',
      });

      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-unlimited',
        usedSeats: 3,
      });

      const res = await licensesService.assignUser('lic-unlimited', {
        userId: 'user-oss-1',
      });

      expect(res.id).toBe('asgn-oss-1');
      expect(mockPrisma.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lic-unlimited' },
          data: { usedSeats: 3 },
        }),
      );
    });

    it('EMPIRICAL-LIC-7: previously revoked user can be assigned again without active assignment conflict', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-1',
        name: 'GitHub Enterprise',
        totalSeats: 10,
        usedSeats: 2,
        type: LicenseType.SUBSCRIPTION,
      });

      mockPrisma.directoryUser.findUnique.mockResolvedValue({
        id: 'user-rehire',
        email: 'rehire@company.com',
      });

      // Previous assignment was soft-revoked (unassignedAt is a Date, not null)
      // When querying active assignments (unassignedAt: null), Prisma findFirst returns null
      mockPrisma.licenseAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.licenseAssignment.count.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

      mockPrisma.licenseAssignment.create.mockResolvedValue({
        id: 'asgn-rehire-2',
        licenseId: 'lic-1',
        userId: 'user-rehire',
        assignedAt: new Date(),
        unassignedAt: null,
      });

      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-1',
        usedSeats: 3,
      });

      const res = await licensesService.assignUser('lic-1', {
        userId: 'user-rehire',
      });

      expect(res.id).toBe('asgn-rehire-2');
    });

    it('EMPIRICAL-LIC-8: revoking an assignment with mismatched licenseId is rejected with NotFoundException', async () => {
      // Assignment exists in DB, but belongs to lic-999, not lic-1
      mockPrisma.licenseAssignment.findFirst.mockResolvedValue(null);

      await expect(licensesService.revokeUser('lic-1', 'asgn-from-other-license')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrisma.licenseAssignment.update).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. Dual-Subnet Synchronization on IP Re-allocation
  // =========================================================================
  describe('NetworkService - Dual-Subnet Synchronization & Anti-Drift Invariants', () => {
    let networkService: NetworkService;
    let mockPrisma: {
      iPAddress: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
      };
      subnet: {
        update: ReturnType<typeof vi.fn>;
      };
    };
    let mockVault: {
      encrypt: ReturnType<typeof vi.fn>;
      decrypt: ReturnType<typeof vi.fn>;
      maskSecret: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockPrisma = {
        iPAddress: {
          findUnique: vi.fn(),
          update: vi.fn(),
          count: vi.fn(),
          delete: vi.fn(),
        },
        subnet: {
          update: vi.fn(),
        },
      };

      mockVault = {
        encrypt: vi.fn(),
        decrypt: vi.fn(),
        maskSecret: vi.fn(),
      };

      networkService = new NetworkService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
        mockVault as unknown as CredentialVaultService,
      );
    });

    it('EMPIRICAL-NET-1: transferring IP from Subnet A to Subnet B re-synchronizes both subnets preventing counter drift', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        id: 'ip-realloc-1',
        address: '10.232.130.42',
        subnetId: 'subnet-A-130',
        status: 'ASSIGNED',
      });

      mockPrisma.iPAddress.update.mockResolvedValue({
        id: 'ip-realloc-1',
        address: '10.232.140.42',
        subnetId: 'subnet-B-140',
        status: 'ASSIGNED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.iPAddress.count
        .mockResolvedValueOnce(24) // Subnet A ASSIGNED
        .mockResolvedValueOnce(2) // Subnet A RESERVED
        .mockResolvedValueOnce(11) // Subnet B ASSIGNED
        .mockResolvedValueOnce(1); // Subnet B RESERVED

      mockPrisma.subnet.update.mockResolvedValue({});

      await networkService.updateIp('ip-realloc-1', {
        address: '10.232.140.42',
        subnetId: 'subnet-B-140',
      });

      expect(mockPrisma.subnet.update).toHaveBeenCalledTimes(2);

      expect(mockPrisma.subnet.update).toHaveBeenCalledWith({
        where: { id: 'subnet-A-130' },
        data: {
          usedIps: 24,
          reservedIps: 2,
        },
      });

      expect(mockPrisma.subnet.update).toHaveBeenCalledWith({
        where: { id: 'subnet-B-140' },
        data: {
          usedIps: 11,
          reservedIps: 1,
        },
      });

      expect(mockPrisma.iPAddress.count).toHaveBeenNthCalledWith(1, {
        where: { subnetId: 'subnet-A-130', status: 'ASSIGNED' },
      });
      expect(mockPrisma.iPAddress.count).toHaveBeenNthCalledWith(2, {
        where: { subnetId: 'subnet-A-130', status: 'RESERVED' },
      });
      expect(mockPrisma.iPAddress.count).toHaveBeenNthCalledWith(3, {
        where: { subnetId: 'subnet-B-140', status: 'ASSIGNED' },
      });
      expect(mockPrisma.iPAddress.count).toHaveBeenNthCalledWith(4, {
        where: { subnetId: 'subnet-B-140', status: 'RESERVED' },
      });
    });

    it('EMPIRICAL-NET-2: detaching IP from subnet (subnetId: null) re-synchronizes the previous subnet', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        id: 'ip-detach-1',
        address: '10.232.130.99',
        subnetId: 'subnet-A-130',
        status: 'ASSIGNED',
      });

      mockPrisma.iPAddress.update.mockResolvedValue({
        id: 'ip-detach-1',
        address: '10.232.130.99',
        subnetId: null,
        status: 'AVAILABLE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.iPAddress.count
        .mockResolvedValueOnce(20) // Subnet A ASSIGNED
        .mockResolvedValueOnce(2); // Subnet A RESERVED

      mockPrisma.subnet.update.mockResolvedValue({});

      await networkService.updateIp('ip-detach-1', {
        subnetId: undefined,
      });

      expect(mockPrisma.subnet.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.subnet.update).toHaveBeenCalledWith({
        where: { id: 'subnet-A-130' },
        data: { usedIps: 20, reservedIps: 2 },
      });
    });

    it('EMPIRICAL-NET-3: status change within same subnet (ASSIGNED -> RESERVED) re-synchronizes subnet counters', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        id: 'ip-status-chg',
        address: '10.232.130.15',
        subnetId: 'subnet-A-130',
        status: 'ASSIGNED',
      });

      mockPrisma.iPAddress.update.mockResolvedValue({
        id: 'ip-status-chg',
        address: '10.232.130.15',
        subnetId: 'subnet-A-130',
        status: 'RESERVED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.iPAddress.count.mockImplementation((args: { where: { status: string } }) =>
        Promise.resolve(args.where.status === 'ASSIGNED' ? 9 : 3),
      );

      mockPrisma.subnet.update.mockResolvedValue({});

      await networkService.updateIp('ip-status-chg', {
        status: 'Reserved',
      });

      // Note: syncSubnetStats is invoked twice due to line 579 (unconditional sync if newSubnetId)
      // plus line 582 (redundant sync when oldSubnetId === newSubnetId and status changed)
      expect(mockPrisma.subnet.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.subnet.update).toHaveBeenLastCalledWith({
        where: { id: 'subnet-A-130' },
        data: { usedIps: 9, reservedIps: 3 },
      });
    });

    it('EMPIRICAL-NET-4: deleteIp removes IP and recalculates subnet usage counts from database', async () => {
      mockPrisma.iPAddress.findUnique.mockResolvedValue({
        subnetId: 'subnet-A-130',
      });
      mockPrisma.iPAddress.delete.mockResolvedValue({ id: 'ip-del-1' });

      mockPrisma.iPAddress.count
        .mockResolvedValueOnce(8) // ASSIGNED after deletion
        .mockResolvedValueOnce(2); // RESERVED

      mockPrisma.subnet.update.mockResolvedValue({});

      const res = await networkService.deleteIp('ip-del-1');

      expect(res.success).toBe(true);
      expect(mockPrisma.iPAddress.delete).toHaveBeenCalledWith({ where: { id: 'ip-del-1' } });
      expect(mockPrisma.subnet.update).toHaveBeenCalledWith({
        where: { id: 'subnet-A-130' },
        data: { usedIps: 8, reservedIps: 2 },
      });
    });
  });

  // =========================================================================
  // 3. Asset Lifecycle State Machine
  // =========================================================================
  describe('AssetsService - State Machine Transitions & Override Invariants', () => {
    let assetsService: AssetsService;
    let mockPrisma: {
      $transaction: ReturnType<typeof vi.fn>;
      asset: {
        findUnique: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
      };
      assetCategory: {
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
      };
      location: {
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
      };
      directoryUser: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      assetHistory: {
        create: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
        asset: {
          findUnique: vi.fn(),
          update: vi.fn(),
          create: vi.fn(),
        },
        assetCategory: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
        },
        location: {
          findUnique: vi.fn(),
          findFirst: vi.fn(),
        },
        directoryUser: {
          findUnique: vi.fn(),
        },
        assetHistory: {
          create: vi.fn(),
        },
      };

      assetsService = new AssetsService(
        mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
      );
    });

    it('EMPIRICAL-AST-1: assigning an available asset to a user sets status = IN_USE', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-laptop-1',
        name: 'Dell XPS 15',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
      });

      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-laptop-1',
        name: 'Dell XPS 15',
        status: AssetStatus.IN_USE,
        assignedToId: 'user-dev-1',
        category: { name: 'Laptops' },
        location: { name: 'HQ' },
        assignedTo: { firstName: 'Alice', lastName: 'Engineer', email: 'alice@company.com' },
      });

      const updated = await assetsService.update('ast-laptop-1', {
        assignedToId: 'user-dev-1',
      });

      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ast-laptop-1' },
          data: expect.objectContaining({
            status: AssetStatus.IN_USE,
            assignedTo: { connect: { id: 'user-dev-1' } },
          }),
        }),
      );

      expect(updated.status).toBe('Active');
    });

    it('EMPIRICAL-AST-2: unassigning an in-use asset sets status = AVAILABLE', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-laptop-2',
        name: 'MacBook Air M2',
        status: AssetStatus.IN_USE,
        assignedToId: 'user-dev-1',
      });

      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-laptop-2',
        name: 'MacBook Air M2',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
        category: { name: 'Laptops' },
        location: { name: 'Storage Vault' },
        assignedTo: null,
      });

      const updated = await assetsService.update('ast-laptop-2', {
        assignedToId: null,
      });

      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ast-laptop-2' },
          data: expect.objectContaining({
            status: AssetStatus.AVAILABLE,
            assignedTo: { disconnect: true },
          }),
        }),
      );

      expect(updated.status).toBe('In Storage');
    });

    it('EMPIRICAL-AST-3: explicit status override (e.g. MAINTENANCE) is respected during user assignment', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-laptop-3',
        name: 'Lenovo ThinkPad P1',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
      });

      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-laptop-3',
        name: 'Lenovo ThinkPad P1',
        status: AssetStatus.MAINTENANCE,
        assignedToId: 'technician-1',
        category: { name: 'Laptops' },
        location: { name: 'Repair Bench' },
        assignedTo: { firstName: 'Bob', lastName: 'Tech', email: 'bob@company.com' },
      });

      const updated = await assetsService.update('ast-laptop-3', {
        assignedToId: 'technician-1',
        status: 'In Repair',
      });

      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ast-laptop-3' },
          data: expect.objectContaining({
            status: AssetStatus.MAINTENANCE,
            assignedTo: { connect: { id: 'technician-1' } },
          }),
        }),
      );

      expect(updated.status).toBe('In Repair');
    });

    it('EMPIRICAL-AST-4: explicit status override (e.g. RETIRED) is respected during unassignment', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-laptop-4',
        name: 'Old ThinkPad X230',
        status: AssetStatus.IN_USE,
        assignedToId: 'user-retiring',
      });

      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-laptop-4',
        name: 'Old ThinkPad X230',
        status: AssetStatus.RETIRED,
        assignedToId: null,
        category: { name: 'Laptops' },
        location: { name: 'E-Waste Bin' },
        assignedTo: null,
      });

      const updated = await assetsService.update('ast-laptop-4', {
        assignedToId: null,
        status: 'Retired',
      });

      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ast-laptop-4' },
          data: expect.objectContaining({
            status: AssetStatus.RETIRED,
            assignedTo: { disconnect: true },
          }),
        }),
      );

      expect(updated.status).toBe('Retired');
    });

    it('EMPIRICAL-AST-5: unassigning an asset currently in MAINTENANCE does not overwrite status to AVAILABLE without explicit status', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-laptop-5',
        name: 'Damaged Server Blade',
        status: AssetStatus.MAINTENANCE,
        assignedToId: 'technician-1',
      });

      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-laptop-5',
        name: 'Damaged Server Blade',
        status: AssetStatus.MAINTENANCE,
        assignedToId: null,
        category: { name: 'Servers' },
        location: { name: 'Repair Bench' },
        assignedTo: null,
      });

      await assetsService.update('ast-laptop-5', {
        assignedToId: null,
      });

      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ast-laptop-5' },
          data: expect.not.objectContaining({
            status: AssetStatus.AVAILABLE,
          }),
        }),
      );
    });

    it('EMPIRICAL-AST-6: reassigning an already IN_USE asset to another user maintains IN_USE status', async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: 'ast-laptop-6',
        name: 'MacBook Pro 14',
        status: AssetStatus.IN_USE,
        assignedToId: 'user-old',
      });

      mockPrisma.asset.update.mockResolvedValue({
        id: 'ast-laptop-6',
        name: 'MacBook Pro 14',
        status: AssetStatus.IN_USE,
        assignedToId: 'user-new',
        category: { name: 'Laptops' },
        location: { name: 'HQ' },
        assignedTo: { firstName: 'Charlie', lastName: 'Dev', email: 'charlie@company.com' },
      });

      const updated = await assetsService.update('ast-laptop-6', {
        assignedToId: 'user-new',
      });

      // Status should remain IN_USE without change
      expect(mockPrisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ast-laptop-6' },
          data: expect.objectContaining({
            assignedTo: { connect: { id: 'user-new' } },
          }),
        }),
      );
      expect(updated.status).toBe('Active');
    });

    it('EMPIRICAL-AST-7: creating an asset with assignedToId automatically defaults to IN_USE', async () => {
      mockPrisma.assetCategory.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      mockPrisma.location.findUnique.mockResolvedValue({ id: 'loc-1', name: 'HQ' });
      mockPrisma.directoryUser.findUnique.mockResolvedValue({ id: 'user-assigned' });

      mockPrisma.asset.create.mockResolvedValue({
        id: 'ast-new-1',
        assetTag: 'AST-AUTO-01',
        name: 'Surface Laptop 5',
        status: AssetStatus.IN_USE,
        assignedToId: 'user-assigned',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        category: { name: 'Laptops' },
        location: { name: 'HQ' },
        assignedTo: { firstName: 'Dave', lastName: 'Lead', email: 'dave@company.com' },
      });

      const created = await assetsService.create({
        name: 'Surface Laptop 5',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        assignedToId: 'user-assigned',
      });

      expect(mockPrisma.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssetStatus.IN_USE,
            assignedToId: 'user-assigned',
          }),
        }),
      );
      expect(created.status).toBe('Active');
    });

    it('EMPIRICAL-AST-8: creating an asset with assignedToId but explicit status (MAINTENANCE) respects explicit status', async () => {
      mockPrisma.assetCategory.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      mockPrisma.location.findUnique.mockResolvedValue({ id: 'loc-1', name: 'HQ' });
      mockPrisma.directoryUser.findUnique.mockResolvedValue({ id: 'tech-user' });

      mockPrisma.asset.create.mockResolvedValue({
        id: 'ast-new-2',
        assetTag: 'AST-AUTO-02',
        name: 'Defective Laptop for Diagnostics',
        status: AssetStatus.MAINTENANCE,
        assignedToId: 'tech-user',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        category: { name: 'Laptops' },
        location: { name: 'HQ' },
        assignedTo: { firstName: 'Tech', lastName: 'Specialist', email: 'tech@company.com' },
      });

      const created = await assetsService.create({
        name: 'Defective Laptop for Diagnostics',
        categoryId: 'cat-1',
        locationId: 'loc-1',
        assignedToId: 'tech-user',
        status: 'In Repair', // Explicit override on create
      });

      expect(mockPrisma.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AssetStatus.MAINTENANCE,
            assignedToId: 'tech-user',
          }),
        }),
      );
      expect(created.status).toBe('In Repair');
    });

    it('EMPIRICAL-AST-9: creating an asset with non-existent assignedToId throws NotFoundException', async () => {
      mockPrisma.assetCategory.findUnique.mockResolvedValue({ id: 'cat-1', name: 'Laptops' });
      mockPrisma.location.findUnique.mockResolvedValue({ id: 'loc-1', name: 'HQ' });
      mockPrisma.directoryUser.findUnique.mockResolvedValue(null); // User does not exist

      await expect(
        assetsService.create({
          name: 'Orphaned Assignment Asset',
          categoryId: 'cat-1',
          locationId: 'loc-1',
          assignedToId: 'non-existent-user-id',
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.asset.create).not.toHaveBeenCalled();
    });
  });
});
