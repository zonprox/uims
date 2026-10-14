import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  REDACTED_VALUE as UTILS_REDACTED_VALUE,
  computeFieldDiff,
  isSensitiveFieldKey,
} from '@uims/shared-utils';
import {
  REDACTED_VALUE as SANITIZE_REDACTED_VALUE,
  isSensitiveKey,
  sanitizePayload,
} from '../src/common/utils/sanitize.util';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { AuditController } from '../src/modules/audit/audit.controller';
import { AuditService } from '../src/modules/audit/audit.service';
import type { PrismaService } from '../src/database/prisma.service';

/**
 * Helper to build a mock ExecutionContext for testing RolesGuard.
 */
function createMockExecutionContext(
  handler: (...args: unknown[]) => unknown,
  controllerClass: new (...args: unknown[]) => unknown,
  user?: { id?: string; email?: string; role?: string } | null,
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => controllerClass,
    switchToHttp: () => ({
      getRequest: () => ({
        user: user === undefined ? undefined : user,
      }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getType: () => 'http',
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getData: () => ({}), getContext: () => ({}) }),
    switchToWs: () => ({ getClient: () => ({}), getData: () => ({}), getPattern: () => '' }),
  } as unknown as ExecutionContext;
}

describe('Adversarial Challenger M1: Audit History, Diff Engine, Sanitization & RBAC', () => {
  // =========================================================================
  // SUITE 1: computeFieldDiff Adversarial Correctness & Boundary Stress
  // =========================================================================
  describe('Suite 1: computeFieldDiff Adversarial Stress Testing', () => {
    it('handles deeply nested objects and detects changes at deep paths', () => {
      const oldState = {
        meta: {
          hardware: {
            specs: {
              cpu: { cores: 8, model: 'M2 Pro' },
              ramGb: 16,
            },
          },
        },
      };

      const newStateSame = {
        meta: {
          hardware: {
            specs: {
              cpu: { cores: 8, model: 'M2 Pro' },
              ramGb: 16,
            },
          },
        },
      };

      const sameResult = computeFieldDiff(oldState, newStateSame);
      expect(sameResult.hasChanges).toBe(false);
      expect(sameResult.changedKeys).toEqual([]);
      expect(sameResult.oldValue).toBeNull();
      expect(sameResult.newValue).toBeNull();

      const newStateDiff = {
        meta: {
          hardware: {
            specs: {
              cpu: { cores: 12, model: 'M2 Max' },
              ramGb: 32,
            },
          },
        },
      };

      const diffResult = computeFieldDiff(oldState, newStateDiff);
      expect(diffResult.hasChanges).toBe(true);
      expect(diffResult.changedKeys).toEqual(['meta']);
      expect(diffResult.oldValue).toEqual(oldState);
      expect(diffResult.newValue).toEqual(newStateDiff);
    });

    it('correctly handles arrays of objects: identity, mutation, length changes', () => {
      const oldState = {
        assignedLicenses: [
          { licenseId: 'lic-1', seatNumber: 101 },
          { licenseId: 'lic-2', seatNumber: 102 },
        ],
      };

      const sameState = {
        assignedLicenses: [
          { licenseId: 'lic-1', seatNumber: 101 },
          { licenseId: 'lic-2', seatNumber: 102 },
        ],
      };

      expect(computeFieldDiff(oldState, sameState).hasChanges).toBe(false);

      // Mutated element in array
      const mutatedState = {
        assignedLicenses: [
          { licenseId: 'lic-1', seatNumber: 999 },
          { licenseId: 'lic-2', seatNumber: 102 },
        ],
      };
      const mutatedResult = computeFieldDiff(oldState, mutatedState);
      expect(mutatedResult.hasChanges).toBe(true);
      expect(mutatedResult.changedKeys).toEqual(['assignedLicenses']);

      // Reordered elements in array (order matters in JSON serialization)
      const reorderedState = {
        assignedLicenses: [
          { licenseId: 'lic-2', seatNumber: 102 },
          { licenseId: 'lic-1', seatNumber: 101 },
        ],
      };
      const reorderResult = computeFieldDiff(oldState, reorderedState);
      expect(reorderResult.hasChanges).toBe(true);
      expect(reorderResult.changedKeys).toEqual(['assignedLicenses']);
    });

    it('adversarially evaluates primitive type mutations and falsy boundary values', () => {
      // Number vs string
      const numVsStr = computeFieldDiff({ port: 8080 }, { port: '8080' });
      expect(numVsStr.hasChanges).toBe(true);
      expect(numVsStr.changedKeys).toEqual(['port']);

      // Boolean vs string
      const boolVsStr = computeFieldDiff({ enabled: true }, { enabled: 'true' });
      expect(boolVsStr.hasChanges).toBe(true);
      expect(boolVsStr.changedKeys).toEqual(['enabled']);

      // 0 vs false
      const zeroVsFalse = computeFieldDiff({ flag: 0 }, { flag: false });
      expect(zeroVsFalse.hasChanges).toBe(true);
      expect(zeroVsFalse.changedKeys).toEqual(['flag']);

      // Empty string vs null
      const emptyVsNull = computeFieldDiff({ desc: '' }, { desc: null });
      expect(emptyVsNull.hasChanges).toBe(true);
      expect(emptyVsNull.changedKeys).toEqual(['desc']);

      // Zero vs null
      const zeroVsNull = computeFieldDiff({ count: 0 }, { count: null });
      expect(zeroVsNull.hasChanges).toBe(true);
      expect(zeroVsNull.changedKeys).toEqual(['count']);

      // null vs undefined: treated as equivalent by design to avoid false diffs on unassigned fields
      const nullVsUndef = computeFieldDiff({ notes: null }, { notes: undefined });
      expect(nullVsUndef.hasChanges).toBe(false);
      expect(nullVsUndef.changedKeys).toEqual([]);
    });

    it('stress tests Date instances, ISO strings, timezone offsets, and invalid dates', () => {
      const utcDate = new Date('2026-10-13T08:00:00.000Z');
      const offsetDateString = '2026-10-13T15:00:00.000+07:00'; // exact same moment

      const tzResult = computeFieldDiff(
        { scheduledAt: utcDate },
        { scheduledAt: offsetDateString },
      );
      expect(tzResult.hasChanges).toBe(false);

      // Two Date instances with same epoch ms
      const d1 = new Date(1776070800000);
      const d2 = new Date(1776070800000);
      expect(computeFieldDiff({ stamp: d1 }, { stamp: d2 }).hasChanges).toBe(false);

      // Invalid Date does not throw RangeError or crash
      const invalidDateA = new Date('not-a-valid-date');
      const invalidDateB = new Date('another-invalid-date');
      expect(() =>
        computeFieldDiff({ badDate: invalidDateA }, { badDate: invalidDateB }),
      ).not.toThrow();
    });

    it('handles null, undefined, and empty objects without crashing', () => {
      expect(computeFieldDiff(null, null).hasChanges).toBe(false);
      expect(computeFieldDiff(undefined, undefined).hasChanges).toBe(false);
      expect(computeFieldDiff(null, undefined).hasChanges).toBe(false);
      expect(computeFieldDiff({}, {}).hasChanges).toBe(false);

      // Creation from null
      const created = computeFieldDiff(null, { assetTag: 'AST-999', cost: 1200 });
      expect(created.hasChanges).toBe(true);
      expect(created.changedKeys).toEqual(['assetTag', 'cost']);
      expect(created.oldValue).toEqual({ assetTag: null, cost: null });
      expect(created.newValue).toEqual({ assetTag: 'AST-999', cost: 1200 });

      // Deletion to null
      const deleted = computeFieldDiff({ assetTag: 'AST-999', cost: 1200 }, null);
      expect(deleted.hasChanges).toBe(true);
      expect(deleted.changedKeys).toEqual(['assetTag', 'cost']);
      expect(deleted.oldValue).toEqual({ assetTag: 'AST-999', cost: 1200 });
      expect(deleted.newValue).toEqual({ assetTag: null, cost: null });
    });

    it('survives circular references without crashing process', () => {
      const circularA: Record<string, unknown> = { name: 'Node A' };
      circularA.self = circularA;

      const circularB: Record<string, unknown> = { name: 'Node B' };
      circularB.self = circularB;

      // Comparing two distinct objects with circular references
      expect(() => computeFieldDiff(circularA, circularB)).not.toThrow();
      const res = computeFieldDiff(circularA, circularB);
      expect(res.hasChanges).toBe(true);
      expect(res.changedKeys).toContain('name');
    });

    it('redacts sensitive keys regardless of casing, snake_case, camelCase, and affixes', () => {
      const oldState = {
        PASSWORD: 'pwd1',
        password_hash: 'hash1',
        userPassword: 'pwd2',
        ad_initial_password: 'ad1',
        TOKEN: 'tok1',
        refresh_token: 'rf1',
        jwtToken: 'jwt1',
        SECRET: 'sec1',
        client_secret: 'cs1',
        licenseKey: 'lk1',
        license_key: 'lk2',
        LICENSEKEY: 'lk3',
        PIN: '1111',
        SALT: 'salt1',
        APIKEY: 'ak1',
        private_key: 'pk1',
        auth_key: 'ak2',
        access_key: 'ak3',
        secret_key: 'sk1',
        recovery_code: 'rc1',
        credit_card: 'cc1',
        CVV: '123',
        AUTHORIZATION: 'Bearer xyz',
        session_id: 'sess1',
        SSN: '999-00-1111',
        normalField: 'val1',
      };

      const newState = {
        PASSWORD: 'pwd1-new',
        password_hash: 'hash1-new',
        userPassword: 'pwd2-new',
        ad_initial_password: 'ad1-new',
        TOKEN: 'tok1-new',
        refresh_token: 'rf1-new',
        jwtToken: 'jwt1-new',
        SECRET: 'sec1-new',
        client_secret: 'cs1-new',
        licenseKey: 'lk1-new',
        license_key: 'lk2-new',
        LICENSEKEY: 'lk3-new',
        PIN: '2222',
        SALT: 'salt2',
        APIKEY: 'ak1-new',
        private_key: 'pk1-new',
        auth_key: 'ak2-new',
        access_key: 'ak3-new',
        secret_key: 'sk1-new',
        recovery_code: 'rc1-new',
        credit_card: 'cc1-new',
        CVV: '456',
        AUTHORIZATION: 'Bearer abc',
        session_id: 'sess2',
        SSN: '999-00-2222',
        normalField: 'val2',
      };

      const diff = computeFieldDiff(oldState, newState);
      expect(diff.hasChanges).toBe(true);

      for (const [key, val] of Object.entries(diff.oldValue || {})) {
        if (key === 'normalField') {
          expect(val).toBe('val1');
        } else {
          expect(val).toBe(UTILS_REDACTED_VALUE);
        }
      }

      for (const [key, val] of Object.entries(diff.newValue || {})) {
        if (key === 'normalField') {
          expect(val).toBe('val2');
        } else {
          expect(val).toBe(UTILS_REDACTED_VALUE);
        }
      }
    });

    it('always excludes default transient metadata (createdAt, updatedAt)', () => {
      const oldState = {
        status: 'Active',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      const newState = {
        status: 'Active',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-02-01'),
      };

      const diff = computeFieldDiff(oldState, newState);
      expect(diff.hasChanges).toBe(false);
      expect(diff.changedKeys).toEqual([]);
    });
  });

  // =========================================================================
  // SUITE 2: sanitizePayload Adversarial Stress Testing & Boundary Attack
  // =========================================================================
  describe('Suite 2: sanitizePayload Adversarial Stress Testing', () => {
    it('truncates objects exceeding recursion depth limit (maxDepth = 8)', () => {
      // Build a 10-level deep object
      type DeepObj = { child?: DeepObj; leaf?: string };
      const root: DeepObj = {};
      let curr = root;
      for (let i = 0; i < 10; i++) {
        curr.child = {};
        curr = curr.child;
      }
      curr.leaf = 'deep-value';

      const sanitized = sanitizePayload(root) as Record<string, unknown>;
      expect(sanitized).toBeDefined();

      // Navigate down to depth 8
      let nav: unknown = sanitized;
      for (let i = 0; i < 8; i++) {
        if (typeof nav === 'object' && nav !== null && 'child' in nav) {
          nav = (nav as Record<string, unknown>).child;
        }
      }
      expect(nav).toBe('[TRUNCATED]');
    });

    it('safely handles direct and mutual circular references without stack overflow', () => {
      const selfRef: Record<string, unknown> = { id: 'self-1' };
      selfRef.loop = selfRef;

      const sanitizedSelf = sanitizePayload(selfRef) as Record<string, unknown>;
      expect(sanitizedSelf.id).toBe('self-1');
      expect(sanitizedSelf.loop).toBe('[CIRCULAR]');

      // Mutual references: A -> B -> A
      const objA: Record<string, unknown> = { name: 'A' };
      const objB: Record<string, unknown> = { name: 'B' };
      objA.refB = objB;
      objB.refA = objA;

      const sanitizedMutual = sanitizePayload(objA) as {
        name: string;
        refB: { name: string; refA: string };
      };
      expect(sanitizedMutual.name).toBe('A');
      expect(sanitizedMutual.refB.name).toBe('B');
      expect(sanitizedMutual.refB.refA).toBe('[CIRCULAR]');
    });

    it('safely handles cyclic arrays without crashing', () => {
      const cyclicArr: unknown[] = [1, 2];
      cyclicArr.push(cyclicArr);

      const sanitizedArr = sanitizePayload(cyclicArr) as unknown[];
      expect(sanitizedArr[0]).toBe(1);
      expect(sanitizedArr[1]).toBe(2);
      expect(sanitizedArr[2]).toBe('[CIRCULAR]');
    });

    it('handles binary buffers, Uint8Array, and Date values safely', () => {
      const payload = {
        buf: Buffer.from('confidential-bytes'),
        u8: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        validDate: new Date('2026-10-13T10:00:00.000Z'),
        invalidDate: new Date('invalid'),
      };

      const sanitized = sanitizePayload(payload) as Record<string, unknown>;
      expect(sanitized.buf).toBe('[BINARY BUFFER]');
      expect(sanitized.u8).toBe('[BINARY DATA]');
      expect(sanitized.validDate).toBe('2026-10-13T10:00:00.000Z');
      expect(sanitized.invalidDate).toBeNull();
    });

    it('recursively redacts nested arrays containing sensitive objects and redacts sensitive parent collections', () => {
      const complex = {
        organizations: [
          {
            name: 'HQ',
            apiKeys: [
              { keyName: 'main', secret: 'secret-api-123' },
              { keyName: 'backup', secret: 'secret-api-456' },
            ],
            endpoints: [
              { label: 'internal-gateway', token: 'bearer-token-123' },
              { label: 'external-gateway', token: 'bearer-token-456' },
            ],
            credentials: {
              adminPassword: 'super-secret-password',
            },
          },
        ],
      };

      const sanitized = sanitizePayload(complex) as {
        organizations: Array<{
          name: string;
          apiKeys: string;
          endpoints: Array<{ label: string; token: string }>;
          credentials: string;
        }>;
      };

      expect(sanitized.organizations[0].name).toBe('HQ');
      // Parent key 'apiKeys' matches 'apikey' -> completely redacted at parent level
      expect(sanitized.organizations[0].apiKeys).toBe(SANITIZE_REDACTED_VALUE);
      // Parent key 'credentials' matches 'credential' -> completely redacted at parent level
      expect(sanitized.organizations[0].credentials).toBe(SANITIZE_REDACTED_VALUE);
      // Non-sensitive parent key 'endpoints' preserves structure and redacts inner 'token' fields
      expect(sanitized.organizations[0].endpoints[0].label).toBe('internal-gateway');
      expect(sanitized.organizations[0].endpoints[0].token).toBe(SANITIZE_REDACTED_VALUE);
      expect(sanitized.organizations[0].endpoints[1].label).toBe('external-gateway');
      expect(sanitized.organizations[0].endpoints[1].token).toBe(SANITIZE_REDACTED_VALUE);
    });

    it('is idempotent when re-sanitizing an already sanitized payload', () => {
      const payload = {
        username: 'admin',
        password: 'plainPassword123',
        licenseKey: 'MSFT-2026-KEY',
      };

      const pass1 = sanitizePayload(payload) as Record<string, unknown>;
      expect(pass1.password).toBe(SANITIZE_REDACTED_VALUE);
      expect(pass1.licenseKey).toBe(SANITIZE_REDACTED_VALUE);

      const pass2 = sanitizePayload(pass1) as Record<string, unknown>;
      expect(pass2.password).toBe(SANITIZE_REDACTED_VALUE);
      expect(pass2.licenseKey).toBe(SANITIZE_REDACTED_VALUE);
      expect(pass2.username).toBe('admin');
    });
  });

  // =========================================================================
  // SUITE 3: AuditService.findByEntity Bounded Pagination & Determinism
  // =========================================================================
  describe('Suite 3: AuditService.findByEntity Bounded Pagination & Ordering', () => {
    let service: AuditService;
    let mockPrisma: {
      auditLog: {
        findMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        auditLog: {
          findMany: vi.fn(),
          count: vi.fn(),
          create: vi.fn(),
        },
      };
      service = new AuditService(mockPrisma as unknown as PrismaService);
    });

    it('clamps pageSize ceiling to strictly <= 100 when adversary requests pageSize=1000 or pageSize=5000', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(1000);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByEntity('Asset', 'ast-01', { pageSize: 1000 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 0,
        }),
      );

      await service.findByEntity('Asset', 'ast-01', { pageSize: 5000 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 0,
        }),
      );
    });

    it('clamps negative or zero pageSize to bounded values (pageSize=-5 -> take:1, pageSize=0 -> take:20)', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(10);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      // pageSize = -5 is clamped by Math.max(1, -5) -> 1
      await service.findByEntity('Asset', 'ast-01', { pageSize: -5 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 1,
          skip: 0,
        }),
      );

      // pageSize = 0 evaluates `0 || 20` -> defaults to 20
      await service.findByEntity('Asset', 'ast-01', { pageSize: 0 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        }),
      );

      // pageSize = NaN defaults to 20
      await service.findByEntity('Asset', 'ast-01', { pageSize: Number.NaN });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        }),
      );
    });

    it('clamps negative or zero page to page=1 (skip: 0)', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(10);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByEntity('Asset', 'ast-01', { page: -1, pageSize: 20 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );

      await service.findByEntity('Asset', 'ast-01', { page: 0, pageSize: 20 });
      expect(mockPrisma.auditLog.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('enforces deterministic secondary tie-breaker sorting: [{ timestamp: "desc" }, { id: "desc" }]', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(2);
      // Two records with identical timestamp
      const sameTimestamp = new Date('2026-10-13T10:00:00.000Z');
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-002',
          entityType: 'Asset',
          entityId: 'ast-01',
          action: 'UPDATE_TAG',
          timestamp: sameTimestamp,
        },
        {
          id: 'log-001',
          entityType: 'Asset',
          entityId: 'ast-01',
          action: 'CREATE',
          timestamp: sameTimestamp,
        },
      ]);

      const result = await service.findByEntity('Asset', 'ast-01');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
        }),
      );
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('log-002');
      expect(result.items[1].id).toBe('log-001');
    });

    it('trims whitespace and applies case-insensitive entityType filtering', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(0);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.findByEntity('  hardware_asset  ', '   AST-42   ');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'hardware_asset',
            entityId: 'AST-42',
          }),
        }),
      );
    });

    it('computes totalPages accurately for empty, single, and multiple page scenarios', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      // 0 total items -> totalPages = 1
      mockPrisma.auditLog.count.mockResolvedValue(0);
      const res0 = await service.findByEntity('Asset', 'ast-01', { pageSize: 20 });
      expect(res0.total).toBe(0);
      expect(res0.totalPages).toBe(1);

      // 21 items with pageSize 20 -> totalPages = 2
      mockPrisma.auditLog.count.mockResolvedValue(21);
      const res21 = await service.findByEntity('Asset', 'ast-01', { pageSize: 20 });
      expect(res21.total).toBe(21);
      expect(res21.totalPages).toBe(2);

      // 100 items with pageSize 20 -> totalPages = 5
      mockPrisma.auditLog.count.mockResolvedValue(100);
      const res100 = await service.findByEntity('Asset', 'ast-01', { pageSize: 20 });
      expect(res100.total).toBe(100);
      expect(res100.totalPages).toBe(5);
    });
  });

  // =========================================================================
  // SUITE 4: AuditService.logEvent & recordEntityDiff Security Pipeline
  // =========================================================================
  describe('Suite 4: AuditService Sanitization Pipeline in logEvent & recordEntityDiff', () => {
    let service: AuditService;
    let mockPrisma: {
      auditLog: {
        create: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        auditLog: {
          create: vi
            .fn()
            .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
              Promise.resolve({ id: 'log-created-id', ...data }),
            ),
        },
      };
      service = new AuditService(mockPrisma as unknown as PrismaService);
    });

    it('ensures logEvent unconditionally sanitizes diffPayload, oldValue, and newValue before persisting', async () => {
      await service.logEvent({
        action: 'UPDATE_PASSWORD',
        entity: 'User Account',
        entityType: 'User',
        entityId: 'u-55',
        oldValue: {
          password: 'UnredactedOldPassword123!',
          nested: { clientSecret: 'secret-xyz' },
        },
        newValue: {
          password: 'UnredactedNewPassword456!',
          nested: { clientSecret: 'secret-abc' },
        },
        diffPayload: {
          password: 'UnredactedNewPassword456!',
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oldValue: {
            password: SANITIZE_REDACTED_VALUE,
            nested: { clientSecret: SANITIZE_REDACTED_VALUE },
          },
          newValue: {
            password: SANITIZE_REDACTED_VALUE,
            nested: { clientSecret: SANITIZE_REDACTED_VALUE },
          },
          diffPayload: {
            password: SANITIZE_REDACTED_VALUE,
          },
        }),
      });
    });

    it('recordEntityDiff calculates delta, masks secrets, and persists sanitized records', async () => {
      const oldState = {
        name: 'Core Switch',
        ip: '10.0.0.1',
        snmpAuthKey: 'snmp-secret-key-1',
      };
      const newState = {
        name: 'Core Switch 01',
        ip: '10.0.0.1',
        snmpAuthKey: 'snmp-secret-key-2',
      };

      await service.recordEntityDiff({
        entityType: 'Network',
        entityId: 'net-99',
        action: 'UPDATE_SWITCH',
        oldState,
        newState,
        actor: { id: 'usr-admin', name: 'Net Admin', email: 'netadmin@example.com' },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE_SWITCH',
          entityType: 'Network',
          entityId: 'net-99',
          oldValue: {
            name: 'Core Switch',
            snmpAuthKey: SANITIZE_REDACTED_VALUE,
          },
          newValue: {
            name: 'Core Switch 01',
            snmpAuthKey: SANITIZE_REDACTED_VALUE,
          },
          diffPayload: expect.objectContaining({
            hasChanges: true,
            changedKeys: ['name', 'snmpAuthKey'],
          }),
        }),
      });
    });
  });

  // =========================================================================
  // SUITE 5: Strict RBAC Rejection & Authorization Verification
  // =========================================================================
  describe('Suite 5: Strict RBAC Rejection & Role Enforcement', () => {
    let reflector: Reflector;
    let rolesGuard: RolesGuard;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    it('rejects unauthenticated requests (missing user context) on findByEntity', () => {
      const context = createMockExecutionContext(
        AuditController.prototype.findByEntity,
        AuditController,
        undefined, // unauthenticated
      );

      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(false);
    });

    it('rejects requests with null/undefined user or missing role property on findByEntity', () => {
      const contextNull = createMockExecutionContext(
        AuditController.prototype.findByEntity,
        AuditController,
        null,
      );
      expect(rolesGuard.canActivate(contextNull)).toBe(false);

      const contextNoRole = createMockExecutionContext(
        AuditController.prototype.findByEntity,
        AuditController,
        { id: 'usr-1', email: 'user@example.com' }, // no role
      );
      expect(rolesGuard.canActivate(contextNoRole)).toBe(false);
    });

    it('strictly REJECTS non-privileged roles (Employee, Guest, Technician) from accessing findByEntity', () => {
      const employeeCtx = createMockExecutionContext(
        AuditController.prototype.findByEntity,
        AuditController,
        { id: 'e-1', email: 'emp@example.com', role: 'Employee' },
      );
      expect(rolesGuard.canActivate(employeeCtx)).toBe(false);

      const guestCtx = createMockExecutionContext(
        AuditController.prototype.findByEntity,
        AuditController,
        { id: 'g-1', email: 'guest@example.com', role: 'Guest' },
      );
      expect(rolesGuard.canActivate(guestCtx)).toBe(false);

      const techCtx = createMockExecutionContext(
        AuditController.prototype.findByEntity,
        AuditController,
        { id: 't-1', email: 'tech@example.com', role: 'Technician' },
      );
      expect(rolesGuard.canActivate(techCtx)).toBe(false);
    });

    it('ALLOWS authorized audit inspection roles (Admin, Super Admin, Manager, Viewer) to access findByEntity', () => {
      const rolesToAllow = ['Admin', 'Super Admin', 'SUPER_ADMIN', 'Manager', 'Viewer'];

      for (const role of rolesToAllow) {
        const ctx = createMockExecutionContext(
          AuditController.prototype.findByEntity,
          AuditController,
          { id: 'u-1', email: 'auth@example.com', role },
        );
        expect(rolesGuard.canActivate(ctx)).toBe(true);
      }
    });

    it('strictly enforces write endpoint RBAC: logEvent requires Admin or Super Admin, rejecting Viewer and Manager', () => {
      // Viewer should be REJECTED on logEvent
      const viewerCtx = createMockExecutionContext(
        AuditController.prototype.logEvent,
        AuditController,
        { id: 'v-1', email: 'viewer@example.com', role: 'Viewer' },
      );
      expect(rolesGuard.canActivate(viewerCtx)).toBe(false);

      // Manager should be REJECTED on logEvent
      const managerCtx = createMockExecutionContext(
        AuditController.prototype.logEvent,
        AuditController,
        { id: 'm-1', email: 'manager@example.com', role: 'Manager' },
      );
      expect(rolesGuard.canActivate(managerCtx)).toBe(false);

      // Employee should be REJECTED on logEvent
      const empCtx = createMockExecutionContext(
        AuditController.prototype.logEvent,
        AuditController,
        { id: 'e-1', email: 'emp@example.com', role: 'Employee' },
      );
      expect(rolesGuard.canActivate(empCtx)).toBe(false);

      // Admin is ALLOWED on logEvent
      const adminCtx = createMockExecutionContext(
        AuditController.prototype.logEvent,
        AuditController,
        { id: 'a-1', email: 'admin@example.com', role: 'Admin' },
      );
      expect(rolesGuard.canActivate(adminCtx)).toBe(true);

      // Super Admin is ALLOWED on logEvent
      const superAdminCtx = createMockExecutionContext(
        AuditController.prototype.logEvent,
        AuditController,
        { id: 'sa-1', email: 'sa@example.com', role: 'Super Admin' },
      );
      expect(rolesGuard.canActivate(superAdminCtx)).toBe(true);
    });

    it('strictly enforces exportCsv and getStats RBAC: rejecting unauthorized roles', () => {
      const exportEmpCtx = createMockExecutionContext(
        AuditController.prototype.exportCsv,
        AuditController,
        { id: 'e-1', email: 'emp@example.com', role: 'Employee' },
      );
      expect(rolesGuard.canActivate(exportEmpCtx)).toBe(false);

      const statsGuestCtx = createMockExecutionContext(
        AuditController.prototype.getStats,
        AuditController,
        { id: 'g-1', email: 'guest@example.com', role: 'Guest' },
      );
      expect(rolesGuard.canActivate(statsGuestCtx)).toBe(false);

      const exportAdminCtx = createMockExecutionContext(
        AuditController.prototype.exportCsv,
        AuditController,
        { id: 'a-1', email: 'admin@example.com', role: 'Admin' },
      );
      expect(rolesGuard.canActivate(exportAdminCtx)).toBe(true);
    });
  });

  // =========================================================================
  // SUITE 6: Deep Edge Cases: NaN, Property Order & Prototype Safety
  // =========================================================================
  describe('Suite 6: Deep Edge Cases (NaN, Prototype Safety, Query Permutations)', () => {
    it('empirically characterizes NaN behavior in computeFieldDiff', () => {
      // In JS, NaN !== NaN and typeof NaN === 'number'.
      // computeFieldDiff treats NaN vs NaN as differing because NaN === NaN is false in JS.
      const diffNaN = computeFieldDiff({ val: Number.NaN }, { val: Number.NaN });
      expect(diffNaN.hasChanges).toBe(true);
      expect(diffNaN.changedKeys).toEqual(['val']);
    });

    it('empirically characterizes nested object property order sensitivity', () => {
      // Nested objects compared via JSON.stringify are order-sensitive
      const obj1 = { meta: { a: 1, b: 2 } };
      const obj2 = { meta: { b: 2, a: 1 } };
      const res = computeFieldDiff(obj1, obj2);
      expect(res.hasChanges).toBe(true);
      expect(res.changedKeys).toEqual(['meta']);
    });

    it('prevents prototype pollution vectors during sanitizePayload traversal', () => {
      const maliciousPayload = JSON.parse(
        '{"__proto__":{"polluted":true},"normalField":"safe","password":"pass"}',
      ) as Record<string, unknown>;

      const sanitized = sanitizePayload(maliciousPayload) as Record<string, unknown>;
      expect(sanitized.normalField).toBe('safe');
      expect(sanitized.password).toBe(SANITIZE_REDACTED_VALUE);
      // Ensure Object.prototype is not polluted
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });
  });
});
