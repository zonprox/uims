import * as dotenv from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RackStatus, SwitchRole, SwitchStatus } from '@prisma/client';

dotenv.config({ path: '.env' });
dotenv.config({ path: '../../.env' });

describe('Milestone 1 Challenger — PostgreSQL Schema Constraints, FK Integrity & Cascade Adversarial Suite', () => {
  let prisma: PrismaClient;
  let isDbAvailable = false;

  const testVlanNumber = 3987;
  let testVlanId = '';
  const testAssetId = 'asset-challenger-m1-test';
  const testAsset2Id = 'asset2-challenger-m1-test';
  const testIpId = 'ip-challenger-m1-test';

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      isDbAvailable = false;
      return;
    }
    try {
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString }),
      });
      await prisma.$queryRaw`SELECT 1`;
      isDbAvailable = true;

      // Clean up any residual test records from previous runs
      await cleanupTestData();

      const vlan = await prisma.vLAN.upsert({
        where: { vlanNumber: testVlanNumber },
        update: {},
        create: {
          vlanNumber: testVlanNumber,
          name: 'Challenger Test VLAN',
        },
      });
      testVlanId = vlan.id;

      // Get or create asset category
      let category = await prisma.assetCategory.findFirst();
      if (!category) {
        category = await prisma.assetCategory.create({
          data: {
            name: 'Network Equipment',
            code: 'NET-EQ',
          },
        });
      }

      const sampleDept = await prisma.department.findFirst();

      await prisma.asset.upsert({
        where: { id: testAssetId },
        update: {
          departmentId: sampleDept?.id,
        },
        create: {
          id: testAssetId,
          assetTag: 'TAG-CHALLENGER-01',
          name: 'Challenger Switch Asset',
          categoryId: category.id,
          departmentId: sampleDept?.id,
        },
      });

      await prisma.asset.upsert({
        where: { id: testAsset2Id },
        update: {
          departmentId: sampleDept?.id,
        },
        create: {
          id: testAsset2Id,
          assetTag: 'TAG-CHALLENGER-02',
          name: 'Challenger Server Endpoint',
          categoryId: category.id,
          departmentId: sampleDept?.id,
        },
      });

      await prisma.iPAddress.upsert({
        where: { id: testIpId },
        update: {},
        create: {
          id: testIpId,
          address: '10.254.254.1',
        },
      });
    } catch (err) {
      console.error('Database connection failed in Challenger Suite:', err);
      isDbAvailable = false;
    }
  });

  async function cleanupTestData() {
    try {
      await prisma.switchPort.deleteMany({
        where: {
          OR: [
            { switch: { name: { startsWith: 'TEST-CHALLENGER' } } },
            { name: { startsWith: 'CHALLENGER-P' } },
          ],
        },
      });
      await prisma.networkSwitch.deleteMany({
        where: { name: { startsWith: 'TEST-CHALLENGER' } },
      });
      await prisma.networkRack.deleteMany({
        where: { code: { startsWith: 'RACK-CHALLENGER' } },
      });
      await prisma.vLAN.deleteMany({
        where: { name: { startsWith: 'Temp Cascade' } },
      });
    } catch {
      // Ignore during setup
    }
  }

  afterAll(async () => {
    if (isDbAvailable && prisma) {
      try {
        await cleanupTestData();
        await prisma.iPAddress.deleteMany({ where: { id: testIpId } });
        if (testVlanId) {
          await prisma.vLAN.deleteMany({ where: { id: testVlanId } });
        }
        await prisma.asset.deleteMany({ where: { id: { in: [testAssetId, testAsset2Id] } } });
        await prisma.$disconnect();
      } catch {
        // Ignore during teardown
      }
    }
  });

  // =========================================================================
  // 1. UNIQUE CONSTRAINTS VERIFICATION
  // =========================================================================
  describe('1. Model Constraints & Unique Indexes', () => {
    it('1.1 should enforce unique code on NetworkRack', async () => {
      const rack1 = await prisma.networkRack.create({
        data: {
          name: 'TEST-CHALLENGER-RACK-1',
          code: 'RACK-CHALLENGER-U01',
          status: RackStatus.ACTIVE,
        },
      });
      expect(rack1.id).toBeDefined();

      // Attempt duplicate code
      let duplicateThrew = false;
      try {
        await prisma.networkRack.create({
          data: {
            name: 'TEST-CHALLENGER-RACK-DUPLICATE',
            code: 'RACK-CHALLENGER-U01', // Same code
            status: RackStatus.ACTIVE,
          },
        });
      } catch (err: unknown) {
        duplicateThrew = true;
        const prismaErr = err as { code?: string };
        expect(prismaErr.code, 'Must throw P2002 Unique constraint violation').toBe('P2002');
      }
      expect(duplicateThrew, 'Duplicate rack code must be rejected by PostgreSQL').toBe(true);
    });

    it('1.2 should enforce unique serialNumber on NetworkSwitch', async () => {
      const sw1 = await prisma.networkSwitch.create({
        data: {
          name: 'TEST-CHALLENGER-SW-SN1',
          model: 'C9300-48P',
          vendor: 'Cisco',
          serialNumber: 'SN-CHALLENGER-UNIQUE-001',
        },
      });
      expect(sw1.id).toBeDefined();

      let duplicateThrew = false;
      try {
        await prisma.networkSwitch.create({
          data: {
            name: 'TEST-CHALLENGER-SW-SN2',
            model: 'C9300-24P',
            vendor: 'Cisco',
            serialNumber: 'SN-CHALLENGER-UNIQUE-001', // Duplicate SN
          },
        });
      } catch (err: unknown) {
        duplicateThrew = true;
        const prismaErr = err as { code?: string };
        expect(prismaErr.code).toBe('P2002');
      }
      expect(duplicateThrew, 'Duplicate switch serialNumber must be rejected').toBe(true);
    });

    it('1.3 should enforce composite unique constraint [switchId, portNumber] on SwitchPort', async () => {
      const sw = await prisma.networkSwitch.create({
        data: {
          name: 'TEST-CHALLENGER-SW-PORT-UNIQ',
          model: 'EX3400',
          vendor: 'Juniper',
        },
      });

      const port1 = await prisma.switchPort.create({
        data: {
          switchId: sw.id,
          portNumber: 1,
          name: 'ge-0/0/1',
        },
      });
      expect(port1.id).toBeDefined();

      // Attempt duplicate port number on SAME switch
      let duplicatePortThrew = false;
      try {
        await prisma.switchPort.create({
          data: {
            switchId: sw.id,
            portNumber: 1, // Duplicate portNumber
            name: 'ge-0/0/1-duplicate',
          },
        });
      } catch (err: unknown) {
        duplicatePortThrew = true;
        const prismaErr = err as { code?: string };
        expect(prismaErr.code).toBe('P2002');
      }
      expect(duplicatePortThrew, 'Duplicate [switchId, portNumber] must be rejected').toBe(true);

      // But another switch CAN have portNumber 1
      const sw2 = await prisma.networkSwitch.create({
        data: {
          name: 'TEST-CHALLENGER-SW-PORT-UNIQ-2',
          model: 'EX3400',
          vendor: 'Juniper',
        },
      });
      const portOnSw2 = await prisma.switchPort.create({
        data: {
          switchId: sw2.id,
          portNumber: 1, // Same port number on DIFFERENT switch
          name: 'ge-0/0/1',
        },
      });
      expect(portOnSw2.id).toBeDefined();
    });
  });

  // =========================================================================
  // 2. FOREIGN KEY REFERENTIAL INTEGRITY
  // =========================================================================
  describe('2. Foreign Key Referential Integrity', () => {
    it.skip('2.1 should reject NetworkRack with non-existent locationId (Purged per user directive)', async () => {
      let threw = false;
      try {
        await (prisma.networkRack as unknown as { create: (args: unknown) => Promise<unknown> }).create({
          data: {
            name: 'TEST-CHALLENGER-RACK-BAD-LOC',
            code: 'RACK-CHALLENGER-BAD-LOC',
            locationId: '00000000-0000-0000-0000-000000000000', // Non-existent
          },
        });
      } catch (err: unknown) {
        threw = true;
        const prismaErr = err as { code?: string };
        expect(prismaErr.code).toBe('P2003');
      }
      expect(threw, 'FK violation on invalid locationId must be rejected').toBe(true);
    });

    it('2.2 should reject NetworkSwitch with non-existent rackId or assetId', async () => {
      let threw = false;
      try {
        await prisma.networkSwitch.create({
          data: {
            name: 'TEST-CHALLENGER-SW-BAD-RACK',
            model: 'C9300',
            vendor: 'Cisco',
            rackId: '00000000-0000-0000-0000-000000000000',
          },
        });
      } catch (err: unknown) {
        threw = true;
        const prismaErr = err as { code?: string };
        expect(prismaErr.code).toBe('P2003');
      }
      expect(threw, 'FK violation on invalid rackId must be rejected').toBe(true);
    });

    it('2.3 should reject SwitchPort with non-existent switchId or vlanId', async () => {
      let threw = false;
      try {
        await prisma.switchPort.create({
          data: {
            switchId: '00000000-0000-0000-0000-000000000000',
            portNumber: 1,
            name: 'p1',
          },
        });
      } catch (err: unknown) {
        threw = true;
        const prismaErr = err as { code?: string };
        expect(prismaErr.code).toBe('P2003');
      }
      expect(threw, 'FK violation on invalid switchId must be rejected').toBe(true);
    });
  });

  // =========================================================================
  // 3. REFERENTIAL CASCADES (MANDATED CHALLENGE)
  // =========================================================================
  describe('3. Referential Cascades Verification', () => {
    it('3.1 should CASCADE DELETE SwitchPort when NetworkSwitch is deleted', async () => {
      // Create Switch
      const sw = await prisma.networkSwitch.create({
        data: {
          name: 'TEST-CHALLENGER-CASCADE-SW',
          model: 'C9300',
          vendor: 'Cisco',
        },
      });

      // Create 3 ports
      const p1 = await prisma.switchPort.create({
        data: { switchId: sw.id, portNumber: 1, name: 'Gi1/0/1' },
      });
      const p2 = await prisma.switchPort.create({
        data: { switchId: sw.id, portNumber: 2, name: 'Gi1/0/2' },
      });
      const p3 = await prisma.switchPort.create({
        data: { switchId: sw.id, portNumber: 3, name: 'Gi1/0/3' },
      });

      // Verify all 3 exist
      const portCountBefore = await prisma.switchPort.count({
        where: { switchId: sw.id },
      });
      expect(portCountBefore).toBe(3);

      // DELETE SWITCH
      await prisma.networkSwitch.delete({
        where: { id: sw.id },
      });

      // Verify SWITCH is deleted
      const swAfter = await prisma.networkSwitch.findUnique({
        where: { id: sw.id },
      });
      expect(swAfter).toBeNull();

      // Verify ALL PORTS ARE AUTOMATICALLY CASCADED
      const portCountAfter = await prisma.switchPort.count({
        where: { switchId: sw.id },
      });
      expect(portCountAfter, 'All switch ports must be cascaded when switch is deleted').toBe(0);

      const checkP1 = await prisma.switchPort.findUnique({ where: { id: p1.id } });
      const checkP2 = await prisma.switchPort.findUnique({ where: { id: p2.id } });
      const checkP3 = await prisma.switchPort.findUnique({ where: { id: p3.id } });
      expect(checkP1).toBeNull();
      expect(checkP2).toBeNull();
      expect(checkP3).toBeNull();
    });

    it('3.2 should UNMOUNT switch (SET NULL on rackId) when NetworkRack is deleted', async () => {
      // Create Rack
      const rack = await prisma.networkRack.create({
        data: {
          name: 'TEST-CHALLENGER-RACK-UNMOUNT',
          code: 'RACK-CHALLENGER-UNMOUNT',
          totalHeight: 42,
        },
      });

      // Create Switch mounted in rack
      const sw = await prisma.networkSwitch.create({
        data: {
          name: 'TEST-CHALLENGER-MOUNTED-SW',
          model: 'C9300',
          vendor: 'Cisco',
          rackId: rack.id,
          rackPosition: 20,
          rackHeight: 1,
        },
      });

      expect(sw.rackId).toBe(rack.id);

      // DELETE RACK
      await prisma.networkRack.delete({
        where: { id: rack.id },
      });

      // Verify Rack is gone
      const rackAfter = await prisma.networkRack.findUnique({
        where: { id: rack.id },
      });
      expect(rackAfter).toBeNull();

      // Verify SWITCH STILL EXISTS, but rackId is now null (SetNull)
      const swAfter = await prisma.networkSwitch.findUnique({
        where: { id: sw.id },
      });
      expect(swAfter, 'Switch must not be deleted when rack is deleted').not.toBeNull();
      expect(swAfter?.rackId, 'Switch rackId must be set to null after rack deletion').toBeNull();
    });

    it('3.3 should SET NULL on vlanId when VLAN is deleted', async () => {
      // Create temporary VLAN with unique number
      const dynamicVlanNum = 3900 + Math.floor(Math.random() * 80);
      const tempVlan = await prisma.vLAN.create({
        data: {
          vlanNumber: dynamicVlanNum,
          name: `Temp Cascade VLAN ${dynamicVlanNum}`,
        },
      });

      const sw = await prisma.networkSwitch.create({
        data: {
          name: 'TEST-CHALLENGER-VLAN-SW',
          model: 'C9300',
          vendor: 'Cisco',
        },
      });

      const port = await prisma.switchPort.create({
        data: {
          switchId: sw.id,
          portNumber: 1,
          name: 'Gi1/0/1',
          vlanId: tempVlan.id,
        },
      });

      expect(port.vlanId).toBe(tempVlan.id);

      // Delete VLAN
      await prisma.vLAN.delete({ where: { id: tempVlan.id } });

      // Check port: should still exist, vlanId should be null
      const portAfter = await prisma.switchPort.findUnique({ where: { id: port.id } });
      expect(portAfter).not.toBeNull();
      expect(
        portAfter?.vlanId,
        'SwitchPort.vlanId must be set to null when VLAN is deleted',
      ).toBeNull();
    });

    it.skip('3.4 should SET NULL on locationId when Location is deleted (Purged per user directive)', async () => {
      // Skipped: model Location was purged per user directive
    });
  });

  // =========================================================================
  // 4. POSTGRESQL ENUM TYPE INTEGRITY
  // =========================================================================
  describe('4. PostgreSQL Enum Constraints Verification', () => {
    it('4.1 should reject invalid enum values in PostgreSQL for NetworkRack status', async () => {
      let pgErrThrew = false;
      try {
        await prisma.$executeRaw`
          INSERT INTO "NetworkRack" (id, name, code, status, "updatedAt")
          VALUES ('00000000-0000-0000-0000-000000000099', 'Fail Rack', 'RACK-FAIL-01', 'BOGUS_STATUS'::"RackStatus", NOW());
        `;
      } catch (err: unknown) {
        pgErrThrew = true;
        const msg = String(err);
        expect(msg).toContain('invalid input value for enum');
      }
      expect(pgErrThrew, 'PostgreSQL must reject invalid RackStatus').toBe(true);
    });

    it('4.2 should reject invalid enum values in PostgreSQL for NetworkSwitch role', async () => {
      let pgErrThrew = false;
      try {
        await prisma.$executeRaw`
          INSERT INTO "NetworkSwitch" (id, name, model, vendor, role, status, "updatedAt")
          VALUES ('00000000-0000-0000-0000-000000000098', 'Fail Switch', 'M', 'V', 'INVALID_ROLE'::"SwitchRole", 'ONLINE'::"SwitchStatus", NOW());
        `;
      } catch (err: unknown) {
        pgErrThrew = true;
        const msg = String(err);
        expect(msg).toContain('invalid input value for enum');
      }
      expect(pgErrThrew, 'PostgreSQL must reject invalid SwitchRole').toBe(true);
    });

    it('4.3 should reject invalid enum values in PostgreSQL for SwitchPort operStatus', async () => {
      const sw = await prisma.networkSwitch.create({
        data: {
          name: 'TEST-CHALLENGER-ENUM-SW',
          model: 'C9300',
          vendor: 'Cisco',
        },
      });

      let pgErrThrew = false;
      try {
        await prisma.$executeRaw`
          INSERT INTO "SwitchPort" (id, "switchId", "portNumber", name, "operStatus", "updatedAt")
          VALUES ('00000000-0000-0000-0000-000000000097', ${sw.id}, 99, 'p99', 'BROKEN_LINK'::"PortOperStatus", NOW());
        `;
      } catch (err: unknown) {
        pgErrThrew = true;
        const msg = String(err);
        expect(msg).toContain('invalid input value for enum');
      }
      expect(pgErrThrew, 'PostgreSQL must reject invalid PortOperStatus').toBe(true);
    });
  });
});
