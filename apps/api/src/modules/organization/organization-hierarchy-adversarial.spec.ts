import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationService } from './organization.service';

describe('Organization Hierarchy & API Contract Adversarial Suite', () => {
  // =========================================================================
  // 1. DTO VALIDATION & PIPELINE INTEGRITY (ValidationPipe)
  // =========================================================================
  describe('DTO Validation: CreateOrganizationDto & UpdateOrganizationDto', () => {
    let pipe: ValidationPipe;

    beforeEach(() => {
      // Replicate the exact production configuration from main.ts
      pipe = new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      });
    });

    it('1.1 should accept valid CreateOrganizationDto with valid parentId string', async () => {
      const payload = {
        name: 'Broadpeak Soc Trang',
        code: 'BSL',
        parentId: 'org-holding-uuid',
      };

      const transformed = (await pipe.transform(payload, {
        type: 'body',
        metatype: CreateOrganizationDto,
      })) as CreateOrganizationDto;

      expect(transformed).toBeInstanceOf(CreateOrganizationDto);
      expect(transformed.name).toBe('Broadpeak Soc Trang');
      expect(transformed.code).toBe('BSL');
      expect(transformed.parentId).toBe('org-holding-uuid');
    });

    it('1.2 should accept valid CreateOrganizationDto without parentId (optional holding root)', async () => {
      const payload = {
        name: 'Youngone / Broadpeak Group',
        code: 'HOLDING',
      };

      const transformed = (await pipe.transform(payload, {
        type: 'body',
        metatype: CreateOrganizationDto,
      })) as CreateOrganizationDto;

      expect(transformed).toBeInstanceOf(CreateOrganizationDto);
      expect(transformed.parentId).toBeUndefined();
    });

    it('1.3 should reject CreateOrganizationDto with invalid numeric parentId', async () => {
      const payload = {
        name: 'Invalid Parent ID Type Org',
        code: 'INV-NUM',
        parentId: 12345,
      };

      await expect(
        pipe.transform(payload, {
          type: 'body',
          metatype: CreateOrganizationDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.4 should reject CreateOrganizationDto with invalid boolean parentId', async () => {
      const payload = {
        name: 'Invalid Boolean Parent ID Org',
        code: 'INV-BOOL',
        parentId: true,
      };

      await expect(
        pipe.transform(payload, {
          type: 'body',
          metatype: CreateOrganizationDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.5 should reject CreateOrganizationDto with array parentId', async () => {
      const payload = {
        name: 'Invalid Array Parent ID Org',
        code: 'INV-ARR',
        parentId: ['org-holding-uuid'],
      };

      await expect(
        pipe.transform(payload, {
          type: 'body',
          metatype: CreateOrganizationDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.6 should reject CreateOrganizationDto with object parentId', async () => {
      const payload = {
        name: 'Invalid Object Parent ID Org',
        code: 'INV-OBJ',
        parentId: { id: 'org-uuid' },
      };

      await expect(
        pipe.transform(payload, {
          type: 'body',
          metatype: CreateOrganizationDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.7 should reject CreateOrganizationDto containing non-whitelisted properties (forbidNonWhitelisted)', async () => {
      const payload = {
        name: 'Injection Attempt Org',
        code: 'INJECT',
        parentId: 'org-holding-uuid',
        maliciousPayload: 'DROP TABLE "Organization";',
      };

      await expect(
        pipe.transform(payload, {
          type: 'body',
          metatype: CreateOrganizationDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.8 should reject CreateOrganizationDto when required fields (name, code) are missing', async () => {
      const missingName = {
        code: 'NO-NAME',
        parentId: 'org-holding-uuid',
      };

      await expect(
        pipe.transform(missingName, {
          type: 'body',
          metatype: CreateOrganizationDto,
        }),
      ).rejects.toThrow(BadRequestException);

      const missingCode = {
        name: 'No Code Org',
        parentId: 'org-holding-uuid',
      };

      await expect(
        pipe.transform(missingCode, {
          type: 'body',
          metatype: CreateOrganizationDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.9 should accept valid UpdateOrganizationDto updating parentId', async () => {
      const payload = {
        parentId: 'org-new-parent-uuid',
      };

      const transformed = (await pipe.transform(payload, {
        type: 'body',
        metatype: UpdateOrganizationDto,
      })) as UpdateOrganizationDto;

      expect(transformed.parentId).toBe('org-new-parent-uuid');
    });

    it('1.10 should reject UpdateOrganizationDto with non-string parentId', async () => {
      const payload = {
        parentId: 99999,
      };

      await expect(
        pipe.transform(payload, {
          type: 'body',
          metatype: UpdateOrganizationDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.11 should reject UpdateOrganizationDto with non-whitelisted fields', async () => {
      const payload = {
        parentId: 'org-parent-uuid',
        unauthorizedField: 'bypass',
      };

      await expect(
        pipe.transform(payload, {
          type: 'body',
          metatype: UpdateOrganizationDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 2. ORGANIZATION SERVICE HIERARCHY & ADVERSARIAL TOPOLOGY
  // =========================================================================
  describe('OrganizationService Hierarchy & Topology Stress', () => {
    let service: OrganizationService;
    let mockPrisma: {
      organization: {
        findMany: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
      };
    };

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
      };

      service = new OrganizationService(mockPrisma as unknown as PrismaService);
    });

    it('2.1 should reject self-parenting in updateOrganization with BadRequestException', async () => {
      const orgId = 'org-self-test';
      await expect(service.updateOrganization(orgId, { parentId: orgId })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });

    it('2.2 should reject duplicate code in createOrganization with ConflictException', async () => {
      mockPrisma.organization.findUnique.mockResolvedValueOnce({
        id: 'existing-id',
        code: 'DUPLICATE',
      });

      await expect(
        service.createOrganization({
          name: 'Duplicate Org',
          code: 'DUPLICATE',
        }),
      ).rejects.toThrow(/already exists/);
    });

    it('2.3 should build a deep 5-tier organizational hierarchy tree accurately', async () => {
      // Holding (T1) -> Regional Division (T2) -> Subsidiary Corp (T3) -> Operating Plant (T4) -> Sub-facility (T5)
      mockPrisma.organization.findMany.mockResolvedValueOnce([
        {
          id: 'tier-1',
          name: 'Global Group',
          code: 'GRP',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 10 },
        },
        {
          id: 'tier-2',
          name: 'Asia Pacific Division',
          code: 'APAC',
          parentId: 'tier-1',
          locations: [],
          departments: [],
          _count: { users: 20 },
        },
        {
          id: 'tier-3',
          name: 'Broadpeak Vietnam',
          code: 'VN',
          parentId: 'tier-2',
          locations: [],
          departments: [],
          _count: { users: 30 },
        },
        {
          id: 'tier-4',
          name: 'Soc Trang Complex',
          code: 'BSL',
          parentId: 'tier-3',
          locations: [],
          departments: [],
          _count: { users: 40 },
        },
        {
          id: 'tier-5',
          name: 'Factory 1 Operational Unit',
          code: 'F1',
          parentId: 'tier-4',
          locations: [],
          departments: [],
          _count: { users: 50 },
        },
      ]);

      const tree = await service.getHierarchyTree();

      // Only root tier-1 at the root
      expect(tree).toHaveLength(1);
      expect(tree[0].key).toBe('org-tier-1');

      // Tier 2 under Tier 1
      const t2 = tree[0].children?.find((c) => c.key === 'org-tier-2');
      expect(t2).toBeDefined();

      // Tier 3 under Tier 2
      const t3 = t2?.children?.find((c) => c.key === 'org-tier-3');
      expect(t3).toBeDefined();

      // Tier 4 under Tier 3
      const t4 = t3?.children?.find((c) => c.key === 'org-tier-4');
      expect(t4).toBeDefined();

      // Tier 5 under Tier 4
      const t5 = t4?.children?.find((c) => c.key === 'org-tier-5');
      expect(t5).toBeDefined();
    });

    it('2.4 should handle wide hierarchies with 50 subsidiaries under a single holding company', async () => {
      const holding = {
        id: 'holding',
        name: 'Broadpeak Global Holding',
        code: 'HOLDING',
        parentId: null,
        locations: [],
        departments: [],
        _count: { users: 100 },
      };

      const subsidiaries = Array.from({ length: 50 }, (_, i) => ({
        id: `sub-${i}`,
        name: `Subsidiary ${i}`,
        code: `SUB-${i}`,
        parentId: 'holding',
        locations: [],
        departments: [],
        _count: { users: 10 },
      }));

      mockPrisma.organization.findMany.mockResolvedValueOnce([holding, ...subsidiaries]);

      const tree = await service.getHierarchyTree();

      expect(tree).toHaveLength(1);
      expect(tree[0].key).toBe('org-holding');

      const childrenOrgs = (tree[0].children || []).filter((c) => c.type === 'organization');
      expect(childrenOrgs).toHaveLength(50);
    });

    it('2.5 should gracefully break and resolve 3-node circular loops (A -> B -> C -> A)', async () => {
      mockPrisma.organization.findMany.mockResolvedValueOnce([
        {
          id: 'org-a',
          name: 'Company A',
          code: 'CO-A',
          parentId: 'org-c',
          locations: [],
          departments: [],
          _count: { users: 1 },
        },
        {
          id: 'org-b',
          name: 'Company B',
          code: 'CO-B',
          parentId: 'org-a',
          locations: [],
          departments: [],
          _count: { users: 1 },
        },
        {
          id: 'org-c',
          name: 'Company C',
          code: 'CO-C',
          parentId: 'org-b',
          locations: [],
          departments: [],
          _count: { users: 1 },
        },
      ]);

      const tree = await service.getHierarchyTree();

      // Ensure execution completes without stack overflow / hanging
      expect(tree.length).toBeGreaterThan(0);
      // All three companies must still be present in output (not lost/dropped)
      const allKeys = new Set<string>();
      const collectKeys = (nodes: typeof tree) => {
        for (const n of nodes) {
          allKeys.add(n.key);
          if (n.children) collectKeys(n.children);
        }
      };
      collectKeys(tree);
      expect(allKeys.has('org-org-a')).toBe(true);
      expect(allKeys.has('org-org-b')).toBe(true);
      expect(allKeys.has('org-org-c')).toBe(true);
    });

    it('2.6 should safely handle broken/orphan parentId referencing non-existent parent', async () => {
      mockPrisma.organization.findMany.mockResolvedValueOnce([
        {
          id: 'org-orphan',
          name: 'Orphan Org',
          code: 'ORPHAN',
          parentId: 'non-existent-ghost-parent',
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
      ]);

      const tree = await service.getHierarchyTree();

      // Orphan node should gracefully promote to root rather than disappearing
      expect(tree).toHaveLength(1);
      expect(tree[0].key).toBe('org-org-orphan');
    });

    it('2.7 should handle multiple independent holding groups (multi-tenant structure)', async () => {
      mockPrisma.organization.findMany.mockResolvedValueOnce([
        {
          id: 'holding-1',
          name: 'Group 1',
          code: 'GRP1',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 10 },
        },
        {
          id: 'sub-1a',
          name: 'Sub 1A',
          code: 'S1A',
          parentId: 'holding-1',
          locations: [],
          departments: [],
          _count: { users: 5 },
        },
        {
          id: 'holding-2',
          name: 'Group 2',
          code: 'GRP2',
          parentId: null,
          locations: [],
          departments: [],
          _count: { users: 20 },
        },
        {
          id: 'sub-2a',
          name: 'Sub 2A',
          code: 'S2A',
          parentId: 'holding-2',
          locations: [],
          departments: [],
          _count: { users: 15 },
        },
      ]);

      const tree = await service.getHierarchyTree();

      expect(tree).toHaveLength(2);
      const g1 = tree.find((t) => t.key === 'org-holding-1');
      const g2 = tree.find((t) => t.key === 'org-holding-2');
      expect(g1).toBeDefined();
      expect(g2).toBeDefined();
      expect(g1?.children?.some((c) => c.key === 'org-sub-1a')).toBe(true);
      expect(g2?.children?.some((c) => c.key === 'org-sub-2a')).toBe(true);
    });

    it('2.8 should return empty array when no organizations exist in database', async () => {
      mockPrisma.organization.findMany.mockResolvedValueOnce([]);
      const tree = await service.getHierarchyTree();
      expect(tree).toEqual([]);
    });
  });
});
