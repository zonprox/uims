import * as dotenv from 'dotenv';
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  type NetworkRack,
  type NetworkStatsDto,
  type NetworkSwitch,
  PortAdminStatus,
  PortFormFactor,
  PortMode,
  PortOperStatus,
  type RackElevationData,
  type RackElevationSlot,
  RackStatus,
  SwitchRole,
  SwitchStatus,
} from '@uims/shared-types';
import {
  createRackSchema,
  createSwitchPortSchema,
  createSwitchSchema,
  macRegex,
  rackQuerySchema,
  switchPortQuerySchema,
  switchQuerySchema,
} from '@uims/shared-validators';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

describe('Milestone 1 Challenger 2 — Empirical Adversarial Stress & Verification Suite', () => {
  let prisma: PrismaClient;
  let isDbAvailable = false;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';
    try {
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      });
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;
    } catch {
      isDbAvailable = false;
    }
  });

  afterAll(async () => {
    if (isDbAvailable && prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore
      }
    }
  });

  // =========================================================================
  // SECTION 1: POSTGRESQL DATABASE INDEX COVERAGE & INTEGRITY VERIFICATION
  // =========================================================================
  describe('Mission 1: Database Index Coverage & Relational Integrity Verification', () => {
    interface PgIndexRow {
      tablename: string;
      indexname: string;
      indexdef: string;
    }

    it('1.1 should verify all foreign key columns on NetworkRack, NetworkSwitch, SwitchPort have explicit B-tree indexes in pg_indexes', async () => {
      if (!isDbAvailable) return;

      const rows = await prisma.$queryRaw<Array<PgIndexRow>>`
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename IN ('NetworkRack', 'NetworkSwitch', 'SwitchPort')
        ORDER BY tablename, indexname;
      `;

      expect(rows.length).toBeGreaterThanOrEqual(15);

      const indexesByTable: Record<string, Array<string>> = {};
      for (const row of rows) {
        if (!indexesByTable[row.tablename]) {
          indexesByTable[row.tablename] = [];
        }
        indexesByTable[row.tablename].push(row.indexname);
      }

      // 1. NetworkRack indexes
      expect(indexesByTable.NetworkRack).toContain('NetworkRack_code_idx');

      // 2. NetworkSwitch foreign keys: rackId, assetId, ipAddressId
      expect(indexesByTable.NetworkSwitch).toContain('NetworkSwitch_rackId_idx');
      expect(indexesByTable.NetworkSwitch).toContain('NetworkSwitch_assetId_idx');
      expect(indexesByTable.NetworkSwitch).toContain('NetworkSwitch_ipAddressId_idx');

      // 3. SwitchPort foreign keys: switchId, vlanId, ipAddressId, connectedAssetId
      expect(indexesByTable.SwitchPort).toContain('SwitchPort_switchId_idx');
      expect(indexesByTable.SwitchPort).toContain('SwitchPort_vlanId_idx');
      expect(indexesByTable.SwitchPort).toContain('SwitchPort_ipAddressId_idx');
      expect(indexesByTable.SwitchPort).toContain('SwitchPort_connectedAssetId_idx');
    });

    it('1.2 should verify uniqueness indexes for code, serialNumber, assetId, and (switchId, portNumber)', async () => {
      if (!isDbAvailable) return;

      const rows = await prisma.$queryRaw<Array<PgIndexRow>>`
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE tablename IN ('NetworkRack', 'NetworkSwitch', 'SwitchPort')
          AND indexdef LIKE 'CREATE UNIQUE INDEX%'
        ORDER BY tablename, indexname;
      `;

      const uniqueIndexes = rows.map((r) => r.indexname);

      expect(uniqueIndexes).toContain('NetworkRack_code_key');
      expect(uniqueIndexes).toContain('NetworkSwitch_serialNumber_key');
      expect(uniqueIndexes).toContain('NetworkSwitch_assetId_key');
      expect(uniqueIndexes).toContain('SwitchPort_switchId_portNumber_key');
    });

    it('1.3 should verify query planner utilizes indexes on foreign key columns (EXPLAIN)', async () => {
      if (!isDbAvailable) return;

      // In PostgreSQL, on empty/tiny tables seqscan cost (1.2) is lower than index scan (2.3).
      // Disabling enable_seqscan verifies that the index is valid, recognized by Postgres, and usable by the optimizer.
      await prisma.$executeRawUnsafe('SET enable_seqscan = OFF;');
      try {
        const testUuid = '00000000-0000-0000-0000-000000000000';
        const explainRows = await prisma.$queryRaw<Array<{ 'QUERY PLAN': string }>>`
          EXPLAIN SELECT * FROM "SwitchPort" WHERE "switchId" = ${testUuid};
        `;

        const planText = explainRows.map((r) => r['QUERY PLAN']).join('\n');
        expect(planText).toMatch(/Index Scan|Bitmap Index Scan|Index/i);
      } finally {
        await prisma.$executeRawUnsafe('SET enable_seqscan = ON;');
      }
    });

    it('1.4 should enforce unique constraints against collision attacks in PostgreSQL', async () => {
      if (!isDbAvailable) return;

      const uniqueSuffix = `test-${Date.now()}`;
      const rackCode = `RACK-COLLISION-${uniqueSuffix}`;

      // Insert first rack
      const rack1 = await prisma.networkRack.create({
        data: {
          name: 'Collision Rack 1',
          code: rackCode,
          totalHeight: 42,
        },
      });

      // Attempt duplicate code insert -> must fail
      let collisionError: unknown;
      try {
        await prisma.networkRack.create({
          data: {
            name: 'Collision Rack 2',
            code: rackCode,
            totalHeight: 48,
          },
        });
      } catch (error: unknown) {
        collisionError = error;
      }

      expect(collisionError).toBeDefined();
      expect(collisionError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      if (collisionError instanceof Prisma.PrismaClientKnownRequestError) {
        expect(collisionError.code).toBe('P2002'); // Unique constraint failed
      }

      // Cleanup
      await prisma.networkRack.delete({ where: { id: rack1.id } });
    });

    it('1.5 should enforce cascade deletion of SwitchPort when parent NetworkSwitch is destroyed', async () => {
      if (!isDbAvailable) return;

      const uniqueSuffix = `test-${Date.now()}`;
      const testSwitch = await prisma.networkSwitch.create({
        data: {
          name: `Cascade Test Switch ${uniqueSuffix}`,
          model: 'EX4300',
          vendor: 'Juniper',
          serialNumber: `JUNIPER-${uniqueSuffix}`,
          totalPorts: 2,
          ports: {
            create: [
              { portNumber: 1, name: 'ge-0/0/1' },
              { portNumber: 2, name: 'ge-0/0/2' },
            ],
          },
        },
        include: { ports: true },
      });

      expect(testSwitch.ports.length).toBe(2);
      const portIds = testSwitch.ports.map((p) => p.id);

      // Verify ports exist in DB
      const countBefore = await prisma.switchPort.count({
        where: { id: { in: portIds } },
      });
      expect(countBefore).toBe(2);

      // Delete parent switch
      await prisma.networkSwitch.delete({ where: { id: testSwitch.id } });

      // Verify ports were cascade-deleted
      const countAfter = await prisma.switchPort.count({
        where: { id: { in: portIds } },
      });
      expect(countAfter).toBe(0);
    });

    it('1.6 should enforce set null semantics when parent NetworkRack is deleted (preserving switch)', async () => {
      if (!isDbAvailable) return;

      const uniqueSuffix = `test-${Date.now()}`;
      const rack = await prisma.networkRack.create({
        data: {
          name: `Preserve Test Rack ${uniqueSuffix}`,
          code: `RACK-PRESERVE-${uniqueSuffix}`,
          totalHeight: 42,
        },
      });

      const sw = await prisma.networkSwitch.create({
        data: {
          name: `Preserved Switch ${uniqueSuffix}`,
          model: 'C9200L',
          vendor: 'Cisco',
          serialNumber: `CISCO-PRESERVE-${uniqueSuffix}`,
          rackId: rack.id,
          rackPosition: 10,
        },
      });

      expect(sw.rackId).toBe(rack.id);

      // Delete rack
      await prisma.networkRack.delete({ where: { id: rack.id } });

      // Switch must still exist, with rackId set to null
      const swAfter = await prisma.networkSwitch.findUnique({
        where: { id: sw.id },
      });
      expect(swAfter).not.toBeNull();
      expect(swAfter?.rackId).toBeNull();

      // Cleanup
      await prisma.networkSwitch.delete({ where: { id: sw.id } });
    });
  });

  // =========================================================================
  // SECTION 2: SHARED TYPES & DTOS ROUNDTRIP SERIALIZATION & VALIDATOR STRESS
  // =========================================================================
  describe('Mission 2: Shared Types, DTOs Roundtrip Serialization & Validator Stress', () => {
    describe('2.1 Serialization Roundtrip Fidelity', () => {
      it('should preserve complete data integrity across JSON serialize/deserialize for NetworkRack', () => {
        const originalRack: NetworkRack = {
          id: 'b6f4e198-5c7a-4df1-8693-01053f3e1b10',
          name: 'Datacenter Rack A-01 🇻🇳',
          code: 'RACK-DC-A01',
          totalHeight: 42,
          depth: 1070.5,
          width: 600,
          maxPowerKw: 8.5,
          maxWeightKg: 1200,
          status: RackStatus.ACTIVE,
          notes: 'Contains Core Switches & SAN Storage Array.\nDual 32A PDU feeds.',
          usedUnits: 14,
          availableUnits: 28,
          occupancyRate: 33.33,
          powerUtilization: 42.5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const serialized = JSON.stringify(originalRack);
        const parsed = JSON.parse(serialized) as NetworkRack;

        expect(parsed).toEqual(originalRack);
        expect(parsed.name).toBe('Datacenter Rack A-01 🇻🇳');
        expect(parsed.totalHeight).toBe(42);
        expect(parsed.depth).toBe(1070.5);
      });

      it('should preserve complete data integrity across JSON serialize/deserialize for NetworkSwitch with Ports', () => {
        const originalSwitch: NetworkSwitch = {
          id: '2a8c3d9e-1f5b-4e7a-9c2d-8e4f1a6b3c5d',
          name: 'Distribution Switch 01',
          model: 'Catalyst 9300-48UXM',
          vendor: 'Cisco',
          serialNumber: 'FCW2345B012',
          macAddress: '00:1A:2B:3C:4D:5E',
          role: SwitchRole.DISTRIBUTION,
          status: SwitchStatus.ONLINE,
          totalPorts: 48,
          rackPosition: 24,
          rackHeight: 1,
          ports: [
            {
              id: 'port-1-uuid',
              switchId: '2a8c3d9e-1f5b-4e7a-9c2d-8e4f1a6b3c5d',
              portNumber: 1,
              name: 'Te1/0/1',
              formFactor: PortFormFactor.RJ45_1G,
              poeEnabled: true,
              adminStatus: PortAdminStatus.UP,
              operStatus: PortOperStatus.ACTIVE,
              speed: '10 Gbps',
              duplex: 'Full',
              mode: PortMode.TRUNK,
              taggedVlanIds: [10, 20, 30, 100],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const serialized = JSON.stringify(originalSwitch);
        const parsed = JSON.parse(serialized) as NetworkSwitch;

        expect(parsed).toEqual(originalSwitch);
        expect(parsed.ports?.[0].taggedVlanIds).toEqual([10, 20, 30, 100]);
        expect(parsed.ports?.[0].operStatus).toBe(PortOperStatus.ACTIVE);
      });

      it('should preserve complete data integrity across JSON serialize/deserialize for RackElevationData', () => {
        const slots: Array<RackElevationSlot> = Array.from({ length: 42 }, (_, i) => {
          const unitNumber = i + 1;
          const isOccupied = unitNumber >= 20 && unitNumber <= 21;
          return {
            unitNumber,
            isOccupied,
            isStartingUnit: unitNumber === 20,
            occupiedByUnit: isOccupied ? 20 : null,
            switch:
              unitNumber === 20
                ? {
                    id: 'sw-uuid',
                    name: 'Core Switch',
                    model: 'Nexus 93180YC-FX',
                    vendor: 'Cisco',
                    role: SwitchRole.CORE,
                    status: SwitchStatus.ONLINE,
                    rackHeight: 2,
                    rackPosition: 20,
                    totalPorts: 48,
                    activePortsCount: 36,
                  }
                : null,
          };
        });

        const elevation: RackElevationData = {
          rackId: 'rack-01',
          rackName: 'DC-RACK-01',
          rackCode: 'R01',
          totalHeight: 42,
          usedUnits: 2,
          availableUnits: 40,
          occupancyRate: 4.76,
          maxPowerKw: 10,
          estimatedPowerUsageKw: 1.2,
          slots,
        };

        const serialized = JSON.stringify(elevation);
        const parsed = JSON.parse(serialized) as RackElevationData;

        expect(parsed.slots.length).toBe(42);
        expect(parsed.slots[19].isOccupied).toBe(true);
        expect(parsed.slots[19].switch?.role).toBe(SwitchRole.CORE);
        expect(parsed.slots[0].isOccupied).toBe(false);
      });
    });

    describe('2.2 Boundary, Overflow & Type Validation Stress', () => {
      it('should reject invalid numbers and boundary violations for Rack creation', () => {
        // Zero or negative totalHeight
        expect(createRackSchema.safeParse({ name: 'R', code: 'C', totalHeight: 0 }).success).toBe(
          false,
        );
        expect(createRackSchema.safeParse({ name: 'R', code: 'C', totalHeight: -5 }).success).toBe(
          false,
        );
        // Exceeds max RU height 100
        expect(createRackSchema.safeParse({ name: 'R', code: 'C', totalHeight: 101 }).success).toBe(
          false,
        );
        // Floating point totalHeight
        expect(
          createRackSchema.safeParse({ name: 'R', code: 'C', totalHeight: 42.5 }).success,
        ).toBe(false);
        // Negative dimensions or weights
        expect(createRackSchema.safeParse({ name: 'R', code: 'C', depth: -100 }).success).toBe(
          false,
        );
        expect(createRackSchema.safeParse({ name: 'R', code: 'C', width: 0 }).success).toBe(false);
        expect(createRackSchema.safeParse({ name: 'R', code: 'C', maxPowerKw: -1 }).success).toBe(
          false,
        );
        expect(createRackSchema.safeParse({ name: 'R', code: 'C', maxWeightKg: -50 }).success).toBe(
          false,
        );
      });

      it('should validate all standard enterprise MAC address formats and reject invalid ones', () => {
        // Colon-separated uppercase & lowercase
        expect(macRegex.test('00:1A:2B:3C:4D:5E')).toBe(true);
        expect(macRegex.test('00:1a:2b:3c:4d:5e')).toBe(true);
        // Hyphen-separated uppercase & lowercase
        expect(macRegex.test('00-1A-2B-3C-4D-5E')).toBe(true);
        expect(macRegex.test('00-1a-2b-3c-4d-5e')).toBe(true);
        // Cisco dot-separated format (4 hex digits per group)
        expect(macRegex.test('001a.2b3c.4d5e')).toBe(true);
        // Continuous 12 hex characters
        expect(macRegex.test('001A2B3C4D5E')).toBe(true);

        // Invalid MAC formats:
        expect(macRegex.test('00:1A:2B:3C:4D:GG')).toBe(false); // Non-hex char G
        expect(macRegex.test('00:1A:2B:3C:4D')).toBe(false); // Incomplete 5 bytes
        expect(macRegex.test('00:1A:2B:3C:4D:5E:6F')).toBe(false); // 7 bytes
        expect(macRegex.test('')).toBe(false);
        expect(macRegex.test('not-a-mac')).toBe(false);
        expect(macRegex.test('00:1A:2B:3C:4D:5E ')).toBe(false); // Trailing space
      });

      it('should reject invalid switch parameters (totalPorts, rackPosition, rackHeight)', () => {
        const baseSwitch = {
          name: 'SW-01',
          model: 'C9300',
          vendor: 'Cisco',
        };

        // Total ports out of bounds (min 1, max 128)
        expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: 0 }).success).toBe(false);
        expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: 200 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseSwitch, totalPorts: 24.5 }).success).toBe(
          false,
        );

        // Rack position out of bounds (min 1, max 100)
        expect(createSwitchSchema.safeParse({ ...baseSwitch, rackPosition: 0 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseSwitch, rackPosition: 101 }).success).toBe(
          false,
        );
        expect(createSwitchSchema.safeParse({ ...baseSwitch, rackPosition: -1 }).success).toBe(
          false,
        );

        // Rack height out of bounds (min 1, max 10)
        expect(createSwitchSchema.safeParse({ ...baseSwitch, rackHeight: 0 }).success).toBe(false);
        expect(createSwitchSchema.safeParse({ ...baseSwitch, rackHeight: 11 }).success).toBe(false);
      });

      it('should reject invalid switch port parameters and accept valid tagged VLAN arrays', () => {
        const validSwitchId = '123e4567-e89b-12d3-a456-426614174000';
        const basePort = {
          switchId: validSwitchId,
          portNumber: 1,
          name: 'Gi1/0/1',
        };

        // Port number boundary tests
        expect(createSwitchPortSchema.safeParse({ ...basePort, portNumber: 0 }).success).toBe(
          false,
        );
        expect(createSwitchPortSchema.safeParse({ ...basePort, portNumber: -1 }).success).toBe(
          false,
        );
        expect(createSwitchPortSchema.safeParse({ ...basePort, portNumber: 129 }).success).toBe(
          false,
        );
        expect(createSwitchPortSchema.safeParse({ ...basePort, portNumber: 1.5 }).success).toBe(
          false,
        );

        // Invalid switchId format (non-UUID)
        expect(
          createSwitchPortSchema.safeParse({ ...basePort, switchId: 'not-a-uuid' }).success,
        ).toBe(false);

        // Tagged VLAN IDs validation
        expect(
          createSwitchPortSchema.safeParse({
            ...basePort,
            taggedVlanIds: [10, 20, 30],
          }).success,
        ).toBe(true);

        expect(
          createSwitchPortSchema.safeParse({
            ...basePort,
            taggedVlanIds: ['10', '20', '30'],
          }).success,
        ).toBe(true);

        expect(
          createSwitchPortSchema.safeParse({
            ...basePort,
            taggedVlanIds: [],
          }).success,
        ).toBe(true);

        expect(
          createSwitchPortSchema.safeParse({
            ...basePort,
            taggedVlanIds: null,
          }).success,
        ).toBe(true);

        // Invalid tagged VLAN item (boolean or object)
        expect(
          createSwitchPortSchema.safeParse({
            ...basePort,
            taggedVlanIds: [true, false],
          }).success,
        ).toBe(false);

        expect(
          createSwitchPortSchema.safeParse({
            ...basePort,
            taggedVlanIds: [{ vlan: 10 }],
          }).success,
        ).toBe(false);
      });

      it('should enforce pagination ceiling of max 100 on all network query schemas', () => {
        // rackQuerySchema
        expect(rackQuerySchema.safeParse({ limit: '100' }).success).toBe(true);
        expect(rackQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
        expect(rackQuerySchema.safeParse({ pageSize: '100' }).success).toBe(true);
        expect(rackQuerySchema.safeParse({ pageSize: '150' }).success).toBe(false);

        // switchQuerySchema
        expect(switchQuerySchema.safeParse({ limit: '50' }).success).toBe(true);
        expect(switchQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
        expect(switchQuerySchema.safeParse({ pageSize: '1000' }).success).toBe(false);

        // switchPortQuerySchema
        expect(switchPortQuerySchema.safeParse({ limit: '100' }).success).toBe(true);
        expect(switchPortQuerySchema.safeParse({ limit: '105' }).success).toBe(false);
        expect(switchPortQuerySchema.safeParse({ pageSize: '200' }).success).toBe(false);

        // Negative numbers
        expect(rackQuerySchema.safeParse({ page: '-1' }).success).toBe(false);
        expect(switchQuerySchema.safeParse({ pageSize: '0' }).success).toBe(false);
      });

      it('should safely handle malicious payloads (SQL Injection, XSS, Unicode, Prototype Pollution)', () => {
        const sqlInjection = '\'; DROP TABLE "NetworkRack";--';
        const xssPayload = "<script>alert('XSS')</script>";
        const unicodePayload = 'Đà Nẵng DC - Tủ mạng 01 🚀✨';

        const rackResult = createRackSchema.safeParse({
          name: unicodePayload,
          code: 'RACK-SEC-01',
          notes: `${sqlInjection}\n${xssPayload}`,
        });

        expect(rackResult.success).toBe(true);
        if (rackResult.success) {
          expect(rackResult.data.name).toBe(unicodePayload);
          expect(rackResult.data.notes).toContain(sqlInjection);
          expect(rackResult.data.notes).toContain(xssPayload);
        }

        // Prototype pollution attempt in raw object
        const maliciousJson = JSON.parse(
          '{"name": "Polluted Rack", "code": "RACK-POL", "__proto__": {"polluted": true}}',
        );
        const parseMalicious = createRackSchema.safeParse(maliciousJson);
        expect(parseMalicious.success).toBe(true);
        expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
      });
    });
  });

  // =========================================================================
  // SECTION 3: RE-VERIFYING ZERO REGRESSIONS ACROSS NETWORK DOMAIN
  // =========================================================================
  describe('Mission 3: Full Network Domain Verification', () => {
    it('3.1 should successfully instantiate all network enums and verify enum fidelity', () => {
      expect(RackStatus.ACTIVE).toBe('ACTIVE');
      expect(RackStatus.PLANNED).toBe('PLANNED');
      expect(RackStatus.MAINTENANCE).toBe('MAINTENANCE');
      expect(RackStatus.RETIRED).toBe('RETIRED');

      expect(SwitchRole.CORE).toBe('CORE');
      expect(SwitchRole.DISTRIBUTION).toBe('DISTRIBUTION');
      expect(SwitchRole.ACCESS).toBe('ACCESS');
      expect(SwitchRole.TOR).toBe('TOR');

      expect(SwitchStatus.ONLINE).toBe('ONLINE');
      expect(SwitchStatus.OFFLINE).toBe('OFFLINE');
      expect(SwitchStatus.MAINTENANCE).toBe('MAINTENANCE');

      expect(PortFormFactor.RJ45_1G).toBe('RJ45_1G');
      expect(PortFormFactor.SFP_1G).toBe('SFP_1G');
      expect(PortFormFactor.SFP_PLUS_10G).toBe('SFP_PLUS_10G');
      expect(PortFormFactor.SFP28_25G).toBe('SFP28_25G');
      expect(PortFormFactor.QSFP_PLUS_40G).toBe('QSFP_PLUS_40G');
      expect(PortFormFactor.QSFP28_100G).toBe('QSFP28_100G');

      expect(PortAdminStatus.UP).toBe('UP');
      expect(PortAdminStatus.DOWN).toBe('DOWN');

      expect(PortOperStatus.ACTIVE).toBe('ACTIVE');
      expect(PortOperStatus.DOWN).toBe('DOWN');
      expect(PortOperStatus.CONNECTED_NO_SIGNAL).toBe('CONNECTED_NO_SIGNAL');
      expect(PortOperStatus.RESERVED).toBe('RESERVED');

      expect(PortMode.ACCESS).toBe('ACCESS');
      expect(PortMode.TRUNK).toBe('TRUNK');
      expect(PortMode.LACP).toBe('LACP');
    });

    it('3.2 should verify NetworkStatsDto structure and field compatibility', () => {
      const stats: NetworkStatsDto = {
        totalVlans: 5,
        managedSubnets: 8,
        totalIps: 2048,
        allocatedStaticIps: 150,
        reservedDhcpLeases: 300,
        availableIps: 1598,
        freeIpCapacity: 78.02,
        averageUtilization: 21.98,
        totalRacks: 4,
        totalSwitches: 12,
        totalPorts: 576,
        portUtilization: 68.4,
      };

      expect(stats.totalRacks).toBe(4);
      expect(stats.totalSwitches).toBe(12);
      expect(stats.totalPorts).toBe(576);
      expect(stats.portUtilization).toBe(68.4);
    });
  });
});
