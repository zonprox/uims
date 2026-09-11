import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { resolveDescendantLocationIds } from './location-tree.util';

describe('resolveDescendantLocationIds', () => {
  describe('PostgreSQL Recursive CTE primary path', () => {
    it('should query via prisma.$queryRaw when available and return mapped ids', async () => {
      const mockQueryRaw = vi
        .fn()
        .mockResolvedValue([
          { id: 'loc-campus' },
          { id: 'loc-factory-1' },
          { id: 'loc-line-01' },
          { id: 'loc-station-01' },
        ]);

      const mockPrisma = {
        $queryRaw: mockQueryRaw,
      } as unknown as PrismaService;

      const result = await resolveDescendantLocationIds(mockPrisma, 'loc-campus');

      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual(['loc-campus', 'loc-factory-1', 'loc-line-01', 'loc-station-01']);
    });

    it('should return empty array when $queryRaw returns empty array for non-existent id', async () => {
      const mockQueryRaw = vi.fn().mockResolvedValue([]);

      const mockPrisma = {
        $queryRaw: mockQueryRaw,
      } as unknown as PrismaService;

      const result = await resolveDescendantLocationIds(mockPrisma, 'non-existent-id');

      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should return empty array immediately when locationId is empty string', async () => {
      const mockQueryRaw = vi.fn();
      const mockPrisma = {
        $queryRaw: mockQueryRaw,
      } as unknown as PrismaService;

      const result = await resolveDescendantLocationIds(mockPrisma, '');

      expect(mockQueryRaw).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('Bounded query fallback path', () => {
    const sampleTree = [
      { id: 'loc-hq', parentId: null },
      { id: 'loc-f1', parentId: 'loc-hq' },
      { id: 'loc-f2', parentId: 'loc-hq' },
      { id: 'loc-f1-cut', parentId: 'loc-f1' },
      { id: 'loc-f1-sew', parentId: 'loc-f1' },
      { id: 'loc-f1-sew-st1', parentId: 'loc-f1-sew' },
    ];

    it('should fall back to bounded findMany and BFS when $queryRaw throws an error', async () => {
      const mockQueryRaw = vi.fn().mockRejectedValue(new Error('Syntax error or offline'));
      const mockFindMany = vi.fn().mockResolvedValue(sampleTree);

      const mockPrisma = {
        $queryRaw: mockQueryRaw,
        location: {
          findMany: mockFindMany,
        },
      } as unknown as PrismaService;

      const result = await resolveDescendantLocationIds(mockPrisma, 'loc-f1');

      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
      expect(mockFindMany).toHaveBeenCalledWith({
        select: { id: true, parentId: true },
        take: 5000,
      });
      expect(result).toEqual(['loc-f1', 'loc-f1-cut', 'loc-f1-sew', 'loc-f1-sew-st1']);
    });

    it('should fall back to bounded findMany when $queryRaw is not defined on prisma mock', async () => {
      const mockFindMany = vi.fn().mockResolvedValue(sampleTree);

      const mockPrisma = {
        location: {
          findMany: mockFindMany,
        },
      } as unknown as PrismaService;

      const result = await resolveDescendantLocationIds(mockPrisma, 'loc-f1');

      expect(mockFindMany).toHaveBeenCalledWith({
        select: { id: true, parentId: true },
        take: 5000,
      });
      expect(result).toEqual(['loc-f1', 'loc-f1-cut', 'loc-f1-sew', 'loc-f1-sew-st1']);
    });

    it('should return empty array when target locationId does not exist in fallback dataset', async () => {
      const mockFindMany = vi.fn().mockResolvedValue(sampleTree);

      const mockPrisma = {
        location: {
          findMany: mockFindMany,
        },
      } as unknown as PrismaService;

      const result = await resolveDescendantLocationIds(mockPrisma, 'loc-unknown');

      expect(result).toEqual([]);
    });

    it('should handle cyclic parent-child links gracefully without infinite loop in fallback', async () => {
      const cyclicTree = [
        { id: 'node-a', parentId: 'node-b' },
        { id: 'node-b', parentId: 'node-a' },
      ];

      const mockPrisma = {
        location: {
          findMany: vi.fn().mockResolvedValue(cyclicTree),
        },
      } as unknown as PrismaService;

      const result = await resolveDescendantLocationIds(mockPrisma, 'node-a');

      expect(result).toHaveLength(2);
      expect(result).toContain('node-a');
      expect(result).toContain('node-b');
    });

    it('should return single id array when location.findMany is also not defined', async () => {
      const mockPrisma = {} as unknown as PrismaService;

      const result = await resolveDescendantLocationIds(mockPrisma, 'lonely-node');

      expect(result).toEqual(['lonely-node']);
    });
  });
});
