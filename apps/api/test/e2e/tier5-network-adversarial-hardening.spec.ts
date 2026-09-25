import * as dotenv from 'dotenv';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PortAdminStatus,
  PortFormFactor,
  PortMode,
  PortOperStatus,
  PrismaClient,
  RackStatus,
  SwitchRole,
  SwitchStatus,
} from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../src/database/prisma.service';
import { NetworkService } from '../../src/modules/network/network.service';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Tier 5 Adversarial Coverage Hardening — Network Modernization Suite', () => {
  let prisma: PrismaService;
  let service: NetworkService;
  let isDbAvailable = false;

  // Dedicated test fixtures to prevent collision with seeded production records
  const RACK_CODE_PRIMARY = 'RACK-TIER5-01';
  const RACK_CODE_SECONDARY = 'RACK-TIER5-02';
  const RACK_CODE_SHRINK = 'RACK-TIER5-SHRINK';
  const SWITCH_SN_A = 'TIER5-SN-ALPHA-01';
  const SWITCH_SN_B = 'TIER5-SN-BETA-02';
  const SWITCH_SN_C = 'TIER5-SN-GAMMA-03';
  const SWITCH_SN_D = 'TIER5-SN-DELTA-04';

  let primaryRackId: string;
  let secondaryRackId: string;

  beforeAll(async () => {
    try {
      prisma = new PrismaService();
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
      service = new NetworkService(prisma);

      // Clean up any residual test records from prior runs
      await cleanupResiduals();

      // Seed baseline test racks
      const r1 = await service.createRack({
        name: 'Tier 5 Primary Datacenter Rack',
        code: RACK_CODE_PRIMARY,
        totalHeight: 42,
        maxPowerKw: 10.0,
        maxWeightKg: 1000,
        status: 'ACTIVE',
      });
      primaryRackId = r1.id;

      const r2 = await service.createRack({
        name: 'Tier 5 Secondary 24U IDF Rack',
        code: RACK_CODE_SECONDARY,
        totalHeight: 24,
        maxPowerKw: 5.0,
        maxWeightKg: 500,
        status: 'ACTIVE',
      });
      secondaryRackId = r2.id;
    } catch (err: unknown) {
      isDbAvailable = false;
      console.warn('PostgreSQL database not available for Tier 5 tests:', err);
    }
  });

  afterAll(async () => {
    if (isDbAvailable && prisma) {
      await cleanupResiduals();
      await prisma.$disconnect();
    }
  });

  async function cleanupResiduals(): Promise<void> {
    try {
      // Find test racks
      const testRacks = await prisma.networkRack.findMany({
        where: {
          code: { in: [RACK_CODE_PRIMARY, RACK_CODE_SECONDARY, RACK_CODE_SHRINK] },
        },
        select: { id: true },
      });
      const rackIds = testRacks.map((r) => r.id);

      // Find test switches
      const testSwitches = await prisma.networkSwitch.findMany({
        where: {
          OR: [
            { serialNumber: { in: [SWITCH_SN_A, SWITCH_SN_B, SWITCH_SN_C, SWITCH_SN_D] } },
            { rackId: { in: rackIds } },
            { name: { startsWith: 'Tier5-' } },
          ],
        },
        select: { id: true },
      });
      const switchIds = testSwitches.map((s) => s.id);

      if (switchIds.length > 0) {
        await prisma.switchPort.deleteMany({
          where: { switchId: { in: switchIds } },
        });
        await prisma.networkSwitch.deleteMany({
          where: { id: { in: switchIds } },
        });
      }

      if (rackIds.length > 0) {
        await prisma.networkRack.deleteMany({
          where: { id: { in: rackIds } },
        });
      }
    } catch (_ignore: unknown) {
      // Best-effort cleanup
    }
  }

  // ==========================================================================
  // AREA 1: MULTI-DEVICE RACK SLOTTING COLLISION BOUNDARIES
  // ==========================================================================

  describe('Area 1: Multi-Device Rack Slotting Collision Boundaries', () => {
    it('1.1 mounts multi-device layout with exact boundary adjacencies without false collisions', async () => {
      if (!isDbAvailable) return;

      // Mount Device 1: 4U Core Switch at U1..U4
      const dev1 = await service.createSwitch({
        name: 'Tier5-Core-4U',
        model: 'Nexus-9504',
        vendor: 'Cisco',
        serialNumber: SWITCH_SN_A,
        totalPorts: 48,
        rackId: primaryRackId,
        rackPosition: 1,
        rackHeight: 4,
        autoGeneratePorts: false,
      });
      expect(dev1.rackPosition).toBe(1);
      expect(dev1.rackHeight).toBe(4);

      // Mount Device 2: 1U Distribution Switch at U5 (immediately adjacent above Dev 1)
      const dev2 = await service.createSwitch({
        name: 'Tier5-Dist-1U',
        model: 'Catalyst-9300',
        vendor: 'Cisco',
        serialNumber: SWITCH_SN_B,
        totalPorts: 24,
        rackId: primaryRackId,
        rackPosition: 5,
        rackHeight: 1,
        autoGeneratePorts: false,
      });
      expect(dev2.rackPosition).toBe(5);

      // Mount Device 3: 2U SAN Switch at U6..U7 (immediately adjacent above Dev 2)
      const dev3 = await service.createSwitch({
        name: 'Tier5-SAN-2U',
        model: 'MDS-9148T',
        vendor: 'Cisco',
        serialNumber: SWITCH_SN_C,
        totalPorts: 24,
        rackId: primaryRackId,
        rackPosition: 6,
        rackHeight: 2,
        autoGeneratePorts: false,
      });
      expect(dev3.rackPosition).toBe(6);

      // Mount Device 4: 2U Top-of-Rack Switch at top slot U41..U42
      const dev4 = await service.createSwitch({
        name: 'Tier5-ToR-2U',
        model: 'QFX5120',
        vendor: 'Juniper',
        serialNumber: SWITCH_SN_D,
        totalPorts: 24,
        rackId: primaryRackId,
        rackPosition: 41,
        rackHeight: 2,
        autoGeneratePorts: false,
      });
      expect(dev4.rackPosition).toBe(41);
      expect(dev4.rackHeight).toBe(2);
    });

    it('1.2 rejects slotting at rack rail underflow (U0 or negative units)', async () => {
      if (!isDbAvailable) return;

      await expect(
        service.createSwitch({
          name: 'Tier5-Underflow-U0',
          model: 'EdgeSwitch-24',
          vendor: 'Ubiquiti',
          totalPorts: 24,
          rackId: primaryRackId,
          rackPosition: 0,
          rackHeight: 1,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createSwitch({
          name: 'Tier5-Underflow-Negative',
          model: 'EdgeSwitch-24',
          vendor: 'Ubiquiti',
          totalPorts: 24,
          rackId: primaryRackId,
          rackPosition: -5,
          rackHeight: 1,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.3 rejects slotting beyond total rack height (overflow U43+ in 42U rack)', async () => {
      if (!isDbAvailable) return;

      // 1U device at U43 in 42U rack
      await expect(
        service.createSwitch({
          name: 'Tier5-Overflow-U43',
          model: 'EdgeSwitch-24',
          vendor: 'Ubiquiti',
          totalPorts: 24,
          rackId: primaryRackId,
          rackPosition: 43,
          rackHeight: 1,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(BadRequestException);

      // 2U device at U42 in 42U rack (spans U42-U43)
      await expect(
        service.createSwitch({
          name: 'Tier5-Overflow-U42-2U',
          model: 'EdgeSwitch-24',
          vendor: 'Ubiquiti',
          totalPorts: 24,
          rackId: primaryRackId,
          rackPosition: 42,
          rackHeight: 2,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1.4 rejects multi-device collisions on partial lower, exact, and partial upper overlaps', async () => {
      if (!isDbAvailable) return;

      // Device 1 is at U1..U4, Device 2 is at U5..U5, Device 3 is at U6..U7, Device 4 is at U41..U42

      // Collision 1: Partial overlap with Dev 1 upper edge (mount at U4..U5, overlapping U4)
      await expect(
        service.createSwitch({
          name: 'Tier5-Overlap-U4',
          model: 'OS6450',
          vendor: 'Alcatel-Lucent',
          totalPorts: 24,
          rackId: primaryRackId,
          rackPosition: 4,
          rackHeight: 2,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(/RU collision.*occupied/);

      // Collision 2: Exact overlap with Dev 2 (mount at U5..U5)
      await expect(
        service.createSwitch({
          name: 'Tier5-Exact-U5',
          model: 'OS6450',
          vendor: 'Alcatel-Lucent',
          totalPorts: 24,
          rackId: primaryRackId,
          rackPosition: 5,
          rackHeight: 1,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(/RU collision.*occupied/);

      // Collision 3: Enclosing overlap over Dev 2 (mount 3U at U4..U6, enclosing U5)
      await expect(
        service.createSwitch({
          name: 'Tier5-Enclosing-U4-U6',
          model: 'OS6450',
          vendor: 'Alcatel-Lucent',
          totalPorts: 24,
          rackId: primaryRackId,
          rackPosition: 4,
          rackHeight: 3,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(/RU collision.*occupied/);

      // Collision 4: Overlap with Dev 4 at U41..U42 (mount 2U at U40..U41)
      await expect(
        service.createSwitch({
          name: 'Tier5-Overlap-U40-U41',
          model: 'OS6450',
          vendor: 'Alcatel-Lucent',
          totalPorts: 24,
          rackId: primaryRackId,
          rackPosition: 40,
          rackHeight: 2,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(/RU collision.*occupied/);
    });

    it('1.5 permits safe update of switch position without self-collision', async () => {
      if (!isDbAvailable) return;

      const sw = await prisma.networkSwitch.findUniqueOrThrow({
        where: { serialNumber: SWITCH_SN_B }, // Dev 2 at U5
      });

      // Updating Dev 2 at its current position U5 must not trigger false collision against itself
      const updatedSame = await service.updateSwitch(sw.id, {
        name: 'Tier5-Dist-1U-Renamed',
        rackPosition: 5,
        rackHeight: 1,
      });
      expect(updatedSame.name).toBe('Tier5-Dist-1U-Renamed');
      expect(updatedSame.rackPosition).toBe(5);

      // Moving Dev 2 to available slot U10 must succeed
      const moved = await service.updateSwitch(sw.id, {
        rackPosition: 10,
        rackHeight: 1,
      });
      expect(moved.rackPosition).toBe(10);

      // Now attempt moving Dev 2 onto occupied slot U1 (Dev 1 U1..U4) - must be rejected
      await expect(
        service.updateSwitch(sw.id, {
          rackPosition: 2,
          rackHeight: 1,
        }),
      ).rejects.toThrow(/RU collision.*occupied/);

      // Restore Dev 2 back to U5
      await service.updateSwitch(sw.id, {
        rackPosition: 5,
        rackHeight: 1,
      });
    });

    it('1.6 empirical challenge: shrinking rack totalHeight with mounted devices (Shrink Attack)', async () => {
      if (!isDbAvailable) return;

      // Create a 42U rack and mount a switch at U38
      const shrinkRack = await service.createRack({
        name: 'Tier 5 Shrink Test Rack',
        code: RACK_CODE_SHRINK,
        totalHeight: 42,
        status: 'ACTIVE',
      });

      const highSwitch = await service.createSwitch({
        name: 'Tier5-High-Switch-U38',
        model: 'Catalyst-3850',
        vendor: 'Cisco',
        rackId: shrinkRack.id,
        rackPosition: 38,
        rackHeight: 1,
        autoGeneratePorts: false,
      });
      expect(highSwitch.rackPosition).toBe(38);

      // Now update the rack totalHeight to 24U (shorter than mounted switch U38)
      // EMPIRICAL TEST: Check that updateRack rejects shrinking below mounted switches
      try {
        await expect(
          service.updateRack(shrinkRack.id, {
            totalHeight: 24,
          }),
        ).rejects.toThrow(BadRequestException);
      } finally {
        // Cleanup
        await service.deleteSwitch(highSwitch.id);
        await service.deleteRack(shrinkRack.id);
      }
    });
  });

  // ==========================================================================
  // AREA 2: RAPID PORT LINK STATE TRANSITIONS AND FLAPPING
  // ==========================================================================

  describe('Area 2: Rapid Port Link State Transitions and Flapping', () => {
    let testPortId: string;
    let testSwitchId: string;

    beforeAll(async () => {
      if (!isDbAvailable) return;
      const sw = await prisma.networkSwitch.findUniqueOrThrow({
        where: { serialNumber: SWITCH_SN_A },
      });
      testSwitchId = sw.id;

      // Create a dedicated test port
      const port = await service.createPort(testSwitchId, {
        portNumber: 99,
        name: 'Gi1/0/99',
        formFactor: 'RJ45_1G',
        poeEnabled: true,
        adminStatus: 'UP',
        operStatus: 'DOWN',
        speed: '1 Gbps',
        duplex: 'Full',
        mode: 'ACCESS',
        description: 'Tier 5 Stress Flapping Port',
      });
      testPortId = port.id;
    });

    afterAll(async () => {
      if (isDbAvailable && testPortId) {
        try {
          await service.deletePort(testPortId);
        } catch (_ignore: unknown) {}
      }
    });

    it('2.1 executes rapid sequential link flapping across all 4 operational states without data corruption', async () => {
      if (!isDbAvailable) return;

      const stateSequence: PortOperStatus[] = [
        'ACTIVE',
        'DOWN',
        'CONNECTED_NO_SIGNAL',
        'ACTIVE',
        'RESERVED',
        'DOWN',
        'CONNECTED_NO_SIGNAL',
        'ACTIVE',
        'DOWN',
      ];

      for (const targetStatus of stateSequence) {
        const updated = await service.updatePort(testPortId, {
          operStatus: targetStatus,
        });
        expect(updated.operStatus).toBe(targetStatus);
      }

      // Verify final persisted state in PostgreSQL
      const persisted = await service.findPort(testPortId);
      expect(persisted.operStatus).toBe('DOWN');
      expect(persisted.adminStatus).toBe('UP');
    });

    it('2.2 enforces adminStatus DOWN override invariant when adminStatus is set to DOWN', async () => {
      if (!isDbAvailable) return;

      // Set adminStatus = DOWN while attempting to pass operStatus = ACTIVE
      const updated = await service.updatePort(testPortId, {
        adminStatus: 'DOWN',
        operStatus: 'ACTIVE',
      });

      // INVARIANT: When adminStatus is DOWN, operStatus MUST evaluate to DOWN
      expect(updated.adminStatus).toBe('DOWN');
      expect(updated.operStatus).toBe('DOWN');

      // Verify in DB directly
      const dbPort = await prisma.switchPort.findUniqueOrThrow({
        where: { id: testPortId },
      });
      expect(dbPort.adminStatus).toBe('DOWN');
      expect(dbPort.operStatus).toBe('DOWN');

      // Restore adminStatus to UP
      await service.updatePort(testPortId, {
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
      });
    });

    it('2.3 executes concurrent port updates stress test without database deadlocks', async () => {
      if (!isDbAvailable) return;

      // Spawn 15 concurrent updates on the port with alternating telemetry speeds and descriptions
      const updatePromises = Array.from({ length: 15 }, (_, i) =>
        service.updatePort(testPortId, {
          description: `Flap-Stress-Iter-${i}`,
          speed: i % 2 === 0 ? '1 Gbps' : '100 Mbps',
          operStatus: i % 3 === 0 ? 'ACTIVE' : i % 3 === 1 ? 'DOWN' : 'CONNECTED_NO_SIGNAL',
        }),
      );

      const results = await Promise.allSettled(updatePromises);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      expect(fulfilled.length).toBe(15);

      // Verify final port is queryable and healthy
      const finalPort = await service.findPort(testPortId);
      expect(finalPort.id).toBe(testPortId);
      expect(finalPort.description).toMatch(/^Flap-Stress-Iter-/);
    });

    it('2.4 handles 802.1Q trunk port VLAN tagging with empty, numeric, and boundary arrays', async () => {
      if (!isDbAvailable) return;

      // Mode cutover to TRUNK with tagged VLAN list
      const trunkPort = await service.updatePort(testPortId, {
        mode: 'TRUNK',
        taggedVlanIds: [10, 20, 30, 4094],
      });
      expect(trunkPort.mode).toBe('TRUNK');
      expect(trunkPort.taggedVlanIds).toEqual([10, 20, 30, 4094]);

      // Update to empty tagged array
      const emptyTrunk = await service.updatePort(testPortId, {
        taggedVlanIds: [],
      });
      expect(emptyTrunk.taggedVlanIds).toEqual([]);

      // Reset back to ACCESS mode
      const accessPort = await service.updatePort(testPortId, {
        mode: 'ACCESS',
        taggedVlanIds: null,
      });
      expect(accessPort.mode).toBe('ACCESS');
    });
  });

  // ==========================================================================
  // AREA 3: MALFORMED PAYLOADS, DATABASE CONSTRAINTS & REFERENTIAL INTEGRITY
  // ==========================================================================

  describe('Area 3: Malformed Payloads, Database Constraints & Referential Integrity', () => {
    it('3.1 rejects duplicate rack code collisions (case-insensitive and exact)', async () => {
      if (!isDbAvailable) return;

      // Exact collision
      await expect(
        service.createRack({
          name: 'Duplicate Rack Code',
          code: RACK_CODE_PRIMARY,
          totalHeight: 42,
        }),
      ).rejects.toThrow(/already exists/);

      // Case-insensitive collision in update
      await expect(
        service.updateRack(secondaryRackId, {
          code: RACK_CODE_PRIMARY.toLowerCase(),
        }),
      ).rejects.toThrow(/already exists/);
    });

    it('3.2 rejects duplicate switch serial number collisions in create and update', async () => {
      if (!isDbAvailable) return;

      // Attempt creating switch with existing serial number SWITCH_SN_A
      await expect(
        service.createSwitch({
          name: 'Duplicate SN Switch',
          model: 'Catalyst-9200',
          vendor: 'Cisco',
          serialNumber: SWITCH_SN_A,
          totalPorts: 24,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(/already exists/);

      // Attempt updating switch to existing serial number SWITCH_SN_A
      const swB = await prisma.networkSwitch.findUniqueOrThrow({
        where: { serialNumber: SWITCH_SN_B },
      });
      await expect(
        service.updateSwitch(swB.id, {
          serialNumber: SWITCH_SN_A,
        }),
      ).rejects.toThrow(/already exists/);
    });

    it('3.3 enforces database composite unique constraint on [switchId, portNumber]', async () => {
      if (!isDbAvailable) return;

      const sw = await prisma.networkSwitch.findUniqueOrThrow({
        where: { serialNumber: SWITCH_SN_A },
      });

      // Create port 88
      const port1 = await service.createPort(sw.id, {
        portNumber: 88,
        name: 'Gi1/0/88',
        formFactor: 'RJ45_1G',
      });

      try {
        // Attempting to create duplicate port 88 on same switch must fail P2002
        await expect(
          service.createPort(sw.id, {
            portNumber: 88,
            name: 'Gi1/0/88-Duplicate',
            formFactor: 'RJ45_1G',
          }),
        ).rejects.toThrow(); // Prisma P2002 Unique constraint failed
      } finally {
        await service.deletePort(port1.id);
      }
    });

    it('3.4 enforces foreign key integrity: rejects non-existent locationId, rackId, switchId', async () => {
      if (!isDbAvailable) return;

      const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

      // Create switch with non-existent rackId
      await expect(
        service.createSwitch({
          name: 'NonExistentRackSwitch',
          model: 'C9300',
          vendor: 'Cisco',
          rackId: FAKE_UUID,
          rackPosition: 1,
          autoGeneratePorts: false,
        }),
      ).rejects.toThrow(NotFoundException);

      // Create port on non-existent switchId
      await expect(
        service.createPort(FAKE_UUID, {
          portNumber: 1,
          name: 'Gi1/0/1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('3.5 verifies cascade deletion: deleting switch deletes all ports but preserves rack', async () => {
      if (!isDbAvailable) return;

      // Create temporary switch with 4 ports
      const tempSw = await service.createSwitch({
        name: 'Tier5-Temp-Cascade-Switch',
        model: 'EX2300',
        vendor: 'Juniper',
        serialNumber: 'TEMP-CASCADE-SN-01',
        totalPorts: 4,
        rackId: secondaryRackId,
        rackPosition: 1,
        rackHeight: 1,
        autoGeneratePorts: false,
      });

      // Add 2 ports
      await service.createPort(tempSw.id, { portNumber: 1, name: 'ge-0/0/0' });
      await service.createPort(tempSw.id, { portNumber: 2, name: 'ge-0/0/1' });

      const beforePorts = await prisma.switchPort.count({
        where: { switchId: tempSw.id },
      });
      expect(beforePorts).toBe(2);

      // Delete switch
      await service.deleteSwitch(tempSw.id);

      // Ports must be cascade deleted
      const afterPorts = await prisma.switchPort.count({
        where: { switchId: tempSw.id },
      });
      expect(afterPorts).toBe(0);

      // Parent rack must NOT be deleted
      const rackStillExists = await prisma.networkRack.findUnique({
        where: { id: secondaryRackId },
      });
      expect(rackStillExists).not.toBeNull();
    });

    it('3.6 verifies SetNull referential behavior: deleting rack unmounts switches without deleting them', async () => {
      if (!isDbAvailable) return;

      // Create temporary rack
      const tempRack = await service.createRack({
        name: 'Tier5-Temp-SetNull-Rack',
        code: 'RACK-TIER5-TEMP-SETNULL',
        totalHeight: 24,
      });

      // Create switch mounted in this rack
      const mountedSw = await service.createSwitch({
        name: 'Tier5-Mounted-To-Temp-Rack',
        model: 'Aruba-2930F',
        vendor: 'Aruba',
        serialNumber: 'TEMP-SETNULL-SN-02',
        rackId: tempRack.id,
        rackPosition: 5,
        rackHeight: 1,
        autoGeneratePorts: false,
      });

      expect(mountedSw.rackId).toBe(tempRack.id);
      expect(mountedSw.rackPosition).toBe(5);

      // Delete the rack
      await service.deleteRack(tempRack.id);

      // Switch must still exist, with rackId = null and rackPosition = null
      const switchAfterRackDelete = await service.findSwitch(mountedSw.id);
      expect(switchAfterRackDelete).not.toBeNull();
      expect(switchAfterRackDelete.rackId).toBeNull();
      expect(switchAfterRackDelete.rackPosition).toBeNull();

      // Clean up the switch
      await service.deleteSwitch(mountedSw.id);
    });

    it('3.7 safely handles malicious search queries and extreme pagination parameters', async () => {
      if (!isDbAvailable) return;

      // SQL Injection payload
      const sqliResult = await service.findAllRacks({
        search: '\'; DROP TABLE "NetworkRack"; --',
      });
      expect(Array.isArray(sqliResult)).toBe(true);

      // XSS payload in switch search
      const xssResult = await service.findAllSwitches({
        search: '<script>alert("xss")</script>',
      });
      expect(Array.isArray(xssResult)).toBe(true);

      // Extreme pagination bounds (pageSize > 100 capped to 100, page < 1 bounded to 1)
      const boundedRacks = await service.findAllRacks({
        pageSize: 99999,
        page: -5,
      });
      expect(boundedRacks.length).toBeLessThanOrEqual(100);
    });
  });

  // ==========================================================================
  // AREA 4: UNHANDLED EDGE CASES IN 2D ELEVATION GRID COMPUTATION
  // ==========================================================================

  describe('Area 4: Unhandled Edge Cases in 2D Elevation Grid Computation', () => {
    it('4.1 calculates elevation for empty rack without NaN or division by zero', async () => {
      if (!isDbAvailable) return;

      const elevation = await service.getRackElevation(secondaryRackId);
      expect(elevation.totalHeight).toBe(24);
      expect(elevation.slots.length).toBe(24);
      expect(elevation.slots.every((s) => !s.isOccupied)).toBe(true);
      expect(elevation.occupiedUnits).toBe(0);
      expect(elevation.availableUnits).toBe(24);
      expect(elevation.spaceUtilizationPercent).toBe(0);
      expect(elevation.totalPowerDrawKw).toBe(0);
      expect(elevation.powerUtilizationPercent).toBe(0);
      expect(elevation.totalWeightKg).toBe(0);
      expect(elevation.weightUtilizationPercent).toBe(0);
    });

    it('4.2 preserves 2D slotting invariants on multi-U devices (1U, 2U, 4U)', async () => {
      if (!isDbAvailable) return;

      const elevation = await service.getRackElevation(primaryRackId);
      expect(elevation.totalHeight).toBe(42);
      expect(elevation.slots.length).toBe(42);

      // Device 1: 4U switch at U1..U4
      const slot1 = elevation.slots.find((s) => s.unitNumber === 1);
      const slot2 = elevation.slots.find((s) => s.unitNumber === 2);
      const slot3 = elevation.slots.find((s) => s.unitNumber === 3);
      const slot4 = elevation.slots.find((s) => s.unitNumber === 4);

      expect(slot1).toBeDefined();
      expect(slot1?.isOccupied).toBe(true);
      expect(slot1?.isStartingUnit).toBe(true);
      expect(slot1?.switch?.startUnit).toBe(1);
      expect(slot1?.switch?.unitHeight).toBe(4);

      expect(slot2?.isOccupied).toBe(true);
      expect(slot2?.isStartingUnit).toBe(false);
      expect(slot2?.occupiedByUnit).toBe(1);

      expect(slot3?.isOccupied).toBe(true);
      expect(slot3?.isStartingUnit).toBe(false);
      expect(slot3?.occupiedByUnit).toBe(1);

      expect(slot4?.isOccupied).toBe(true);
      expect(slot4?.isStartingUnit).toBe(false);
      expect(slot4?.occupiedByUnit).toBe(1);

      // Device 2: 1U switch at U5
      const slot5 = elevation.slots.find((s) => s.unitNumber === 5);
      expect(slot5?.isOccupied).toBe(true);
      expect(slot5?.isStartingUnit).toBe(true);
      expect(slot5?.switch?.startUnit).toBe(5);
      expect(slot5?.switch?.unitHeight).toBe(1);

      // Device 3: 2U switch at U6..U7
      const slot6 = elevation.slots.find((s) => s.unitNumber === 6);
      const slot7 = elevation.slots.find((s) => s.unitNumber === 7);
      expect(slot6?.isOccupied).toBe(true);
      expect(slot6?.isStartingUnit).toBe(true);
      expect(slot7?.isOccupied).toBe(true);
      expect(slot7?.isStartingUnit).toBe(false);
      expect(slot7?.occupiedByUnit).toBe(6);

      // Unoccupied slots U8..U40
      const slot8 = elevation.slots.find((s) => s.unitNumber === 8);
      expect(slot8?.isOccupied).toBe(false);
      expect(slot8?.switch).toBeNull();
      expect(slot8?.occupiedByUnit).toBeNull();

      // Device 4: 2U switch at U41..U42
      const slot41 = elevation.slots.find((s) => s.unitNumber === 41);
      const slot42 = elevation.slots.find((s) => s.unitNumber === 42);
      expect(slot41?.isOccupied).toBe(true);
      expect(slot41?.isStartingUnit).toBe(true);
      expect(slot42?.isOccupied).toBe(true);
      expect(slot42?.isStartingUnit).toBe(false);
      expect(slot42?.occupiedByUnit).toBe(41);

      // Total occupied units: Dev1 (4) + Dev2 (1) + Dev3 (2) + Dev4 (2) = 9 units
      expect(elevation.occupiedUnits).toBe(9);
      expect(elevation.availableUnits).toBe(33);
      expect(elevation.spaceUtilizationPercent).toBeCloseTo((9 / 42) * 100, 1);
    });

    it('4.3 calculates power and weight telemetry metrics accurately', async () => {
      if (!isDbAvailable) return;

      const elevation = await service.getRackElevation(primaryRackId);

      // 4 switches mounted * 350W = 1400W = 1.4 kW
      expect(elevation.totalPowerDrawKw).toBe(1.4);
      // maxPowerKw is 10.0 kW -> (1.4 / 10.0) * 100 = 14.0%
      expect(elevation.powerUtilizationPercent).toBe(14.0);

      // 4 switches mounted * 8.5 kg = 34.0 kg
      expect(elevation.totalWeightKg).toBe(34.0);
      // maxWeightKg is 1000 kg -> (34.0 / 1000) * 100 = 3.4%
      expect(elevation.weightUtilizationPercent).toBe(3.4);
    });

    it('4.4 supports 12U, 24U, 42U, and 48U rack sizes dynamically with exact slot count', async () => {
      if (!isDbAvailable) return;

      const rackSizes = [12, 24, 42, 48];
      for (const size of rackSizes) {
        const temp = await service.createRack({
          name: `Tier5-Size-${size}U-Rack`,
          code: `RACK-TIER5-SIZE-${size}U`,
          totalHeight: size,
        });

        const elev = await service.getRackElevation(temp.id);
        expect(elev.totalHeight).toBe(size);
        expect(elev.slots.length).toBe(size);
        expect(elev.slots[0].unitNumber).toBe(1);
        expect(elev.slots[size - 1].unitNumber).toBe(size);

        await service.deleteRack(temp.id);
      }
    });

    it('4.5 handles null or zero maxPowerKw and maxWeightKg gracefully without NaN', async () => {
      if (!isDbAvailable) return;

      const zeroCapRack = await service.createRack({
        name: 'Tier5-Zero-Capacity-Rack',
        code: 'RACK-TIER5-ZERO-CAP',
        totalHeight: 42,
        maxPowerKw: 0,
        maxWeightKg: 0,
      });

      const elev = await service.getRackElevation(zeroCapRack.id);
      expect(elev.powerUtilizationPercent).toBe(0);
      expect(elev.weightUtilizationPercent).toBe(0);
      expect(Number.isNaN(elev.powerUtilizationPercent)).toBe(false);
      expect(Number.isNaN(elev.weightUtilizationPercent)).toBe(false);

      await service.deleteRack(zeroCapRack.id);
    });
  });
});
