import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockPrisma: Record<string, unknown>;

  beforeEach(() => {
    mockPrisma = {
      organization: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      department: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      position: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      location: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      user: {
        count: vi.fn(),
      },
    };

    service = new OrganizationService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('getStats', () => {
    it('should return aggregate organization counts', async () => {
      (mockPrisma.organization as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValueOnce(
        3,
      );
      (mockPrisma.department as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValueOnce(8);
      (mockPrisma.position as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValueOnce(15);
      (mockPrisma.location as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValueOnce(6);
      (mockPrisma.user as { count: ReturnType<typeof vi.fn> }).count.mockResolvedValueOnce(42);

      const stats = await service.getStats();

      expect(stats).toEqual({
        totalOrganizations: 3,
        totalDepartments: 8,
        totalPositions: 15,
        totalBranches: 6,
        totalEmployees: 42,
      });
    });
  });

  describe('findAllOrganizations', () => {
    it('should map organization counts correctly', async () => {
      (
        mockPrisma.organization as { findMany: ReturnType<typeof vi.fn> }
      ).findMany.mockResolvedValueOnce([
        {
          id: 'org-1',
          name: 'Acme HQ',
          code: 'ACME-US',
          _count: { departments: 4, locations: 2, users: 20 },
        },
      ]);

      const orgs = await service.findAllOrganizations();

      expect(orgs).toHaveLength(1);
      expect(orgs[0].departmentsCount).toBe(4);
      expect(orgs[0].locationsCount).toBe(2);
      expect(orgs[0].usersCount).toBe(20);
    });
  });

  describe('getHierarchyTree', () => {
    it('should build recursive tree structure', async () => {
      (
        mockPrisma.organization as { findMany: ReturnType<typeof vi.fn> }
      ).findMany.mockResolvedValueOnce([
        {
          id: 'org-1',
          name: 'Acme Corp',
          code: 'ACME',
          locations: [{ id: 'loc-1', name: 'NY HQ', type: 'Headquarters' }],
          departments: [
            {
              id: 'dept-1',
              name: 'Engineering',
              code: 'ENG',
              managerName: 'Sarah Chen',
              description: 'Core Engineering',
              children: [],
              positions: [{ id: 'pos-1', title: 'Senior Dev', code: 'DEV-SR', level: 'Senior' }],
              _count: { users: 10 },
            },
          ],
          _count: { users: 25 },
        },
      ]);

      const tree = await service.getHierarchyTree();

      expect(tree).toHaveLength(1);
      expect(tree[0].key).toBe('org-org-1');
      expect(tree[0].title).toBe('Acme Corp');
      expect(tree[0].children).toHaveLength(2); // 1 branch group + 1 dept
    });
  });
});
