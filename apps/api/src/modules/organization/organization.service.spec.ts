import { BadRequestException } from '@nestjs/common';
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
      directoryUser: {
        count: vi.fn(),
      },
    };
    mockPrisma.directoryUser = mockPrisma.user;

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

    it('should correctly nest multi-tier departments across 4 levels (Executive -> Division -> Factory -> Section)', async () => {
      (
        mockPrisma.organization as { findMany: ReturnType<typeof vi.fn> }
      ).findMany.mockResolvedValueOnce([
        {
          id: 'org-bsl',
          name: 'Broadpeak Soc Trang',
          code: 'BSL',
          locations: [
            { id: 'loc-campus', name: 'Soc Trang Campus', type: 'CAMPUS', parentId: null },
            {
              id: 'loc-bldg',
              name: 'Factory 1 Building',
              type: 'BUILDING',
              parentId: 'loc-campus',
            },
          ],
          departments: [
            {
              id: 'dept-l1',
              name: 'Executive Leadership',
              code: 'DEPT-BSL-MGMT',
              parentId: null,
              positions: [
                { id: 'pos-gm', title: 'General Director', code: 'POS-GM', level: 'Executive' },
              ],
              _count: { users: 2 },
            },
            {
              id: 'dept-l2',
              name: 'Garment Manufacturing Division',
              code: 'DEPT-BSL-PROD',
              parentId: 'dept-l1',
              positions: [],
              _count: { users: 5 },
            },
            {
              id: 'dept-l3',
              name: 'Factory 1 Production',
              code: 'DEPT-BSL-F1',
              parentId: 'dept-l2',
              positions: [],
              _count: { users: 15 },
            },
            {
              id: 'dept-l4',
              name: 'Factory 1 - Cutting Section',
              code: 'DEPT-BSL-F1-CUT',
              parentId: 'dept-l3',
              positions: [
                { id: 'pos-cut-lead', title: 'Cutting Lead', code: 'POS-CUT-1', level: 'Lead' },
              ],
              _count: { users: 30 },
            },
          ],
          _count: { users: 52 },
        },
      ]);

      const tree = await service.getHierarchyTree();

      expect(tree).toHaveLength(1);
      const bsl = tree[0];
      expect(bsl.key).toBe('org-org-bsl');

      // Facilities group should have hierarchical nesting
      const branchGroup = bsl.children?.find((c) => c.code === 'BRANCHES');
      expect(branchGroup).toBeDefined();
      expect(branchGroup?.children).toHaveLength(1); // campus root
      expect(branchGroup?.children?.[0].key).toBe('loc-loc-campus');
      expect(branchGroup?.children?.[0].children).toHaveLength(1); // building inside campus
      expect(branchGroup?.children?.[0].children?.[0].key).toBe('loc-loc-bldg');

      // Level 1: Executive Leadership
      const l1 = bsl.children?.find((c) => c.key === 'dept-dept-l1');
      expect(l1).toBeDefined();

      // Level 2: Division under Level 1
      const l2 = l1?.children?.find((c) => c.key === 'dept-dept-l2');
      expect(l2).toBeDefined();

      // Level 3: Factory 1 under Division
      const l3 = l2?.children?.find((c) => c.key === 'dept-dept-l3');
      expect(l3).toBeDefined();

      // Level 4: Cutting Section under Factory 1
      const l4 = l3?.children?.find((c) => c.key === 'dept-dept-l4');
      expect(l4).toBeDefined();
      expect(l4?.children?.some((c) => c.key === 'pos-pos-cut-lead')).toBe(true);
    });

    it('should nest child organizations under their parent holding company', async () => {
      (
        mockPrisma.organization as { findMany: ReturnType<typeof vi.fn> }
      ).findMany.mockResolvedValueOnce([
        {
          id: 'org-holding',
          name: 'Youngone / Broadpeak Group',
          code: 'HOLDING',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 10 },
        },
        {
          id: 'org-bsh',
          name: 'Broadpeak Ho Chi Minh',
          code: 'BSH',
          parentId: 'org-holding',
          locations: [{ id: 'loc-bsh', name: 'HCM Office', type: 'Office', parentId: null }],
          departments: [],
          _count: { users: 50 },
        },
        {
          id: 'org-bsl',
          name: 'Broadpeak Soc Trang',
          code: 'BSL',
          parentId: 'org-holding',
          locations: [{ id: 'loc-bsl', name: 'Soc Trang Complex', type: 'Campus', parentId: null }],
          departments: [],
          _count: { users: 300 },
        },
      ]);

      const tree = await service.getHierarchyTree();

      // Top level should only contain the root holding company
      expect(tree).toHaveLength(1);
      expect(tree[0].key).toBe('org-org-holding');
      expect(tree[0].title).toBe('Youngone / Broadpeak Group');

      // Holding should have BSH and BSL nested inside children
      const childOrgs = tree[0].children?.filter((c) => c.type === 'organization');
      expect(childOrgs).toHaveLength(2);
      expect(childOrgs?.map((o) => o.code)).toEqual(['BSH', 'BSL']);

      // Subordinate companies should have their own branches/departments
      const bshNode = childOrgs?.find((o) => o.code === 'BSH');
      expect(bshNode?.children?.some((c) => c.code === 'BRANCHES')).toBe(true);
    });

    it('should gracefully handle cyclic organization references without crashing', async () => {
      (
        mockPrisma.organization as { findMany: ReturnType<typeof vi.fn> }
      ).findMany.mockResolvedValueOnce([
        {
          id: 'org-a',
          name: 'Org Alpha',
          code: 'ALPHA',
          parentId: 'org-b',
          locations: [],
          departments: [],
          _count: { users: 1 },
        },
        {
          id: 'org-b',
          name: 'Org Beta',
          code: 'BETA',
          parentId: 'org-a',
          locations: [],
          departments: [],
          _count: { users: 1 },
        },
      ]);

      const tree = await service.getHierarchyTree();
      expect(tree.length).toBeGreaterThan(0);
    });
  });

  describe('updateOrganization', () => {
    it('should throw BadRequestException when organization is set as its own parent', async () => {
      await expect(service.updateOrganization('org-123', { parentId: 'org-123' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update organization when parentId is a different valid ID', async () => {
      (
        mockPrisma.organization as { findUnique: ReturnType<typeof vi.fn> }
      ).findUnique.mockResolvedValueOnce({
        id: 'org-child',
        name: 'Child Org',
        code: 'CHILD',
        _count: { departments: 0, locations: 0, users: 0 },
      });
      (
        mockPrisma.organization as { update: ReturnType<typeof vi.fn> }
      ).update.mockResolvedValueOnce({
        id: 'org-child',
        name: 'Child Org',
        code: 'CHILD',
        parentId: 'org-parent',
      });

      const result = await service.updateOrganization('org-child', {
        parentId: 'org-parent',
      });

      expect(result.parentId).toBe('org-parent');
    });
  });
});
