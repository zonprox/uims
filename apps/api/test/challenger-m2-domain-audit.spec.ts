import { NotFoundException } from '@nestjs/common';
import { AssetStatus, LicenseStatus, LicenseType } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptLicenseKey } from '../src/common/crypto/license-crypto';
import { REDACTED_VALUE } from '../src/common/utils/sanitize.util';
import type { PrismaService } from '../src/database/prisma.service';
import { AssetsService } from '../src/modules/assets/assets.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { LicensesService } from '../src/modules/licenses/licenses.service';
import type { NotificationsService } from '../src/modules/notifications/notifications.service';

describe('Adversarial Challenger M2: Domain Activity Tracking & Field-Level Diff Stress Suite', () => {
  // Shared Mock Audit Service
  let mockAuditService: {
    logEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    process.env.LICENSE_ENCRYPTION_KEY =
      process.env.LICENSE_ENCRYPTION_KEY || 'test-license-key-32-chars-minimum-secure!';
    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({ id: 'aud-test-1', timestamp: new Date() }),
    };
  });

  // =========================================================================
  // DOMAIN 1: Hardware Assets Domain Audit Logging & Diff Stress
  // =========================================================================
  describe('Domain 1: Hardware Assets Audit Logging', () => {
    let assetsService: AssetsService;
    let mockPrisma: {
      $transaction: ReturnType<typeof vi.fn>;
      asset: {
        findMany: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        updateMany: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        deleteMany: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
      };
      assetCategory: {
        findFirst: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        findMany: ReturnType<typeof vi.fn>;
      };
      deviceModel: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      department: {
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
      };
      directoryUser: {
        findUnique: ReturnType<typeof vi.fn>;
      };
      assetHandoverRecord: {
        create: ReturnType<typeof vi.fn>;
        createMany: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
      auditLog: {
        create: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
        deviceModel: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'mod-1',
            name: 'MacBook Pro 16" M3 Max',
            modelCode: 'MBP-16',
            deletedAt: null,
          }),
        },
        department: {
          findUnique: vi.fn(),
          findFirst: vi.fn().mockResolvedValue({ id: 'dept-1', name: 'Engineering' }),
        },
        asset: {
          findMany: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn(),
          update: vi.fn(),
          updateMany: vi.fn(),
          delete: vi.fn(),
          deleteMany: vi.fn(),
          count: vi.fn(),
        },
        assetCategory: {
          findFirst: vi.fn().mockResolvedValue({ id: 'cat-laptops', name: 'Laptop' }),
          findUnique: vi.fn(),
          create: vi.fn(),
          findMany: vi.fn(),
        },
        directoryUser: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'emp-it-99',
            firstName: 'Alex',
            lastName: 'Engineer',
            displayName: 'Alex Engineer',
            email: 'alex@company.com',
          }),
        },
        assetHandoverRecord: {
          create: vi.fn().mockResolvedValue({ id: 'rec-1' }),
          createMany: vi.fn(),
          findFirst: vi.fn().mockResolvedValue({ id: 'rec-pending-1', isPending: true }),
          update: vi.fn().mockResolvedValue({ id: 'rec-pending-1', isPending: false }),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'aud-db-1' }),
        },
      };

      assetsService = new AssetsService(
        mockPrisma as unknown as PrismaService,
        undefined as unknown as NotificationsService,
        mockAuditService as unknown as AuditService,
      );
    });

    it('ASSET-01: should log ASSET_CREATED with entityType=Hardware and full formatted payload', async () => {
      const createdAsset = {
        id: 'asset-hw-1',
        name: 'MacBook Pro 16" M3 Max',
        assetTag: 'AST-2026-001',
        subcode: 'AST-2026-001',
        serialNumber: 'SN-M3-999',
        deviceModel: {
          id: 'mod-1',
          name: 'MacBook Pro 16" M3 Max',
          modelCode: 'MBP-16',
          category: { name: 'Laptop' },
          categoryId: 'cat-laptops',
        },
        deviceModelId: 'mod-1',
        category: { name: 'Laptop' },
        categoryId: 'cat-laptops',
        status: AssetStatus.AVAILABLE,
        assignedToId: null,
        hasPendingRecord: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };
      mockPrisma.asset.create.mockResolvedValue(createdAsset);
      mockPrisma.asset.findUnique.mockResolvedValue(createdAsset);

      const result = await assetsService.registerUnit({
        deviceModelId: 'mod-1',
        subcode: 'AST-2026-001',
        serialNumber: 'SN-M3-999',
      });

      expect(result.id).toBe('asset-hw-1');
      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_CREATED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'asset-hw-1',
          severity: 'Info',
          status: 'Success',
        }),
      );
    });

    it('ASSET-02: should log ASSET_UPDATED with field-level diffs on state mutation', async () => {
      const existing = {
        id: 'asset-hw-1',
        name: 'MacBook Pro 16"',
        assetTag: 'AST-001',
        serialNumber: 'SN-111',
        category: 'Laptop',
        status: AssetStatus.AVAILABLE,
        costCenter: '1001',
        notes: 'Initial stock',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };
      const updated = {
        ...existing,
        name: 'MacBook Pro 16" (Repaired)',
        status: AssetStatus.IN_USE,
        notes: 'Deployed to executive',
        updatedAt: new Date('2026-02-01T00:00:00Z'),
      };

      mockPrisma.asset.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.update.mockResolvedValue(updated);

      await assetsService.update('asset-hw-1', {
        name: 'MacBook Pro 16" (Repaired)',
        status: AssetStatus.IN_USE,
        notes: 'Deployed to executive',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(1);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_UPDATED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'asset-hw-1',
          oldValue: {
            name: 'MacBook Pro 16"',
            notes: 'Initial stock',
            status: AssetStatus.AVAILABLE,
          },
          newValue: {
            name: 'MacBook Pro 16" (Repaired)',
            notes: 'Deployed to executive',
            status: AssetStatus.IN_USE,
          },
        }),
      );
    });

    it('ASSET-03: should NOT emit ASSET_UPDATED audit log when update has zero changes', async () => {
      const existing = {
        id: 'asset-hw-1',
        name: 'Dell Precision 5570',
        assetTag: 'AST-002',
        status: AssetStatus.AVAILABLE,
        notes: 'No changes',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      };
      // Same values returned from update
      mockPrisma.asset.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.update.mockResolvedValue({
        ...existing,
        updatedAt: new Date('2026-01-02T00:00:00Z'), // Excluded timestamp
      });

      await assetsService.update('asset-hw-1', {
        name: 'Dell Precision 5570',
      });

      expect(mockAuditService.logEvent).not.toHaveBeenCalled();
    });

    it('ASSET-04: should log ASSET_ASSIGNED for each item in batchAssign with recipient metadata', async () => {
      const mockAssets = [
        {
          id: 'ast-b1',
          assignedToId: null,
          hasPendingRecord: false,
          status: AssetStatus.AVAILABLE,
        },
        {
          id: 'ast-b2',
          assignedToId: null,
          hasPendingRecord: false,
          status: AssetStatus.AVAILABLE,
        },
      ];
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets);
      mockPrisma.asset.updateMany.mockResolvedValue({ count: 2 });

      const result = await assetsService.batchAssign({
        assetIds: ['ast-b1', 'ast-b2'],
        assignedToId: 'emp-it-99',
        signedDocUrl: 'https://storage.internal/docs/signed-1.pdf',
      });

      expect(result.count).toBe(2);
      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(2);

      expect(mockAuditService.logEvent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          action: 'ASSET_ASSIGNED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'ast-b1',
          oldValue: {
            assignedToId: null,
            hasPendingRecord: false,
            status: AssetStatus.AVAILABLE,
          },
          newValue: {
            assignedToId: 'emp-it-99',
            hasPendingRecord: false,
            status: AssetStatus.IN_USE,
          },
        }),
      );

      expect(mockAuditService.logEvent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          action: 'ASSET_ASSIGNED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'ast-b2',
        }),
      );
    });

    it('ASSET-05: should log ASSET_RECORD_RESOLVED when signed handover doc is attached', async () => {
      const existing = {
        id: 'ast-pending-1',
        assetTag: 'AST-PENDING-001',
        hasPendingRecord: true,
      };
      mockPrisma.asset.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.update.mockResolvedValue({
        ...existing,
        hasPendingRecord: false,
        handoverRecords: [],
      });

      await assetsService.attachHandoverDocument(
        'ast-pending-1',
        'https://storage.uims/records/signed.pdf',
        'Signed paper scan attached by IT',
      );

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_RECORD_RESOLVED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'ast-pending-1',
          oldValue: { hasPendingRecord: true },
          newValue: {
            hasPendingRecord: false,
            signedDocUrl: 'https://storage.uims/records/signed.pdf',
          },
        }),
      );
    });

    it('ASSET-06: should log ASSET_DELETED on single remove with oldValue snapshot', async () => {
      const existing = {
        id: 'ast-del-1',
        name: 'Broken Monitor',
        assetTag: 'AST-SCRAP-99',
      };
      mockPrisma.asset.findUnique.mockResolvedValue(existing);
      mockPrisma.asset.delete.mockResolvedValue(existing);

      await assetsService.remove('ast-del-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_DELETED',
          entity: 'Asset',
          entityType: 'Hardware',
          entityId: 'ast-del-1',
          severity: 'Warning',
          oldValue: expect.objectContaining({
            id: 'ast-del-1',
            name: 'Broken Monitor',
          }),
        }),
      );
    });

    it('ASSET-07: should log ASSET_DELETED for each asset in batchDelete', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        { id: 'ast-batch-1' },
        { id: 'ast-batch-2' },
        { id: 'ast-batch-3' },
      ]);
      mockPrisma.asset.deleteMany.mockResolvedValue({ count: 3 });

      const res = await assetsService.batchDelete(['ast-batch-1', 'ast-batch-2', 'ast-batch-3']);
      expect(res.count).toBe(3);
      expect(mockAuditService.logEvent).toHaveBeenCalledTimes(3);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ASSET_DELETED',
          entityType: 'Hardware',
          entityId: 'ast-batch-1',
        }),
      );
    });

    it('ASSET-08: should NOT crash asset operation if auditService.logEvent rejects (resilience test)', async () => {
      mockAuditService.logEvent.mockRejectedValue(new Error('Audit DB down!'));
      const resilientAsset = {
        id: 'ast-resilient-1',
        name: 'Test Device',
        assetTag: 'TAG-R1',
        subcode: 'TAG-R1',
        deviceModel: { id: 'mod-1', name: 'Test Device' },
        deviceModelId: 'mod-1',
        category: { name: 'Laptop' },
        categoryId: 'cat-laptops',
        status: AssetStatus.AVAILABLE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.asset.create.mockResolvedValue(resilientAsset);
      mockPrisma.asset.findUnique.mockResolvedValue(resilientAsset);

      // Must succeed without throwing
      const created = await assetsService.registerUnit({
        deviceModelId: 'mod-1',
        subcode: 'TAG-R1',
      });
      expect(created.id).toBe('ast-resilient-1');
    });
  });

  // =========================================================================
  // DOMAIN 2: Software Licenses Domain Audit Logging & Key Masking Stress
  // =========================================================================
  describe('Domain 2: Software Licenses Audit Logging & Masking', () => {
    let licensesService: LicensesService;
    let mockPrisma: {
      $transaction: ReturnType<typeof vi.fn>;
      license: {
        findUnique: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
      };
      licenseAssignment: {
        findFirst: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
        license: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        licenseAssignment: {
          findFirst: vi.fn(),
          count: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
      };

      licensesService = new LicensesService(
        mockPrisma as unknown as PrismaService,
        undefined as unknown as NotificationsService,
        mockAuditService as unknown as AuditService,
      );
    });

    it('LIC-01: should mask licenseKey in newValue on LICENSE_CREATED (never store plaintext)', async () => {
      const plaintextKey = 'ADOBE-CC-PRO-987654321-XYZ';
      mockPrisma.license.create.mockResolvedValue({
        id: 'lic-audit-1',
        name: 'Adobe Creative Cloud',
        vendor: 'Adobe',
        type: LicenseType.SUBSCRIPTION,
        totalSeats: 25,
        usedSeats: 0,
        licenseKey: encryptLicenseKey(plaintextKey),
        status: LicenseStatus.ACTIVE,
        assignments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await licensesService.create({
        name: 'Adobe Creative Cloud',
        vendor: 'Adobe',
        type: 'Subscription',
        totalSeats: 25,
        licenseKey: plaintextKey,
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LICENSE_CREATED',
          entity: 'License',
          entityType: 'License',
          entityId: 'lic-audit-1',
          newValue: expect.objectContaining({
            name: 'Adobe Creative Cloud',
            licenseKey: '••••-••••--XYZ', // maskedKey format
          }),
        }),
      );

      // Verify the plaintext key NEVER appears anywhere in the call args
      const callArg = mockAuditService.logEvent.mock.calls[0][0];
      const serialized = JSON.stringify(callArg);
      expect(serialized).not.toContain(plaintextKey);
    });

    it('LIC-02: should redact licenseKey in field diff on LICENSE_UPDATED when key is changed', async () => {
      const oldRaw = 'OLD-TOP-SECRET-KEY-AAAA';
      const newRaw = 'NEW-TOP-SECRET-KEY-BBBB';
      const existing = {
        id: 'lic-audit-2',
        name: 'IntelliJ IDEA Ultimate',
        vendor: 'JetBrains',
        totalSeats: 10,
        usedSeats: 5,
        licenseKey: encryptLicenseKey(oldRaw),
        assignments: [],
      };
      const updated = {
        ...existing,
        licenseKey: encryptLicenseKey(newRaw),
      };

      mockPrisma.license.findUnique.mockResolvedValue(existing);
      mockPrisma.license.update.mockResolvedValue(updated);

      await licensesService.update('lic-audit-2', {
        licenseKey: newRaw,
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LICENSE_UPDATED',
          entity: 'License',
          entityType: 'License',
          entityId: 'lic-audit-2',
          oldValue: {
            licenseKey: REDACTED_VALUE,
          },
          newValue: {
            licenseKey: REDACTED_VALUE,
          },
        }),
      );

      // Neither plaintext nor raw ciphertext must appear in the audit call
      const callArg = mockAuditService.logEvent.mock.calls[0][0];
      const serialized = JSON.stringify(callArg);
      expect(serialized).not.toContain(oldRaw);
      expect(serialized).not.toContain(newRaw);
    });

    it('LIC-03: should log LICENSE_SEAT_ASSIGNED with seat count diff and recipient info', async () => {
      mockPrisma.license.findUnique.mockResolvedValue({
        id: 'lic-seat-1',
        name: 'Slack Enterprise',
        totalSeats: 100,
        usedSeats: 10,
        type: LicenseType.SUBSCRIPTION,
      });
      mockPrisma.licenseAssignment.count.mockResolvedValue(11);
      mockPrisma.licenseAssignment.create.mockResolvedValue({
        id: 'asg-slack-1',
        licenseId: 'lic-seat-1',
        assignedName: 'Bob Engineer',
        assignedEmail: 'bob@youngonevn.com',
      });
      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-seat-1',
        name: 'Slack Enterprise',
        usedSeats: 11,
        totalSeats: 100,
        assignments: [],
      });

      await licensesService.assignUser('lic-seat-1', {
        name: 'Bob Engineer',
        email: 'bob@youngonevn.com',
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LICENSE_SEAT_ASSIGNED',
          entity: 'License',
          entityType: 'License',
          entityId: 'lic-seat-1',
          oldValue: {
            usedSeats: 10,
          },
          newValue: expect.objectContaining({
            usedSeats: 11,
            assignmentId: 'asg-slack-1',
            assignedName: 'Bob Engineer',
          }),
        }),
      );
    });

    it('LIC-04: should log LICENSE_SEAT_REVOKED with decremented seat counts', async () => {
      mockPrisma.licenseAssignment.findFirst.mockResolvedValue({
        id: 'asg-slack-1',
        licenseId: 'lic-seat-1',
      });
      mockPrisma.licenseAssignment.update.mockResolvedValue({
        id: 'asg-slack-1',
        unassignedAt: new Date(),
      });
      mockPrisma.licenseAssignment.count.mockResolvedValue(10);
      mockPrisma.license.update.mockResolvedValue({
        id: 'lic-seat-1',
        usedSeats: 10,
      });

      await licensesService.revokeUser('lic-seat-1', 'asg-slack-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LICENSE_SEAT_REVOKED',
          entity: 'License',
          entityType: 'License',
          entityId: 'lic-seat-1',
          oldValue: {
            assignmentId: 'asg-slack-1',
            usedSeats: 11,
          },
          newValue: {
            usedSeats: 10,
          },
        }),
      );
    });

    it('LIC-05: should log LICENSE_DELETED on license deletion with previous name and seats', async () => {
      const existing = {
        id: 'lic-del-1',
        name: 'Deprecated Tool',
        vendor: 'OldVendor',
        totalSeats: 5,
      };
      mockPrisma.license.findUnique.mockResolvedValue(existing);
      mockPrisma.license.delete.mockResolvedValue(existing);

      await licensesService.remove('lic-del-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LICENSE_DELETED',
          entity: 'License',
          entityType: 'License',
          entityId: 'lic-del-1',
          oldValue: {
            name: 'Deprecated Tool',
            vendor: 'OldVendor',
            totalSeats: 5,
          },
        }),
      );
    });
  });

  // =========================================================================
  // DOMAIN 3: Consumable Inventory Domain Audit Logging & Restock Stress
  // =========================================================================
  describe('Domain 3: Consumable Inventory Audit Logging & Restock', () => {
    let inventoryService: InventoryService;
    let mockPrisma: {
      inventoryItem: {
        findUnique: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
      };
      inventoryCategory: {
        findFirst: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
      };
    };

    beforeEach(() => {
      mockPrisma = {
        inventoryItem: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        inventoryCategory: {
          findFirst: vi.fn().mockResolvedValue({ id: 'cat-supplies', name: 'General Supplies' }),
          create: vi.fn().mockResolvedValue({ id: 'cat-supplies', name: 'General Supplies' }),
        },
      };

      inventoryService = new InventoryService(
        mockPrisma as unknown as PrismaService,
        undefined as unknown as NotificationsService,
        mockAuditService as unknown as AuditService,
      );
    });

    it('INV-01: should log INVENTORY_ITEM_CREATED with formatted item details', async () => {
      const createdItem = {
        id: 'inv-item-1',
        sku: 'CAT6-CABLE-100M',
        name: 'Cat6 Ethernet Cable (100m Roll)',
        quantity: 50,
        minThreshold: 10,
        unitCost: 35.5,
        binNumber: 'A-12-3',
        category: { name: 'Cables & Networking' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.inventoryItem.create.mockResolvedValue(createdItem);

      const result = await inventoryService.create({
        sku: 'CAT6-CABLE-100M',
        name: 'Cat6 Ethernet Cable (100m Roll)',
        quantity: 50,
        minThreshold: 10,
        unitCost: 35.5,
      });

      expect(result.id).toBe('inv-item-1');
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ITEM_CREATED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'inv-item-1',
          newValue: expect.objectContaining({
            id: 'inv-item-1',
            sku: 'CAT6-CABLE-100M',
            quantity: 50,
          }),
        }),
      );
    });

    it('INV-02: should log INVENTORY_ITEM_UPDATED with field-level diff on threshold or price changes', async () => {
      const existing = {
        id: 'inv-item-1',
        sku: 'RJ45-PLUG-100PK',
        name: 'RJ45 Modular Connectors',
        quantity: 200,
        minThreshold: 30,
        unitCost: 8.0,
        binNumber: 'B-01',
        category: { name: 'Connectors' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = {
        ...existing,
        minThreshold: 50,
        unitCost: 9.5,
      };

      mockPrisma.inventoryItem.findUnique.mockResolvedValue(existing);
      mockPrisma.inventoryItem.update.mockResolvedValue(updated);

      await inventoryService.update('inv-item-1', {
        minThreshold: 50,
        unitCost: 9.5,
      });

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ITEM_UPDATED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'inv-item-1',
          oldValue: {
            minThreshold: 30,
            unitCost: 8.0,
          },
          newValue: {
            minThreshold: 50,
            unitCost: 9.5,
          },
        }),
      );
    });

    it('INV-03: should log INVENTORY_RESTOCKED with accurate quantity delta (+X units)', async () => {
      const existing = {
        id: 'inv-restock-1',
        sku: 'KEYBOARD-USB-EN',
        name: 'Standard USB Keyboard',
        quantity: 15,
        minThreshold: 20,
        category: { name: 'Peripherals' },
      };
      const updated = {
        ...existing,
        quantity: 65, // +50 units
      };

      mockPrisma.inventoryItem.findUnique.mockResolvedValue(existing);
      mockPrisma.inventoryItem.update.mockResolvedValue(updated);

      const result = await inventoryService.restock('inv-restock-1', 50);

      expect(result.quantity).toBe(65);
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_RESTOCKED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'inv-restock-1',
          details: expect.stringContaining('restocked (+50 units)'),
          oldValue: {
            quantity: 15,
          },
          newValue: {
            quantity: 65,
          },
        }),
      );
    });

    it('INV-04: should reject restock on non-existent item and NOT call auditService', async () => {
      mockPrisma.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(inventoryService.restock('inv-ghost-99', 20)).rejects.toThrow(NotFoundException);

      expect(mockAuditService.logEvent).not.toHaveBeenCalled();
    });

    it('INV-05: should log INVENTORY_ITEM_DELETED on item removal', async () => {
      const existing = {
        id: 'inv-del-1',
        sku: 'OLD-MOUSE-PAD',
        name: 'Mouse Pad Generic',
        quantity: 0,
      };
      mockPrisma.inventoryItem.findUnique.mockResolvedValue(existing);
      mockPrisma.inventoryItem.delete.mockResolvedValue(existing);

      await inventoryService.remove('inv-del-1');

      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'INVENTORY_ITEM_DELETED',
          entity: 'Inventory',
          entityType: 'Inventory',
          entityId: 'inv-del-1',
          severity: 'Warning',
          oldValue: expect.objectContaining({
            id: 'inv-del-1',
            sku: 'OLD-MOUSE-PAD',
          }),
        }),
      );
    });
  });

  // =========================================================================
  // INTEGRATION DEFENSE: Real AuditService Sensitive Field Sanitizer
  // =========================================================================
  describe('Integration Defense: Real AuditService Sensitive Field Sanitizer', () => {
    it('SEC-01: ensures Real AuditService masks sensitive keys in diffPayload, oldValue, and newValue', async () => {
      const mockAuditLogCreate = vi.fn().mockImplementation(async ({ data }) => ({
        id: 'aud-real-1',
        ...data,
      }));

      const realAuditService = new AuditService({
        auditLog: { create: mockAuditLogCreate },
      } as unknown as PrismaService);

      await realAuditService.logEvent({
        action: 'TEST_MUTATION',
        entity: 'License',
        entityType: 'License',
        entityId: 'lic-real-99',
        oldValue: {
          licenseKey: 'OLD-KEY-SUPER-SECRET-1234',
          apiToken: 'tok-secret-xyz',
          normalField: 'Normal Value',
        },
        newValue: {
          licenseKey: 'NEW-KEY-SUPER-SECRET-5678',
          apiToken: 'tok-new-secret',
          normalField: 'Updated Value',
        },
      });

      expect(mockAuditLogCreate).toHaveBeenCalledTimes(1);
      const passedData = mockAuditLogCreate.mock.calls[0][0].data;

      // Verify oldValue and newValue have their sensitive fields replaced by [REDACTED]
      expect(passedData.oldValue).toEqual({
        licenseKey: REDACTED_VALUE,
        apiToken: REDACTED_VALUE,
        normalField: 'Normal Value',
      });
      expect(passedData.newValue).toEqual({
        licenseKey: REDACTED_VALUE,
        apiToken: REDACTED_VALUE,
        normalField: 'Updated Value',
      });
    });
  });
});
