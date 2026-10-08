import {
  type Prisma,
  type PrismaClient,
  RackStatus,
  SwitchRole,
  SwitchStatus,
} from '@prisma/client';
import {
  calcSubnetDetails,
  inTransactionChunks,
  runDomainSeeder,
  type SeederContext,
} from './seeder.utils';

export const standardSubnetRows: string[] = [
  '10.232.100.0/24|100|BSL Servers & Core|BC-F1-DC102|10.232.100.254|BSL Server Room & Core Infrastructure|Production hypervisors, ERP servers, PBX, CATO SD-WAN, core portals',
  '10.232.129.0/24|129|BSL Switch Management|BC-F1-DC102|10.232.129.254|BSL Core & Edge Switch Management|Cisco Catalyst 9300 and C1300 switch management interfaces',
  '10.232.130.0/24|130|BSL Access Control|BSL-BC|10.232.130.254|BSL Access Control & Time Attendance|Time attendance fingerprint terminals (MCC F1-F7) and wireless APs',
  '10.232.131.0/24|131|Factory 1 Devices|BSL-F1|10.232.131.254|BSL Factory 1 Terminals & Printers|Hikvision facial recognition terminals and local production printers',
  '10.232.132.0/24|132|Factory 2 Devices|BSL-F2|10.232.132.254|BSL Factory 2 Terminals & Printers|Factory 2 face recognition terminals and printers',
  '10.233.100.0/23|233|HCM Office D7|HCM-D7|10.233.100.1|HCM District 7 Corporate Office|CATO SD-WAN, Cisco switches, Synology NAS, APs and office printers',
  '10.232.133.0/24|133|Factory 3 Devices|BSL-F3|10.232.133.254|BSL Factory 3 Terminals|Factory 3 face recognition door terminals',
  '10.232.134.0/24|134|Factory 4 Devices|BSL-F4|10.232.134.254|BSL Factory 4 Terminals & Cameras|Factory 4 face recognition door terminals and cameras',
  '10.232.135.0/24|135|Factory 5 Devices|BSL-F5|10.232.135.254|BSL Factory 5 Terminals & Printers|Factory 5 face recognition door terminals and printers',
  '10.232.136.0/24|136|Factory 6 Devices|BSL-F6|10.232.136.254|BSL Factory 6 Terminals|Factory 6 face recognition door terminals and MCD units',
  '10.232.137.0/24|137|CMCD QA & Lab|BSL-F7|10.232.137.254|BSL CMCD QA & Lab Terminals|Quality assurance and lab room access control terminals',
  '10.232.138.0/24|138|Office Printers|BSL-BC|10.232.138.254|BSL Administrative Office Printers|SAP, accounting, import-export network printers',
  '10.232.139.0/24|139|Factory 7 Printers|BSL-F7|10.232.139.254|BSL Factory 7 Office Printers|Factory 7 sales and maintenance office printers',
  '10.232.97.0/24|97|CCTV Backbone|BSL-BC|10.232.97.254|BSL CCTV Backbone & NVR Storage|Hanwha Techwin NVR storage array and Alcatel OmniSwitch backbone',
  '10.232.98.0/24|98|CCTV Factory 1-6|BSL-ST|10.232.98.254|BSL Factory 1-6 CCTV Fleet|Hanwha Vision & Hikvision camera surveillance fleet across F1-F6',
  '10.232.99.0/24|99|CCTV Factory 7|BSL-F7|10.232.99.254|BSL Factory 7 CCTV Fleet|Hanwha Vision camera surveillance fleet across Factory 7',
  '10.232.125.0/24|125|CCTV Legacy|BSL-ST|10.232.125.254|BSL Legacy CCTV Fleet|Hikvision surveillance cameras in solar substation and factories',
  '10.232.112.0/24|998|Factory 7 Construction|BSL-F7|10.232.112.1|BSL Factory 7 Construction Network|Temporary construction field units at Factory 7 (normalized to /24)',
  '192.168.232.0/25|996|Legacy Construction & WAN|BC-F1-DC102|192.168.232.1|BSL Server Room WAN (VNPT)|VNPT fiber modem WAN gateway for BSL server room (lower /25 block)',
  '192.168.232.128/25|996|Legacy Construction & WAN|BSL-BC|192.168.232.129|BSL Legacy Construction Network|Legacy construction field units and Viettel modem (upper /25 block)',
  '192.168.1.0/24|1|HCM Office D3|HCM-D3|192.168.1.1|HCM District 3 Branch Office|VNPT fiber modem, biometric terminals, APs, office workstations',
];

export const rackRows: string[] = [
  'Core Datacenter Rack 01|RACK-DC01|loc-bsl-bc-datacenter|42|1070|800|10.0|1200|Primary core infrastructure, leaf-spine switches, and virtualization hosts.',
  'Distribution Datacenter Rack 02|RACK-DC02|loc-bsl-bc-datacenter|42|1070|800|8.0|1000|Distribution switches, SAN storage arrays, and backup appliance cabinet.',
  'Factory 1 IDF Cabinet|RACK-F1-IDF|loc-bsl-f1|24|800|600|3.5|500|Factory 1 production floor intermediate distribution frame.',
];

export const switchRows: string[] = [
  'BSL-CORE-SW01|C9300-48P|Cisco Systems|FOC2488102|70:69:79:2A:41:01|0|17.9.4a|CORE|48|RACK-DC01|39|100|AST-1010|loc-bsl-bc-datacenter|BSL Datacenter Core Switch (Stack Master).',
  'BSL-DIST-SW01|C9200L-24P-4G|Cisco Systems|FOC2533K92|70:69:79:2A:41:02|1|17.6.5|DISTRIBUTION|24|RACK-DC01|37|130|AST-1018|loc-bsl-bc-datacenter|Business Center & Datacenter Distribution Switch.',
  'BSL-F1-ACC01|Aruba 6200F 24G|Aruba Networks|SG2410881|70:69:79:2A:41:03|2|10.12.1000|ACCESS|24|RACK-F1-IDF|20|131|AST-1019|loc-bsl-f1|Factory 1 Sewing & Production Line Access Switch.',
  'BSL-F1-IDF01|Compact 16-Port Access Switch|Aruba Networks|SG2410992|70:69:79:2A:41:04|3|10.12.1000|ACCESS|16|RACK-F1-IDF|18|131||loc-bsl-f1|Factory 1 IDF Compact Access Switch.',
];

export async function seedNetwork(prisma: PrismaClient, ctx?: SeederContext) {
  return runDomainSeeder(
    'NetworkSeeder',
    '🌐',
    'Enterprise Network Infrastructure Topology',
    async (logger) => {
      logger.log('Seeding canonical enterprise VLAN and Subnet topology...');

      const vlanMap = new Map<number, string>();

      // 1. Seed VLANs & Subnets via bitwise calcSubnetDetails
      for (const row of standardSubnetRows) {
        const [cidr, vlanNumStr, vlanName, _locKey, gw, name, desc] = row.split('|');
        const vlanNumber = parseInt(vlanNumStr, 10);

        const vlan = await prisma.vLAN.upsert({
          where: { vlanNumber },
          update: { name: vlanName },
          create: { vlanNumber, name: vlanName, status: 'ACTIVE' },
        });
        vlanMap.set(vlanNumber, vlan.id);

        const details = calcSubnetDetails(cidr, gw);
        await prisma.subnet.upsert({
          where: { cidr },
          update: {
            name,
            vlanId: vlan.id,
            gateway: details.gateway,
            networkAddress: details.networkAddress,
            netmask: details.netmask,
            broadcastAddress: details.broadcastAddress,
            startIp: details.startIp,
            endIp: details.endIp,
            totalIps: details.totalIps,
            description: desc,
          },
          create: {
            cidr,
            name,
            vlanId: vlan.id,
            gateway: details.gateway,
            networkAddress: details.networkAddress,
            netmask: details.netmask,
            broadcastAddress: details.broadcastAddress,
            startIp: details.startIp,
            endIp: details.endIp,
            totalIps: details.totalIps,
            description: desc,
          },
        });
      }
      logger.log(`Seeded ${standardSubnetRows.length} subnets with bitwise IPAM calculation.`);

      // 2. Seed Switch Management IPs
      const mgmtSubnet = await prisma.subnet.findUnique({ where: { cidr: '10.232.129.0/24' } });
      const mgmtIps: string[] = [];
      const mgmtIpAddresses = ['10.232.129.10', '10.232.129.11', '10.232.129.12', '10.232.129.13'];
      const vlan129Id = vlanMap.get(129) || null;

      for (let idx = 0; idx < mgmtIpAddresses.length; idx++) {
        const addr = mgmtIpAddresses[idx];
        const subnetId = mgmtSubnet?.id || '';
        let ipRecord = await prisma.iPAddress.findFirst({
          where: { address: addr, subnetId },
        });
        if (!ipRecord) {
          ipRecord = await prisma.iPAddress.create({
            data: {
              address: addr,
              status: 'ASSIGNED',
              deviceType: 'Switch',
              subnetId,
              vlanId: vlan129Id,
              description: `Management IP for Enterprise Switch 0${idx + 1}`,
            },
          });
        }
        mgmtIps.push(ipRecord.id);
      }

      // 3. Seed 3 Network Racks
      const rackMap = new Map<string, string>();
      const rackResults = await inTransactionChunks(prisma, rackRows, 50, async (tx, row) => {
        const [name, code, _locKey, hStr, dStr, wStr, kwStr, kgStr, notes] = row.split('|');
        return tx.networkRack.upsert({
          where: { code },
          update: {
            name,
            totalHeight: parseInt(hStr, 10),
            depth: parseInt(dStr, 10),
            width: parseInt(wStr, 10),
            maxPowerKw: parseFloat(kwStr),
            maxWeightKg: parseInt(kgStr, 10),
            status: RackStatus.ACTIVE,
            notes,
          },
          create: {
            name,
            code,
            totalHeight: parseInt(hStr, 10),
            depth: parseInt(dStr, 10),
            width: parseInt(wStr, 10),
            maxPowerKw: parseFloat(kwStr),
            maxWeightKg: parseInt(kgStr, 10),
            status: RackStatus.ACTIVE,
            notes,
          },
        });
      });

      for (let i = 0; i < rackRows.length; i++) {
        rackMap.set(rackRows[i].split('|')[1], rackResults[i].id);
      }
      logger.log(`Seeded ${rackMap.size} network equipment racks.`);

      // 4. Seed 4 Network Switches
      const assetMap = new Map<string, string>();
      if (ctx && ctx.assets.size > 0) {
        for (const [k, v] of ctx.assets.entries()) assetMap.set(k, v);
      } else {
        const neededAssets = await prisma.asset.findMany({
          where: { assetTag: { in: ['AST-1010', 'AST-1018', 'AST-1019', 'AST-1009', 'AST-1017'] } },
          select: { id: true, assetTag: true },
        });
        for (const a of neededAssets) {
          if (a.assetTag) assetMap.set(a.assetTag, a.id);
        }
      }

      const swResults = await inTransactionChunks(prisma, switchRows, 50, async (tx, row) => {
        const [
          name,
          model,
          vendor,
          serial,
          mac,
          mgmtIdxStr,
          fw,
          roleStr,
          portsStr,
          rackCode,
          posStr,
          vlanNumStr,
          assetTag,
          _locKey,
          notes,
        ] = row.split('|');
        const mgmtIdx = parseInt(mgmtIdxStr, 10);
        const role = roleStr as SwitchRole;
        const totalPorts = parseInt(portsStr, 10);
        const rackPosition = parseInt(posStr, 10);
        const defaultVlanId = vlanNumStr ? vlanMap.get(parseInt(vlanNumStr, 10)) || null : null;
        const assetId = assetTag ? assetMap.get(assetTag) || null : null;

        const swData = {
          name,
          model,
          vendor,
          serialNumber: serial,
          macAddress: mac,
          ipAddressId: mgmtIps[mgmtIdx] || null,
          firmwareVersion: fw,
          role,
          status: SwitchStatus.ONLINE,
          totalPorts,
          rackId: rackMap.get(rackCode) || null,
          rackPosition,
          rackHeight: 1,
          assetId,
          notes,
        };
        const created = await tx.networkSwitch.upsert({
          where: { serialNumber: serial },
          update: swData,
          create: swData,
        });
        return {
          id: created.id,
          name: created.name,
          totalPorts: created.totalPorts,
          defaultVlanId,
        };
      });

      logger.log(`Seeded ${swResults.length} network switches with hardware bindings.`);

      // 5. Seed Switch Ports with Realistic Tri-State Telemetry & Genuine Server Uplinks
      const allPortsData: Prisma.SwitchPortCreateManyInput[] = [];
      const getPortStatus = (
        idx: number,
      ): { admin: 'UP' | 'DOWN'; oper: 'ACTIVE' | 'DOWN' | 'CONNECTED_NO_SIGNAL' | 'RESERVED' } => {
        const mod = idx % 20;
        if (mod === 3 || mod === 10 || mod === 17) return { admin: 'DOWN', oper: 'DOWN' };
        if (mod === 6 || mod === 12 || mod === 18)
          return { admin: 'UP', oper: 'CONNECTED_NO_SIGNAL' };
        if (mod === 14) return { admin: 'UP', oper: 'RESERVED' };
        return { admin: 'UP', oper: 'ACTIVE' };
      };

      const ast1009Id = assetMap.get('AST-1009') || null;
      const ast1017Id = assetMap.get('AST-1017') || null;

      let totalCreatedPorts = 0;
      for (const sw of swResults) {
        for (let p = 1; p <= sw.totalPorts; p++) {
          const statusItem = getPortStatus(totalCreatedPorts + p);
          let connectedAssetId: string | null = null;
          let desc = `Access Port ${p}`;

          // Genuine Server Uplinks on Datacenter Core Switch
          if (sw.name === 'BSL-CORE-SW01' && p === 1 && ast1009Id) {
            connectedAssetId = ast1009Id;
            desc = 'Uplink: Dell PowerEdge R750 Enterprise Server (AST-1009)';
          } else if (sw.name === 'BSL-CORE-SW01' && p === 2 && ast1017Id) {
            connectedAssetId = ast1017Id;
            desc = 'Uplink: Dell PowerEdge R660 Virtualization Host (AST-1017)';
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

        // 4 dedicated 10G SFP+ Uplinks per switch
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

      await prisma.switchPort.deleteMany({
        where: { switchId: { in: swResults.map((s) => s.id) } },
      });

      await prisma.switchPort.createMany({ data: allPortsData });
      logger.log(`Seeded ${allPortsData.length} switch ports with tri-state telemetry.`);
    },
  );
}
