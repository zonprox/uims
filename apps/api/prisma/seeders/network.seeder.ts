import {
  NetworkDomain,
  type Prisma,
  type PrismaClient,
  RackStatus,
  SwitchRole,
  SwitchStatus,
  TopologyNodeType,
  TopologyViewMode,
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
  'Core Datacenter Rack 01|RACK-DC01|loc-bsl-bc-datacenter|42|1070|800|10.0|1200|Primary core infrastructure, leaf-spine switches, and virtualization hosts.|200|150',
  'Distribution Datacenter Rack 02|RACK-DC02|loc-bsl-bc-datacenter|42|1070|800|8.0|1000|Distribution switches, SAN storage arrays, and backup appliance cabinet.|550|150',
  'Factory 1 IDF Cabinet|RACK-F1-IDF|loc-bsl-f1|24|800|600|3.5|500|Factory 1 production floor intermediate distribution frame.|900|150',
  'Security CCTV & Video Surveillance Cabinet|RACK-CCTV-01|loc-bsl-bc-datacenter|24|800|600|4.0|600|Factory and datacenter CCTV security & NVR surveillance rack.|550|550',
];

export const switchRows: string[] = [
  'BSL-CORE-SW01|C9300-48P|Cisco Systems|FOC2488102|70:69:79:2A:41:01|0|17.9.4a|CORE|NETWORK|48|RACK-DC01|39|100|AST-1010|loc-bsl-bc-datacenter|BSL Datacenter Core Switch (Stack Master).|200|250',
  'BSL-DIST-SW01|C9200L-24P-4G|Cisco Systems|FOC2533K92|70:69:79:2A:41:02|1|17.6.5|DISTRIBUTION|NETWORK|24|RACK-DC01|37|130|AST-1018|loc-bsl-bc-datacenter|Business Center & Datacenter Distribution Switch.|550|250',
  'BSL-F1-ACC01|Aruba 6200F 24G|Aruba Networks|SG2410881|70:69:79:2A:41:03|2|10.12.1000|ACCESS|NETWORK|24|RACK-F1-IDF|20|131|AST-1019|loc-bsl-f1|Factory 1 Sewing & Production Line Access Switch.|900|250',
  'BSL-F1-IDF01|Compact 16-Port Access Switch|Aruba Networks|SG2410992|70:69:79:2A:41:04|3|10.12.1000|ACCESS|NETWORK|16|RACK-F1-IDF|18|131||loc-bsl-f1|Factory 1 IDF Compact Access Switch.|900|380',
  'BSL-CCTV-SW01|Catalyst 3850-24P PoE+|Cisco Systems|FOC2499CCTV1|70:69:79:2A:41:05|4|16.12.5|POE_ACCESS|CCTV|24|RACK-CCTV-01|12|97||loc-bsl-bc-datacenter|Enterprise CCTV PoE+ Surveillance Switch.|450|600',
  'BSL-F1-CCTV01|DS-3E2528P Managed PoE|Hikvision|HK2400CCTV2|70:69:79:2A:41:06|5|V4.2.1|POE_ACCESS|CCTV|24|RACK-CCTV-01|10|98||loc-bsl-bc-datacenter|Factory 1 CCTV Managed PoE Distribution Switch.|750|600',
];

interface TrunkLinkDef {
  switchA: string;
  portNumA: number;
  switchB: string;
  portNumB: number;
  speed: string;
  taggedVlans: number[];
  descA: string;
  descB: string;
}

const trunkLinks: TrunkLinkDef[] = [
  // Link 1: BSL-CORE-SW01 (port 49: Te1/0/49) <---> BSL-DIST-SW01 (port 25: Te1/0/25)
  {
    switchA: 'BSL-CORE-SW01',
    portNumA: 49,
    switchB: 'BSL-DIST-SW01',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [97, 100, 129, 130, 131, 132],
    descA: 'Trunk Uplink to BSL-DIST-SW01 Te1/0/25',
    descB: 'Trunk Uplink to BSL-CORE-SW01 Te1/0/49',
  },
  // Link 2: BSL-CORE-SW01 (port 50: Te1/0/50) <---> BSL-CCTV-SW01 (port 25: Te1/0/25)
  {
    switchA: 'BSL-CORE-SW01',
    portNumA: 50,
    switchB: 'BSL-CCTV-SW01',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [97, 98, 99, 125, 129],
    descA: 'Trunk Uplink to BSL-CCTV-SW01 Te1/0/25',
    descB: 'Trunk Uplink to BSL-CORE-SW01 Te1/0/50',
  },
  // Link 3: BSL-DIST-SW01 (port 26: Te1/0/26) <---> BSL-F1-ACC01 (port 25: Te1/0/25)
  {
    switchA: 'BSL-DIST-SW01',
    portNumA: 26,
    switchB: 'BSL-F1-ACC01',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [129, 130, 131],
    descA: 'Trunk Uplink to BSL-F1-ACC01 Te1/0/25',
    descB: 'Trunk Uplink to BSL-DIST-SW01 Te1/0/26',
  },
  // Link 4: BSL-CCTV-SW01 (port 26: Te1/0/26) <---> BSL-F1-CCTV01 (port 25: Te1/0/25)
  {
    switchA: 'BSL-CCTV-SW01',
    portNumA: 26,
    switchB: 'BSL-F1-CCTV01',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [97, 98, 129],
    descA: 'Trunk Uplink to BSL-F1-CCTV01 Te1/0/25',
    descB: 'Trunk Uplink to BSL-CCTV-SW01 Te1/0/26',
  },
  // Link 5: BSL-F1-ACC01 (port 24: Gi1/0/24) <---> BSL-F1-IDF01 (port 16: Gi1/0/16)
  {
    switchA: 'BSL-F1-ACC01',
    portNumA: 24,
    switchB: 'BSL-F1-IDF01',
    portNumB: 16,
    speed: '1 Gbps',
    taggedVlans: [131],
    descA: 'Trunk Uplink to BSL-F1-IDF01 Gi1/0/16',
    descB: 'Trunk Uplink to BSL-F1-ACC01 Gi1/0/24',
  },
];

export async function seedNetwork(prisma: PrismaClient, ctx?: SeederContext) {
  return runDomainSeeder(
    'NetworkSeeder',
    '🌐',
    'Enterprise Network Infrastructure Topology',
    async (logger) => {
      logger.log('Seeding canonical enterprise VLAN and Subnet topology...');

      const vlanMap = new Map<number, string>();

      const subnetUtilizationMap: Record<string, { usedIps: number; reservedIps: number }> = {
        '10.233.100.0/23': { usedIps: 418, reservedIps: 12 }, // 82.0% utilization (matches notif-003)
        '10.232.130.0/24': { usedIps: 235, reservedIps: 5 }, // 92.5% utilization (>90% critical access pool)
        '10.232.100.0/24': { usedIps: 24, reservedIps: 10 }, // 9.4% server infrastructure
        '10.232.129.0/24': { usedIps: 6, reservedIps: 6 }, // switch management pool
      };

      // 1. Seed VLANs & Subnets via bitwise calcSubnetDetails
      for (const row of standardSubnetRows) {
        const [cidr, vlanNumStr, vlanName, _locKey, gw, name, desc] = row.split('|');
        const vlanNumber = parseInt(vlanNumStr, 10);
        const isCctv = [97, 98, 99, 125].includes(vlanNumber);
        const domain = isCctv ? NetworkDomain.CCTV : NetworkDomain.NETWORK;

        const vlan = await prisma.vLAN.upsert({
          where: { vlanNumber },
          update: { name: vlanName, domain },
          create: { vlanNumber, name: vlanName, status: 'ACTIVE', domain },
        });
        vlanMap.set(vlanNumber, vlan.id);

        const details = calcSubnetDetails(cidr, gw);
        const util = subnetUtilizationMap[cidr] || { usedIps: 0, reservedIps: 0 };
        const subnetRecord = await prisma.subnet.upsert({
          where: { cidr },
          update: {
            name,
            domain,
            vlanId: vlan.id,
            gateway: details.gateway,
            networkAddress: details.networkAddress,
            netmask: details.netmask,
            broadcastAddress: details.broadcastAddress,
            startIp: details.startIp,
            endIp: details.endIp,
            totalIps: details.totalIps,
            usedIps: util.usedIps,
            reservedIps: util.reservedIps,
            description: desc,
          },
          create: {
            cidr,
            name,
            domain,
            vlanId: vlan.id,
            gateway: details.gateway,
            networkAddress: details.networkAddress,
            netmask: details.netmask,
            broadcastAddress: details.broadcastAddress,
            startIp: details.startIp,
            endIp: details.endIp,
            totalIps: details.totalIps,
            usedIps: util.usedIps,
            reservedIps: util.reservedIps,
            description: desc,
          },
        });
        if (ctx?.subnets) {
          ctx.subnets.set(cidr, subnetRecord.id);
          ctx.subnets.set(subnetRecord.id, subnetRecord.id);
        }
      }
      logger.log(`Seeded ${standardSubnetRows.length} subnets with bitwise IPAM calculation.`);

      // 2. Seed Switch Management IPs for all 6 switches
      const mgmtSubnet = await prisma.subnet.findUnique({ where: { cidr: '10.232.129.0/24' } });
      const mgmtIps: string[] = [];
      const mgmtIpAddresses = [
        '10.232.129.10',
        '10.232.129.11',
        '10.232.129.12',
        '10.232.129.13',
        '10.232.129.14',
        '10.232.129.15',
      ];
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

      // 2b. Seed Allocated IP Addresses for High-Utilization Subnets
      const hcmSubnet = await prisma.subnet.findUnique({ where: { cidr: '10.233.100.0/23' } });
      const vlan233Id = vlanMap.get(233) || null;
      if (hcmSubnet) {
        const hcmIps: Prisma.IPAddressCreateManyInput[] = [];
        for (let i = 2; i <= 419; i++) {
          const thirdOctet = 100 + Math.floor(i / 256);
          const fourthOctet = i % 256;
          const address = `10.233.${thirdOctet}.${fourthOctet}`;
          hcmIps.push({
            address,
            subnetId: hcmSubnet.id,
            vlanId: vlan233Id,
            status: 'ASSIGNED',
            deviceType: i < 50 ? 'Workstation' : i < 350 ? 'Laptop' : 'Office Device',
            description: `HCM Office D7 Active Device (Host ${i})`,
            pingStatus: 'online',
          });
        }
        await prisma.iPAddress.createMany({ data: hcmIps, skipDuplicates: true });
      }

      const accessSubnet = await prisma.subnet.findUnique({ where: { cidr: '10.232.130.0/24' } });
      const vlan130Id = vlanMap.get(130) || null;
      if (accessSubnet) {
        const accessIps: Prisma.IPAddressCreateManyInput[] = [];
        for (let i = 1; i <= 235; i++) {
          const address = `10.232.130.${i}`;
          accessIps.push({
            address,
            subnetId: accessSubnet.id,
            vlanId: vlan130Id,
            status: 'ASSIGNED',
            deviceType: i < 180 ? 'Biometric Terminal' : 'Wireless AP',
            description: `BSL Access Control Terminal MCC-${i.toString().padStart(3, '0')}`,
            pingStatus: 'online',
          });
        }
        await prisma.iPAddress.createMany({ data: accessIps, skipDuplicates: true });
      }

      // 3. Seed 4 Network Racks with Layout Coordinates
      const rackMap = new Map<string, string>();
      const rackResults = await inTransactionChunks(prisma, rackRows, 50, async (tx, row) => {
        const [name, code, _locKey, _hStr, dStr, wStr, kwStr, kgStr, notes, posXStr, posYStr] =
          row.split('|');
        const positionX = posXStr ? parseFloat(posXStr) : null;
        const positionY = posYStr ? parseFloat(posYStr) : null;
        return tx.networkRack.upsert({
          where: { code },
          update: {
            name,
            depth: parseInt(dStr, 10),
            width: parseInt(wStr, 10),
            maxPowerKw: parseFloat(kwStr),
            maxWeightKg: parseInt(kgStr, 10),
            positionX,
            positionY,
            status: RackStatus.ACTIVE,
            notes,
          },
          create: {
            name,
            code,
            depth: parseInt(dStr, 10),
            width: parseInt(wStr, 10),
            maxPowerKw: parseFloat(kwStr),
            maxWeightKg: parseInt(kgStr, 10),
            positionX,
            positionY,
            status: RackStatus.ACTIVE,
            notes,
          },
        });
      });

      for (let i = 0; i < rackRows.length; i++) {
        rackMap.set(rackRows[i].split('|')[1], rackResults[i].id);
      }
      logger.log(`Seeded ${rackMap.size} network equipment racks.`);

      // 4. Ensure CCTV and Endpoint Assets are registered with referential integrity
      const assetMap = new Map<string, string>();
      if (ctx && ctx.assets.size > 0) {
        for (const [k, v] of ctx.assets.entries()) assetMap.set(k, v);
      }

      const existingAssets = await prisma.asset.findMany({
        where: {
          OR: [
            {
              assetTag: {
                in: [
                  'AST-1009',
                  'AST-1010',
                  'AST-1014',
                  'AST-1017',
                  'AST-1018',
                  'AST-1019',
                  'AST-1035',
                  'AST-1036',
                  'AST-NVR-01',
                  'AST-CAM-001',
                  'AST-CAM-002',
                  'AST-CAM-003',
                  'AST-CAM-004',
                  'AST-CAM-005',
                  'AST-CAM-006',
                  'AST-CAM-007',
                  'AST-CAM-008',
                ],
              },
            },
            {
              subcode: {
                in: [
                  'AST-1009',
                  'AST-1010',
                  'AST-1014',
                  'AST-1017',
                  'AST-1018',
                  'AST-1019',
                  'AST-1035',
                  'AST-1036',
                  'AST-NVR-01',
                  'AST-CAM-001',
                  'AST-CAM-002',
                  'AST-CAM-003',
                  'AST-CAM-004',
                  'AST-CAM-005',
                  'AST-CAM-006',
                  'AST-CAM-007',
                  'AST-CAM-008',
                ],
              },
            },
          ],
        },
        select: { id: true, assetTag: true, subcode: true },
      });
      for (const a of existingAssets) {
        if (a.assetTag) assetMap.set(a.assetTag, a.id);
        if (a.subcode) assetMap.set(a.subcode, a.id);
      }

      // Ensure fallback department and device model for any missing CCTV endpoints
      const defaultDept = await prisma.department.findFirst({
        where: { code: 'DEPT-BSL-IT' },
        select: { id: true },
      });
      const fallbackDeptId =
        defaultDept?.id || (await prisma.department.findFirst({ select: { id: true } }))?.id || null;

      const cctvModel =
        (await prisma.deviceModel.findFirst({
          where: { modelCode: 'MOD-HIK-TERMINAL' },
          select: { id: true },
        })) || (await prisma.deviceModel.findFirst({ select: { id: true } }));

      const cctvAssetDefs = [
        {
          tag: 'AST-NVR-01',
          serial: 'HTW-NVR-6401',
          notes: 'Hanwha Techwin 64CH Enterprise NVR Video Storage.',
        },
        {
          tag: 'AST-CAM-001',
          serial: 'HTW-CAM-001',
          notes: 'Hanwha XNO-6080R Bullet Camera Main Perimeter.',
        },
        {
          tag: 'AST-CAM-002',
          serial: 'HTW-CAM-002',
          notes: 'Hanwha QND-6082R Dome Camera Datacenter.',
        },
        {
          tag: 'AST-CAM-003',
          serial: 'HK-CAM-003',
          notes: 'Hikvision DS-2CD2143G2 Dome Camera Corridor.',
        },
        {
          tag: 'AST-CAM-004',
          serial: 'HK-CAM-004',
          notes: 'Hikvision DS-2CD2043G2 Bullet Camera Solar Substation.',
        },
        {
          tag: 'AST-CAM-005',
          serial: 'HK-CAM-005',
          notes: 'Factory 1 Vehicle Entrance ANPR Camera.',
        },
        {
          tag: 'AST-CAM-006',
          serial: 'HK-CAM-006',
          notes: 'Factory 1 Sewing Production Floor Camera.',
        },
        {
          tag: 'AST-CAM-007',
          serial: 'HK-CAM-007',
          notes: 'Factory 1 Shipping Loading Dock Camera.',
        },
        {
          tag: 'AST-CAM-008',
          serial: 'HK-CAM-008',
          notes: 'Factory 1 North Emergency Exit Camera.',
        },
      ];

      if (cctvModel) {
        for (const cad of cctvAssetDefs) {
          if (!assetMap.has(cad.tag)) {
            const created = await prisma.asset.upsert({
              where: { subcode: cad.tag },
              update: {
                assetTag: cad.tag,
                serialNumber: cad.serial,
                deviceModelId: cctvModel.id,
                departmentId: fallbackDeptId,
                status: 'IN_USE',
                notes: cad.notes,
              },
              create: {
                assetTag: cad.tag,
                subcode: cad.tag,
                serialNumber: cad.serial,
                deviceModelId: cctvModel.id,
                departmentId: fallbackDeptId,
                status: 'IN_USE',
                notes: cad.notes,
              },
            });
            assetMap.set(cad.tag, created.id);
            if (ctx?.assets) {
              ctx.assets.set(cad.tag, created.id);
            }
          }
        }
      }

      // 5. Seed 6 Network Switches
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
          domainStr,
          portsStr,
          rackCode,
          posStr,
          vlanNumStr,
          assetTag,
          _locKey,
          notes,
          posXStr,
          posYStr,
        ] = row.split('|');
        const mgmtIdx = parseInt(mgmtIdxStr, 10);
        const role = roleStr as SwitchRole;
        const domain = domainStr as NetworkDomain;
        const totalPorts = parseInt(portsStr, 10);
        const rackPosition = parseInt(posStr, 10);
        const defaultVlanId = vlanNumStr ? vlanMap.get(parseInt(vlanNumStr, 10)) || null : null;
        const assetId = assetTag ? assetMap.get(assetTag) || null : null;
        const positionX = posXStr ? parseFloat(posXStr) : null;
        const positionY = posYStr ? parseFloat(posYStr) : null;

        const swData = {
          name,
          model,
          vendor,
          serialNumber: serial,
          macAddress: mac,
          ipAddressId: mgmtIps[mgmtIdx] || null,
          firmwareVersion: fw,
          role,
          domain,
          status: SwitchStatus.ONLINE,
          totalPorts,
          rackId: rackMap.get(rackCode) || null,
          rackPosition,
          rackHeight: 1,
          positionX,
          positionY,
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
          role: created.role,
          domain: created.domain,
          totalPorts: created.totalPorts,
          defaultVlanId,
        };
      });

      logger.log(`Seeded ${swResults.length} network switches with hardware bindings.`);

      // 6. Seed Switch Ports with Realistic Tri-State Telemetry & Dedicated Uplinks
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
      const ast1014Id = assetMap.get('AST-1014') || null;
      const ast1035Id = assetMap.get('AST-1035') || null;
      const astNvr01Id = assetMap.get('AST-NVR-01') || null;
      const astCam001Id = assetMap.get('AST-CAM-001') || null;
      const astCam002Id = assetMap.get('AST-CAM-002') || null;
      const astCam003Id = assetMap.get('AST-CAM-003') || null;
      const astCam004Id = assetMap.get('AST-CAM-004') || null;
      const astCam005Id = assetMap.get('AST-CAM-005') || null;
      const astCam006Id = assetMap.get('AST-CAM-006') || null;
      const astCam007Id = assetMap.get('AST-CAM-007') || null;
      const astCam008Id = assetMap.get('AST-CAM-008') || null;

      let totalCreatedPorts = 0;
      for (const sw of swResults) {
        const isPoeSwitch = sw.role === SwitchRole.POE_ACCESS;

        for (let p = 1; p <= sw.totalPorts; p++) {
          const statusItem = getPortStatus(totalCreatedPorts + p);
          let connectedAssetId: string | null = null;
          let desc = `Access Port ${p}`;
          let poeEnabled = isPoeSwitch;
          let adminStatus = statusItem.admin;
          let operStatus = statusItem.oper;
          let speed: string | null = statusItem.oper === 'DOWN' ? null : '1 Gbps';

          // Specific Endpoint Attachments
          if (sw.name === 'BSL-CORE-SW01') {
            poeEnabled = false;
            if (p === 1 && ast1009Id) {
              connectedAssetId = ast1009Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              desc = 'Uplink: Dell PowerEdge R750 Enterprise Server (AST-1009)';
            } else if (p === 2 && ast1017Id) {
              connectedAssetId = ast1017Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              desc = 'Uplink: Dell PowerEdge R660 Virtualization Host (AST-1017)';
            }
          } else if (sw.name === 'BSL-F1-ACC01') {
            if (p === 1 && ast1014Id) {
              connectedAssetId = ast1014Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              poeEnabled = true;
              desc = 'Access Point: Cisco Catalyst AP 9130AX (AST-1014)';
            } else if (p === 2 && ast1035Id) {
              connectedAssetId = ast1035Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              poeEnabled = true;
              desc = 'Terminal: Hikvision DS-K1T671MF Face Terminal (AST-1035)';
            }
          } else if (sw.name === 'BSL-CCTV-SW01') {
            poeEnabled = true;
            if (p === 1 && astNvr01Id) {
              connectedAssetId = astNvr01Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              poeEnabled = false;
              desc = 'NVR Storage: Hanwha Techwin 64CH Enterprise NVR';
            } else if (p === 2 && astCam001Id) {
              connectedAssetId = astCam001Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              desc = 'CCTV: Hanwha XNO-6080R Bullet Camera Main Perimeter';
            } else if (p === 3 && astCam002Id) {
              connectedAssetId = astCam002Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              desc = 'CCTV: Hanwha QND-6082R Dome Camera Datacenter';
            } else if (p === 4 && astCam003Id) {
              connectedAssetId = astCam003Id;
              adminStatus = 'UP';
              operStatus = 'CONNECTED_NO_SIGNAL';
              speed = '100 Mbps';
              desc = 'CCTV: Hikvision DS-2CD2143G2 Dome Camera (Signal Loss)';
            } else if (p === 5 && astCam004Id) {
              connectedAssetId = astCam004Id;
              adminStatus = 'DOWN';
              operStatus = 'DOWN';
              speed = null;
              poeEnabled = false;
              desc = 'CCTV: Hikvision DS-2CD2043G2 Bullet Camera (Offline)';
            }
          } else if (sw.name === 'BSL-F1-CCTV01') {
            poeEnabled = true;
            if (p === 1 && astCam005Id) {
              connectedAssetId = astCam005Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              desc = 'CCTV: Factory 1 Vehicle Entrance ANPR Camera';
            } else if (p === 2 && astCam006Id) {
              connectedAssetId = astCam006Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              desc = 'CCTV: Factory 1 Sewing Production Floor Camera';
            } else if (p === 3 && astCam007Id) {
              connectedAssetId = astCam007Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '1 Gbps';
              desc = 'CCTV: Factory 1 Shipping Loading Dock Camera';
            } else if (p === 4 && astCam008Id) {
              connectedAssetId = astCam008Id;
              adminStatus = 'UP';
              operStatus = 'CONNECTED_NO_SIGNAL';
              speed = '100 Mbps';
              desc = 'CCTV: Factory 1 North Emergency Exit Camera (Signal Loss)';
            }
          }

          allPortsData.push({
            switchId: sw.id,
            portNumber: p,
            name: `Gi1/0/${p}`,
            formFactor: 'RJ45_1G',
            poeEnabled,
            adminStatus,
            operStatus,
            speed,
            duplex: operStatus === 'DOWN' ? null : 'Full',
            vlanId: sw.defaultVlanId,
            mode: 'ACCESS',
            connectedAssetId,
            description: desc,
          });
        }

        // 4 dedicated 10G SFP+ Uplinks per switch
        for (let u = 1; u <= 4; u++) {
          const portNum = sw.totalPorts + u;
          allPortsData.push({
            switchId: sw.id,
            portNumber: portNum,
            name: `Te1/0/${portNum}`,
            formFactor: 'SFP_PLUS_10G',
            poeEnabled: false,
            adminStatus: 'UP',
            operStatus: 'DOWN', // Will be set to ACTIVE by inter-switch links
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

      // 7. Establish Symmetrical Inter-Switch Trunk Uplinks
      logger.log('Establishing symmetrical inter-switch trunk uplinks...');
      const createdPorts = await prisma.switchPort.findMany({
        where: { switchId: { in: swResults.map((s) => s.id) } },
        select: { id: true, switchId: true, portNumber: true, switch: { select: { name: true } } },
      });

      const portLookup = new Map<string, string>(); // `${switchName}:${portNumber}` -> portId
      for (const cp of createdPorts) {
        portLookup.set(`${cp.switch.name}:${cp.portNumber}`, cp.id);
      }

      for (const link of trunkLinks) {
        const portAId = portLookup.get(`${link.switchA}:${link.portNumA}`);
        const portBId = portLookup.get(`${link.switchB}:${link.portNumB}`);

        if (portAId && portBId) {
          await prisma.switchPort.update({
            where: { id: portAId },
            data: {
              connectedPortId: portBId,
              mode: 'TRUNK',
              adminStatus: 'UP',
              operStatus: 'ACTIVE',
              speed: link.speed,
              taggedVlanIds: link.taggedVlans,
              description: link.descA,
            },
          });

          await prisma.switchPort.update({
            where: { id: portBId },
            data: {
              connectedPortId: portAId,
              mode: 'TRUNK',
              adminStatus: 'UP',
              operStatus: 'ACTIVE',
              speed: link.speed,
              taggedVlanIds: link.taggedVlans,
              description: link.descB,
            },
          });
        }
      }
      logger.log(`Connected ${trunkLinks.length} inter-switch trunk links.`);

      // 8. Seed Initial Canvas Layout Positions in TopologyNodePosition
      logger.log('Seeding initial multi-perspective canvas layout positions...');
      const switchIdMap = new Map<string, string>();
      for (const sw of swResults) {
        switchIdMap.set(sw.name, sw.id);
      }

      interface SeedPositionDef {
        nodeId: string;
        nodeType: TopologyNodeType;
        viewMode: TopologyViewMode;
        x: number;
        y: number;
      }

      const initialPositions: SeedPositionDef[] = [];

      // View Mode: ALL
      for (const r of rackRows) {
        const [_, code, __, ___, ____, _____, ______, _______, ________, posXStr, posYStr] =
          r.split('|');
        const rackId = rackMap.get(code);
        if (rackId && posXStr && posYStr) {
          initialPositions.push({
            nodeId: rackId,
            nodeType: TopologyNodeType.RACK,
            viewMode: TopologyViewMode.ALL,
            x: parseFloat(posXStr),
            y: parseFloat(posYStr),
          });
        }
      }

      for (const sw of switchRows) {
        const [name, _m, _v, _s, _mac, _idx, _fw, _role, _dom, _p, _rCode, _pos, _vlan, _a, _l, _n, posXStr, posYStr] =
          sw.split('|');
        const switchId = switchIdMap.get(name);
        if (switchId && posXStr && posYStr) {
          initialPositions.push({
            nodeId: switchId,
            nodeType: TopologyNodeType.SWITCH,
            viewMode: TopologyViewMode.ALL,
            x: parseFloat(posXStr),
            y: parseFloat(posYStr),
          });
        }
      }

      // View Mode: NETWORK
      const networkSwitchPositions: Record<string, { x: number; y: number }> = {
        'BSL-CORE-SW01': { x: 300, y: 150 },
        'BSL-DIST-SW01': { x: 600, y: 150 },
        'BSL-F1-ACC01': { x: 900, y: 150 },
        'BSL-F1-IDF01': { x: 900, y: 320 },
      };
      for (const [swName, pos] of Object.entries(networkSwitchPositions)) {
        const swId = switchIdMap.get(swName);
        if (swId) {
          initialPositions.push({
            nodeId: swId,
            nodeType: TopologyNodeType.SWITCH,
            viewMode: TopologyViewMode.NETWORK,
            x: pos.x,
            y: pos.y,
          });
        }
      }

      // View Mode: CCTV
      const cctvSwitchPositions: Record<string, { x: number; y: number }> = {
        'BSL-CCTV-SW01': { x: 400, y: 250 },
        'BSL-F1-CCTV01': { x: 750, y: 250 },
      };
      for (const [swName, pos] of Object.entries(cctvSwitchPositions)) {
        const swId = switchIdMap.get(swName);
        if (swId) {
          initialPositions.push({
            nodeId: swId,
            nodeType: TopologyNodeType.SWITCH,
            viewMode: TopologyViewMode.CCTV,
            x: pos.x,
            y: pos.y,
          });
        }
      }

      for (const ip of initialPositions) {
        await prisma.topologyNodePosition.upsert({
          where: {
            nodeId_viewMode: {
              nodeId: ip.nodeId,
              viewMode: ip.viewMode,
            },
          },
          update: {
            positionX: ip.x,
            positionY: ip.y,
            nodeType: ip.nodeType,
          },
          create: {
            nodeId: ip.nodeId,
            nodeType: ip.nodeType,
            viewMode: ip.viewMode,
            positionX: ip.x,
            positionY: ip.y,
          },
        });
      }
      logger.log(`Seeded ${initialPositions.length} persistent multi-perspective canvas layout positions.`);
    },
  );
}
