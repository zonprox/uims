import type { Department } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import { buildDepartmentTree } from './OrganizationPage';

describe('buildDepartmentTree - Multi-Tier Corporate Hierarchy Engine', () => {
  const mockDepartments: Department[] = [
    // Level 1: Executive
    {
      id: 'dept-l1',
      name: 'Factory Executive Leadership',
      code: 'DEPT-BSL-MGMT',
      parentId: null,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    // Level 2: Division
    {
      id: 'dept-l2',
      name: 'Garment Manufacturing Division',
      code: 'DEPT-BSL-PROD',
      parentId: 'dept-l1',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    // Level 3: Factory
    {
      id: 'dept-l3',
      name: 'Factory 1 Production',
      code: 'DEPT-BSL-F1',
      parentId: 'dept-l2',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    // Level 4: Sections
    {
      id: 'dept-l4-cut',
      name: 'Factory 1 - Cutting Section',
      code: 'DEPT-BSL-F1-CUT',
      parentId: 'dept-l3',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'dept-l4-sew',
      name: 'Factory 1 - Sewing Assembly Lines',
      code: 'DEPT-BSL-F1-SEW',
      parentId: 'dept-l3',
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  it('builds a nested 4-tier tree from flat department records', () => {
    const tree = buildDepartmentTree(mockDepartments);

    expect(tree).toHaveLength(1);
    const l1 = tree[0];
    expect(l1.id).toBe('dept-l1');
    expect(l1.tierLevel).toBe(1);
    expect(l1.tierLabel).toBe('Level 1 • Executive Leadership');
    expect(l1.hierarchyPath).toBe('Factory Executive Leadership');

    // Level 2: Division
    expect(l1.children).toHaveLength(1);
    const l2 = l1.children![0];
    expect(l2.id).toBe('dept-l2');
    expect(l2.tierLevel).toBe(2);
    expect(l2.tierLabel).toBe('Level 2 • Operational Division');
    expect(l2.hierarchyPath).toBe('Factory Executive Leadership > Garment Manufacturing Division');

    // Level 3: Factory
    expect(l2.children).toHaveLength(1);
    const l3 = l2.children![0];
    expect(l3.id).toBe('dept-l3');
    expect(l3.tierLevel).toBe(3);
    expect(l3.tierLabel).toBe('Level 3 • Department / Factory');
    expect(l3.hierarchyPath).toBe(
      'Factory Executive Leadership > Garment Manufacturing Division > Factory 1 Production',
    );

    // Level 4: Sections
    expect(l3.children).toHaveLength(2);
    const cut = l3.children![0];
    expect(cut.id).toBe('dept-l4-cut');
    expect(cut.tierLevel).toBe(4);
    expect(cut.tierLabel).toBe('Level 4 • Functional Section');
    expect(cut.hierarchyPath).toBe(
      'Factory Executive Leadership > Garment Manufacturing Division > Factory 1 Production > Factory 1 - Cutting Section',
    );
    expect(cut.children).toBeUndefined();
  });

  it('filters tree with search query while preserving ancestor lineage', () => {
    const filtered = buildDepartmentTree(mockDepartments, 'Cutting');

    expect(filtered).toHaveLength(1);
    const l1 = filtered[0];
    expect(l1.id).toBe('dept-l1');
    const l2 = l1.children![0];
    expect(l2.id).toBe('dept-l2');
    const l3 = l2.children![0];
    expect(l3.id).toBe('dept-l3');

    // Only Cutting section should remain, Sewing lines filtered out
    expect(l3.children).toHaveLength(1);
    expect(l3.children![0].id).toBe('dept-l4-cut');
  });

  it('handles empty department list gracefully', () => {
    const tree = buildDepartmentTree([]);
    expect(tree).toEqual([]);
  });

  it('prevents infinite recursion when cyclic parent references exist', () => {
    const cyclicDepts: Department[] = [
      {
        id: 'dept-a',
        name: 'Dept A',
        code: 'A',
        parentId: 'dept-b',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'dept-b',
        name: 'Dept B',
        code: 'B',
        parentId: 'dept-a',
        status: 'ACTIVE',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    expect(() => buildDepartmentTree(cyclicDepts)).not.toThrow();
  });
});
