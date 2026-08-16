import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BankOutlined,
  BranchesOutlined,
  ClusterOutlined,
  CompressOutlined,
  DownloadOutlined,
  EditOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FilterOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  IdcardOutlined,
  MinusSquareOutlined,
  OneToOneOutlined,
  PlusOutlined,
  PlusSquareOutlined,
  SearchOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import type { OrgNode } from '@uims/shared-types';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Empty,
  Flex,
  Input,
  type MenuProps,
  Radio,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useThemeStore } from '../../stores/theme.store';

const { Text } = Typography;

export interface OrganizationCanvasProps {
  treeData: OrgNode[];
  selectedNodeKey?: string | null;
  onSelectNode?: (node: OrgNode) => void;
  onOpenEditOrg?: (orgId: string) => void;
  onOpenEditDept?: (deptId: string) => void;
  onOpenEditPos?: (posId: string) => void;
  onOpenCreateDept?: (parentId?: string) => void;
  onOpenCreatePos?: (deptId?: string) => void;
  loading?: boolean;
}

export interface CanvasNodeLayout {
  id: string;
  key: string;
  data: OrgNode;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  isCollapsed: boolean;
  hasChildren: boolean;
  childCount: number;
  parentId?: string;
}

export interface CanvasEdgeLayout {
  id: string;
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  path: string;
}

export interface CanvasLayoutResult {
  nodes: CanvasNodeLayout[];
  edges: CanvasEdgeLayout[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export function getNodeDimensions(type: OrgNode['type']): { width: number; height: number } {
  switch (type) {
    case 'organization':
      return { width: 250, height: 92 };
    case 'department':
      return { width: 230, height: 86 };
    case 'sub-department':
      return { width: 215, height: 80 };
    case 'branch':
      return { width: 210, height: 76 };
    case 'position':
      return { width: 195, height: 70 };
    default:
      return { width: 220, height: 80 };
  }
}

export function getNodeTheme(type: OrgNode['type'], isDark = false) {
  switch (type) {
    case 'organization':
      return {
        borderColor: isDark ? '#a78bfa' : '#8b5cf6',
        bgHeader: isDark ? 'rgba(139, 92, 246, 0.18)' : '#f5f3ff',
        badgeBg: isDark ? 'rgba(139, 92, 246, 0.3)' : '#ede9fe',
        badgeColor: isDark ? '#ddd6fe' : '#6d28d9',
        tagColor: 'purple',
        icon: <BankOutlined style={{ color: isDark ? '#c4b5fd' : '#7c3aed' }} />,
        titleColor: isDark ? '#e9d5ff' : '#5b21b6',
        cardBg: isDark ? '#0f172a' : '#ffffff',
        textColor: isDark ? '#f1f5f9' : '#1e293b',
      };
    case 'branch':
      return {
        borderColor: isDark ? '#34d399' : '#10b981',
        bgHeader: isDark ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
        badgeBg: isDark ? 'rgba(16, 185, 129, 0.3)' : '#d1fae5',
        badgeColor: isDark ? '#a7f3d0' : '#047857',
        tagColor: 'green',
        icon: <EnvironmentOutlined style={{ color: isDark ? '#6ee7b7' : '#059669' }} />,
        titleColor: isDark ? '#a7f3d0' : '#065f46',
        cardBg: isDark ? '#0f172a' : '#ffffff',
        textColor: isDark ? '#f1f5f9' : '#1e293b',
      };
    case 'department':
      return {
        borderColor: isDark ? '#60a5fa' : '#3b82f6',
        bgHeader: isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff',
        badgeBg: isDark ? 'rgba(59, 130, 246, 0.3)' : '#dbeafe',
        badgeColor: isDark ? '#bfdbfe' : '#1d4ed8',
        tagColor: 'blue',
        icon: <ApartmentOutlined style={{ color: isDark ? '#93c5fd' : '#2563eb' }} />,
        titleColor: isDark ? '#bfdbfe' : '#1e40af',
        cardBg: isDark ? '#0f172a' : '#ffffff',
        textColor: isDark ? '#f1f5f9' : '#1e293b',
      };
    case 'sub-department':
      return {
        borderColor: isDark ? '#22d3ee' : '#06b6d4',
        bgHeader: isDark ? 'rgba(6, 182, 212, 0.18)' : '#ecfeff',
        badgeBg: isDark ? 'rgba(6, 182, 212, 0.3)' : '#cffafe',
        badgeColor: isDark ? '#a5f3fc' : '#0e7490',
        tagColor: 'cyan',
        icon: <ClusterOutlined style={{ color: isDark ? '#67e8f9' : '#0891b2' }} />,
        titleColor: isDark ? '#a5f3fc' : '#155e75',
        cardBg: isDark ? '#0f172a' : '#ffffff',
        textColor: isDark ? '#f1f5f9' : '#1e293b',
      };
    case 'position':
      return {
        borderColor: isDark ? '#fbbf24' : '#f59e0b',
        bgHeader: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb',
        badgeBg: isDark ? 'rgba(245, 158, 11, 0.3)' : '#fef3c7',
        badgeColor: isDark ? '#fde68a' : '#b45309',
        tagColor: 'orange',
        icon: <IdcardOutlined style={{ color: isDark ? '#fcd34d' : '#d97706' }} />,
        titleColor: isDark ? '#fef08a' : '#92400e',
        cardBg: isDark ? '#0f172a' : '#ffffff',
        textColor: isDark ? '#f1f5f9' : '#1e293b',
      };
    default:
      return {
        borderColor: isDark ? '#64748b' : '#94a3b8',
        bgHeader: isDark ? 'rgba(148, 163, 184, 0.18)' : '#f8fafc',
        badgeBg: isDark ? 'rgba(148, 163, 184, 0.3)' : '#f1f5f9',
        badgeColor: isDark ? '#e2e8f0' : '#475569',
        tagColor: 'default',
        icon: <ApartmentOutlined style={{ color: isDark ? '#94a3b8' : '#64748b' }} />,
        titleColor: isDark ? '#e2e8f0' : '#334155',
        cardBg: isDark ? '#0f172a' : '#ffffff',
        textColor: isDark ? '#f1f5f9' : '#1e293b',
      };
  }
}

interface InternalTreeNode {
  node: OrgNode;
  width: number;
  height: number;
  subtreeWidth: number;
  x: number;
  y: number;
  depth: number;
  parentId?: string;
  children: InternalTreeNode[];
  isCollapsed: boolean;
  hasChildren: boolean;
  childCount: number;
}

export function computeTreeLayout(
  treeData: OrgNode[],
  options: {
    collapsedKeys: Set<string>;
    typeFilters: Set<string>;
    maxDepth: number;
    lineStyle: 'bezier' | 'orthogonal';
    orientation: 'vertical' | 'horizontal';
    horizontalGap?: number;
    verticalGap?: number;
    rootGap?: number;
  },
): CanvasLayoutResult {
  const {
    collapsedKeys,
    typeFilters,
    maxDepth,
    lineStyle,
    orientation,
    horizontalGap = 24,
    verticalGap = 72,
    rootGap = 50,
  } = options;

  const isVertical = orientation === 'vertical';

  function buildInternalTree(
    rawNode: OrgNode,
    depth: number,
    parentId?: string,
  ): InternalTreeNode | null {
    if (!typeFilters.has(rawNode.type)) {
      return null;
    }
    if (depth > maxDepth) {
      return null;
    }

    const { width, height } = getNodeDimensions(rawNode.type);
    const w = isVertical ? width : height;
    const h = isVertical ? height : width;

    const rawChildren = rawNode.children || [];
    const validChildren = rawChildren.filter((c) => typeFilters.has(c.type));
    const isCollapsed = collapsedKeys.has(rawNode.key);
    const hasChildren = validChildren.length > 0;
    const childCount = validChildren.length;

    const children: InternalTreeNode[] = [];
    if (hasChildren && !isCollapsed && depth < maxDepth) {
      for (const childRaw of validChildren) {
        const childNode = buildInternalTree(childRaw, depth + 1, rawNode.key);
        if (childNode) {
          children.push(childNode);
        }
      }
    }

    let subtreeWidth = w;
    if (children.length > 0) {
      const sumChildren = children.reduce((acc, c) => acc + c.subtreeWidth, 0);
      const gaps = (children.length - 1) * horizontalGap;
      subtreeWidth = Math.max(w, sumChildren + gaps);
    }

    return {
      node: rawNode,
      width: w,
      height: h,
      subtreeWidth,
      x: 0,
      y: 0,
      depth,
      parentId,
      children,
      isCollapsed,
      hasChildren,
      childCount,
    };
  }

  const validRoots: InternalTreeNode[] = [];
  for (const root of treeData) {
    const rootNode = buildInternalTree(root, 0);
    if (rootNode) validRoots.push(rootNode);
  }

  const nodes: CanvasNodeLayout[] = [];
  const edges: CanvasEdgeLayout[] = [];

  let currentRootOffset = 40;

  function positionSubtree(item: InternalTreeNode, offset: number, currentY: number) {
    item.x = offset + (item.subtreeWidth - item.width) / 2;
    item.y = currentY;

    const finalNodeWidth = isVertical ? item.width : item.height;
    const finalNodeHeight = isVertical ? item.height : item.width;
    const finalX = isVertical ? item.x : item.y;
    const finalY = isVertical ? item.y : item.x;

    nodes.push({
      id: item.node.key,
      key: item.node.key,
      data: item.node,
      x: finalX,
      y: finalY,
      width: finalNodeWidth,
      height: finalNodeHeight,
      depth: item.depth,
      isCollapsed: item.isCollapsed,
      hasChildren: item.hasChildren,
      childCount: item.childCount,
      parentId: item.parentId,
    });

    if (item.children.length > 0) {
      let childOffset = offset;
      const childY = currentY + item.height + verticalGap;

      for (const child of item.children) {
        positionSubtree(child, childOffset, childY);

        const parentFinalX = isVertical ? item.x : item.y;
        const parentFinalY = isVertical ? item.y : item.x;
        const parentW = isVertical ? item.width : item.height;
        const parentH = isVertical ? item.height : item.width;

        const childFinalX = isVertical ? child.x : child.y;
        const childFinalY = isVertical ? child.y : child.x;
        const childW = isVertical ? child.width : child.height;
        const childH = isVertical ? child.height : child.width;

        let sourceX: number;
        let sourceY: number;
        let targetX: number;
        let targetY: number;
        let pathStr: string;

        if (isVertical) {
          sourceX = parentFinalX + parentW / 2;
          sourceY = parentFinalY + parentH;
          targetX = childFinalX + childW / 2;
          targetY = childFinalY;
          const midY = sourceY + (targetY - sourceY) / 2;

          if (lineStyle === 'orthogonal') {
            pathStr = `M ${sourceX} ${sourceY} V ${midY} H ${targetX} V ${targetY}`;
          } else {
            pathStr = `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;
          }
        } else {
          sourceX = parentFinalX + parentW;
          sourceY = parentFinalY + parentH / 2;
          targetX = childFinalX;
          targetY = childFinalY + childH / 2;
          const midX = sourceX + (targetX - sourceX) / 2;

          if (lineStyle === 'orthogonal') {
            pathStr = `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`;
          } else {
            pathStr = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`;
          }
        }

        edges.push({
          id: `edge-${item.node.key}->${child.node.key}`,
          sourceId: item.node.key,
          targetId: child.node.key,
          sourceX,
          sourceY,
          targetX,
          targetY,
          path: pathStr,
        });

        childOffset += child.subtreeWidth + horizontalGap;
      }
    }
  }

  for (const root of validRoots) {
    positionSubtree(root, currentRootOffset, 40);
    currentRootOffset += root.subtreeWidth + rootGap;
  }

  if (nodes.length === 0) {
    return {
      nodes: [],
      edges: [],
      bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 },
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x + node.width > maxX) maxX = node.x + node.width;
    if (node.y + node.height > maxY) maxY = node.y + node.height;
  }

  return {
    nodes,
    edges,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(maxX - minX, 100),
      height: Math.max(maxY - minY, 100),
    },
  };
}

export default function OrganizationCanvas({
  treeData,
  selectedNodeKey,
  onSelectNode,
  onOpenEditOrg,
  onOpenEditDept,
  onOpenEditPos,
  onOpenCreateDept,
  onOpenCreatePos,
  loading = false,
}: OrganizationCanvasProps) {
  const mode = useThemeStore((state) => state.mode);
  const isDark = mode === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  // Filter States
  const [typeFilters, setTypeFilters] = useState<Set<string>>(
    new Set(['organization', 'branch', 'department', 'sub-department', 'position']),
  );
  const [maxDepth, setMaxDepth] = useState<number>(10);
  const [lineStyle, setLineStyle] = useState<'bezier' | 'orthogonal'>('bezier');
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedIndex, setMatchedIndex] = useState(0);

  // Pan & Zoom transform
  const [transform, setTransform] = useState<{ x: number; y: number; scale: number }>({
    x: 40,
    y: 40,
    scale: 0.85,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);

  // Compute Layout
  const layout = useMemo(() => {
    return computeTreeLayout(treeData, {
      collapsedKeys,
      typeFilters,
      maxDepth,
      lineStyle,
      orientation,
    });
  }, [treeData, collapsedKeys, typeFilters, maxDepth, lineStyle, orientation]);

  // Search matches
  const matchedNodeKeys = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return layout.nodes
      .filter((n) => {
        const titleMatch = n.data.title?.toLowerCase().includes(q);
        const codeMatch = n.data.code?.toLowerCase().includes(q);
        const mgrMatch = n.data.manager?.toLowerCase().includes(q);
        const descMatch = n.data.description?.toLowerCase().includes(q);
        return titleMatch || codeMatch || mgrMatch || descMatch;
      })
      .map((n) => n.key);
  }, [searchQuery, layout.nodes]);

  const activeMatchedKey = matchedNodeKeys[matchedIndex] || null;

  // Fit View
  const handleFitView = useCallback(() => {
    if (!containerRef.current || layout.nodes.length === 0) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    if (containerW <= 0 || containerH <= 0) return;

    const { minX, minY, width, height } = layout.bounds;
    const padding = 60;
    const scaleX = (containerW - padding * 2) / width;
    const scaleY = (containerH - padding * 2) / height;
    const rawScale = Math.min(scaleX, scaleY);
    const newScale = Math.max(Math.min(rawScale, 1.2), 0.2);

    const newX = (containerW - width * newScale) / 2 - minX * newScale;
    const newY = (containerH - height * newScale) / 2 - minY * newScale;

    setTransform({ x: newX, y: newY, scale: newScale });
  }, [layout]);

  // Center on node
  const centerOnNode = useCallback(
    (nodeKey: string) => {
      const node = layout.nodes.find((n) => n.key === nodeKey);
      if (!node || !containerRef.current) return;
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;

      const targetCenterX = node.x + node.width / 2;
      const targetCenterY = node.y + node.height / 2;

      const newX = containerW / 2 - targetCenterX * transform.scale;
      const newY = containerH / 2 - targetCenterY * transform.scale;

      setTransform((prev) => ({ ...prev, x: newX, y: newY }));
    },
    [layout.nodes, transform.scale],
  );

  // Auto-fit on initial load or data changes
  useEffect(() => {
    if (layout.nodes.length > 0) {
      handleFitView();
    }
  }, [layout.nodes.length, handleFitView]);

  // Handle Search next/prev
  const handleNextMatch = () => {
    if (matchedNodeKeys.length === 0) return;
    const nextIdx = (matchedIndex + 1) % matchedNodeKeys.length;
    setMatchedIndex(nextIdx);
    centerOnNode(matchedNodeKeys[nextIdx]);
    const matchedNode = layout.nodes.find((n) => n.key === matchedNodeKeys[nextIdx]);
    if (matchedNode && onSelectNode) {
      onSelectNode(matchedNode.data);
    }
  };

  const handlePrevMatch = () => {
    if (matchedNodeKeys.length === 0) return;
    const prevIdx = (matchedIndex - 1 + matchedNodeKeys.length) % matchedNodeKeys.length;
    setMatchedIndex(prevIdx);
    centerOnNode(matchedNodeKeys[prevIdx]);
    const matchedNode = layout.nodes.find((n) => n.key === matchedNodeKeys[prevIdx]);
    if (matchedNode && onSelectNode) {
      onSelectNode(matchedNode.data);
    }
  };

  // Expand / Collapse toggles
  const toggleCollapseNode = (nodeKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    setCollapsedKeys(new Set());
  };

  const handleCollapseAll = () => {
    const parentKeys = new Set<string>();
    for (const node of treeData) {
      if (node.children && node.children.length > 0) {
        parentKeys.add(node.key);
      }
    }
    setCollapsedKeys(parentKeys);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.2, 2.5),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / 1.2, 0.2),
    }));
  };

  const handleResetZoom = () => {
    setTransform((prev) => ({ ...prev, scale: 1.0 }));
  };

  // Non-passive native mouse wheel listener for smooth cursor-centered zooming without passive warnings
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;

      setTransform((prev) => {
        const newScale = Math.min(Math.max(prev.scale * zoomFactor, 0.15), 2.5);
        const newX = mouseX - (mouseX - prev.x) * (newScale / prev.scale);
        const newY = mouseY - (mouseY - prev.y) * (newScale / prev.scale);
        return { x: newX, y: newY, scale: newScale };
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Pan Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary button
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers for Mobile / Touchpad
  const touchStartRef = useRef<{ x: number; y: number; dist: number }>({ x: 0, y: 0, dist: 0 });

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - transform.x, y: touch.clientY - transform.y });
      setIsDragging(true);
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
        dist,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setTransform((prev) => ({
        ...prev,
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      }));
    } else if (e.touches.length === 2 && containerRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = dist / (touchStartRef.current.dist || dist);
      const newScale = Math.min(Math.max(transform.scale * ratio, 0.15), 2.5);
      setTransform((prev) => ({ ...prev, scale: newScale }));
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Toggle Type Filter
  const handleToggleTypeFilter = (type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) {
          next.delete(type);
        }
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document
        .exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Export Diagram as SVG
  const handleExportSVG = () => {
    const svgElem = containerRef.current?.querySelector('svg.org-canvas-svg');
    if (!svgElem) return;

    const { minX, minY, width, height } = layout.bounds;
    const padding = 50;
    const bgColor = isDark ? '#080c14' : '#ffffff';
    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    const subColor = isDark ? '#94a3b8' : '#64748b';
    const edgeColor = isDark ? '#334155' : '#94a3b8';
    const cardBg = isDark ? '#0f172a' : '#ffffff';

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width + padding * 2}" height="${height + padding * 2}" viewBox="${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}">\n`;
    svgContent += `<rect width="100%" height="100%" fill="${bgColor}" />\n`;
    svgContent += `<style>
      .node-card { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      .node-title { font-weight: 600; font-size: 13px; fill: ${textColor}; }
      .node-code { font-size: 10px; font-weight: bold; }
      .node-subtitle { font-size: 11px; fill: ${subColor}; }
    </style>\n`;

    // Add Edges
    for (const edge of layout.edges) {
      svgContent += `<path d="${edge.path}" fill="none" stroke="${edgeColor}" stroke-width="2" stroke-dasharray="0" />\n`;
    }

    // Add Nodes
    for (const node of layout.nodes) {
      const theme = getNodeTheme(node.data.type, isDark);
      svgContent += `
      <g transform="translate(${node.x}, ${node.y})">
        <rect width="${node.width}" height="${node.height}" rx="8" fill="${cardBg}" stroke="${theme.borderColor}" stroke-width="2" />
        <rect width="${node.width}" height="24" rx="8" fill="${theme.bgHeader}" />
        <text x="12" y="16" font-size="11" font-weight="700" fill="${theme.badgeColor}">${node.data.code}</text>
        <text x="12" y="44" class="node-title">${node.data.title.replace(/&/g, '&amp;')}</text>
        <text x="12" y="62" class="node-subtitle">${(node.data.manager || node.data.description || node.data.type).replace(/&/g, '&amp;')}</text>
      </g>\n`;
    }

    svgContent += '</svg>';

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enterprise-org-structure-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export as PNG via canvas
  const handleExportPNG = () => {
    const { minX, minY, width, height } = layout.bounds;
    const padding = 60;
    const canvas = document.createElement('canvas');
    const scale = 2; // Hi-res
    canvas.width = (width + padding * 2) * scale;
    canvas.height = (height + padding * 2) * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.fillStyle = isDark ? '#080c14' : '#f8fafc';
    ctx.fillRect(0, 0, width + padding * 2, height + padding * 2);

    ctx.translate(-minX + padding, -minY + padding);

    // Draw Edges
    for (const edge of layout.edges) {
      ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const p = new Path2D(edge.path);
      ctx.stroke(p);
    }

    // Draw Nodes
    for (const node of layout.nodes) {
      const theme = getNodeTheme(node.data.type, isDark);
      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = 2;

      // Rounded rect
      const radius = 8;
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, node.width, node.height, radius);
      ctx.fill();
      ctx.stroke();

      // Header strip
      ctx.fillStyle = theme.bgHeader;
      ctx.beginPath();
      ctx.roundRect(node.x, node.y, node.width, 24, [radius, radius, 0, 0]);
      ctx.fill();

      // Header Tag Text
      ctx.fillStyle = theme.badgeColor;
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(node.data.code || node.data.type.toUpperCase(), node.x + 10, node.y + 16);

      // Title
      ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(node.data.title.substring(0, 24), node.x + 10, node.y + 45);

      // Subtitle / Manager
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.font = '11px Inter, sans-serif';
      const sub = node.data.manager
        ? `Lead: ${node.data.manager}`
        : node.data.description || node.data.type;
      ctx.fillText(sub.substring(0, 26), node.x + 10, node.y + 64);
    }

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `enterprise-org-chart-${Date.now()}.png`;
    link.click();
  };

  // Node action menu builder
  const getNodeMenuItems = (node: CanvasNodeLayout): MenuProps['items'] => {
    const items: MenuProps['items'] = [
      {
        key: 'inspect',
        label: 'Inspect Details',
        icon: <EyeOutlined />,
        onClick: () => onSelectNode?.(node.data),
      },
    ];

    if (node.data.type === 'organization' && onOpenEditOrg) {
      const orgId = node.data.key.replace(/^org-/, '');
      items.push({
        key: 'edit-org',
        label: 'Edit Organization Entity',
        icon: <EditOutlined />,
        onClick: () => onOpenEditOrg(orgId),
      });
      if (onOpenCreateDept) {
        items.push({
          key: 'add-dept',
          label: 'Add Division / Department',
          icon: <PlusOutlined />,
          onClick: () => onOpenCreateDept(),
        });
      }
    } else if (
      (node.data.type === 'department' || node.data.type === 'sub-department') &&
      onOpenEditDept
    ) {
      const deptId = node.data.key.replace(/^dept-/, '');
      items.push({
        key: 'edit-dept',
        label: 'Edit Department',
        icon: <EditOutlined />,
        onClick: () => onOpenEditDept(deptId),
      });
      if (onOpenCreateDept) {
        items.push({
          key: 'add-subdept',
          label: 'Add Sub-Department',
          icon: <ApartmentOutlined />,
          onClick: () => onOpenCreateDept(deptId),
        });
      }
      if (onOpenCreatePos) {
        items.push({
          key: 'add-pos',
          label: 'Add Job Position',
          icon: <IdcardOutlined />,
          onClick: () => onOpenCreatePos(deptId),
        });
      }
    } else if (node.data.type === 'position' && onOpenEditPos) {
      const posId = node.data.key.replace(/^pos-/, '');
      items.push({
        key: 'edit-pos',
        label: 'Edit Position',
        icon: <EditOutlined />,
        onClick: () => onOpenEditPos(posId),
      });
    }

    return items;
  };

  // Minimap Navigation
  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || layout.nodes.length === 0) return;
    const minimapRect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - minimapRect.left;
    const clickY = e.clientY - minimapRect.top;

    const { minX, minY, width, height } = layout.bounds;
    const mapPadding = 12;
    const availableW = minimapRect.width - mapPadding * 2;
    const availableH = minimapRect.height - mapPadding * 2;

    const scaleX = availableW / width;
    const scaleY = availableH / height;
    const mapScale = Math.min(scaleX, scaleY);

    const graphX = minX + (clickX - mapPadding) / mapScale;
    const graphY = minY + (clickY - mapPadding) / mapScale;

    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    const newX = containerW / 2 - graphX * transform.scale;
    const newY = containerH / 2 - graphY * transform.scale;

    setTransform((prev) => ({ ...prev, x: newX, y: newY }));
  };

  // Minimap viewport box calculation
  const minimapViewport = useMemo(() => {
    if (!containerRef.current || layout.nodes.length === 0) return null;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const { minX, minY, width, height } = layout.bounds;
    const mapW = 180;
    const mapH = 120;
    const mapPadding = 8;
    const availableW = mapW - mapPadding * 2;
    const availableH = mapH - mapPadding * 2;
    const mapScale = Math.min(availableW / width, availableH / height);

    const viewX = (-transform.x / transform.scale - minX) * mapScale + mapPadding;
    const viewY = (-transform.y / transform.scale - minY) * mapScale + mapPadding;
    const viewW = (containerW / transform.scale) * mapScale;
    const viewH = (containerH / transform.scale) * mapScale;

    return {
      x: Math.max(0, viewX),
      y: Math.max(0, viewY),
      w: Math.min(mapW, viewW),
      h: Math.min(mapH, viewH),
      mapScale,
      minX,
      minY,
      mapPadding,
    };
  }, [layout.bounds, layout.nodes.length, transform]);

  return (
    <Card
      size="small"
      styles={{
        body: {
          padding: 0,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: isDark ? '#090d16' : '#fafbfc',
          borderRadius: 8,
        },
      }}
      style={{
        border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
        boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Canvas Top Control Bar */}
      <Flex
        align="center"
        justify="space-between"
        wrap="wrap"
        gap={8}
        style={{
          padding: '10px 14px',
          background: isDark ? '#0c1017' : '#ffffff',
          borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          zIndex: 10,
          position: 'relative',
        }}
      >
        {/* Search & Navigation in Canvas */}
        <Flex align="center" gap={8}>
          <Input
            placeholder="Search nodes in canvas..."
            prefix={<SearchOutlined style={{ color: isDark ? '#64748b' : '#94a3b8' }} />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setMatchedIndex(0);
            }}
            allowClear
            style={{ width: 220 }}
            size="small"
          />
          {matchedNodeKeys.length > 0 && (
            <Flex align="center" gap={4}>
              <Tag color="processing" style={{ margin: 0 }}>
                {matchedIndex + 1}/{matchedNodeKeys.length} matches
              </Tag>
              <Tooltip title="Previous match">
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={handlePrevMatch}
                />
              </Tooltip>
              <Tooltip title="Next match">
                <Button
                  size="small"
                  type="text"
                  icon={<ArrowRightOutlined />}
                  onClick={handleNextMatch}
                />
              </Tooltip>
            </Flex>
          )}
        </Flex>

        {/* Filters & Options */}
        <Flex align="center" gap={8} wrap="wrap">
          {/* Depth Level */}
          <Flex align="center" gap={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Depth:
            </Text>
            <Select
              size="small"
              value={maxDepth}
              onChange={(val) => setMaxDepth(val)}
              style={{ width: 105 }}
              options={[
                { label: 'All Levels', value: 10 },
                { label: '1 - Entities', value: 0 },
                { label: '2 - Depts', value: 1 },
                { label: '3 - Sub-depts', value: 2 },
                { label: '4 - Positions', value: 3 },
              ]}
            />
          </Flex>

          {/* Node Type Visibility Filter Dropdown */}
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'organization',
                  label: (
                    <Checkbox
                      checked={typeFilters.has('organization')}
                      onChange={() => handleToggleTypeFilter('organization')}
                    >
                      <Tag color="purple" style={{ margin: 0 }}>
                        Entities & Hubs
                      </Tag>
                    </Checkbox>
                  ),
                },
                {
                  key: 'branch',
                  label: (
                    <Checkbox
                      checked={typeFilters.has('branch')}
                      onChange={() => handleToggleTypeFilter('branch')}
                    >
                      <Tag color="green" style={{ margin: 0 }}>
                        Regional Branches
                      </Tag>
                    </Checkbox>
                  ),
                },
                {
                  key: 'department',
                  label: (
                    <Checkbox
                      checked={typeFilters.has('department')}
                      onChange={() => handleToggleTypeFilter('department')}
                    >
                      <Tag color="blue" style={{ margin: 0 }}>
                        Departments
                      </Tag>
                    </Checkbox>
                  ),
                },
                {
                  key: 'sub-department',
                  label: (
                    <Checkbox
                      checked={typeFilters.has('sub-department')}
                      onChange={() => handleToggleTypeFilter('sub-department')}
                    >
                      <Tag color="cyan" style={{ margin: 0 }}>
                        Sub-Departments
                      </Tag>
                    </Checkbox>
                  ),
                },
                {
                  key: 'position',
                  label: (
                    <Checkbox
                      checked={typeFilters.has('position')}
                      onChange={() => handleToggleTypeFilter('position')}
                    >
                      <Tag color="orange" style={{ margin: 0 }}>
                        Job Positions
                      </Tag>
                    </Checkbox>
                  ),
                },
              ],
            }}
          >
            <Button size="small" icon={<FilterOutlined />}>
              Filter Types ({typeFilters.size})
            </Button>
          </Dropdown>

          {/* Layout Orientation */}
          <Radio.Group
            size="small"
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="vertical">Vertical</Radio.Button>
            <Radio.Button value="horizontal">Horizontal</Radio.Button>
          </Radio.Group>

          {/* Connector Line Style */}
          <Radio.Group
            size="small"
            value={lineStyle}
            onChange={(e) => setLineStyle(e.target.value)}
            optionType="button"
          >
            <Radio.Button value="bezier">Curved</Radio.Button>
            <Radio.Button value="orthogonal">Elbow</Radio.Button>
          </Radio.Group>

          {/* Expand/Collapse All */}
          <Space size={4}>
            <Tooltip title="Expand All Branches">
              <Button size="small" icon={<PlusSquareOutlined />} onClick={handleExpandAll}>
                Expand
              </Button>
            </Tooltip>
            <Tooltip title="Collapse All Branches">
              <Button size="small" icon={<MinusSquareOutlined />} onClick={handleCollapseAll}>
                Collapse
              </Button>
            </Tooltip>
          </Space>

          {/* Export options */}
          <Dropdown
            menu={{
              items: [
                {
                  key: 'png',
                  label: 'Download PNG Image (Hi-Res)',
                  icon: <DownloadOutlined />,
                  onClick: handleExportPNG,
                },
                {
                  key: 'svg',
                  label: 'Download SVG Vector',
                  icon: <BranchesOutlined />,
                  onClick: handleExportSVG,
                },
              ],
            }}
          >
            <Button size="small" icon={<DownloadOutlined />}>
              Export
            </Button>
          </Dropdown>
        </Flex>
      </Flex>

      {/* Main Canvas Viewport Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: '100%',
          height: isFullscreen ? '100vh' : '620px',
          position: 'relative',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
          backgroundColor: isDark ? '#080c14' : '#f8fafc',
          backgroundImage: isDark
            ? 'radial-gradient(circle, #1e293b 1.2px, transparent 1.2px), radial-gradient(circle, #0f172a 1.2px, transparent 1.2px)'
            : 'radial-gradient(circle, #cbd5e1 1px, transparent 1px), radial-gradient(circle, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '24px 24px, 120px 120px',
          backgroundPosition: `${transform.x}px ${transform.y}px`,
        }}
      >
        {/* Floating Zoom & Canvas Controls */}
        <Flex
          vertical
          gap={4}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 20,
            background: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(6px)',
            padding: 6,
            borderRadius: 8,
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.06)',
          }}
        >
          <Tooltip title="Zoom In (+)" placement="left">
            <Button size="small" type="text" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
          </Tooltip>
          <Tooltip title="Zoom Out (-)" placement="left">
            <Button size="small" type="text" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
          </Tooltip>
          <Tooltip title="Reset Scale (100%)" placement="left">
            <Button
              size="small"
              type="text"
              icon={<OneToOneOutlined />}
              onClick={handleResetZoom}
            />
          </Tooltip>
          <Tooltip title="Fit Canvas to Screen" placement="left">
            <Button size="small" type="text" icon={<CompressOutlined />} onClick={handleFitView} />
          </Tooltip>
          <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Canvas'} placement="left">
            <Button
              size="small"
              type="text"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={handleToggleFullscreen}
            />
          </Tooltip>
          <Tooltip title={showMinimap ? 'Hide Minimap' : 'Show Minimap'} placement="left">
            <Button
              size="small"
              type="text"
              icon={<EyeOutlined />}
              onClick={() => setShowMinimap(!showMinimap)}
            />
          </Tooltip>
          <div
            style={{
              textAlign: 'center',
              fontSize: 10,
              color: isDark ? '#94a3b8' : '#64748b',
              fontWeight: 600,
              paddingTop: 4,
              borderTop: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
            }}
          >
            {Math.round(transform.scale * 100)}%
          </div>
        </Flex>

        {/* Legend Overlay */}
        <Flex
          gap={10}
          align="center"
          wrap="wrap"
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 20,
            background: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(6px)',
            padding: '6px 12px',
            borderRadius: 8,
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.05)',
            fontSize: 11,
          }}
        >
          <Flex align="center" gap={4}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#7c3aed',
                display: 'inline-block',
              }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Entity ({layout.nodes.filter((n) => n.data.type === 'organization').length})
            </Text>
          </Flex>
          <Flex align="center" gap={4}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#059669',
                display: 'inline-block',
              }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Facility ({layout.nodes.filter((n) => n.data.type === 'branch').length})
            </Text>
          </Flex>
          <Flex align="center" gap={4}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'inline-block',
              }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Dept ({layout.nodes.filter((n) => n.data.type === 'department').length})
            </Text>
          </Flex>
          <Flex align="center" gap={4}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#0891b2',
                display: 'inline-block',
              }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Sub-Dept ({layout.nodes.filter((n) => n.data.type === 'sub-department').length})
            </Text>
          </Flex>
          <Flex align="center" gap={4}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#d97706',
                display: 'inline-block',
              }}
            />
            <Text type="secondary" style={{ fontSize: 11 }}>
              Position ({layout.nodes.filter((n) => n.data.type === 'position').length})
            </Text>
          </Flex>
        </Flex>

        {/* Minimap Overlay (Bottom Right) */}
        {showMinimap && minimapViewport && layout.nodes.length > 0 && (
          <div
            onClick={handleMinimapClick}
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: 180,
              height: 120,
              background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
              borderRadius: 8,
              boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 20,
              overflow: 'hidden',
              cursor: 'crosshair',
            }}
          >
            <svg width="100%" height="100%">
              {/* Nodes dots in minimap */}
              {layout.nodes.map((n) => {
                const mapX =
                  (n.x - minimapViewport.minX) * minimapViewport.mapScale +
                  minimapViewport.mapPadding;
                const mapY =
                  (n.y - minimapViewport.minY) * minimapViewport.mapScale +
                  minimapViewport.mapPadding;
                const mapW = Math.max(n.width * minimapViewport.mapScale, 3);
                const mapH = Math.max(n.height * minimapViewport.mapScale, 2);

                const theme = getNodeTheme(n.data.type, isDark);
                return (
                  <rect
                    key={n.id}
                    x={mapX}
                    y={mapY}
                    width={mapW}
                    height={mapH}
                    rx={1}
                    fill={theme.borderColor}
                    opacity={0.85}
                  />
                );
              })}

              {/* Viewport Frame in minimap */}
              <rect
                x={minimapViewport.x}
                y={minimapViewport.y}
                width={minimapViewport.w}
                height={minimapViewport.h}
                fill={isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(37, 99, 235, 0.12)'}
                stroke={isDark ? '#60a5fa' : '#2563eb'}
                strokeWidth={1.5}
                rx={2}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: 3,
                right: 5,
                fontSize: 9,
                color: isDark ? '#64748b' : '#94a3b8',
                fontWeight: 600,
              }}
            >
              MINIMAP
            </div>
          </div>
        )}

        {/* Empty State */}
        {layout.nodes.length === 0 && !loading && (
          <Flex align="center" justify="center" style={{ width: '100%', height: '100%' }}>
            <Empty description="No organization nodes match the selected filters" />
          </Flex>
        )}

        {/* Dynamic Zoom/Pan Layer */}
        <div
          style={{
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
            transition: isDragging ? 'none' : 'transform 0.08s ease-out',
            pointerEvents: 'auto',
          }}
        >
          {/* Connector Edges SVG Layer */}
          <svg
            className="org-canvas-svg"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: layout.bounds.maxX + 400,
              height: layout.bounds.maxY + 400,
              overflow: 'visible',
              pointerEvents: 'none',
            }}
          >
            <defs>
              <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.5" />
              </linearGradient>
            </defs>

            {layout.edges.map((edge) => {
              const isHighlighted =
                selectedNodeKey === edge.sourceId || selectedNodeKey === edge.targetId;

              return (
                <g key={edge.id}>
                  <path
                    d={edge.path}
                    fill="none"
                    stroke={
                      isHighlighted
                        ? isDark
                          ? '#60a5fa'
                          : '#2563eb'
                        : isDark
                          ? '#334155'
                          : '#cbd5e1'
                    }
                    strokeWidth={isHighlighted ? 2.5 : 1.8}
                    strokeDasharray={isHighlighted ? 'none' : 'none'}
                    opacity={isHighlighted ? 1 : 0.85}
                  />
                  {/* Subtle junction dot at target */}
                  <circle
                    cx={edge.targetX}
                    cy={edge.targetY}
                    r={isHighlighted ? 3.5 : 2.5}
                    fill={
                      isHighlighted
                        ? isDark
                          ? '#60a5fa'
                          : '#2563eb'
                        : isDark
                          ? '#475569'
                          : '#94a3b8'
                    }
                  />
                </g>
              );
            })}
          </svg>

          {/* Node Cards Layer */}
          {layout.nodes.map((node) => {
            const isSelected = selectedNodeKey === node.key;
            const isMatched = matchedNodeKeys.includes(node.key);
            const isActiveMatch = activeMatchedKey === node.key;
            const theme = getNodeTheme(node.data.type, isDark);

            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode?.(node.data);
                }}
                style={{
                  position: 'absolute',
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                  background: isDark ? '#0f172a' : '#ffffff',
                  borderRadius: 10,
                  border: isSelected
                    ? `2px solid ${theme.borderColor}`
                    : isActiveMatch
                      ? '2px solid #ef4444'
                      : isMatched
                        ? '2px solid #f59e0b'
                        : isDark
                          ? '1px solid #1e293b'
                          : '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: isSelected
                    ? isDark
                      ? `0 0 0 3px ${theme.bgHeader}, 0 8px 20px -2px rgba(0, 0, 0, 0.6)`
                      : `0 0 0 3px ${theme.bgHeader}, 0 8px 16px -2px rgba(0, 0, 0, 0.1)`
                    : isActiveMatch
                      ? '0 0 0 4px rgba(239, 68, 68, 0.25), 0 6px 14px rgba(0,0,0,0.2)'
                      : isDark
                        ? '0 2px 8px rgba(0, 0, 0, 0.4)'
                        : '0 2px 6px -1px rgba(0, 0, 0, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: isSelected ? 15 : isActiveMatch ? 14 : 5,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = isDark
                    ? '0 10px 24px -3px rgba(0, 0, 0, 0.7), 0 4px 8px -2px rgba(0, 0, 0, 0.5)'
                    : '0 10px 20px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isSelected
                    ? isDark
                      ? `0 0 0 3px ${theme.bgHeader}, 0 8px 20px -2px rgba(0, 0, 0, 0.6)`
                      : `0 0 0 3px ${theme.bgHeader}, 0 8px 16px -2px rgba(0, 0, 0, 0.1)`
                    : isDark
                      ? '0 2px 8px rgba(0, 0, 0, 0.4)'
                      : '0 2px 6px -1px rgba(0, 0, 0, 0.06)';
                }}
              >
                {/* Node Header */}
                <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                  <Flex align="center" gap={6}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: theme.badgeBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                      }}
                    >
                      {theme.icon}
                    </div>
                    <Tag
                      color={theme.tagColor}
                      style={{
                        fontSize: 10,
                        margin: 0,
                        padding: '0 4px',
                        height: 16,
                        lineHeight: '14px',
                        fontWeight: 700,
                      }}
                    >
                      {node.data.code}
                    </Tag>
                  </Flex>

                  {/* Context Actions Dropdown */}
                  <Dropdown
                    menu={{ items: getNodeMenuItems(node) }}
                    trigger={['click']}
                    placement="bottomRight"
                  >
                    <Button
                      type="text"
                      size="small"
                      style={{
                        width: 18,
                        height: 18,
                        minWidth: 18,
                        padding: 0,
                        fontSize: 10,
                        color: isDark ? '#64748b' : '#94a3b8',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      •••
                    </Button>
                  </Dropdown>
                </Flex>

                {/* Node Title */}
                <div>
                  <Text
                    strong
                    ellipsis
                    style={{
                      fontSize: 12.5,
                      color: isSelected ? theme.titleColor : isDark ? '#f1f5f9' : '#1e293b',
                      display: 'block',
                      lineHeight: 1.3,
                    }}
                  >
                    {node.data.title}
                  </Text>
                </div>

                {/* Node Footer: Manager / Headcount / Status */}
                <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                  <Text
                    type="secondary"
                    ellipsis
                    style={{
                      fontSize: 10.5,
                      maxWidth: '65%',
                      lineHeight: 1,
                      color: isDark ? '#94a3b8' : undefined,
                    }}
                  >
                    {node.data.manager ? (
                      `👤 ${node.data.manager}`
                    ) : node.data.description ? (
                      node.data.description
                    ) : (
                      <span style={{ textTransform: 'capitalize' }}>{node.data.type}</span>
                    )}
                  </Text>

                  {typeof node.data.count === 'number' && node.data.count > 0 && (
                    <Badge
                      count={node.data.count}
                      overflowCount={999}
                      style={{
                        backgroundColor: theme.badgeBg,
                        color: theme.badgeColor,
                        fontSize: 10,
                        height: 16,
                        lineHeight: '16px',
                        padding: '0 5px',
                        boxShadow: 'none',
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Flex>

                {/* Expand / Collapse Button if node has children */}
                {node.hasChildren && (
                  <div
                    onClick={(e) => toggleCollapseNode(node.key, e)}
                    style={{
                      position: 'absolute',
                      bottom: orientation === 'vertical' ? -10 : 'calc(50% - 9px)',
                      right: orientation === 'vertical' ? 'calc(50% - 10px)' : -10,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: isDark ? '#1e293b' : '#ffffff',
                      border: isDark
                        ? `1.5px solid ${node.isCollapsed ? '#f59e0b' : '#60a5fa'}`
                        : `1.5px solid ${node.isCollapsed ? '#f59e0b' : '#3b82f6'}`,
                      color: isDark
                        ? node.isCollapsed
                          ? '#fbbf24'
                          : '#93c5fd'
                        : node.isCollapsed
                          ? '#d97706'
                          : '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: isDark
                        ? '0 2px 6px rgba(0,0,0,0.5)'
                        : '0 2px 5px rgba(0,0,0,0.12)',
                      zIndex: 16,
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {node.isCollapsed ? `+${node.childCount}` : '−'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
