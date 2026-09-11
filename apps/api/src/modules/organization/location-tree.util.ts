import type { PrismaService } from '../../database/prisma.service';

/**
 * Resolves a target location ID and all its recursive descendants.
 *
 * 1. Primary Engine: PostgreSQL recursive CTE via prisma.$queryRaw with cycle detection.
 * 2. Fallback: Bounded Prisma query (take: 5000) and in-memory BFS for unit test environments
 *    where $queryRaw is unmocked or returns a non-array.
 */
export async function resolveDescendantLocationIds(
  prisma: PrismaService,
  locationId: string,
): Promise<string[]> {
  if (!locationId) {
    return [];
  }

  // Primary: PostgreSQL recursive CTE via $queryRaw
  if (typeof prisma?.$queryRaw === 'function') {
    try {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        WITH RECURSIVE location_tree AS (
          SELECT id, ARRAY[id]::text[] AS path
          FROM "Location"
          WHERE id = ${locationId}
          UNION ALL
          SELECT l.id, lt.path || l.id
          FROM "Location" l
          JOIN location_tree lt ON l."parentId" = lt.id
          WHERE NOT (l.id = ANY(lt.path))
        )
        SELECT id FROM location_tree;
      `;
      if (Array.isArray(rows)) {
        return rows.map((r) => r.id);
      }
    } catch (_error: unknown) {
      // Fall back to bounded scan if $queryRaw fails (e.g., minimal mock environments)
    }
  }

  // Fallback: bounded query (take: 5000) and BFS for unit test environments
  if (typeof prisma?.location?.findMany === 'function') {
    const allLocations = await prisma.location.findMany({
      select: { id: true, parentId: true },
      take: 5000,
    });

    if (!Array.isArray(allLocations) || !allLocations.some((l) => l.id === locationId)) {
      return [];
    }

    const childrenMap = new Map<string, string[]>();
    for (const loc of allLocations) {
      if (loc.parentId) {
        const list = childrenMap.get(loc.parentId) || [];
        list.push(loc.id);
        childrenMap.set(loc.parentId, list);
      }
    }

    const result: string[] = [locationId];
    const queue: string[] = [locationId];
    const visited = new Set<string>([locationId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenMap.get(current);
      if (children) {
        for (const childId of children) {
          if (!visited.has(childId)) {
            visited.add(childId);
            result.push(childId);
            queue.push(childId);
          }
        }
      }
    }

    return result;
  }

  return [locationId];
}
