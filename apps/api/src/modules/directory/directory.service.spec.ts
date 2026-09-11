import { ConflictException, NotFoundException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectoryService } from './directory.service';

describe('DirectoryService', () => {
  let service: DirectoryService;
  let mockPrisma: {
    directoryUser: {
      findFirst: ReturnType<typeof vi.fn>;
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
  };

  beforeEach(() => {
    mockPrisma = {
      directoryUser: {
        findFirst: vi.fn(),
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
    };

    service = new DirectoryService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('create', () => {
    it('should create a directory user record without password or credentials', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue(null);
      mockPrisma.directoryUser.create.mockImplementation(
        (args: { data: Record<string, unknown> }) =>
          Promise.resolve({
            id: 'dir-1',
            ...args.data,
            assignedAssets: [],
            licenseAssignments: [],
          }),
      );

      const result = await service.create({
        email: 'john.doe@company.com',
        employeeCode: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        jobTitle: 'Manufacturing Technician',
        department: 'Production',
      });

      expect(result.id).toBe('dir-1');
      expect(result.email).toBe('john.doe@company.com');
      expect(mockPrisma.directoryUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'john.doe@company.com',
            employeeCode: 'EMP001',
            firstName: 'John',
            lastName: 'Doe',
            status: AccountStatus.ACTIVE,
          }),
        }),
      );

      // Verify that no passwordHash field is ever sent to database
      const createCall = mockPrisma.directoryUser.create.mock.calls[0][0];
      expect(createCall.data).not.toHaveProperty('password');
      expect(createCall.data).not.toHaveProperty('passwordHash');
    });

    it('should auto-link Active Directory group when adGroup is specified', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue(null);
      mockPrisma.directoryUser.create.mockResolvedValue({
        id: 'dir-2',
        email: 'jane.smith@company.com',
        adGroup: 'SEC-HQ-Staff',
        assignedAssets: [],
        licenseAssignments: [],
      });
      mockPrisma.directoryGroup.findFirst.mockResolvedValue({
        id: 'group-1',
        name: 'SEC-HQ-Staff',
      });
      mockPrisma.directoryMembership.upsert.mockResolvedValue({});
      mockPrisma.directoryMembership.count.mockResolvedValue(5);
      mockPrisma.directoryGroup.update.mockResolvedValue({});

      await service.create({
        email: 'jane.smith@company.com',
        adGroup: 'SEC-HQ-Staff',
      });

      expect(mockPrisma.directoryMembership.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_groupId: {
              userId: 'dir-2',
              groupId: 'group-1',
            },
          },
        }),
      );
    });

    it('should throw ConflictException if directory record with same email exists', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-existing',
        email: 'duplicate@company.com',
      });

      await expect(
        service.create({
          email: 'duplicate@company.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated directory users with calculated full names and counts', async () => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([
        {
          id: 'dir-1',
          email: 'alice@company.com',
          firstName: 'Alice',
          lastName: 'Wong',
          displayName: 'Alice Wong',
          assignedAssets: [{ id: 'asset-1' }],
          licenseAssignments: [{ id: 'lic-1' }, { id: 'lic-2' }],
          groupMemberships: [],
        },
      ]);
      mockPrisma.directoryUser.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, pageSize: 10, search: 'Alice' });

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].fullName).toBe('Alice Wong');
      expect(result.items[0].assignedAssetsCount).toBe(1);
      expect(result.items[0].assignedLicensesCount).toBe(2);
      expect(mockPrisma.directoryUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 0,
        }),
      );
    });

    it('should enforce upper ceiling of 100 on page size', async () => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([]);
      mockPrisma.directoryUser.count.mockResolvedValue(0);

      await service.findAll({ pageSize: 500 });

      expect(mockPrisma.directoryUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return directory user by ID or employeeCode', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-1',
        employeeCode: 'EMP001',
        email: 'bob@company.com',
        firstName: 'Bob',
        lastName: 'Taylor',
        displayName: 'Bob Taylor',
        assignedAssets: [],
        licenseAssignments: [],
        groupMemberships: [],
      });

      const result = await service.findOne('dir-1');
      expect(result.id).toBe('dir-1');
      expect(result.fullName).toBe('Bob Taylor');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update directory user profile and link new AD group if specified', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue({
        id: 'dir-1',
        email: 'bob@company.com',
        firstName: 'Bob',
        lastName: 'Taylor',
      });
      mockPrisma.directoryUser.update.mockResolvedValue({
        id: 'dir-1',
        email: 'bob.new@company.com',
        firstName: 'Robert',
        lastName: 'Taylor',
        adGroup: 'SEC-Eng-DevOps',
      });
      mockPrisma.directoryGroup.findFirst.mockResolvedValue({
        id: 'grp-devops',
        name: 'SEC-Eng-DevOps',
      });

      const updated = await service.update('dir-1', {
        firstName: 'Robert',
        adGroup: 'SEC-Eng-DevOps',
      });

      expect(updated.firstName).toBe('Robert');
      expect(mockPrisma.directoryUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dir-1' },
          data: expect.objectContaining({
            firstName: 'Robert',
          }),
        }),
      );
      expect(mockPrisma.directoryMembership.upsert).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete directory user', async () => {
      mockPrisma.directoryUser.findFirst.mockResolvedValue({ id: 'dir-1' });
      mockPrisma.directoryUser.delete.mockResolvedValue({ id: 'dir-1' });

      const deleted = await service.remove('dir-1');
      expect(deleted.id).toBe('dir-1');
      expect(mockPrisma.directoryUser.delete).toHaveBeenCalledWith({ where: { id: 'dir-1' } });
    });
  });

  describe('getStats', () => {
    it('should aggregate directory metrics accurately', async () => {
      mockPrisma.directoryUser.count
        .mockResolvedValueOnce(120) // totalEmployees
        .mockResolvedValueOnce(110) // activeEmployees
        .mockResolvedValueOnce(95) // assignedWorkstations
        .mockResolvedValueOnce(10); // closedAccounts
      mockPrisma.directoryGroup.count.mockResolvedValueOnce(8); // totalGroups

      const stats = await service.getStats();

      expect(stats.totalEmployees).toBe(120);
      expect(stats.activeEmployees).toBe(110);
      expect(stats.assignedWorkstations).toBe(95);
      expect(stats.totalGroups).toBe(8);
      expect(stats.totalOUs).toBe(6);
      expect(stats.closedAccounts).toBe(10);
    });
  });

  describe('getOrganizationalUnits', () => {
    it('should aggregate OU user, group, and workstation statistics', async () => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([
        { ouPath: 'OU=Corporate,DC=uims,DC=internal', computerName: 'CORP-PC-01' },
        { ouPath: 'OU=Corporate,DC=uims,DC=internal', computerName: null },
        { ouPath: 'OU=Production,DC=uims,DC=internal', computerName: 'PROD-WS-01' },
      ]);
      mockPrisma.directoryGroup.findMany.mockResolvedValue([
        { ouPath: 'OU=Corporate,DC=uims,DC=internal' },
      ]);

      const ous = await service.getOrganizationalUnits();

      expect(ous).toHaveLength(6);
      const corporate = ous.find((ou) => ou.id === 'ou-corporate');
      expect(corporate).toBeDefined();
      expect(corporate?.userCount).toBe(2);
      expect(corporate?.workstationCount).toBe(1);
      expect(corporate?.groupCount).toBe(1);
    });
  });

  describe('syncDomain', () => {
    it('should return simulated domain controller sync results', async () => {
      mockPrisma.directoryUser.count
        .mockResolvedValueOnce(150) // totalUsers
        .mockResolvedValueOnce(140); // activeUsers
      mockPrisma.directoryGroup.count.mockResolvedValueOnce(10); // totalGroups

      const result = await service.syncDomain();

      expect(result.domain).toBe('uims.internal');
      expect(result.status).toBe('SYNCHRONIZED');
      expect(result.replicatedObjects).toBe(160);
      expect(result.activeIdentities).toBe(140);
      expect(result.controller).toBe('DC01-PRIMARY.corp.uims.internal');
      expect(typeof result.latencyMs).toBe('number');
      expect(typeof result.lastSyncTimestamp).toBe('string');
    });
  });

  describe('exportMaster', () => {
    it('should format directory users as tabular records without passwords', async () => {
      mockPrisma.directoryUser.findMany.mockResolvedValue([
        {
          id: 'dir-1',
          employeeCode: 'EMP001',
          email: 'charlie@company.com',
          firstName: 'Charlie',
          lastName: 'Brown',
          displayName: 'Charlie Brown',
          jobTitle: 'Senior Specialist',
          groupCompany: 'BSL',
          company: 'BSL Core',
          plant: 'Plant 1',
          department: 'IT',
          section: 'Infrastructure',
          subSection: 'Networks',
          telephone: '1001',
          isClosed: false,
          status: 'ACTIVE',
          computerName: 'IT-CH-01',
          computerName2: null,
          adGroup: 'SEC-IT-Admins',
          ouPath: 'OU=IT,DC=uims,DC=internal',
          managerName: 'Alex Johnson',
        },
      ]);

      const exportRows = await service.exportMaster();

      expect(exportRows).toHaveLength(1);
      const row = exportRows[0];
      expect(row.STT).toBe(1);
      expect(row['Employee Code']).toBe('EMP001');
      expect(row['Full Name']).toBe('Charlie Brown');
      expect(row.Closed).toBe('N');
      expect(row['Computer Name']).toBe('IT-CH-01');
      expect(row).not.toHaveProperty('password');
      expect(row).not.toHaveProperty('passwordHash');
    });
  });

  describe('importBatch', () => {
    it('should import new employee records without password fields and update existing records', async () => {
      mockPrisma.directoryUser.findFirst
        .mockResolvedValueOnce(null) // First row: new
        .mockResolvedValueOnce({ id: 'dir-existing-1', employeeCode: 'EMP002' }); // Second row: existing

      mockPrisma.directoryUser.create.mockResolvedValue({ id: 'dir-new-1' });
      mockPrisma.directoryUser.update.mockResolvedValue({ id: 'dir-existing-1' });

      const response = await service.importBatch({
        users: [
          {
            email: 'new.emp@company.com',
            employeeCode: 'EMP001',
            name: 'New Employee',
            designation: 'Engineer',
            company: 'BSL Tech',
          },
          {
            email: 'existing.emp@company.com',
            employeeCode: 'EMP002',
            name: 'Existing Employee',
            designation: 'Senior Engineer',
          },
        ],
      });

      expect(response.total).toBe(2);
      expect(response.created).toBe(1);
      expect(response.updated).toBe(1);
      expect(response.skipped).toBe(0);
      expect(response.errors).toHaveLength(0);

      // Verify create call has NO password
      const createData = mockPrisma.directoryUser.create.mock.calls[0][0].data;
      expect(createData).not.toHaveProperty('password');
      expect(createData).not.toHaveProperty('passwordHash');
      expect(createData.email).toBe('new.emp@company.com');
      expect(createData.source).toBe('LDAP');
    });

    it('should skip rows without email and gracefully log failures', async () => {
      mockPrisma.directoryUser.findFirst.mockRejectedValue(new Error('Database lock error'));

      const response = await service.importBatch({
        users: [
          {
            email: '',
          },
          {
            email: 'fail.emp@company.com',
          },
        ],
      });

      expect(response.total).toBe(2);
      expect(response.skipped).toBe(1);
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].email).toBe('fail.emp@company.com');
      expect(response.errors[0].error).toContain('Database lock error');
    });
  });

  describe('groups', () => {
    it('should find all groups with membership count', async () => {
      mockPrisma.directoryGroup.findMany.mockResolvedValue([
        {
          id: 'grp-1',
          name: 'SEC-Admins',
          memberCount: 5,
          _count: { memberships: 5 },
        },
      ]);

      const groups = await service.findAllGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('SEC-Admins');
    });

    it('should create new group if it does not exist', async () => {
      mockPrisma.directoryGroup.findFirst.mockResolvedValue(null);
      mockPrisma.directoryGroup.create.mockResolvedValue({
        id: 'grp-new',
        name: 'SEC-NewGroup',
      });

      const group = await service.createGroup({
        name: 'SEC-NewGroup',
        description: 'New security group',
      });

      expect(group.id).toBe('grp-new');
      expect(mockPrisma.directoryGroup.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'SEC-NewGroup',
          description: 'New security group',
        }),
      });
    });

    it('should update existing group if name already exists', async () => {
      mockPrisma.directoryGroup.findFirst.mockResolvedValue({
        id: 'grp-exist',
        name: 'SEC-Existing',
      });
      mockPrisma.directoryGroup.update.mockResolvedValue({
        id: 'grp-exist',
        name: 'SEC-Existing',
        description: 'Updated description',
      });

      const group = await service.createGroup({
        name: 'SEC-Existing',
        description: 'Updated description',
      });

      expect(group.id).toBe('grp-exist');
      expect(mockPrisma.directoryGroup.update).toHaveBeenCalledWith({
        where: { id: 'grp-exist' },
        data: expect.objectContaining({
          description: 'Updated description',
        }),
      });
    });
  });
});
