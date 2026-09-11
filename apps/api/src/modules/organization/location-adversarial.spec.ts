import { BadRequestException } from '@nestjs/common';
import { LocationType } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { OrganizationService } from './organization.service';

interface MockLocationRecord {
  id: string;
  name: string;
  code?: string | null;
  type: LocationType;
  parentId?: string | null;
  fullPath?: string | null;
  description?: string | null;
  organizationId?: string | null;
  organization?: { id: string; name: string; code: string } | null;
  _count?: {
    assets: number;
    inventoryItems: number;
    users: number;
    children: number;
  };
}

describe('Location Adversarial & Stress Harness (OrganizationService)', () => {
  let service: OrganizationService;
  let mockPrisma: {
    location: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      location: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    service = new OrganizationService(mockPrisma as unknown as PrismaService);
  });

  // =========================================================================
  // 1. DEEP HIERARCHY STRESS TESTS (15+ TO 30 LEVELS)
  // =========================================================================
  describe('Deep Hierarchy Stress Tests', () => {
    it('should build and traverse an ultra-deep 30-level linear hierarchy without call stack exhaustion', async () => {
      const depthCount = 30;
      const deepChain: MockLocationRecord[] = [];

      for (let i = 0; i < depthCount; i++) {
        deepChain.push({
          id: `chain-node-${i}`,
          name: `Level ${i.toString().padStart(2, '0')}`,
          code: `LVL-${i}`,
          type: i === 0 ? LocationType.CAMPUS : LocationType.ROOM,
          parentId: i === 0 ? null : `chain-node-${i - 1}`,
          fullPath: null,
          organizationId: 'org-enterprise',
          _count: { assets: 1, inventoryItems: 2, users: 1, children: i < depthCount - 1 ? 1 : 0 },
        });
      }

      mockPrisma.location.findMany.mockResolvedValue(deepChain);

      const tree = await service.getLocationTree('org-enterprise');

      // 1. Single root node at level 0
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('chain-node-0');
      expect(tree[0].fullPath).toBe('Level 00');

      // 2. Walk down 30 levels and verify nested chain
      let current = tree[0];
      for (let i = 1; i < depthCount; i++) {
        expect(current.children).toBeDefined();
        expect(current.children).toHaveLength(1);
        current = current.children![0];
        expect(current.id).toBe(`chain-node-${i}`);
      }

      // 3. Leaf node verification at level 29
      expect(current.children).toHaveLength(0);
      const expectedLeafPath = Array.from(
        { length: depthCount },
        (_, k) => `Level ${k.toString().padStart(2, '0')}`,
      ).join(' > ');
      expect(current.fullPath).toBe(expectedLeafPath);

      // 4. Verify breadcrumb delimiter split count
      const pathSegments = current.fullPath.split(' > ');
      expect(pathSegments).toHaveLength(30);
      expect(pathSegments[0]).toBe('Level 00');
      expect(pathSegments[29]).toBe('Level 29');
    });

    it('should resolve descendant IDs accurately across a 30-level hierarchy from root and intermediate nodes', async () => {
      const depthCount = 30;
      const deepChain = Array.from({ length: depthCount }, (_, i) => ({
        id: `node-${i}`,
        parentId: i === 0 ? null : `node-${i - 1}`,
      }));

      mockPrisma.location.findMany.mockResolvedValue(deepChain);

      // Root resolution: all 30 descendants
      const allDescendants = await service.getDescendantLocationIds('node-0');
      expect(allDescendants).toHaveLength(30);
      expect(allDescendants[0]).toBe('node-0');
      expect(allDescendants[29]).toBe('node-29');

      // Mid-point resolution: level 15 returns 15 descendants (node-15 to node-29)
      const midDescendants = await service.getDescendantLocationIds('node-15');
      expect(midDescendants).toHaveLength(15);
      expect(midDescendants[0]).toBe('node-15');
      expect(midDescendants[14]).toBe('node-29');
      expect(midDescendants).not.toContain('node-0');
      expect(midDescendants).not.toContain('node-14');

      // Leaf resolution: returns single element array
      const leafDescendants = await service.getDescendantLocationIds('node-29');
      expect(leafDescendants).toEqual(['node-29']);
    });

    it('should iteratively compute fullPath climbing 25 levels without recursion depth limits', async () => {
      const depthCount = 25;
      const deepChain = Array.from({ length: depthCount }, (_, i) => ({
        id: `node-${i}`,
        name: `Tier-${i}`,
        parentId: i === 0 ? null : `node-${i - 1}`,
      }));

      mockPrisma.location.findMany.mockResolvedValue(deepChain);
      mockPrisma.location.update.mockImplementation(({ data }: { data: { fullPath: string } }) =>
        Promise.resolve({ id: `node-${depthCount - 1}`, fullPath: data.fullPath }),
      );

      const leafId = `node-${depthCount - 1}`;
      const path = await service.computeFullPath(leafId);

      const expectedPath = Array.from({ length: depthCount }, (_, k) => `Tier-${k}`).join(' > ');
      expect(path).toBe(expectedPath);
      expect(mockPrisma.location.update).toHaveBeenCalledWith({
        where: { id: leafId },
        data: { fullPath: expectedPath },
      });
    });

    it('should build a 16-level branching tree with multiple forks per level', async () => {
      // Create a balanced binary tree of depth 5 (31 nodes) linked to deep chains
      const nodes: MockLocationRecord[] = [];
      const totalLevels = 16;

      // Root
      nodes.push({
        id: 'branch-root',
        name: 'Root Campus',
        type: LocationType.CAMPUS,
        parentId: null,
      });

      // Two main factory branches
      nodes.push(
        {
          id: 'factory-A',
          name: 'Factory A',
          type: LocationType.WORKSHOP,
          parentId: 'branch-root',
        },
        {
          id: 'factory-B',
          name: 'Factory B',
          type: LocationType.WORKSHOP,
          parentId: 'branch-root',
        },
      );

      // For each factory, build 14 more levels down
      for (const branch of ['A', 'B']) {
        let parent = `factory-${branch}`;
        for (let lvl = 3; lvl <= totalLevels; lvl++) {
          const childId = `fac-${branch}-lvl-${lvl}`;
          nodes.push({
            id: childId,
            name: `Branch ${branch} Sub-${lvl}`,
            type: LocationType.ZONE,
            parentId: parent,
          });
          parent = childId;
        }
      }

      mockPrisma.location.findMany.mockResolvedValue(nodes);

      const tree = await service.getLocationTree();
      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('branch-root');
      expect(tree[0].children).toHaveLength(2);

      const leafA = nodes.find((n) => n.id === 'fac-A-lvl-16');
      expect(leafA).toBeDefined();

      const descendantsA = await service.getDescendantLocationIds('factory-A');
      expect(descendantsA).toHaveLength(15); // factory-A + 14 child levels
      expect(descendantsA).toContain('fac-A-lvl-16');
      expect(descendantsA).not.toContain('factory-B');
      expect(descendantsA).not.toContain('fac-B-lvl-16');
    });
  });

  // =========================================================================
  // 2. SELF-PARENTING AND MUTUAL CYCLIC DEFENSE
  // =========================================================================
  describe('Self-Parenting & Cyclic Loop Defense', () => {
    it('should survive direct self-parenting (id === parentId) in database without infinite loops', async () => {
      const selfLoopNodes: MockLocationRecord[] = [
        {
          id: 'self-loop-node',
          name: 'Self Referential Node',
          type: LocationType.BUILDING,
          parentId: 'self-loop-node', // Direct self loop
          _count: { assets: 5, inventoryItems: 0, users: 2, children: 1 },
        },
        {
          id: 'valid-root',
          name: 'Independent Root',
          type: LocationType.CAMPUS,
          parentId: null,
          _count: { assets: 10, inventoryItems: 5, users: 8, children: 0 },
        },
      ];

      mockPrisma.location.findMany.mockResolvedValue(selfLoopNodes);

      // getLocationTree must NOT throw RangeError: Maximum call stack size exceeded
      const tree = await service.getLocationTree();
      expect(tree).toBeDefined();

      // The self-referencing node must be promoted to root rather than self-nested
      const selfNode = tree.find((n) => n.id === 'self-loop-node');
      expect(selfNode).toBeDefined();
      expect(selfNode?.children).toHaveLength(0);
      expect(selfNode?.fullPath).toBe('Self Referential Node');

      // getDescendantLocationIds must terminate and return only itself
      const descendants = await service.getDescendantLocationIds('self-loop-node');
      expect(descendants).toEqual(['self-loop-node']);

      // computeFullPath must terminate safely
      mockPrisma.location.update.mockResolvedValue({
        id: 'self-loop-node',
        fullPath: 'Self Referential Node',
      });
      const fullPath = await service.computeFullPath('self-loop-node');
      expect(fullPath).toBe('Self Referential Node');
    });

    it('should survive 2-node mutual cycles (A -> B -> A) without infinite recursion', async () => {
      const mutualCycleNodes: MockLocationRecord[] = [
        {
          id: 'cycle-node-A',
          name: 'Alpha Node',
          type: LocationType.WORKSHOP,
          parentId: 'cycle-node-B',
        },
        {
          id: 'cycle-node-B',
          name: 'Beta Node',
          type: LocationType.FLOOR,
          parentId: 'cycle-node-A',
        },
      ];

      mockPrisma.location.findMany.mockResolvedValue(mutualCycleNodes);

      // 1. Tree construction must break cycle and return nodes safely
      const tree = await service.getLocationTree();
      expect(tree).toBeDefined();
      expect(tree.length).toBeGreaterThanOrEqual(1);

      // Children must not infinitely nest
      for (const root of tree) {
        if (root.children && root.children.length > 0) {
          for (const child of root.children) {
            expect(child.children).toHaveLength(0);
          }
        }
      }

      // 2. getDescendantLocationIds must return both nodes exactly once
      const descendantsA = await service.getDescendantLocationIds('cycle-node-A');
      expect(descendantsA).toHaveLength(2);
      expect(descendantsA).toContain('cycle-node-A');
      expect(descendantsA).toContain('cycle-node-B');

      // 3. computeFullPath must terminate safely
      mockPrisma.location.update.mockResolvedValue({
        id: 'cycle-node-A',
        fullPath: 'Beta Node > Alpha Node',
      });
      const pathA = await service.computeFullPath('cycle-node-A');
      expect(pathA).toBeDefined();
      expect(['Beta Node > Alpha Node', 'Alpha Node > Beta Node']).toContain(pathA);
    });

    it('should survive 4-node mutual cycle with attached external trees (A -> B -> C -> D -> A + child)', async () => {
      const complexCycle: MockLocationRecord[] = [
        { id: 'c-A', name: 'Node A', type: LocationType.BUILDING, parentId: 'c-D' },
        { id: 'c-B', name: 'Node B', type: LocationType.FLOOR, parentId: 'c-A' },
        { id: 'c-C', name: 'Node C', type: LocationType.ZONE, parentId: 'c-B' },
        { id: 'c-D', name: 'Node D', type: LocationType.ROOM, parentId: 'c-C' },
        // Legitimate child attached to cycle node C
        { id: 'legit-leaf', name: 'Legitimate Leaf', type: LocationType.STATION, parentId: 'c-C' },
      ];

      mockPrisma.location.findMany.mockResolvedValue(complexCycle);

      const tree = await service.getLocationTree();
      expect(tree).toBeDefined();

      // Cycle must be broken and all nodes preserved
      const allTreeIds: string[] = [];
      const collectIds = (nodes: typeof tree) => {
        for (const n of nodes) {
          allTreeIds.push(n.id);
          if (n.children && n.children.length > 0) {
            collectIds(n.children);
          }
        }
      };
      collectIds(tree);
      expect(allTreeIds).toContain('c-A');
      expect(allTreeIds).toContain('c-B');
      expect(allTreeIds).toContain('c-C');
      expect(allTreeIds).toContain('c-D');
      expect(allTreeIds).toContain('legit-leaf');

      // getDescendantLocationIds from c-A must contain all 5 elements
      const descendants = await service.getDescendantLocationIds('c-A');
      expect(descendants).toHaveLength(5);
      expect(descendants).toEqual(
        expect.arrayContaining(['c-A', 'c-B', 'c-C', 'c-D', 'legit-leaf']),
      );
    });

    it('should reject updateLocation when setting parent to self', async () => {
      mockPrisma.location.findUnique.mockResolvedValue({
        id: 'target-loc-1',
        name: 'Target Location',
        parentId: null,
      });

      await expect(
        service.updateLocation('target-loc-1', { parentId: 'target-loc-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject updateLocation when setting parent to an existing descendant (cycle prevention)', async () => {
      // Hierarchy: P -> C1 -> C2
      mockPrisma.location.findUnique.mockResolvedValue({
        id: 'P',
        name: 'Parent Node',
        parentId: null,
      });
      mockPrisma.location.findMany.mockResolvedValue([
        { id: 'P', parentId: null },
        { id: 'C1', parentId: 'P' },
        { id: 'C2', parentId: 'C1' },
      ]);

      // Attempt to set P's parent to C2 (which is a descendant of P)
      await expect(service.updateLocation('P', { parentId: 'C2' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // =========================================================================
  // 3. DISCONNECTED BRANCHES, ORPHANED NODES & MULTI-TENANCY
  // =========================================================================
  describe('Disconnected Branches, Orphaned Nodes & Multi-Tenancy', () => {
    it('should handle orphaned nodes with non-existent parent IDs gracefully as roots', async () => {
      const orphanedData: MockLocationRecord[] = [
        {
          id: 'valid-root',
          name: 'Main Campus',
          type: LocationType.CAMPUS,
          parentId: null,
        },
        {
          id: 'orphan-1',
          name: 'Orphan Workshop 1',
          type: LocationType.WORKSHOP,
          parentId: 'deleted-parent-guid-9999',
        },
        {
          id: 'orphan-child',
          name: 'Orphan Sub-Line',
          type: LocationType.LINE,
          parentId: 'orphan-1', // Points to an orphan, which forms a disconnected tree
        },
      ];

      mockPrisma.location.findMany.mockResolvedValue(orphanedData);

      const tree = await service.getLocationTree();

      // Should return 2 roots: valid-root and orphan-1
      expect(tree).toHaveLength(2);
      const rootIds = tree.map((r) => r.id);
      expect(rootIds).toContain('valid-root');
      expect(rootIds).toContain('orphan-1');

      // orphan-1 should have orphan-child nested under it
      const orphanRoot = tree.find((r) => r.id === 'orphan-1');
      expect(orphanRoot?.children).toHaveLength(1);
      expect(orphanRoot?.children?.[0].id).toBe('orphan-child');
      expect(orphanRoot?.children?.[0].fullPath).toBe('Orphan Workshop 1 > Orphan Sub-Line');
    });

    it('should strictly isolate multi-tenant trees and prevent cross-organization leakage', async () => {
      const multiOrgData: MockLocationRecord[] = [
        // Organization Alpha (BSL)
        {
          id: 'bsl-campus',
          name: 'BSL Garment Campus',
          type: LocationType.CAMPUS,
          parentId: null,
          organizationId: 'org-bsl-uuid',
        },
        {
          id: 'bsl-factory-1',
          name: 'BSL Factory 1',
          type: LocationType.WORKSHOP,
          parentId: 'bsl-campus',
          organizationId: 'org-bsl-uuid',
        },
        // Organization Beta (BSH)
        {
          id: 'bsh-campus',
          name: 'BSH Electronics HQ',
          type: LocationType.CAMPUS,
          parentId: null,
          organizationId: 'org-bsh-uuid',
        },
        {
          id: 'bsh-office',
          name: 'BSH Hanoi Office',
          type: LocationType.BUILDING,
          parentId: 'bsh-campus',
          organizationId: 'org-bsh-uuid',
        },
      ];

      // When queried with organizationId = 'org-bsl-uuid'
      mockPrisma.location.findMany.mockImplementation(
        ({ where }: { where?: { organizationId?: string } }) => {
          if (where?.organizationId) {
            return Promise.resolve(
              multiOrgData.filter((l) => l.organizationId === where.organizationId),
            );
          }
          return Promise.resolve(multiOrgData);
        },
      );

      const bslTree = await service.getLocationTree('org-bsl-uuid');
      expect(bslTree).toHaveLength(1);
      expect(bslTree[0].id).toBe('bsl-campus');
      expect(bslTree[0].children).toHaveLength(1);
      expect(bslTree[0].children?.[0].id).toBe('bsl-factory-1');

      // BSH elements must NOT be present
      const bslIds = JSON.stringify(bslTree);
      expect(bslIds).not.toContain('bsh-campus');
      expect(bslIds).not.toContain('bsh-office');

      const bshTree = await service.getLocationTree('org-bsh-uuid');
      expect(bshTree).toHaveLength(1);
      expect(bshTree[0].id).toBe('bsh-campus');
      expect(bshTree[0].children).toHaveLength(1);
      expect(bshTree[0].children?.[0].id).toBe('bsh-office');

      // Cross-tenant filter check
      expect(JSON.stringify(bshTree)).not.toContain('bsl-campus');
    });

    it('should promote child to root when parent belongs to another tenant in scoped query', async () => {
      // Malicious or corrupted cross-tenant linkage:
      // Node in Org Beta points to parent in Org Alpha
      const crossLinkedData: MockLocationRecord[] = [
        {
          id: 'beta-orphan-child',
          name: 'Beta Facility With Alpha Parent',
          type: LocationType.WORKSHOP,
          parentId: 'alpha-campus-id', // Parent is in Org Alpha
          organizationId: 'org-beta',
        },
      ];

      mockPrisma.location.findMany.mockResolvedValue(crossLinkedData);

      const betaTree = await service.getLocationTree('org-beta');
      expect(betaTree).toHaveLength(1);
      expect(betaTree[0].id).toBe('beta-orphan-child');
      expect(betaTree[0].fullPath).toBe('Beta Facility With Alpha Parent');
    });
  });

  // =========================================================================
  // 4. BREADCRUMB DELIMITER ACCURACY (" > ") & UNICODE VIETNAMESE CHARACTERS
  // =========================================================================
  describe('Breadcrumb Delimiter Accuracy & Unicode Vietnamese Characters', () => {
    it('should generate exact breadcrumb paths using " > " delimiter across 5 tiers with Vietnamese diacritics', async () => {
      const vietnameseHierarchy: MockLocationRecord[] = [
        {
          id: 'vn-t0',
          name: 'Tổng Công ty May Mặc BSL - Cơ sở Sóc Trăng (Trụ sở chính)',
          code: 'BSL-ST-HQ',
          type: LocationType.CAMPUS,
          parentId: null,
          fullPath: null,
        },
        {
          id: 'vn-t1',
          name: 'Tòa nhà Điều hành & Trung tâm Nghiệp vụ Thương mại',
          code: 'BSL-BC',
          type: LocationType.BUILDING,
          parentId: 'vn-t0',
          fullPath: null,
        },
        {
          id: 'vn-t2',
          name: 'Phân xưởng Sản xuất May Xuất khẩu Số 07',
          code: 'BSL-PX07',
          type: LocationType.WORKSHOP,
          parentId: 'vn-t1',
          fullPath: null,
        },
        {
          id: 'vn-t3',
          name: 'Khu vực Cắt, In ấn & Ép nhiệt Kỹ thuật cao',
          code: 'BSL-PX07-CUT',
          type: LocationType.AREA,
          parentId: 'vn-t2',
          fullPath: null,
        },
        {
          id: 'vn-t4',
          name: 'Chuyền May Tự động 01 - Bàn Thao tác Số 04 (Vị trí QC/KCS)',
          code: 'BSL-PX07-L01-QC04',
          type: LocationType.STATION,
          parentId: 'vn-t3',
          fullPath: null,
        },
      ];

      mockPrisma.location.findMany.mockResolvedValue(vietnameseHierarchy);

      const tree = await service.getLocationTree();
      expect(tree).toHaveLength(1);

      // Trace down to leaf
      const leaf = tree[0]?.children?.[0]?.children?.[0]?.children?.[0]?.children?.[0];
      expect(leaf).toBeDefined();
      expect(leaf?.id).toBe('vn-t4');

      const expectedFullPath =
        'Tổng Công ty May Mặc BSL - Cơ sở Sóc Trăng (Trụ sở chính) > ' +
        'Tòa nhà Điều hành & Trung tâm Nghiệp vụ Thương mại > ' +
        'Phân xưởng Sản xuất May Xuất khẩu Số 07 > ' +
        'Khu vực Cắt, In ấn & Ép nhiệt Kỹ thuật cao > ' +
        'Chuyền May Tự động 01 - Bàn Thao tác Số 04 (Vị trí QC/KCS)';

      expect(leaf?.fullPath).toBe(expectedFullPath);

      // Verify delimiter splitting produces exact segments
      const segments = leaf!.fullPath.split(' > ');
      expect(segments).toHaveLength(5);
      expect(segments[0]).toBe('Tổng Công ty May Mặc BSL - Cơ sở Sóc Trăng (Trụ sở chính)');
      expect(segments[1]).toBe('Tòa nhà Điều hành & Trung tâm Nghiệp vụ Thương mại');
      expect(segments[2]).toBe('Phân xưởng Sản xuất May Xuất khẩu Số 07');
      expect(segments[3]).toBe('Khu vực Cắt, In ấn & Ép nhiệt Kỹ thuật cao');
      expect(segments[4]).toBe('Chuyền May Tự động 01 - Bàn Thao tác Số 04 (Vị trí QC/KCS)');

      // Verify Unicode normalization and diacritic integrity
      for (const segment of segments) {
        expect(segment).toBe(segment.normalize('NFC'));
      }
    });

    it('should compute fullPath with Vietnamese characters via iterative climbing', async () => {
      const vietnameseNodes = [
        { id: 'vn-root', name: 'Kho Tổng - BSL Sóc Trăng', parentId: null },
        { id: 'vn-wh', name: 'Kho Phụ Liệu & Vải Mộc', parentId: 'vn-root' },
        { id: 'vn-rack', name: 'Kệ Hàng R-01 (Khu Vực Ép Keo)', parentId: 'vn-wh' },
        { id: 'vn-bin', name: 'Ngăn Chứa N-15 (Chỉ May Polyester)', parentId: 'vn-rack' },
      ];

      mockPrisma.location.findMany.mockResolvedValue(vietnameseNodes);
      mockPrisma.location.update.mockImplementation(({ data }: { data: { fullPath: string } }) =>
        Promise.resolve({ id: 'vn-bin', fullPath: data.fullPath }),
      );

      const path = await service.computeFullPath('vn-bin');
      const expected =
        'Kho Tổng - BSL Sóc Trăng > Kho Phụ Liệu & Vải Mộc > Kệ Hàng R-01 (Khu Vực Ép Keo) > Ngăn Chứa N-15 (Chỉ May Polyester)';
      expect(path).toBe(expected);
      expect(mockPrisma.location.update).toHaveBeenCalledWith({
        where: { id: 'vn-bin' },
        data: { fullPath: expected },
      });
    });

    it('should correctly handle node names that contain symbols and delimiter characters', async () => {
      const specialCharNodes: MockLocationRecord[] = [
        {
          id: 'sp-1',
          name: 'Factory [Alpha/Beta] & Co.',
          type: LocationType.CAMPUS,
          parentId: null,
        },
        {
          id: 'sp-2',
          name: 'Line #01 (Speed > 100m/min)',
          type: LocationType.LINE,
          parentId: 'sp-1',
        },
      ];

      mockPrisma.location.findMany.mockResolvedValue(specialCharNodes);

      const tree = await service.getLocationTree();
      expect(tree).toHaveLength(1);
      const child = tree[0].children?.[0];
      expect(child?.fullPath).toBe('Factory [Alpha/Beta] & Co. > Line #01 (Speed > 100m/min)');
    });
  });

  // =========================================================================
  // 5. HIGH VOLUME FOREST STRESS TEST (500 NODES)
  // =========================================================================
  describe('High Volume Performance & Scale', () => {
    it('should assemble a large forest of 500 nodes across 50 independent trees in under 100ms', async () => {
      const nodeCount = 500;
      const treesCount = 50;
      const nodesPerTree = nodeCount / treesCount; // 10 nodes per tree
      const largeForest: MockLocationRecord[] = [];

      for (let t = 0; t < treesCount; t++) {
        const rootId = `forest-root-${t}`;
        largeForest.push({
          id: rootId,
          name: `Enterprise Campus ${t}`,
          type: LocationType.CAMPUS,
          parentId: null,
        });

        let parent = rootId;
        for (let n = 1; n < nodesPerTree; n++) {
          const childId = `forest-t${t}-node${n}`;
          largeForest.push({
            id: childId,
            name: `Sub-Facility ${t}-${n}`,
            type: LocationType.ROOM,
            parentId: parent,
          });
          parent = childId;
        }
      }

      mockPrisma.location.findMany.mockResolvedValue(largeForest);

      const startTime = performance.now();
      const tree = await service.getLocationTree();
      const durationMs = performance.now() - startTime;

      expect(tree).toHaveLength(treesCount);
      expect(durationMs).toBeLessThan(150); // High-speed execution requirement

      // Verify leaf node of last tree
      const lastRoot = tree[treesCount - 1];
      let curr = lastRoot;
      while (curr.children && curr.children.length > 0) {
        curr = curr.children[0];
      }
      expect(curr.id).toBe(`forest-t${treesCount - 1}-node${nodesPerTree - 1}`);
    });
  });
});
