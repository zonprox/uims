import 'dotenv/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service';
import { TopologyNodeType } from '@prisma/client';

describe('Empirical Challenger M2-1: Live Database Relational Invariants & Seed Suite', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Organization & Vendor Entity Counts', () => {
    it('should have exactly 4 Organizations including orgHolding, orgBSL, orgBSH, and orgBSD', async () => {
      const orgs = await prisma.organization.findMany({
        orderBy: { code: 'asc' },
      });

      expect(orgs.length).toBe(4);
      const orgCodes = orgs.map((o) => o.code);
      expect(orgCodes).toContain('HOLDING');
      expect(orgCodes).toContain('BSL');
      expect(orgCodes).toContain('BSH');
      expect(orgCodes).toContain('BSD');
    });

    it('should have exactly 27 Canonical Enterprise Vendors', async () => {
      const vendorCount = await prisma.vendor.count();
      expect(vendorCount).toBe(27);

      const requiredVendors = [
        'ven-hp',
        'ven-hpe',
        'ven-aruba',
        'ven-fortinet',
        'ven-zebra',
        'ven-synology',
        'ven-schneider',
        'ven-honeywell',
        'ven-hikvision',
        'ven-hanwha',
        'ven-axis',
        'ven-lg',
        'ven-jetbrains',
        'ven-figma',
        'ven-autodesk',
      ];

      const existingVendors = await prisma.vendor.findMany({
        where: { id: { in: requiredVendors } },
        select: { id: true, name: true },
      });

      expect(existingVendors.length).toBe(requiredVendors.length);
    });

    it('should maintain strict DirectoryGroup.memberCount synchronization with DirectoryMembership records', async () => {
      const groups = await prisma.directoryGroup.findMany({
        include: {
          memberships: true,
        },
      });

      expect(groups.length).toBeGreaterThan(0);
      for (const group of groups) {
        expect(group.memberCount).toBe(group.memberships.length);
      }
    });
  });

  describe('2. Hardware Asset Custody & Handover Invariants', () => {
    it('should have 0 assets with status IN_USE that have assignedToId null', async () => {
      const unassignedInUse = await prisma.asset.count({
        where: {
          status: 'IN_USE',
          assignedToId: null,
        },
      });
      expect(unassignedInUse).toBe(0);
    });

    it('every IN_USE asset must have an active DirectoryUser custodian and an active ASSIGNMENT handover record', async () => {
      const inUseAssets = await prisma.asset.findMany({
        where: { status: 'IN_USE' },
        include: {
          assignedTo: true,
          handoverRecords: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      expect(inUseAssets.length).toBeGreaterThan(0);

      for (const asset of inUseAssets) {
        expect(asset.assignedToId).not.toBeNull();
        expect(asset.assignedTo).not.toBeNull();
        expect(asset.assignedTo?.status).toBe('ACTIVE');

        // Handover records validation: must have at least one ASSIGNMENT record
        const assignmentRecords = asset.handoverRecords.filter((r) => r.type === 'ASSIGNMENT');
        expect(assignmentRecords.length).toBeGreaterThanOrEqual(1);

        const latestRecord = asset.handoverRecords[0];
        if (latestRecord) {
          expect(asset.hasPendingRecord).toBe(latestRecord.isPending);
        }
      }
    });

    it('every non-in-use asset (AVAILABLE, MAINTENANCE, RETIRED, LOST) must have assignedToId null and hasPendingRecord false', async () => {
      const nonInUseAssets = await prisma.asset.findMany({
        where: {
          status: {
            in: ['AVAILABLE', 'MAINTENANCE', 'RETIRED', 'LOST'],
          },
        },
      });

      expect(nonInUseAssets.length).toBeGreaterThan(0);
      for (const asset of nonInUseAssets) {
        expect(asset.assignedToId).toBeNull();
        expect(asset.hasPendingRecord).toBe(false);
      }
    });

    it('every physical asset must reference a valid DeviceModel catalog entry', async () => {
      const assets = await prisma.asset.findMany({
        select: {
          id: true,
          assetTag: true,
          deviceModelId: true,
          deviceModel: {
            select: { id: true, name: true, vendorId: true },
          },
        },
      });

      expect(assets.length).toBeGreaterThan(0);
      for (const asset of assets) {
        expect(asset.deviceModelId).not.toBeNull();
        expect(asset.deviceModel).not.toBeNull();
        expect(asset.deviceModel.vendorId).not.toBeNull();
      }
    });
  });

  describe('3. Network Switch Hardware Linkage & Port Topology', () => {
    it('should have 0 network switches with assetId null (all 16 switches bound to valid Asset)', async () => {
      const switchesWithoutAsset = await prisma.networkSwitch.count({
        where: { assetId: null, name: { not: { startsWith: 'TEST-' } } },
      });
      expect(switchesWithoutAsset).toBe(0);

      const totalSwitches = await prisma.networkSwitch.count({
        where: { name: { not: { startsWith: 'TEST-' } } },
      });
      expect(totalSwitches).toBe(16);
    });

    it('every switch assetId must reference an Asset whose model matches the switch model', async () => {
      const switches = await prisma.networkSwitch.findMany({
        where: { name: { not: { startsWith: 'TEST-' } } },
        include: {
          asset: {
            include: {
              deviceModel: true,
            },
          },
        },
      });

      expect(switches.length).toBe(16);

      const modelKeywords = ['9500', '9300', '6200', '9200', '3850', '2528', 'compact'];

      for (const sw of switches) {
        expect(sw.assetId).not.toBeNull();
        expect(sw.asset).not.toBeNull();
        expect(sw.asset?.deviceModel).not.toBeNull();

        // Assert manufacturer and vendor correspondence
        expect(sw.vendor).toBe(sw.asset?.deviceModel.manufacturer);

        const switchModel = sw.model.toLowerCase();
        const assetModelName = sw.asset?.deviceModel.name.toLowerCase() || '';

        // Check model series or vendor correspondence
        const isModelOrVendorAligned =
          modelKeywords.some((k) => switchModel.includes(k) && assetModelName.includes(k)) ||
          (sw.vendor === 'Aruba Networks' && assetModelName.includes('aruba'));

        expect(isModelOrVendorAligned).toBe(true);
      }
    });

    it('symmetrical inter-switch trunk links must be bidirectional and consistent', async () => {
      const trunkPorts = await prisma.switchPort.findMany({
        where: {
          connectedSwitchId: { not: null },
          connectedPortId: { not: null },
        },
      });

      expect(trunkPorts.length).toBeGreaterThan(0);
      expect(trunkPorts.length % 2).toBe(0); // Symmetrical pairs

      for (const sourcePort of trunkPorts) {
        const targetPort = await prisma.switchPort.findUnique({
          where: { id: sourcePort.connectedPortId! },
        });

        expect(targetPort).not.toBeNull();
        expect(targetPort?.switchId).toBe(sourcePort.connectedSwitchId);
        expect(targetPort?.connectedSwitchId).toBe(sourcePort.switchId);
        expect(targetPort?.connectedPortId).toBe(sourcePort.id);
      }
    });
  });

  describe('4. Software License Seats Invariants', () => {
    it('for all licenses totalSeats must be greater than or equal to count of assignments', async () => {
      const licenses = await prisma.license.findMany({
        include: {
          assignments: true,
        },
      });

      expect(licenses.length).toBeGreaterThan(0);

      for (const lic of licenses) {
        expect(lic.totalSeats).toBeGreaterThanOrEqual(lic.assignments.length);
        expect(lic.usedSeats).toBe(lic.assignments.length);
      }
    });

    it('specifically verifies lic-jetbrains has totalSeats == 10 and 9 assignments', async () => {
      const jetbrains = await prisma.license.findUnique({
        where: { id: 'lic-jetbrains' },
        include: { assignments: true },
      });

      expect(jetbrains).not.toBeNull();
      expect(jetbrains?.totalSeats).toBe(10);
      expect(jetbrains?.assignments.length).toBe(9);
      expect(jetbrains?.usedSeats).toBe(9);
      expect(jetbrains?.totalSeats).toBeGreaterThanOrEqual(jetbrains!.assignments.length);
    });

    it('every license assignment must reference an active DirectoryUser custodian', async () => {
      const assignments = await prisma.licenseAssignment.findMany({
        include: {
          user: true,
        },
      });

      expect(assignments.length).toBeGreaterThan(0);
      for (const assign of assignments) {
        expect(assign.user).not.toBeNull();
        expect(assign.user?.status).toBe('ACTIVE');
      }
    });
  });

  describe('5. CanvasNodePosition Node Types and Coordinate Integrity', () => {
    it('distinct CanvasNodePosition.nodeType values must be strictly within [ENDPOINT, RACK, SWITCH]', async () => {
      const nodeTypes = await prisma.canvasNodePosition.findMany({
        select: { nodeType: true },
        distinct: ['nodeType'],
      });

      const allowedTypes: Array<TopologyNodeType> = [
        TopologyNodeType.ENDPOINT,
        TopologyNodeType.RACK,
        TopologyNodeType.SWITCH,
      ];

      for (const record of nodeTypes) {
        expect(allowedTypes).toContain(record.nodeType);
      }
    });

    it('coordinates across ALL, NETWORK, and CCTV perspectives maintain vertical tier separation and horizontal pitch >= 220px', async () => {
      const positions = await prisma.canvasNodePosition.findMany();
      expect(positions.length).toBeGreaterThanOrEqual(90);

      const viewModes = ['ALL', 'NETWORK', 'CCTV'] as const;

      for (const viewMode of viewModes) {
        const modePositions = positions.filter((p) => p.viewMode === viewMode);
        expect(modePositions.length).toBeGreaterThan(0);

        // Group by y coordinate
        const byY = new Map<number, typeof modePositions>();
        for (const pos of modePositions) {
          const list = byY.get(pos.y) || [];
          list.push(pos);
          byY.set(pos.y, list);
        }

        // Verify that switches are at hierarchical tier levels (Core/Dist/Access/CCTV)
        const switchPositions = modePositions.filter((p) => p.nodeType === TopologyNodeType.SWITCH);
        for (const swPos of switchPositions) {
          expect([100, 265, 280, 295, 350, 460, 600, 660, 800]).toContain(swPos.y);
        }

        // Verify that endpoints are at endpoint tier levels (NVR/Servers/APs/Cameras)
        const endpointPositions = modePositions.filter(
          (p) => p.nodeType === TopologyNodeType.ENDPOINT,
        );
        for (const endPos of endpointPositions) {
          expect([460, 600, 660, 800, 850, 1050, 1100]).toContain(endPos.y);
        }

        // Check horizontal pitch and zero-overlap within each y level
        for (const [yLevel, nodes] of byY.entries()) {
          if (nodes.length <= 1) continue;

          // Sort horizontally by x
          const sorted = [...nodes].sort((a, b) => a.x - b.x);

          for (let i = 0; i < sorted.length - 1; i++) {
            const current = sorted[i];
            const next = sorted[i + 1];
            const horizontalPitch = next.x - current.x;

            // Zero overlap assertion: pitch must be positive
            expect(horizontalPitch).toBeGreaterThan(0);

            // Spacing assertion: pitch must be >= 220px to prevent card collision
            expect(horizontalPitch).toBeGreaterThanOrEqual(220);
          }
        }
      }
    });
  });
});
