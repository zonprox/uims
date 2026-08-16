import type { OrgNode } from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import { computeTreeLayout, getNodeDimensions, getNodeTheme } from './OrganizationCanvas';

describe('OrganizationCanvas Layout Engine', () => {
  const sampleTree: OrgNode[] = [
    {
      key: 'org-1',
      title: 'Acme Corporation',
      code: 'ACM',
      type: 'organization',
      count: 150,
      description: 'Global Headquarters',
      children: [
        {
          key: 'branch-1',
          title: 'Tokyo Hub',
          code: 'TYO',
          type: 'branch',
          description: 'Regional Office',
        },
        {
          key: 'dept-1',
          title: 'Engineering Division',
          code: 'ENG',
          type: 'department',
          manager: 'Sarah Connor',
          count: 45,
          children: [
            {
              key: 'dept-2',
              title: 'Frontend Team',
              code: 'ENG-FE',
              type: 'sub-department',
              manager: 'John Doe',
              count: 12,
              children: [
                {
                  key: 'pos-1',
                  title: 'Senior Frontend Engineer',
                  code: 'SR-FE',
                  type: 'position',
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  it('correctly calculates dimensions for each node type', () => {
    expect(getNodeDimensions('organization')).toEqual({ width: 250, height: 92 });
    expect(getNodeDimensions('department')).toEqual({ width: 230, height: 86 });
    expect(getNodeDimensions('sub-department')).toEqual({ width: 215, height: 80 });
    expect(getNodeDimensions('branch')).toEqual({ width: 210, height: 76 });
    expect(getNodeDimensions('position')).toEqual({ width: 195, height: 70 });
  });

  it('assigns distinctive themes to each entity type (light and dark mode)', () => {
    // Light mode
    const orgThemeLight = getNodeTheme('organization', false);
    expect(orgThemeLight.tagColor).toBe('purple');
    expect(orgThemeLight.borderColor).toBe('#8b5cf6');
    expect(orgThemeLight.cardBg).toBe('#ffffff');

    const branchTheme = getNodeTheme('branch');
    expect(branchTheme.tagColor).toBe('green');

    const deptTheme = getNodeTheme('department');
    expect(deptTheme.tagColor).toBe('blue');

    const subDeptTheme = getNodeTheme('sub-department');
    expect(subDeptTheme.tagColor).toBe('cyan');

    const posTheme = getNodeTheme('position');
    expect(posTheme.tagColor).toBe('orange');

    // Dark mode
    const orgThemeDark = getNodeTheme('organization', true);
    expect(orgThemeDark.tagColor).toBe('purple');
    expect(orgThemeDark.borderColor).toBe('#a78bfa');
    expect(orgThemeDark.cardBg).toBe('#0f172a');
    expect(orgThemeDark.textColor).toBe('#f1f5f9');

    const branchThemeDark = getNodeTheme('branch', true);
    expect(branchThemeDark.borderColor).toBe('#34d399');

    const deptThemeDark = getNodeTheme('department', true);
    expect(deptThemeDark.borderColor).toBe('#60a5fa');
  });

  it('computes full vertical tree layout with nodes and edges', () => {
    const typeFilters = new Set([
      'organization',
      'branch',
      'department',
      'sub-department',
      'position',
    ]);
    const collapsedKeys = new Set<string>();

    const layout = computeTreeLayout(sampleTree, {
      collapsedKeys,
      typeFilters,
      maxDepth: 10,
      lineStyle: 'bezier',
      orientation: 'vertical',
    });

    expect(layout.nodes).toHaveLength(5);
    expect(layout.edges).toHaveLength(4);
    expect(layout.bounds.width).toBeGreaterThan(0);
    expect(layout.bounds.height).toBeGreaterThan(0);

    const rootNode = layout.nodes.find((n) => n.key === 'org-1');
    expect(rootNode).toBeDefined();
    expect(rootNode?.depth).toBe(0);
    expect(rootNode?.y).toBe(40);

    const childBranch = layout.nodes.find((n) => n.key === 'branch-1');
    expect(childBranch).toBeDefined();
    expect(childBranch?.depth).toBe(1);
    expect(childBranch?.y).toBeGreaterThan(rootNode?.y || 0);
  });

  it('respects collapsed branches when calculating layout', () => {
    const typeFilters = new Set([
      'organization',
      'branch',
      'department',
      'sub-department',
      'position',
    ]);
    const collapsedKeys = new Set<string>(['dept-1']);

    const layout = computeTreeLayout(sampleTree, {
      collapsedKeys,
      typeFilters,
      maxDepth: 10,
      lineStyle: 'orthogonal',
      orientation: 'vertical',
    });

    // org-1, branch-1, dept-1 (dept-2 and pos-1 collapsed)
    expect(layout.nodes).toHaveLength(3);
    const deptNode = layout.nodes.find((n) => n.key === 'dept-1');
    expect(deptNode?.isCollapsed).toBe(true);
    expect(deptNode?.childCount).toBe(1);
  });

  it('respects type filters to hide specific node categories', () => {
    // Hide positions
    const typeFilters = new Set(['organization', 'branch', 'department', 'sub-department']);
    const collapsedKeys = new Set<string>();

    const layout = computeTreeLayout(sampleTree, {
      collapsedKeys,
      typeFilters,
      maxDepth: 10,
      lineStyle: 'bezier',
      orientation: 'vertical',
    });

    expect(layout.nodes.some((n) => n.data.type === 'position')).toBe(false);
    expect(layout.nodes).toHaveLength(4);
  });

  it('respects max depth filtering', () => {
    const typeFilters = new Set([
      'organization',
      'branch',
      'department',
      'sub-department',
      'position',
    ]);
    const collapsedKeys = new Set<string>();

    // Depth 0 = only root entities
    const layoutDepth0 = computeTreeLayout(sampleTree, {
      collapsedKeys,
      typeFilters,
      maxDepth: 0,
      lineStyle: 'bezier',
      orientation: 'vertical',
    });

    expect(layoutDepth0.nodes).toHaveLength(1);
    expect(layoutDepth0.nodes[0].key).toBe('org-1');
  });

  it('computes horizontal orientation layout', () => {
    const typeFilters = new Set([
      'organization',
      'branch',
      'department',
      'sub-department',
      'position',
    ]);
    const collapsedKeys = new Set<string>();

    const layout = computeTreeLayout(sampleTree, {
      collapsedKeys,
      typeFilters,
      maxDepth: 10,
      lineStyle: 'orthogonal',
      orientation: 'horizontal',
    });

    expect(layout.nodes).toHaveLength(5);
    const rootNode = layout.nodes.find((n) => n.key === 'org-1');
    const childBranch = layout.nodes.find((n) => n.key === 'branch-1');
    expect(childBranch?.x).toBeGreaterThan(rootNode?.x || 0);
  });
});
