import path from 'node:path';
import dotenv from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { AssetsService } from '../src/modules/assets/assets.service';
import { NotificationsGateway } from '../src/modules/notifications/notifications.gateway';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { ScheduledAlertsWorker } from '../src/modules/notifications/scheduled-alerts.worker';
import { AssetStatus, HandoverRecordType } from '@uims/shared-types';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Milestone 3-2 Challenger Adversarial Suite:
 * Empirical Stress Testing of Dashboard Compliance Data Parity & WebSocket Custody Security
 */
describe('M3-2 Challenger: Dashboard Compliance Metrics & WebSocket Custody Stress Harness', () => {
  let prisma: PrismaService;
  let dashboardService: DashboardService;
  let assetsService: AssetsService;
  let notificationsService: NotificationsService;
  let scheduledAlertsWorker: ScheduledAlertsWorker;
  let gateway: NotificationsGateway;
  let jwtService: JwtService;

  const TEST_JWT_SECRET = process.env.JWT_SECRET || 'uims-m3-2-challenger-secret-2026';

  // Tracking entities for database teardown
  const createdRecordIds: string[] = [];
  const createdAssetIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdModelIds: string[] = [];
  const createdDepartmentIds: string[] = [];

  let testOrgId: string;
  let testDepartmentId: string;
  let testModelId: string;
  let testCustodianId: string;

  // Mock Socket.IO server
  let mockServer: {
    to: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    fetchSockets: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    use: ReturnType<typeof vi.fn>;
  };

  interface MockSocketInstance {
    id: string;
    data: Record<string, unknown>;
    handshake: {
      auth: Record<string, unknown>;
      headers: Record<string, string>;
      query: Record<string, unknown>;
    };
    join: ReturnType<typeof vi.fn>;
    leave: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }

  function createMockSocket(
    options: {
      id?: string;
      auth?: Record<string, unknown>;
      headers?: Record<string, string>;
      query?: Record<string, unknown>;
      data?: Record<string, unknown>;
    } = {},
  ): MockSocketInstance {
    return {
      id: options.id || `socket-${Math.random().toString(36).substring(2, 9)}`,
      data: options.data || {},
      handshake: {
        auth: options.auth || {},
        headers: options.headers || {},
        query: options.query || {},
      },
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
      disconnect: vi.fn(),
    };
  }

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    jwtService = new JwtService({ secret: TEST_JWT_SECRET });

    const mockConfigService = {
      get: vi.fn((key: string): string | undefined => {
        if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
        return undefined;
      }),
      getOrThrow: vi.fn((key: string): string => {
        if (key === 'JWT_SECRET') return TEST_JWT_SECRET;
        throw new Error(`Missing ${key}`);
      }),
    };

    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      fetchSockets: vi.fn().mockResolvedValue([]),
      close: vi.fn((cb?: () => void) => cb?.()),
      use: vi.fn(),
    };

    gateway = new NotificationsGateway(jwtService, mockConfigService as unknown as ConfigService);
    gateway.server = mockServer as unknown as Server;

    notificationsService = new NotificationsService(prisma, gateway);
    assetsService = new AssetsService(prisma, notificationsService, undefined);
    dashboardService = new DashboardService(prisma);
    scheduledAlertsWorker = new ScheduledAlertsWorker(
      prisma,
      notificationsService,
      undefined,
      gateway,
    );

    // Setup base organization and department
    // 1. Resolve or create test Organization and Department (must not pollute HOLDING root)
    let org =
      (await prisma.organization.findFirst({ where: { code: 'BSL' } })) ||
      (await prisma.organization.findFirst({ where: { code: { not: 'HOLDING' } } }));
    if (!org) {
      org = await prisma.organization.create({
        data: {
          code: `ORG-CHALL-${Date.now().toString().slice(-4)}`,
          name: 'Challenger Test Organization',
        },
      });
    }
    testOrgId = org.id;

    let dept = await prisma.department.findFirst({ where: { organizationId: testOrgId } });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          code: `DEPT-CHALL-${Date.now().toString().slice(-4)}`,
          name: 'Challenger Audit Department',
          organizationId: testOrgId,
        },
      });
      createdDepartmentIds.push(dept.id);
    }
    testDepartmentId = dept.id;

    // Setup category & device model
    let cat = await prisma.assetCategory.findFirst();
    if (!cat) {
      cat = await prisma.assetCategory.create({
        data: {
          code: `CAT-CHALL-${Date.now().toString().slice(-4)}`,
          name: 'Challenger Laptops',
        },
      });
    }

    const model = await prisma.deviceModel.create({
      data: {
        name: 'Challenger Latitude 7440',
        modelCode: `MOD-CHALL-STRESS-${Date.now()}`,
        categoryId: cat.id,
        manufacturer: 'Dell',
        unitCost: 1200,
        minThreshold: 3,
      },
    });
    testModelId = model.id;
    createdModelIds.push(model.id);

    // Setup test custodian
    const defaultPos = await prisma.position.findFirst({ select: { id: true } });
    const custodian = await prisma.directoryUser.create({
      data: {
        email: `custodian.stress.${Date.now()}@youngonevn.com`,
        firstName: 'Thang',
        lastName: 'Dang',
        displayName: 'Thang Dang (IT QA)',
        employeeCode: `EMP-QA-${Date.now().toString().slice(-4)}`,
        status: 'ACTIVE',
        organizationId: testOrgId,
        departmentId: testDepartmentId,
        positionId: defaultPos?.id,
      },
    });
    testCustodianId = custodian.id;
    createdUserIds.push(custodian.id);
  });

  afterAll(async () => {
    // Teardown created records in clean reverse dependency order
    if (createdRecordIds.length > 0) {
      await prisma.assetHandoverRecord.deleteMany({
        where: { id: { in: createdRecordIds } },
      });
    }
    if (createdAssetIds.length > 0) {
      await prisma.assetHandoverRecord.deleteMany({
        where: { assetId: { in: createdAssetIds } },
      });
      await prisma.asset.deleteMany({
        where: { id: { in: createdAssetIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.directoryUser.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    if (createdModelIds.length > 0) {
      await prisma.deviceModel.deleteMany({
        where: { id: { in: createdModelIds } },
      });
    }
    if (createdDepartmentIds.length > 0) {
      await prisma.department.deleteMany({
        where: { id: { in: createdDepartmentIds } },
      });
    }
    await prisma.department.deleteMany({
      where: {
        OR: [
          { code: { startsWith: 'DEPT-CHALL-' } },
          { organizationId: 'org-holding' },
        ],
      },
    });
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. WEBSOCKET CUSTODY EVENTS & CONNECTION SECURITY CHALLENGE
  // =========================================================================
  describe('Challenge 1: WebSocket Custody Events & Security Robustness', () => {
    it('1.1 should reject connection when auth token is passed via query string parameter', async () => {
      const validJwt = jwtService.sign(
        { sub: 'usr-attacker', role: 'Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        query: { token: validJwt },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('1.2 should reject connection when access_token is passed via query string parameter', async () => {
      const validJwt = jwtService.sign(
        { sub: 'usr-attacker-2', role: 'Super Admin' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        query: { access_token: validJwt },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('1.3 should reject connection without token (fail-closed)', async () => {
      const socket = createMockSocket({ auth: {}, headers: {}, query: {} });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('1.4 should reject connection when token payload lacks role claim (ZERO fallback to Employee)', async () => {
      const noRoleJwt = jwtService.sign(
        { sub: 'usr-no-role', email: 'norole@uims.local' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({ auth: { token: noRoleJwt } });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('1.5 should accept valid handshake and join deterministic room channels [user:<id>] and [role:<role>]', async () => {
      const validJwt = jwtService.sign(
        { sub: 'usr-qa-auditor', role: 'Auditor', email: 'auditor@youngone.com' },
        { secret: TEST_JWT_SECRET },
      );
      const socket = createMockSocket({
        auth: { token: validJwt },
      });

      await gateway.handleConnection(socket as unknown as Socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:usr-qa-auditor');
      expect(socket.join).toHaveBeenCalledWith('role:Auditor');
      expect(socket.emit).toHaveBeenCalledWith(
        'connected',
        expect.objectContaining({
          status: 'ready',
          userId: 'usr-qa-auditor',
          role: 'Auditor',
        }),
      );
    });

    it('1.6 should emit handover_document_pending with required canonical payload format', async () => {
      const pendingPayload = {
        recordId: 'rec-stress-check-1',
        assetId: 'ast-stress-1',
        assetTag: 'AST-STRESS-101',
        recipientName: 'Thang Dang',
        type: 'ASSIGNMENT' as const,
        daysPending: 2,
        isOverdue: false,
      };

      gateway.emitCustodyEvent('handover_document_pending', pendingPayload);

      expect(mockServer.emit).toHaveBeenCalledWith('handover_document_pending', pendingPayload);
    });

    it('1.7 ScheduledAlertsWorker scans pending records and broadcasts handover_document_pending via WebSocket', async () => {
      // Create a test asset and pending record
      const asset = await prisma.asset.create({
        data: {
          assetTag: `AST-WS-${Date.now()}`,
          serialNumber: `SN-WS-${Date.now()}`,
          status: AssetStatus.IN_USE,
          deviceModelId: testModelId,
          assignedToId: testCustodianId,
          departmentId: testDepartmentId,
          hasPendingRecord: true,
        },
      });
      createdAssetIds.push(asset.id);

      const record = await prisma.assetHandoverRecord.create({
        data: {
          assetId: asset.id,
          type: HandoverRecordType.ASSIGNMENT,
          recipientId: testCustodianId,
          isPending: true,
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago -> Overdue!
        },
      });
      createdRecordIds.push(record.id);

      // Spy on gateway.emitCustodyEvent
      const emitSpy = vi.spyOn(gateway, 'emitCustodyEvent');

      // Execute worker scan
      const scanResult = await scheduledAlertsWorker.scanPendingHandoverRecords();

      expect(scanResult.scanned).toBeGreaterThan(0);
      expect(emitSpy).toHaveBeenCalledWith(
        'handover_document_pending',
        expect.objectContaining({
          recordId: record.id,
          assetId: asset.id,
          type: 'ASSIGNMENT',
          isOverdue: true,
        }),
      );

      emitSpy.mockRestore();
    });
  });

  // =========================================================================
  // 2. DASHBOARD COMPLIANCE METRICS & POSTGRESQL PARITY CHALLENGE
  // =========================================================================
  describe('Challenge 2: Dashboard Compliance Metrics Parity & Overdue Boundary', () => {
    let freshAssetId: string;
    let overdueRecordId: string;
    let freshRecordId: string;

    beforeAll(async () => {
      const asset = await prisma.asset.create({
        data: {
          assetTag: `AST-METRICS-${Date.now()}`,
          serialNumber: `SN-METRICS-${Date.now()}`,
          status: AssetStatus.IN_USE,
          deviceModelId: testModelId,
          assignedToId: testCustodianId,
          departmentId: testDepartmentId,
          hasPendingRecord: true,
        },
      });
      freshAssetId = asset.id;
      createdAssetIds.push(asset.id);

      // Create an overdue pending record (> 3 days)
      const overdueRec = await prisma.assetHandoverRecord.create({
        data: {
          assetId: freshAssetId,
          type: HandoverRecordType.ASSIGNMENT,
          recipientId: testCustodianId,
          isPending: true,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          notes: 'Overdue handover document for testing parity',
        },
      });
      overdueRecordId = overdueRec.id;
      createdRecordIds.push(overdueRec.id);

      // Create a fresh pending record (< 3 days)
      const freshRec = await prisma.assetHandoverRecord.create({
        data: {
          assetId: freshAssetId,
          type: HandoverRecordType.RETURN,
          recipientId: testCustodianId,
          isPending: true,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          notes: 'Fresh return handover document',
        },
      });
      freshRecordId = freshRec.id;
      createdRecordIds.push(freshRec.id);
    });

    it('2.1 getPendingHandoversSummary() totalPending must match 100% PostgreSQL ground truth', async () => {
      const summary = await dashboardService.getPendingHandoversSummary();
      const expectedTotal = await prisma.assetHandoverRecord.count({
        where: { isPending: true },
      });

      expect(summary.totalPending).toBe(expectedTotal);
      expect(summary.totalPending).toBeGreaterThanOrEqual(2);
    });

    it('2.2 getPendingHandoversSummary() type breakdown must match PostgreSQL ground truth', async () => {
      const summary = await dashboardService.getPendingHandoversSummary();

      const [expectedAssignments, expectedReturns] = await Promise.all([
        prisma.assetHandoverRecord.count({
          where: { isPending: true, type: HandoverRecordType.ASSIGNMENT },
        }),
        prisma.assetHandoverRecord.count({
          where: { isPending: true, type: HandoverRecordType.RETURN },
        }),
      ]);

      expect(summary.pendingAssignments).toBe(expectedAssignments);
      expect(summary.pendingReturns).toBe(expectedReturns);
      expect(summary.breakdownByType.assignment).toBe(expectedAssignments);
      expect(summary.breakdownByType.return).toBe(expectedReturns);
      expect(summary.pendingAssignments + summary.pendingReturns).toBe(summary.totalPending);
    });

    it('2.3 getPendingHandoversSummary() overdueCount must strictly match records created before 3 days ago', async () => {
      const summary = await dashboardService.getPendingHandoversSummary();

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const expectedOverdue = await prisma.assetHandoverRecord.count({
        where: {
          isPending: true,
          createdAt: { lt: threeDaysAgo },
        },
      });

      expect(summary.overdueCount).toBe(expectedOverdue);
      expect(summary.overdueCount).toBeGreaterThanOrEqual(1);

      // Verify overdue flag on individual records
      const foundOverdue = summary.records.find((r) => r.id === overdueRecordId);
      if (foundOverdue) {
        expect(foundOverdue.isOverdue).toBe(true);
        expect(foundOverdue.daysPending).toBeGreaterThanOrEqual(4);
      }

      const foundFresh = summary.records.find((r) => r.id === freshRecordId);
      if (foundFresh) {
        expect(foundFresh.isOverdue).toBe(false);
        expect(foundFresh.daysPending).toBeLessThanOrEqual(2);
      }
    });

    it('2.4 getPendingHandoversSummary() enforces take: 10 ceiling and deterministic ordering', async () => {
      const summary = await dashboardService.getPendingHandoversSummary();

      // Enforce query ceiling
      expect(summary.records.length).toBeLessThanOrEqual(10);

      // Enforce deterministic ordering (createdAt desc, id desc)
      for (let i = 1; i < summary.records.length; i++) {
        const prev = new Date(summary.records[i - 1].createdAt).getTime();
        const curr = new Date(summary.records[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  // =========================================================================
  // 3. IMMEDIATE COMPLIANCE RECALCULATION ON DOCUMENT ATTACH
  // =========================================================================
  describe('Challenge 3: Immediate Live State Update on Document Attach', () => {
    let attachTestAssetId: string;
    let attachRecordId: string;

    beforeAll(async () => {
      const asset = await prisma.asset.create({
        data: {
          assetTag: `AST-ATTACH-${Date.now()}`,
          serialNumber: `SN-ATTACH-${Date.now()}`,
          status: AssetStatus.IN_USE,
          deviceModelId: testModelId,
          assignedToId: testCustodianId,
          departmentId: testDepartmentId,
          hasPendingRecord: true,
        },
      });
      attachTestAssetId = asset.id;
      createdAssetIds.push(asset.id);

      const record = await prisma.assetHandoverRecord.create({
        data: {
          assetId: attachTestAssetId,
          type: HandoverRecordType.ASSIGNMENT,
          recipientId: testCustodianId,
          isPending: true,
          createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // Overdue
        },
      });
      attachRecordId = record.id;
      createdRecordIds.push(record.id);
    });

    it('3.1 initial state confirms record is pending and present in compliance summary', async () => {
      const beforeSummary = await dashboardService.getPendingHandoversSummary();
      const beforeOverdue = beforeSummary.overdueCount;
      const beforeTotal = beforeSummary.totalPending;

      expect(beforeTotal).toBeGreaterThanOrEqual(1);
      expect(beforeOverdue).toBeGreaterThanOrEqual(1);

      const recordInDb = await prisma.assetHandoverRecord.findUnique({
        where: { id: attachRecordId },
      });
      expect(recordInDb).toBeDefined();
      expect(recordInDb?.isPending).toBe(true);

      const recordInSummary = beforeSummary.records.find((r) => r.id === attachRecordId);
      if (recordInSummary) {
        expect(recordInSummary.isOverdue).toBe(true);
      }
    });

    it('3.2 attaching signed document immediately decrements totalPending & clears record from dashboard summary', async () => {
      const beforeSummary = await dashboardService.getPendingHandoversSummary();
      const beforeTotal = beforeSummary.totalPending;
      const beforeOverdue = beforeSummary.overdueCount;

      // Attach signed document
      const attachResult = await assetsService.attachHandoverDocument(
        attachTestAssetId,
        'https://storage.uims.local/records/signed_challenger_test.pdf',
        attachRecordId,
        'Resolved during Challenger M3-2 adversarial test',
      );

      expect(attachResult.id).toBe(attachTestAssetId);
      expect(attachResult.hasPendingRecord).toBe(false);

      // Verify immediate update in DashboardService
      const afterSummary = await dashboardService.getPendingHandoversSummary();
      expect(afterSummary.totalPending).toBe(beforeTotal - 1);
      expect(afterSummary.overdueCount).toBe(beforeOverdue - 1);

      // Record must no longer appear in records list
      const recordAfter = afterSummary.records.find((r) => r.id === attachRecordId);
      expect(recordAfter).toBeUndefined();

      // Database verification
      const dbRec = await prisma.assetHandoverRecord.findUnique({
        where: { id: attachRecordId },
      });
      expect(dbRec?.isPending).toBe(false);
      expect(dbRec?.signedDocUrl).toBe(
        'https://storage.uims.local/records/signed_challenger_test.pdf',
      );
    });

    it('3.3 attaching signed document emits handover_document_resolved via WebSocket', async () => {
      const freshAsset = await prisma.asset.create({
        data: {
          assetTag: `AST-ATTACH-EVT-${Date.now()}`,
          serialNumber: `SN-ATTACH-EVT-${Date.now()}`,
          status: AssetStatus.IN_USE,
          deviceModelId: testModelId,
          assignedToId: testCustodianId,
          departmentId: testDepartmentId,
          hasPendingRecord: true,
        },
      });
      createdAssetIds.push(freshAsset.id);

      const freshRec = await prisma.assetHandoverRecord.create({
        data: {
          assetId: freshAsset.id,
          type: HandoverRecordType.ASSIGNMENT,
          recipientId: testCustodianId,
          isPending: true,
        },
      });
      createdRecordIds.push(freshRec.id);

      const emitSpy = vi.spyOn(gateway, 'emitCustodyEvent');

      await assetsService.attachHandoverDocument(
        freshAsset.id,
        'https://storage.uims.local/records/signed_event_test.pdf',
        freshRec.id,
      );

      expect(emitSpy).toHaveBeenCalledWith(
        'handover_document_resolved',
        expect.objectContaining({
          recordId: freshRec.id,
          assetId: freshAsset.id,
          timestamp: expect.any(String),
        }),
      );

      emitSpy.mockRestore();
    });
  });
});
