import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { LocationType } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../src/database/prisma.service';
import { OrganizationService } from '../../src/modules/organization/organization.service';

interface MockLocation {
  id: string;
  name: string;
  code: string | null;
  type: LocationType;
  building: string | null;
  address: string | null;
  parentId: string | null;
}

interface MockPosition {
  id: string;
  title: string;
  code: string;
  level: string | null;
  description: string | null;
}

interface MockDepartment {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  managerName?: string | null;
  description?: string | null;
  positions: MockPosition[];
  children?: MockDepartment[];
  _count: { users: number };
}

interface MockOrgRecord {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  status?: string;
  locations: MockLocation[];
  departments: MockDepartment[];
  _count: { users: number; departments?: number; locations?: number };
}

describe('Milestone 1 — Organization Self-Referencing Hierarchy Adversarial Suite', () => {
  let service: OrganizationService;
  let orgsDb: MockOrgRecord[];

  let mockPrisma: {
    organization: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    department: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    position: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    location: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    directoryUser: {
      count: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    orgsDb = [];

    mockPrisma = {
      organization: {
        findMany: vi.fn(async () => orgsDb),
        findUnique: vi.fn(async (args: { where: { id?: string; code?: string } }) => {
          if (args.where.id) {
            return orgsDb.find((o) => o.id === args.where.id) ?? null;
          }
          if (args.where.code) {
            return orgsDb.find((o) => o.code === args.where.code) ?? null;
          }
          return null;
        }),
        create: vi.fn(async (args: { data: Prisma.OrganizationCreateInput }) => {
          const newRecord: MockOrgRecord = {
            id: `org-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: args.data.name,
            code: args.data.code,
            parentId: (args.data.parent as { connect?: { id?: string } })?.connect?.id ?? null,
            locations: [],
            departments: [],
            _count: { users: 0 },
          };
          orgsDb.push(newRecord);
          return newRecord;
        }),
        update: vi.fn(
          async (args: { where: { id: string }; data: { parentId?: string | null } }) => {
            const existing = orgsDb.find((o) => o.id === args.where.id);
            if (!existing) {
              throw new Error(`Organization ${args.where.id} not found`);
            }
            if (args.data.parentId !== undefined) {
              existing.parentId = args.data.parentId;
            }
            return existing;
          },
        ),
        delete: vi.fn(async (args: { where: { id: string } }) => {
          const idx = orgsDb.findIndex((o) => o.id === args.where.id);
          if (idx === -1) {
            throw new Error(`Organization ${args.where.id} not found`);
          }
          const [deleted] = orgsDb.splice(idx, 1);
          // Simulate PostgreSQL ON DELETE SET NULL on self-referential foreign key
          for (const org of orgsDb) {
            if (org.parentId === args.where.id) {
              org.parentId = null;
            }
          }
          return deleted;
        }),
        count: vi.fn(async () => orgsDb.length),
      },
      department: {
        findMany: vi.fn(async () => []),
        findUnique: vi.fn(async () => null),
        count: vi.fn(async () => 0),
      },
      position: {
        findMany: vi.fn(async () => []),
        findUnique: vi.fn(async () => null),
        count: vi.fn(async () => 0),
      },
      location: {
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
      },
      directoryUser: {
        count: vi.fn(async () => 0),
      },
    };

    service = new OrganizationService(mockPrisma as unknown as PrismaService);
  });

  // =========================================================================
  // REQUIREMENT 1: Multi-tier Hierarchy (Holding -> Child -> Grandchild)
  // =========================================================================
  describe('1. Multi-tier Hierarchy: Parent (Holding) -> Child (BSH / BSL) -> Grandchild (Regional Unit)', () => {
    it('should correctly nest a 3-tier corporate hierarchy: Holding -> Subsidiary -> Grandchild', async () => {
      orgsDb = [
        {
          id: 'org-holding',
          name: 'Youngone / Broadpeak Group',
          code: 'HOLDING',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 15 },
        },
        {
          id: 'org-bsl',
          name: 'Broadpeak Soc Trang',
          code: 'BSL',
          parentId: 'org-holding',
          locations: [
            {
              id: 'loc-bsl-bc',
              name: 'Business Center Building',
              code: 'BC-BLDG',
              type: 'CAMPUS' as LocationType,
              building: 'BC',
              address: 'Soc Trang Complex',
              parentId: null,
            },
          ],
          departments: [],
          _count: { users: 200 },
        },
        {
          id: 'org-bsl-reg1',
          name: 'BSL Regional Logistics Unit',
          code: 'BSL-REG-LOG',
          parentId: 'org-bsl',
          locations: [
            {
              id: 'loc-wh-hub',
              name: 'Central Warehouse Hub',
              code: 'WH-HUB',
              type: 'WAREHOUSE' as LocationType,
              building: 'WH',
              address: 'Logistics Zone',
              parentId: null,
            },
          ],
          departments: [
            {
              id: 'dept-mat',
              name: 'Raw Materials Storage',
              code: 'DEPT-MAT-1',
              parentId: null,
              positions: [
                {
                  id: 'pos-wh-mgr',
                  title: 'Warehouse Manager',
                  code: 'POS-WHM',
                  level: 'Manager',
                  description: 'Manages materials',
                },
              ],
              _count: { users: 12 },
            },
          ],
          _count: { users: 45 },
        },
      ];

      const tree = await service.getHierarchyTree();

      // Top-level should have exactly 1 root organization (Holding)
      expect(tree).toHaveLength(1);
      const holding = tree[0];
      expect(holding.key).toBe('org-org-holding');
      expect(holding.code).toBe('HOLDING');
      expect(holding.type).toBe('organization');

      // Tier 2: BSL must be nested directly inside holding.children
      const holdingChildOrgs = holding.children?.filter((c) => c.type === 'organization') ?? [];
      expect(holdingChildOrgs).toHaveLength(1);
      const bsl = holdingChildOrgs[0];
      expect(bsl.key).toBe('org-org-bsl');
      expect(bsl.code).toBe('BSL');

      // Tier 3: Grandchild (Regional Unit) must be nested directly inside BSL.children
      const bslChildOrgs = bsl.children?.filter((c) => c.type === 'organization') ?? [];
      expect(bslChildOrgs).toHaveLength(1);
      const grandchild = bslChildOrgs[0];
      expect(grandchild.key).toBe('org-org-bsl-reg1');
      expect(grandchild.code).toBe('BSL-REG-LOG');

      // Grandchild must retain its own facilities and departments intact
      const gcBranchGroup = grandchild.children?.find((c) => c.code === 'BRANCHES');
      expect(gcBranchGroup).toBeDefined();
      expect(gcBranchGroup?.children?.[0].key).toBe('loc-loc-wh-hub');

      const gcDept = grandchild.children?.find((c) => c.key === 'dept-dept-mat');
      expect(gcDept).toBeDefined();
      expect(gcDept?.children?.[0].key).toBe('pos-pos-wh-mgr');

      // Verify serialization safety (no cyclic JSON crash)
      const serialized = JSON.stringify(tree);
      expect(serialized).toContain('"code":"BSL-REG-LOG"');
      expect(JSON.parse(serialized)).toHaveLength(1);
    });

    it('should correctly nest a multi-branch multi-tier corporate tree with mixed child depths', async () => {
      orgsDb = [
        {
          id: 'org-holding',
          name: 'Youngone / Broadpeak Group',
          code: 'HOLDING',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
        // Branch 1: BSH (Flat office only, no child orgs)
        {
          id: 'org-bsh',
          name: 'Broadpeak Ho Chi Minh',
          code: 'BSH',
          parentId: 'org-holding',
          locations: [
            {
              id: 'loc-bsh-hq',
              name: 'HCM Executive Office',
              code: 'BSH-HQ',
              type: 'OFFICE' as LocationType,
              building: 'Saigon Tower',
              address: 'Dist 1, HCMC',
              parentId: null,
            },
          ],
          departments: [],
          _count: { users: 60 },
        },
        // Branch 2: BSL (Manufacturing Complex with 2 regional units)
        {
          id: 'org-bsl',
          name: 'Broadpeak Soc Trang',
          code: 'BSL',
          parentId: 'org-holding',
          locations: [],
          departments: [],
          _count: { users: 500 },
        },
        // Grandchild 1 under BSL
        {
          id: 'org-bsl-factory-hub',
          name: 'Factory Operations Hub',
          code: 'BSL-F-HUB',
          parentId: 'org-bsl',
          locations: [],
          departments: [],
          _count: { users: 350 },
        },
        // Grandchild 2 under BSL
        {
          id: 'org-bsl-wh-hub',
          name: 'Logistics & Supply Hub',
          code: 'BSL-WH-HUB',
          parentId: 'org-bsl',
          locations: [],
          departments: [],
          _count: { users: 80 },
        },
        // Great-grandchild under Factory Operations Hub (Tier 4)
        {
          id: 'org-bsl-f1-unit',
          name: 'Factory 1 Production Unit',
          code: 'BSL-F1-UNIT',
          parentId: 'org-bsl-factory-hub',
          locations: [],
          departments: [],
          _count: { users: 120 },
        },
      ];

      const tree = await service.getHierarchyTree();

      expect(tree).toHaveLength(1);
      const holding = tree[0];

      // Holding has 2 direct child organizations: BSH and BSL
      const holdingChildren = holding.children?.filter((c) => c.type === 'organization') ?? [];
      expect(holdingChildren).toHaveLength(2);
      expect(holdingChildren.map((o) => o.code)).toEqual(['BSH', 'BSL']);

      // BSH has 0 child organizations
      const bsh = holdingChildren.find((o) => o.code === 'BSH');
      const bshChildOrgs = bsh?.children?.filter((c) => c.type === 'organization') ?? [];
      expect(bshChildOrgs).toHaveLength(0);

      // BSL has 2 grandchildren: BSL-F-HUB and BSL-WH-HUB
      const bsl = holdingChildren.find((o) => o.code === 'BSL');
      const bslGrandchildren = bsl?.children?.filter((c) => c.type === 'organization') ?? [];
      expect(bslGrandchildren).toHaveLength(2);
      expect(bslGrandchildren.map((o) => o.code)).toEqual(['BSL-F-HUB', 'BSL-WH-HUB']);

      // BSL-F-HUB has 1 great-grandchild: BSL-F1-UNIT (Tier 4)
      const factoryHub = bslGrandchildren.find((o) => o.code === 'BSL-F-HUB');
      const greatGrandchildren =
        factoryHub?.children?.filter((c) => c.type === 'organization') ?? [];
      expect(greatGrandchildren).toHaveLength(1);
      expect(greatGrandchildren[0].code).toBe('BSL-F1-UNIT');
    });

    it('should maintain strict ordering: child organizations appear before facilities and departments', async () => {
      orgsDb = [
        {
          id: 'org-parent',
          name: 'Parent Org',
          code: 'PARENT',
          parentId: null,
          locations: [
            {
              id: 'loc-1',
              name: 'HQ Campus',
              code: 'CAMPUS',
              type: 'CAMPUS' as LocationType,
              building: null,
              address: null,
              parentId: null,
            },
          ],
          departments: [
            {
              id: 'dept-1',
              name: 'Executive Office',
              code: 'EXEC',
              parentId: null,
              positions: [],
              _count: { users: 10 },
            },
          ],
          _count: { users: 20 },
        },
        {
          id: 'org-child',
          name: 'Child Subsidiary',
          code: 'CHILD',
          parentId: 'org-parent',
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
      ];

      const tree = await service.getHierarchyTree();
      expect(tree).toHaveLength(1);
      const parentNode = tree[0];

      // Children list should be: [child organization, facilities group, departments]
      expect(parentNode.children).toBeDefined();
      expect(parentNode.children?.[0].type).toBe('organization');
      expect(parentNode.children?.[0].code).toBe('CHILD');
      expect(parentNode.children?.[1].type).toBe('branch');
      expect(parentNode.children?.[1].code).toBe('BRANCHES');
      expect(parentNode.children?.[2].type).toBe('department');
      expect(parentNode.children?.[2].code).toBe('EXEC');
    });
  });

  // =========================================================================
  // REQUIREMENT 2: Referential Integrity (onDelete: SetNull on Parent Deletion)
  // =========================================================================
  describe('2. Referential Integrity: Parent Deletion Detaches Children via onDelete: SetNull', () => {
    it('should detach children (parentId becomes null) rather than cascading deletion when parent is deleted', async () => {
      orgsDb = [
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
          locations: [],
          departments: [],
          _count: { users: 50 },
        },
        {
          id: 'org-bsl',
          name: 'Broadpeak Soc Trang',
          code: 'BSL',
          parentId: 'org-holding',
          locations: [],
          departments: [],
          _count: { users: 300 },
        },
        {
          id: 'org-bsl-f1',
          name: 'Factory 1 Regional Unit',
          code: 'BSL-F1',
          parentId: 'org-bsl',
          locations: [],
          departments: [],
          _count: { users: 100 },
        },
      ];

      // Step 1: Verify pre-deletion tree has 1 root (Holding)
      const preTree = await service.getHierarchyTree();
      expect(preTree).toHaveLength(1);
      expect(preTree[0].code).toBe('HOLDING');

      // Step 2: Delete parent holding company via service
      const deleted = await service.deleteOrganization('org-holding');
      expect(deleted.id).toBe('org-holding');

      // Step 3: Verify database records:
      // Parent is gone
      expect(orgsDb.find((o) => o.id === 'org-holding')).toBeUndefined();
      // Children STILL EXIST (did NOT cascade delete!)
      const bsh = orgsDb.find((o) => o.id === 'org-bsh');
      const bsl = orgsDb.find((o) => o.id === 'org-bsl');
      const grandchild = orgsDb.find((o) => o.id === 'org-bsl-f1');

      expect(bsh).toBeDefined();
      expect(bsl).toBeDefined();
      expect(grandchild).toBeDefined();

      // Children's parentId became null (ON DELETE SET NULL)
      expect(bsh?.parentId).toBeNull();
      expect(bsl?.parentId).toBeNull();

      // Grandchild's parentId remained intact (still references BSL)
      expect(grandchild?.parentId).toBe('org-bsl');

      // Step 4: Verify post-deletion getHierarchyTree()
      // Now BSH and BSL are both promoted to top-level root nodes
      const postTree = await service.getHierarchyTree();
      expect(postTree).toHaveLength(2);
      expect(postTree.map((o) => o.code).sort()).toEqual(['BSH', 'BSL']);

      // BSL still retains its grandchild
      const bslNode = postTree.find((o) => o.code === 'BSL');
      const bslChildren = bslNode?.children?.filter((c) => c.type === 'organization') ?? [];
      expect(bslChildren).toHaveLength(1);
      expect(bslChildren[0].code).toBe('BSL-F1');
    });

    it('should detach grandchildren when intermediate child organization is deleted', async () => {
      orgsDb = [
        {
          id: 'org-holding',
          name: 'Holding Co',
          code: 'HOLDING',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
        {
          id: 'org-mid',
          name: 'Intermediate Subsidiary',
          code: 'MID',
          parentId: 'org-holding',
          locations: [],
          departments: [],
          _count: { users: 20 },
        },
        {
          id: 'org-leaf',
          name: 'Leaf Regional Unit',
          code: 'LEAF',
          parentId: 'org-mid',
          locations: [],
          departments: [],
          _count: { users: 15 },
        },
      ];

      // Delete intermediate node
      await service.deleteOrganization('org-mid');

      // Holding survives
      expect(orgsDb.find((o) => o.id === 'org-holding')).toBeDefined();
      // Mid is deleted
      expect(orgsDb.find((o) => o.id === 'org-mid')).toBeUndefined();
      // Leaf survives and was detached (parentId became null)
      const leaf = orgsDb.find((o) => o.id === 'org-leaf');
      expect(leaf).toBeDefined();
      expect(leaf?.parentId).toBeNull();

      // In tree: both Holding and Leaf are now top-level roots
      const tree = await service.getHierarchyTree();
      expect(tree).toHaveLength(2);
      expect(tree.map((o) => o.code).sort()).toEqual(['HOLDING', 'LEAF']);
    });
  });

  // =========================================================================
  // REQUIREMENT 3: Cycle Prevention (parentId === id Rejection)
  // =========================================================================
  describe('3. Cycle Prevention: Updating Organization to Reference Itself as Parent (parentId === id)', () => {
    it('should reject with BadRequestException when updating organization to reference itself as parent', async () => {
      orgsDb = [
        {
          id: 'org-test-self',
          name: 'Self Reference Org',
          code: 'SELF-1',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 2 },
        },
      ];

      await expect(
        service.updateOrganization('org-test-self', {
          parentId: 'org-test-self',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.updateOrganization('org-test-self', {
          parentId: 'org-test-self',
        }),
      ).rejects.toThrow('Organization cannot be its own parent');
    });

    it('should allow updating parentId to a valid different organization ID', async () => {
      orgsDb = [
        {
          id: 'org-parent-valid',
          name: 'Valid Parent',
          code: 'P-VALID',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
        {
          id: 'org-child-valid',
          name: 'Valid Child',
          code: 'C-VALID',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 10 },
        },
      ];

      const result = await service.updateOrganization('org-child-valid', {
        parentId: 'org-parent-valid',
      });

      expect(result.parentId).toBe('org-parent-valid');
      expect(orgsDb.find((o) => o.id === 'org-child-valid')?.parentId).toBe('org-parent-valid');
    });

    it('should allow detaching an organization by updating parentId to null or undefined', async () => {
      orgsDb = [
        {
          id: 'org-attached',
          name: 'Attached Child',
          code: 'ATTACHED',
          parentId: 'org-some-parent',
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
      ];

      // Detach via null
      const resultNull = await service.updateOrganization('org-attached', {
        parentId: null as unknown as string,
      });
      expect(resultNull.parentId).toBeNull();

      // Re-attach then update other fields without touching parentId
      orgsDb[0].parentId = 'org-some-parent';
      const resultNoParent = await service.updateOrganization('org-attached', {
        name: 'Updated Name',
      });
      expect(resultNoParent.parentId).toBe('org-some-parent');
    });
  });

  // =========================================================================
  // REQUIREMENT 4: Circular Loop Defense (getHierarchyTree() Does Not Hang)
  // =========================================================================
  describe('4. Circular Loop Defense: getHierarchyTree() Defense Against Circular References', () => {
    it('should not hang or crash when org A references B and B references A (2-node loop)', async () => {
      orgsDb = [
        {
          id: 'org-alpha',
          name: 'Company Alpha',
          code: 'ALPHA',
          parentId: 'org-beta', // Alpha points to Beta
          locations: [],
          departments: [],
          _count: { users: 10 },
        },
        {
          id: 'org-beta',
          name: 'Company Beta',
          code: 'BETA',
          parentId: 'org-alpha', // Beta points to Alpha
          locations: [],
          departments: [],
          _count: { users: 20 },
        },
      ];

      const startTime = performance.now();
      const tree = await service.getHierarchyTree();
      const elapsedMs = performance.now() - startTime;

      // Assert it finished quickly without hanging
      expect(elapsedMs).toBeLessThan(100);

      // Both organizations must be recovered at root level rather than dropped or infinite looping
      expect(tree).toHaveLength(2);
      expect(tree.map((o) => o.code).sort()).toEqual(['ALPHA', 'BETA']);

      // JSON serialization must succeed without throwing "Converting circular structure to JSON"
      expect(() => JSON.stringify(tree)).not.toThrow();
      const jsonStr = JSON.stringify(tree);
      expect(jsonStr).toContain('"code":"ALPHA"');
      expect(jsonStr).toContain('"code":"BETA"');
    });

    it('should not hang when 3 or more organizations form a circular ring: A -> B -> C -> A', async () => {
      orgsDb = [
        {
          id: 'org-ring-1',
          name: 'Ring Unit 1',
          code: 'RING-1',
          parentId: 'org-ring-3', // 1 points to 3
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
        {
          id: 'org-ring-2',
          name: 'Ring Unit 2',
          code: 'RING-2',
          parentId: 'org-ring-1', // 2 points to 1
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
        {
          id: 'org-ring-3',
          name: 'Ring Unit 3',
          code: 'RING-3',
          parentId: 'org-ring-2', // 3 points to 2
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
      ];

      const startTime = performance.now();
      const tree = await service.getHierarchyTree();
      const elapsedMs = performance.now() - startTime;

      expect(elapsedMs).toBeLessThan(100);
      expect(tree).toHaveLength(3);
      expect(tree.map((o) => o.code).sort()).toEqual(['RING-1', 'RING-2', 'RING-3']);
      expect(() => JSON.stringify(tree)).not.toThrow();
    });

    it('should safely handle an organization record that points directly to itself in database (A -> A)', async () => {
      orgsDb = [
        {
          id: 'org-corrupt-self',
          name: 'Corrupt Self Loop',
          code: 'CORRUPT-SELF',
          parentId: 'org-corrupt-self', // points to self
          locations: [],
          departments: [],
          _count: { users: 1 },
        },
      ];

      const tree = await service.getHierarchyTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].code).toBe('CORRUPT-SELF');
      expect(() => JSON.stringify(tree)).not.toThrow();
    });

    it('should preserve valid corporate hierarchy while safely isolating corrupted circular loops', async () => {
      orgsDb = [
        // Valid 3-tier hierarchy: Holding -> BSH, BSL -> Factory Unit
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
          locations: [],
          departments: [],
          _count: { users: 40 },
        },
        {
          id: 'org-bsl',
          name: 'Broadpeak Soc Trang',
          code: 'BSL',
          parentId: 'org-holding',
          locations: [],
          departments: [],
          _count: { users: 200 },
        },
        {
          id: 'org-bsl-f1',
          name: 'BSL Factory 1',
          code: 'BSL-F1',
          parentId: 'org-bsl',
          locations: [],
          departments: [],
          _count: { users: 80 },
        },
        // Corrupted 2-node circular loop alongside valid tree
        {
          id: 'org-loop-a',
          name: 'Corrupt Entity A',
          code: 'LOOP-A',
          parentId: 'org-loop-b',
          locations: [],
          departments: [],
          _count: { users: 1 },
        },
        {
          id: 'org-loop-b',
          name: 'Corrupt Entity B',
          code: 'LOOP-B',
          parentId: 'org-loop-a',
          locations: [],
          departments: [],
          _count: { users: 1 },
        },
        // Orphaned entity referencing non-existent parent
        {
          id: 'org-orphan',
          name: 'Orphaned Entity',
          code: 'ORPHAN',
          parentId: 'org-ghost-nonexistent',
          locations: [],
          departments: [],
          _count: { users: 2 },
        },
      ];

      const startTime = performance.now();
      const tree = await service.getHierarchyTree();
      const elapsedMs = performance.now() - startTime;

      expect(elapsedMs).toBeLessThan(100);

      // Top-level roots: Holding, LOOP-A, LOOP-B, ORPHAN (total 4)
      expect(tree).toHaveLength(4);

      // Verify the valid holding tree is completely intact
      const holding = tree.find((o) => o.code === 'HOLDING');
      expect(holding).toBeDefined();
      const holdingChildOrgs = holding?.children?.filter((c) => c.type === 'organization') ?? [];
      expect(holdingChildOrgs).toHaveLength(2);
      expect(holdingChildOrgs.map((o) => o.code)).toEqual(['BSH', 'BSL']);

      const bsl = holdingChildOrgs.find((o) => o.code === 'BSL');
      const bslChildren = bsl?.children?.filter((c) => c.type === 'organization') ?? [];
      expect(bslChildren).toHaveLength(1);
      expect(bslChildren[0].code).toBe('BSL-F1');

      // Verify corrupt and orphan nodes are present at root without crashing
      expect(tree.some((o) => o.code === 'LOOP-A')).toBe(true);
      expect(tree.some((o) => o.code === 'LOOP-B')).toBe(true);
      expect(tree.some((o) => o.code === 'ORPHAN')).toBe(true);

      // Entire composite tree serializes cleanly
      expect(() => JSON.stringify(tree)).not.toThrow();
    });
  });

  // =========================================================================
  // REQUIREMENT 5: Deep Hierarchy & Boundary Stress Tests
  // =========================================================================
  describe('5. Deep Hierarchy & Boundary Stress Tests', () => {
    it('should traverse a deep 20-level linear organization hierarchy without call stack exhaustion', async () => {
      const depth = 20;
      orgsDb = [];

      for (let i = 1; i <= depth; i++) {
        orgsDb.push({
          id: `org-level-${i}`,
          name: `Level ${i} Entity`,
          code: `L${i}`,
          parentId: i === 1 ? null : `org-level-${i - 1}`,
          locations: [],
          departments: [],
          _count: { users: i },
        });
      }

      const startTime = performance.now();
      const tree = await service.getHierarchyTree();
      const elapsedMs = performance.now() - startTime;

      expect(elapsedMs).toBeLessThan(150);
      expect(tree).toHaveLength(1);

      // Traverse down 20 levels
      let curr = tree[0];
      for (let level = 1; level <= depth; level++) {
        expect(curr.code).toBe(`L${level}`);
        if (level < depth) {
          const childOrgs = curr.children?.filter((c) => c.type === 'organization') ?? [];
          expect(childOrgs).toHaveLength(1);
          curr = childOrgs[0];
        }
      }

      expect(() => JSON.stringify(tree)).not.toThrow();
    });

    it('should handle large fan-out: parent with 50 direct child organizations', async () => {
      const childCount = 50;
      orgsDb = [
        {
          id: 'org-parent-hub',
          name: 'Central Conglomerate Hub',
          code: 'CONGLOMERATE',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 50 },
        },
      ];

      for (let i = 1; i <= childCount; i++) {
        orgsDb.push({
          id: `org-subsidiary-${i}`,
          name: `Subsidiary Unit ${i}`,
          code: `SUB-${i}`,
          parentId: 'org-parent-hub',
          locations: [],
          departments: [],
          _count: { users: 5 },
        });
      }

      const startTime = performance.now();
      const tree = await service.getHierarchyTree();
      const elapsedMs = performance.now() - startTime;

      expect(elapsedMs).toBeLessThan(150);
      expect(tree).toHaveLength(1);
      const hub = tree[0];
      const childOrgs = hub.children?.filter((c) => c.type === 'organization') ?? [];
      expect(childOrgs).toHaveLength(childCount);
      expect(() => JSON.stringify(tree)).not.toThrow();
    });
  });
});
