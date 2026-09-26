import { Logger } from '@nestjs/common';
import {
  type Asset,
  type Location,
  type Prisma,
  type PrismaClient,
  RackStatus,
  SwitchRole,
  SwitchStatus,
} from '@prisma/client';
import { importNetworkExcel } from '../scripts/import-network-excel';

const logger = new Logger('NetworkSeeder');

export async function seedNetwork(prisma: PrismaClient) {
  logger.log('Starting Network Seeder with Enterprise Excel Workbook Pipeline...');
  try {
    await importNetworkExcel(prisma);
    logger.log('Excel IPAM import completed. Now seeding Racks, Switch Fleet, and Port Matrix...');

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Resolve Locations & Prerequisite Entities
    // ──────────────────────────────────────────────────────────────────────────
    const dcLoc = await prisma.location.findFirst({
      where: { OR: [{ id: 'loc-bsl-bc-datacenter' }, { code: 'BC-F1-DC102' }] },
    });
    const f1Loc = await prisma.location.findFirst({
      where: { OR: [{ id: 'loc-bsl-f1' }, { code: 'BSL-F1' }] },
    });
    const f2Loc = await prisma.location.findFirst({
      where: { OR: [{ id: 'loc-bsl-f2' }, { code: 'BSL-F2' }] },
    });
    const f7Loc = await prisma.location.findFirst({
      where: { OR: [{ id: 'loc-bsl-f7' }, { code: 'BSL-F7' }] },
    });

    const ast1010 = await prisma.asset.findUnique({ where: { assetTag: 'AST-1010' } });
    const ast1018 = await prisma.asset.findUnique({ where: { assetTag: 'AST-1018' } });
    const ast1019 = await prisma.asset.findUnique({ where: { assetTag: 'AST-1019' } });
    const ast1004 = await prisma.asset.findUnique({ where: { assetTag: 'AST-1004' } });
    const ast1005 = await prisma.asset.findUnique({ where: { assetTag: 'AST-1005' } });

    // Look up existing VLANs
    const vlan100 = await prisma.vLAN.findUnique({ where: { vlanNumber: 100 } });
    const vlan129 = await prisma.vLAN.findUnique({ where: { vlanNumber: 129 } });
    const vlan130 = await prisma.vLAN.findUnique({ where: { vlanNumber: 130 } });
    const vlan131 = await prisma.vLAN.findUnique({ where: { vlanNumber: 131 } });
    const vlan132 = await prisma.vLAN.findUnique({ where: { vlanNumber: 132 } });

    // Look up or seed Switch Management IPs in VLAN 129
    const mgmtSubnet = await prisma.subnet.findFirst({
      where: { OR: [{ cidr: '10.232.129.0/24' }, { vlanId: vlan129?.id }] },
    });

    const mgmtIps: string[] = [];
    const mgmtIpAddresses = [
      '10.232.129.10',
      '10.232.129.11',
      '10.232.129.12',
      '10.232.129.13',
      '10.232.129.14',
      '10.232.129.15',
    ];

    for (let idx = 0; idx < mgmtIpAddresses.length; idx++) {
      const addr = mgmtIpAddresses[idx];
      let ipRecord = await prisma.iPAddress.findFirst({
        where: { address: addr },
      });

      if (!ipRecord && mgmtSubnet) {
        ipRecord = await prisma.iPAddress.create({
          data: {
            address: addr,
            status: 'ASSIGNED',
            deviceType: 'Switch',
            subnetId: mgmtSubnet.id,
            vlanId: vlan129?.id || null,
            locationId: dcLoc?.id || null,
            description: `Management IP for Enterprise Switch 0${idx + 1}`,
          },
        });
      }
      if (ipRecord) {
        mgmtIps.push(ipRecord.id);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Seed 5 Enterprise Racks
    // ──────────────────────────────────────────────────────────────────────────
    logger.log('Seeding 5 enterprise equipment racks...');
    const rackDefs = [
      {
        name: 'Core Datacenter Rack 01',
        code: 'RACK-DC-01',
        locationId: dcLoc?.id || null,
        totalHeight: 42,
        depth: 1070,
        width: 800,
        maxPowerKw: 10.0,
        maxWeightKg: 1200,
        status: RackStatus.ACTIVE,
        notes: 'Primary core infrastructure, leaf-spine switches, and virtualization hosts.',
      },
      {
        name: 'Distribution Datacenter Rack 02',
        code: 'RACK-DC-02',
        locationId: dcLoc?.id || null,
        totalHeight: 42,
        depth: 1070,
        width: 800,
        maxPowerKw: 8.0,
        maxWeightKg: 1000,
        status: RackStatus.ACTIVE,
        notes: 'Distribution switches, SAN storage arrays, and backup appliance cabinet.',
      },
      {
        name: 'Factory 1 IDF Cabinet',
        code: 'RACK-F1-IDF',
        locationId: f1Loc?.id || null,
        totalHeight: 24,
        depth: 800,
        width: 600,
        maxPowerKw: 3.5,
        maxWeightKg: 500,
        status: RackStatus.ACTIVE,
        notes: 'Factory 1 production floor intermediate distribution frame.',
      },
      {
        name: 'Factory 2 IDF Cabinet',
        code: 'RACK-F2-IDF',
        locationId: f2Loc?.id || null,
        totalHeight: 24,
        depth: 800,
        width: 600,
        maxPowerKw: 3.5,
        maxWeightKg: 500,
        status: RackStatus.ACTIVE,
        notes: 'Factory 2 production floor intermediate distribution frame.',
      },
      {
        name: 'Factory 7 Server & CCTV Rack',
        code: 'RACK-F7-IDF',
        locationId: f7Loc?.id || null,
        totalHeight: 42,
        depth: 1000,
        width: 600,
        maxPowerKw: 6.0,
        maxWeightKg: 800,
        status: RackStatus.ACTIVE,
        notes: 'Factory 7 warehouse, distribution, and CCTV surveillance cabinet.',
      },
    ];

    const rackMap = new Map<string, string>();
    for (const r of rackDefs) {
      const created = await prisma.networkRack.upsert({
        where: { code: r.code },
        update: {
          name: r.name,
          locationId: r.locationId,
          totalHeight: r.totalHeight,
          depth: r.depth,
          width: r.width,
          maxPowerKw: r.maxPowerKw,
          maxWeightKg: r.maxWeightKg,
          status: r.status,
          notes: r.notes,
        },
        create: r,
      });
      rackMap.set(r.code, created.id);
    }
    logger.log(`Seeded ${rackMap.size} enterprise racks successfully.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Seed 6 Enterprise Switches
    // ──────────────────────────────────────────────────────────────────────────
    logger.log('Seeding 6 enterprise switches...');
    const switchDefs = [
      {
        name: 'BSL-CORE-SW01',
        model: 'C9300-48P-A',
        vendor: 'Cisco Systems',
        serialNumber: ast1010?.serialNumber || 'FOC2488102',
        macAddress: '70:69:79:2A:41:01',
        ipAddressId: mgmtIps[0] || null,
        firmwareVersion: '17.9.4a',
        role: SwitchRole.CORE,
        status: SwitchStatus.ONLINE,
        totalPorts: 48, // 48 RJ45 + 4 SFP = 52 ports
        rackId: rackMap.get('RACK-DC-01') || null,
        rackPosition: 39,
        rackHeight: 1,
        assetId: ast1010?.id || null,
        locationId: dcLoc?.id || null,
        notes: 'BSL Datacenter Core Switch (Stack Master).',
        defaultVlanId: vlan100?.id || null,
      },
      {
        name: 'BSL-DIST-SW01',
        model: 'C9200L-24P-4G',
        vendor: 'Cisco Systems',
        serialNumber: ast1018?.serialNumber || 'FOC2533K92',
        macAddress: '70:69:79:2A:41:02',
        ipAddressId: mgmtIps[1] || null,
        firmwareVersion: '17.6.5',
        role: SwitchRole.DISTRIBUTION,
        status: SwitchStatus.ONLINE,
        totalPorts: 24, // 24 RJ45 + 4 SFP = 28 ports
        rackId: rackMap.get('RACK-DC-01') || null,
        rackPosition: 37,
        rackHeight: 1,
        assetId: ast1018?.id || null,
        locationId: dcLoc?.id || null,
        notes: 'Business Center & Datacenter Distribution Switch.',
        defaultVlanId: vlan130?.id || null,
      },
      {
        name: 'BSL-ACC-SW01',
        model: 'JL726A',
        vendor: 'Aruba Networks',
        serialNumber: ast1019?.serialNumber || 'SG2410881',
        macAddress: '70:69:79:2A:41:03',
        ipAddressId: mgmtIps[2] || null,
        firmwareVersion: '10.12.1000',
        role: SwitchRole.ACCESS,
        status: SwitchStatus.ONLINE,
        totalPorts: 24, // 24 RJ45 + 4 SFP = 28 ports
        rackId: rackMap.get('RACK-DC-02') || null,
        rackPosition: 35,
        rackHeight: 1,
        assetId: ast1019?.id || null,
        locationId: dcLoc?.id || null,
        notes: 'Business Center & Floor 1 IoT / Access Switch.',
        defaultVlanId: vlan130?.id || null,
      },
      {
        name: 'BSL-F1-ACC01',
        model: 'Catalyst 2960X-48TD',
        vendor: 'Cisco Systems',
        serialNumber: 'FCW2144A101',
        macAddress: '70:69:79:2A:41:04',
        ipAddressId: mgmtIps[3] || null,
        firmwareVersion: '15.2(7)E8',
        role: SwitchRole.ACCESS,
        status: SwitchStatus.ONLINE,
        totalPorts: 24, // 24 RJ45 + 4 SFP = 28 ports
        rackId: rackMap.get('RACK-F1-IDF') || null,
        rackPosition: 20,
        rackHeight: 1,
        assetId: null,
        locationId: f1Loc?.id || null,
        notes: 'Factory 1 Sewing & Production Line Access Switch.',
        defaultVlanId: vlan131?.id || null,
      },
      {
        name: 'BSL-F2-ACC01',
        model: 'OmniSwitch 6450-48',
        vendor: 'Alcatel-Lucent',
        serialNumber: 'ALC19823488',
        macAddress: '70:69:79:2A:41:05',
        ipAddressId: mgmtIps[4] || null,
        firmwareVersion: '6.7.2.122.R06',
        role: SwitchRole.ACCESS,
        status: SwitchStatus.ONLINE,
        totalPorts: 24, // 24 RJ45 + 4 SFP = 28 ports
        rackId: rackMap.get('RACK-F2-IDF') || null,
        rackPosition: 18,
        rackHeight: 1,
        assetId: null,
        locationId: f2Loc?.id || null,
        notes: 'Factory 2 Cutting & Sample Room Switch.',
        defaultVlanId: vlan132?.id || null,
      },
      {
        name: 'BSL-TOR-SW01',
        model: 'EX3400-24T',
        vendor: 'Juniper Networks',
        serialNumber: 'JN129988241',
        macAddress: '70:69:79:2A:41:06',
        ipAddressId: mgmtIps[5] || null,
        firmwareVersion: '21.4R3-S5',
        role: SwitchRole.TOR,
        status: SwitchStatus.ONLINE,
        totalPorts: 24, // 24 RJ45 + 4 SFP = 28 ports
        rackId: rackMap.get('RACK-DC-02') || null,
        rackPosition: 42,
        rackHeight: 1,
        assetId: null,
        locationId: dcLoc?.id || null,
        notes: 'Top-of-Rack Storage & Cluster Interconnect.',
        defaultVlanId: vlan100?.id || null,
      },
    ];

    // Total ports across all 6 switches: 52 + 28 + 28 + 28 + 28 + 28 = 192 ports!
    const switchRecords: Array<{
      id: string;
      name: string;
      totalPorts: number;
      defaultVlanId: string | null;
    }> = [];

    for (const sw of switchDefs) {
      const { defaultVlanId, ...swData } = sw;
      const created = await prisma.networkSwitch.upsert({
        where: { serialNumber: swData.serialNumber },
        update: swData,
        create: swData,
      });
      switchRecords.push({
        id: created.id,
        name: created.name,
        totalPorts: created.totalPorts,
        defaultVlanId,
      });
    }
    logger.log(`Seeded ${switchRecords.length} enterprise switches successfully.`);

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Seed ~192 Switch Ports with Realistic Tri-State Telemetry
    // ──────────────────────────────────────────────────────────────────────────
    logger.log('Seeding 192 switch ports with realistic tri-state status distribution...');
    const allPortsData: Prisma.SwitchPortCreateManyInput[] = [];

    // Realistic tri-state status pattern:
    // ~65% ACTIVE (admin: UP, oper: ACTIVE)
    // ~15% DOWN (admin: DOWN, oper: DOWN)
    // ~15% CONNECTED_NO_SIGNAL (admin: UP, oper: CONNECTED_NO_SIGNAL)
    // ~5% RESERVED (admin: UP, oper: RESERVED)
    // Cycle pattern across 20 ports:
    // 13 ACTIVE, 3 DOWN, 3 CONNECTED_NO_SIGNAL, 1 RESERVED (13/20 = 65%, 3/20 = 15%, 3/20 = 15%, 1/20 = 5%)
    const statusCycle: Array<{
      admin: 'UP' | 'DOWN';
      oper: 'ACTIVE' | 'DOWN' | 'CONNECTED_NO_SIGNAL' | 'RESERVED';
    }> = [
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'DOWN', oper: 'DOWN' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'UP', oper: 'CONNECTED_NO_SIGNAL' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'DOWN', oper: 'DOWN' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'UP', oper: 'CONNECTED_NO_SIGNAL' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'UP', oper: 'RESERVED' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'UP', oper: 'ACTIVE' },
      { admin: 'DOWN', oper: 'DOWN' },
      { admin: 'UP', oper: 'CONNECTED_NO_SIGNAL' },
      { admin: 'UP', oper: 'ACTIVE' },
    ];

    let totalCreatedPorts = 0;

    for (const sw of switchRecords) {
      // RJ45 ports (1..totalPorts)
      for (let p = 1; p <= sw.totalPorts; p++) {
        const cycleIdx = (totalCreatedPorts + p) % statusCycle.length;
        const statusItem = statusCycle[cycleIdx];

        let connectedAssetId: string | null = null;
        let desc = `Access Port ${p}`;

        // Cross-link first two ports on CORE switch to physical servers AST-1004 / AST-1005
        if (sw.name === 'BSL-CORE-SW01' && p === 1 && ast1004) {
          connectedAssetId = ast1004.id;
          desc = 'Uplink: Dell PowerEdge R750 (AST-1004)';
        } else if (sw.name === 'BSL-CORE-SW01' && p === 2 && ast1005) {
          connectedAssetId = ast1005.id;
          desc = 'Uplink: Dell PowerEdge R650 (AST-1005)';
        }

        allPortsData.push({
          switchId: sw.id,
          portNumber: p,
          name: `Gi1/0/${p}`,
          formFactor: 'RJ45_1G',
          poeEnabled: true,
          adminStatus: statusItem.admin,
          operStatus: statusItem.oper,
          speed: statusItem.oper === 'DOWN' ? null : '1 Gbps',
          duplex: statusItem.oper === 'DOWN' ? null : 'Full',
          vlanId: sw.defaultVlanId,
          mode: 'ACCESS',
          connectedAssetId,
          description: desc,
        });
      }

      // 4 SFP+ 10G uplink cages
      for (let u = 1; u <= 4; u++) {
        const portNum = sw.totalPorts + u;
        const isCoreUplink = sw.name === 'BSL-CORE-SW01';

        allPortsData.push({
          switchId: sw.id,
          portNumber: portNum,
          name: `Te1/0/${portNum}`,
          formFactor: 'SFP_PLUS_10G',
          poeEnabled: false,
          adminStatus: 'UP',
          operStatus: isCoreUplink ? 'ACTIVE' : u <= 2 ? 'ACTIVE' : 'CONNECTED_NO_SIGNAL',
          speed: '10 Gbps',
          duplex: 'Full',
          vlanId: null,
          mode: 'TRUNK',
          taggedVlanIds: [100, 129, 130, 131, 132],
          description: `10G Trunk Uplink 0${u}`,
        });
      }

      totalCreatedPorts += sw.totalPorts + 4;
    }

    // Clear any existing ports on these switches to ensure clean seeding
    await prisma.switchPort.deleteMany({
      where: { switchId: { in: switchRecords.map((s) => s.id) } },
    });

    await prisma.switchPort.createMany({
      data: allPortsData,
    });

    logger.log(`Seeded ${allPortsData.length} switch ports successfully with tri-state status.`);
    logger.log('Network Seeder completed successfully.');
  } catch (error: unknown) {
    logger.error(
      'Failed to seed network data via Excel ingestion pipeline:',
      error instanceof Error ? error.stack : error,
    );
    throw error;
  }
}
