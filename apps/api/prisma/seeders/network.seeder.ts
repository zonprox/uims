import {
  InfrastructureDomain,
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

export const canonicalSubnetRows: string[] = [
  '10.0.10.0/24|10|Management VLAN|RCK-MDF-01|10.0.10.1|Switch Out-of-Band Management|Switch, router and PDU out-of-band management',
  '10.0.20.0/24|20|Server Infrastructure|RCK-MDF-01|10.0.20.1|Datacenter Server Network|Dell PowerEdge hypervisors, ERP, and database hosts',
  '10.0.30.0/24|30|Corporate Office Network|RCK-IDF-F2|10.0.30.1|Office & Floor Corporate Network|Production floor terminals, office workstations and APs',
  '192.168.40.0/24|40|Guest Wi-Fi Subnet|RCK-IDF-F2|192.168.40.1|Visitor Wireless Network|Isolated visitor and vendor guest wireless access',
  '172.16.100.0/24|105|Surveillance Management|RCK-MDF-02|172.16.100.1|CCTV Video Management|CCTV switches, video decoders and matrix controllers',
  '172.16.110.0/23|110|IP Cameras Surveillance|RCK-IDF-F1|172.16.110.1|4K IP Camera Fleet|4K PTZ, Bullet and Dome PoE camera surveillance fleet',
  '172.16.120.0/24|120|NVR Video Storage|RCK-MDF-02|172.16.120.1|Enterprise NVR Video Arrays|Hanwha Techwin 64CH Enterprise NVR storage arrays',
];

export const canonicalRackRows: string[] = [
  'Datacenter Core MDF Rack 01|RCK-MDF-01|loc-bsl-bc-datacenter|42|1070|800|12.0|1500|Primary core infrastructure, leaf-spine switches, and virtualization hosts.|200|80',
  'Datacenter Dist & CCTV MDF Rack 02|RCK-MDF-02|loc-bsl-bc-datacenter|42|1070|800|10.0|1200|Distribution switches, SAN storage arrays, and backup appliance cabinet.|600|80',
  'Factory Floor 1 IDF Closet|RCK-IDF-F1|loc-bsl-f1|42|800|600|4.5|600|Factory 1 production floor intermediate distribution frame.|1000|80',
  'Office Floor 2 IDF Closet|RCK-IDF-F2|loc-bsl-bc-datacenter|42|800|600|3.5|500|Office Floor 2 corporate intermediate distribution frame.|1400|80',
  'Central Warehouse Logistics IDF|RCK-IDF-WH|loc-bsl-f1|42|800|600|4.0|600|Logistics warehouse intermediate distribution frame.|1800|80',
];

export const legacyRackRows: string[] = [
  'Core Datacenter Rack 01|RACK-DC01|loc-bsl-bc-datacenter|42|1070|800|10.0|1200|Primary core infrastructure, leaf-spine switches, and virtualization hosts.|200|150',
  'Distribution Datacenter Rack 02|RACK-DC02|loc-bsl-bc-datacenter|42|1070|800|8.0|1000|Distribution switches, SAN storage arrays, and backup appliance cabinet.|550|150',
  'Factory 1 IDF Cabinet|RACK-F1-IDF|loc-bsl-f1|24|800|600|3.5|500|Factory 1 production floor intermediate distribution frame.|900|150',
  'Security CCTV & Video Surveillance Cabinet|RACK-CCTV-01|loc-bsl-bc-datacenter|24|800|600|4.0|600|Factory and datacenter CCTV security & NVR surveillance rack.|550|550',
];

export const canonicalSwitchRows: string[] = [
  'SW-CORE-01|Catalyst 9500-48Y4C|Cisco Systems|FOC-9500-01|70:69:79:2A:50:01|0|17.9.4a|CORE|NETWORK|48|RCK-MDF-01|40|10||loc-bsl-bc-datacenter|Enterprise Core Spine Switch 01|250|180',
  'SW-CORE-02|Catalyst 9500-48Y4C|Cisco Systems|FOC-9500-02|70:69:79:2A:50:02|1|17.9.4a|CORE|NETWORK|48|RCK-MDF-01|38|10||loc-bsl-bc-datacenter|Enterprise Core Spine Switch 02|450|180',
  'SW-DIST-01|Catalyst 9300-24T|Cisco Systems|FOC-9300-01|70:69:79:2A:50:03|2|17.6.5|DISTRIBUTION|NETWORK|24|RCK-MDF-02|36|10||loc-bsl-bc-datacenter|Datacenter Distribution Switch 01|600|350',
  'SW-DIST-02|Catalyst 9300-24T|Cisco Systems|FOC-9300-02|70:69:79:2A:50:04|3|17.6.5|DISTRIBUTION|NETWORK|24|RCK-MDF-02|34|10||loc-bsl-bc-datacenter|Datacenter Distribution Switch 02|800|350',
  'SW-ACC-F1-01|Aruba CX 6200F 24G PoE+|Aruba Networks|SG-6200-F1|70:69:79:2A:50:05|4|10.12.1000|ACCESS|NETWORK|24|RCK-IDF-F1|20|30||loc-bsl-f1|Floor 1 Factory Access Switch|1050|520',
  'SW-ACC-F2-01|Catalyst 9200L-24P-4G|Cisco Systems|FOC-9200-F2|70:69:79:2A:50:06|5|17.6.5|ACCESS|NETWORK|24|RCK-IDF-F2|20|30||loc-bsl-bc-datacenter|Floor 2 Office Access Switch|1400|520',
  'SW-ACC-WH-01|Aruba CX 6200F 24G PoE+|Aruba Networks|SG-6200-WH1|70:69:79:2A:50:07|6|10.12.1000|ACCESS|NETWORK|24|RCK-IDF-WH|20|30||loc-bsl-f1|Logistics Warehouse Access Switch 01|1750|520',
  'SW-ACC-WH-02|Compact 16-Port Managed PoE|Aruba Networks|SG-6200-WH2|70:69:79:2A:50:08|7|10.12.1000|ACCESS|NETWORK|16|RCK-IDF-WH|18|30||loc-bsl-f1|Logistics Warehouse Access Switch 02|1950|520',
  'SW-CCTV-01|Catalyst 3850-24P PoE+|Cisco Systems|FOC-3850-CCTV1|70:69:79:2A:50:09|8|16.12.5|POE_ACCESS|CCTV|24|RCK-MDF-02|22|105||loc-bsl-bc-datacenter|Datacenter CCTV Core PoE Switch|500|520',
  'SW-CCTV-02|DS-3E2528P Managed PoE|Hikvision|HK-2528-CCTV2|70:69:79:2A:50:10|9|V4.2.1|POE_ACCESS|CCTV|24|RCK-IDF-F1|16|105||loc-bsl-f1|Floor 1 CCTV Managed PoE Switch|750|520',
];

export const legacySwitchRows: string[] = [
  'BSL-CORE-SW01|C9300-48P|Cisco Systems|FOC2488102|70:69:79:2A:41:01|10|17.9.4a|CORE|NETWORK|48|RACK-DC01|39|100|AST-1010|loc-bsl-bc-datacenter|BSL Datacenter Core Switch (Stack Master).|200|250',
  'BSL-DIST-SW01|C9200L-24P-4G|Cisco Systems|FOC2533K92|70:69:79:2A:41:02|11|17.6.5|DISTRIBUTION|NETWORK|24|RACK-DC01|37|130|AST-1018|loc-bsl-bc-datacenter|Business Center & Datacenter Distribution Switch.|550|250',
  'BSL-F1-ACC01|Aruba 6200F 24G|Aruba Networks|SG2410881|70:69:79:2A:41:03|12|10.12.1000|ACCESS|NETWORK|24|RACK-F1-IDF|20|131|AST-1019|loc-bsl-f1|Factory 1 Sewing & Production Line Access Switch.|900|250',
  'BSL-F1-IDF01|Compact 16-Port Access Switch|Aruba Networks|SG2410992|70:69:79:2A:41:04|13|10.12.1000|ACCESS|NETWORK|16|RACK-F1-IDF|18|131||loc-bsl-f1|Factory 1 IDF Compact Access Switch.|900|380',
  'BSL-CCTV-SW01|Catalyst 3850-24P PoE+|Cisco Systems|FOC2499CCTV1|70:69:79:2A:41:05|14|16.12.5|POE_ACCESS|CCTV|24|RACK-CCTV-01|12|97||loc-bsl-bc-datacenter|Enterprise CCTV PoE+ Surveillance Switch.|450|600',
  'BSL-F1-CCTV01|DS-3E2528P Managed PoE|Hikvision|HK2400CCTV2|70:69:79:2A:41:06|15|V4.2.1|POE_ACCESS|CCTV|24|RACK-CCTV-01|10|98||loc-bsl-bc-datacenter|Factory 1 CCTV Managed PoE Distribution Switch.|750|600',
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

export const canonicalTrunkLinks: TrunkLinkDef[] = [
  // Link 1: SW-CORE-01 (Port 51) <---> SW-CORE-02 (Port 51) (Core VPC Spine Interconnect 1)
  {
    switchA: 'SW-CORE-01',
    portNumA: 51,
    switchB: 'SW-CORE-02',
    portNumB: 51,
    speed: '40 Gbps',
    taggedVlans: [10, 20, 30, 40, 105, 110, 120],
    descA: 'VPC Spine Interconnect 1 to SW-CORE-02 QSFP-51',
    descB: 'VPC Spine Interconnect 1 to SW-CORE-01 QSFP-51',
  },
  // Link 2: SW-CORE-01 (Port 52) <---> SW-CORE-02 (Port 52) (Core VPC Spine Interconnect 2)
  {
    switchA: 'SW-CORE-01',
    portNumA: 52,
    switchB: 'SW-CORE-02',
    portNumB: 52,
    speed: '40 Gbps',
    taggedVlans: [10, 20, 30, 40, 105, 110, 120],
    descA: 'VPC Spine Interconnect 2 to SW-CORE-02 QSFP-52',
    descB: 'VPC Spine Interconnect 2 to SW-CORE-01 QSFP-52',
  },
  // Link 3: SW-CORE-01 (Port 49) <---> SW-DIST-01 (Port 25)
  {
    switchA: 'SW-CORE-01',
    portNumA: 49,
    switchB: 'SW-DIST-01',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [10, 20, 30, 40, 105, 110, 120],
    descA: 'Trunk Uplink to SW-DIST-01 Te1/0/25',
    descB: 'Trunk Uplink to SW-CORE-01 Te1/0/49',
  },
  // Link 4: SW-CORE-02 (Port 49) <---> SW-DIST-01 (Port 26)
  {
    switchA: 'SW-CORE-02',
    portNumA: 49,
    switchB: 'SW-DIST-01',
    portNumB: 26,
    speed: '10 Gbps',
    taggedVlans: [10, 20, 30, 40, 105, 110, 120],
    descA: 'Trunk Uplink to SW-DIST-01 Te1/0/26',
    descB: 'Trunk Uplink to SW-CORE-02 Te1/0/49',
  },
  // Link 5: SW-CORE-01 (Port 50) <---> SW-DIST-02 (Port 25)
  {
    switchA: 'SW-CORE-01',
    portNumA: 50,
    switchB: 'SW-DIST-02',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [10, 20, 30, 40, 105, 110, 120],
    descA: 'Trunk Uplink to SW-DIST-02 Te1/0/25',
    descB: 'Trunk Uplink to SW-CORE-01 Te1/0/50',
  },
  // Link 6: SW-CORE-02 (Port 50) <---> SW-DIST-02 (Port 26)
  {
    switchA: 'SW-CORE-02',
    portNumA: 50,
    switchB: 'SW-DIST-02',
    portNumB: 26,
    speed: '10 Gbps',
    taggedVlans: [10, 20, 30, 40, 105, 110, 120],
    descA: 'Trunk Uplink to SW-DIST-02 Te1/0/26',
    descB: 'Trunk Uplink to SW-CORE-02 Te1/0/50',
  },
  // Link 7: SW-DIST-01 (Port 27) <---> SW-ACC-F1-01 (Port 25)
  {
    switchA: 'SW-DIST-01',
    portNumA: 27,
    switchB: 'SW-ACC-F1-01',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [10, 30, 40],
    descA: 'Trunk Uplink to SW-ACC-F1-01 Te1/0/25',
    descB: 'Trunk Uplink to SW-DIST-01 Te1/0/27',
  },
  // Link 8: SW-DIST-02 (Port 27) <---> SW-ACC-F2-01 (Port 25)
  {
    switchA: 'SW-DIST-02',
    portNumA: 27,
    switchB: 'SW-ACC-F2-01',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [10, 30, 40],
    descA: 'Trunk Uplink to SW-ACC-F2-01 Te1/0/25',
    descB: 'Trunk Uplink to SW-DIST-02 Te1/0/27',
  },
  // Link 9: SW-DIST-01 (Port 28) <---> SW-ACC-WH-01 (Port 25)
  {
    switchA: 'SW-DIST-01',
    portNumA: 28,
    switchB: 'SW-ACC-WH-01',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [10, 30, 40],
    descA: 'Trunk Uplink to SW-ACC-WH-01 Te1/0/25',
    descB: 'Trunk Uplink to SW-DIST-01 Te1/0/28',
  },
  // Link 10: SW-ACC-WH-01 (Port 24) <---> SW-ACC-WH-02 (Port 17)
  {
    switchA: 'SW-ACC-WH-01',
    portNumA: 24,
    switchB: 'SW-ACC-WH-02',
    portNumB: 17,
    speed: '1 Gbps',
    taggedVlans: [10, 30],
    descA: 'Cascade Trunk Link to SW-ACC-WH-02 SFP-17',
    descB: 'Cascade Trunk Link to SW-ACC-WH-01 Gi1/0/24',
  },
  // Link 11: SW-DIST-02 (Port 28) <---> SW-CCTV-01 (Port 25)
  {
    switchA: 'SW-DIST-02',
    portNumA: 28,
    switchB: 'SW-CCTV-01',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [105, 110, 120],
    descA: 'Trunk Uplink to SW-CCTV-01 Te1/0/25',
    descB: 'Trunk Uplink to SW-DIST-02 Te1/0/28',
  },
  // Link 12: SW-CCTV-01 (Port 26) <---> SW-CCTV-02 (Port 25)
  {
    switchA: 'SW-CCTV-01',
    portNumA: 26,
    switchB: 'SW-CCTV-02',
    portNumB: 25,
    speed: '10 Gbps',
    taggedVlans: [105, 110, 120],
    descA: 'Trunk Uplink to SW-CCTV-02 Te1/0/25',
    descB: 'Trunk Uplink to SW-CCTV-01 Te1/0/26',
  },
];

export const legacyTrunkLinks: TrunkLinkDef[] = [
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
    'Canonical Enterprise Network & CCTV Topology (Milestone 7)',
    async (logger) => {
      logger.log('Seeding canonical enterprise VLAN and Subnet topology...');

      const vlanMap = new Map<number, string>();

      const subnetUtilizationMap: Record<string, { usedIps: number; reservedIps: number }> = {
        '10.233.100.0/23': { usedIps: 418, reservedIps: 12 }, // 82.0% utilization (matches notif-003)
        '10.232.130.0/24': { usedIps: 235, reservedIps: 5 }, // 92.5% utilization (>90% critical access pool)
        '10.232.100.0/24': { usedIps: 24, reservedIps: 10 }, // 9.4% server infrastructure
        '10.232.129.0/24': { usedIps: 16, reservedIps: 6 }, // switch management pool
        '10.0.10.0/24': { usedIps: 20, reservedIps: 5 }, // canonical mgmt
        '10.0.20.0/24': { usedIps: 16, reservedIps: 4 }, // canonical servers
        '10.0.30.0/24': { usedIps: 45, reservedIps: 5 }, // canonical corporate
        '192.168.40.0/24': { usedIps: 30, reservedIps: 2 }, // canonical guest
        '172.16.100.0/24': { usedIps: 12, reservedIps: 4 }, // canonical surveillance mgmt
        '172.16.110.0/23': { usedIps: 48, reservedIps: 8 }, // canonical camera fleet
        '172.16.120.0/24': { usedIps: 8, reservedIps: 2 }, // canonical NVR storage
      };

      // 1. Seed Standard & Canonical VLANs & Subnets
      const allSubnetRows = [...standardSubnetRows, ...canonicalSubnetRows];
      for (const row of allSubnetRows) {
        const [cidr, vlanNumStr, vlanName, _locKey, gw, name, desc] = row.split('|');
        const vlanNumber = parseInt(vlanNumStr, 10);
        const isCctv = [97, 98, 99, 105, 110, 120, 125].includes(vlanNumber);
        const domain = isCctv ? InfrastructureDomain.CCTV : InfrastructureDomain.NETWORK;

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
      logger.log(`Seeded ${allSubnetRows.length} subnets and VLANs with bitwise IPAM calculation.`);

      // 2. Seed Switch Management IPs
      const mgmtSubnet129 = await prisma.subnet.findUnique({ where: { cidr: '10.232.129.0/24' } });
      const mgmtSubnet10 = await prisma.subnet.findUnique({ where: { cidr: '10.0.10.0/24' } });
      const cctvSubnet100 = await prisma.subnet.findUnique({ where: { cidr: '172.16.100.0/24' } });

      const mgmtIpMap = new Map<string, string>(); // IP address string -> IPAddress ID

      const allMgmtAddresses = [
        // Canonical Switches
        { ip: '10.0.10.11', subnetId: mgmtSubnet10?.id || '', vlanId: vlanMap.get(10) || null, desc: 'Management IP for SW-CORE-01' },
        { ip: '10.0.10.12', subnetId: mgmtSubnet10?.id || '', vlanId: vlanMap.get(10) || null, desc: 'Management IP for SW-CORE-02' },
        { ip: '10.0.10.13', subnetId: mgmtSubnet10?.id || '', vlanId: vlanMap.get(10) || null, desc: 'Management IP for SW-DIST-01' },
        { ip: '10.0.10.14', subnetId: mgmtSubnet10?.id || '', vlanId: vlanMap.get(10) || null, desc: 'Management IP for SW-DIST-02' },
        { ip: '10.0.10.15', subnetId: mgmtSubnet10?.id || '', vlanId: vlanMap.get(10) || null, desc: 'Management IP for SW-ACC-F1-01' },
        { ip: '10.0.10.16', subnetId: mgmtSubnet10?.id || '', vlanId: vlanMap.get(10) || null, desc: 'Management IP for SW-ACC-F2-01' },
        { ip: '10.0.10.17', subnetId: mgmtSubnet10?.id || '', vlanId: vlanMap.get(10) || null, desc: 'Management IP for SW-ACC-WH-01' },
        { ip: '10.0.10.18', subnetId: mgmtSubnet10?.id || '', vlanId: vlanMap.get(10) || null, desc: 'Management IP for SW-ACC-WH-02' },
        { ip: '172.16.100.11', subnetId: cctvSubnet100?.id || '', vlanId: vlanMap.get(105) || null, desc: 'Management IP for SW-CCTV-01' },
        { ip: '172.16.100.12', subnetId: cctvSubnet100?.id || '', vlanId: vlanMap.get(105) || null, desc: 'Management IP for SW-CCTV-02' },
        // Legacy Switches
        { ip: '10.232.129.10', subnetId: mgmtSubnet129?.id || '', vlanId: vlanMap.get(129) || null, desc: 'Management IP for BSL-CORE-SW01' },
        { ip: '10.232.129.11', subnetId: mgmtSubnet129?.id || '', vlanId: vlanMap.get(129) || null, desc: 'Management IP for BSL-DIST-SW01' },
        { ip: '10.232.129.12', subnetId: mgmtSubnet129?.id || '', vlanId: vlanMap.get(129) || null, desc: 'Management IP for BSL-F1-ACC01' },
        { ip: '10.232.129.13', subnetId: mgmtSubnet129?.id || '', vlanId: vlanMap.get(129) || null, desc: 'Management IP for BSL-F1-IDF01' },
        { ip: '10.232.129.14', subnetId: mgmtSubnet129?.id || '', vlanId: vlanMap.get(129) || null, desc: 'Management IP for BSL-CCTV-SW01' },
        { ip: '10.232.129.15', subnetId: mgmtSubnet129?.id || '', vlanId: vlanMap.get(129) || null, desc: 'Management IP for BSL-F1-CCTV01' },
      ];

      for (const item of allMgmtAddresses) {
        let ipRecord = await prisma.iPAddress.findFirst({
          where: { address: item.ip },
        });
        if (!ipRecord) {
          ipRecord = await prisma.iPAddress.create({
            data: {
              address: item.ip,
              status: 'ASSIGNED',
              deviceType: 'Switch',
              subnetId: item.subnetId || null,
              vlanId: item.vlanId,
              description: item.desc,
            },
          });
        }
        mgmtIpMap.set(item.ip, ipRecord.id);
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

      // 3. Seed Equipment Racks (5 Canonical + 4 Legacy)
      const rackMap = new Map<string, string>(); // code -> id
      const allRackRows = [...canonicalRackRows, ...legacyRackRows];
      const rackResults = await inTransactionChunks(prisma, allRackRows, 50, async (tx, row) => {
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

      for (let i = 0; i < allRackRows.length; i++) {
        rackMap.set(allRackRows[i].split('|')[1], rackResults[i].id);
      }
      logger.log(`Seeded ${rackMap.size} network equipment racks.`);

      // 4. Ensure Hardware Models & Endpoints (28 Canonical + Legacy)
      const assetMap = new Map<string, string>(); // Tag / subcode -> id
      if (ctx && ctx.assets.size > 0) {
        for (const [k, v] of ctx.assets.entries()) assetMap.set(k, v);
      }

      // Find or create Categories and Device Models
      const defaultDept = await prisma.department.findFirst({
        where: { code: 'DEPT-BSL-IT' },
        select: { id: true },
      });
      const fallbackDeptId =
        defaultDept?.id || (await prisma.department.findFirst({ select: { id: true } }))?.id || null;

      const serverCategory = await prisma.assetCategory.findFirst({
        where: { id: 'cat-server' },
        select: { id: true },
      });
      const apCategory = await prisma.assetCategory.findFirst({
        where: { id: 'cat-ap' },
        select: { id: true },
      });
      const storageCategory = await prisma.assetCategory.findFirst({
        where: { id: 'cat-storage' },
        select: { id: true },
      });

      // Camera category
      let cctvCategory = await prisma.assetCategory.findFirst({
        where: { OR: [{ id: 'cat-cctv' }, { name: { contains: 'CCTV' } }] },
        select: { id: true },
      });
      if (!cctvCategory) {
        const createdCat = await prisma.assetCategory.create({
          data: {
            id: 'cat-cctv',
            name: 'CCTV & Video Surveillance',
            description: '4K IP cameras, NVRs, and CCTV video surveillance infrastructure',
          },
        });
        cctvCategory = { id: createdCat.id };
      }

      const vendorCisco = await prisma.vendor.findFirst({ where: { name: { contains: 'Cisco' } } });
      const vendorDell = await prisma.vendor.findFirst({ where: { name: { contains: 'Dell' } } });
      const vendorHik = await prisma.vendor.findFirst({ where: { name: { contains: 'Hikvision' } } });
      const fallbackVendor = await prisma.vendor.findFirst({ select: { id: true } });

      const deviceModelDefs = [
        { modelCode: 'MOD-DELL-R750', name: 'Dell PowerEdge R750 Enterprise Server', manufacturer: 'Dell Inc.', categoryId: serverCategory?.id || '', vendorId: vendorDell?.id || fallbackVendor?.id || '' },
        { modelCode: 'MOD-DELL-R660', name: 'Dell PowerEdge R660 Virtualization Host', manufacturer: 'Dell Inc.', categoryId: serverCategory?.id || '', vendorId: vendorDell?.id || fallbackVendor?.id || '' },
        { modelCode: 'MOD-CISCO-9120AX', name: 'Cisco Catalyst 9120AX Access Point', manufacturer: 'Cisco Systems', categoryId: apCategory?.id || '', vendorId: vendorCisco?.id || fallbackVendor?.id || '' },
        { modelCode: 'MOD-HTW-NVR64', name: 'Hanwha Techwin 64CH Enterprise NVR Video Storage', manufacturer: 'Hanwha Techwin', categoryId: storageCategory?.id || '', vendorId: fallbackVendor?.id || '' },
        { modelCode: 'MOD-HTW-XNO6080', name: 'Hanwha XNO-6080R 4K Bullet Camera', manufacturer: 'Hanwha Techwin', categoryId: cctvCategory?.id || '', vendorId: fallbackVendor?.id || '' },
        { modelCode: 'MOD-HTW-QND6082', name: 'Hanwha QND-6082R 4K Dome Camera', manufacturer: 'Hanwha Techwin', categoryId: cctvCategory?.id || '', vendorId: fallbackVendor?.id || '' },
        { modelCode: 'MOD-HIK-2CD2143', name: 'Hikvision DS-2CD2143G2 4K Dome Camera', manufacturer: 'Hikvision', categoryId: cctvCategory?.id || '', vendorId: vendorHik?.id || fallbackVendor?.id || '' },
        { modelCode: 'MOD-HIK-2CD2043', name: 'Hikvision DS-2CD2043G2 4K Bullet Camera', manufacturer: 'Hikvision', categoryId: cctvCategory?.id || '', vendorId: vendorHik?.id || fallbackVendor?.id || '' },
        { modelCode: 'MOD-AXIS-Q6075', name: 'Axis Q6075-E 4K PTZ Camera', manufacturer: 'Axis Communications', categoryId: cctvCategory?.id || '', vendorId: fallbackVendor?.id || '' },
        { modelCode: 'MOD-HTW-XNP6400', name: 'Hanwha XNP-6400RW 4K PTZ Camera', manufacturer: 'Hanwha Techwin', categoryId: cctvCategory?.id || '', vendorId: fallbackVendor?.id || '' },
        { modelCode: 'MOD-HIK-2CD2347', name: 'Hikvision DS-2CD2347G2 Turret Camera', manufacturer: 'Hikvision', categoryId: cctvCategory?.id || '', vendorId: vendorHik?.id || fallbackVendor?.id || '' },
        { modelCode: 'MOD-HTW-XNO8080', name: 'Hanwha XNO-8080R 4K Bullet Camera', manufacturer: 'Hanwha Techwin', categoryId: cctvCategory?.id || '', vendorId: fallbackVendor?.id || '' },
        { modelCode: 'MOD-AXIS-P3245', name: 'Axis P3245-LVE 4K Dome Camera', manufacturer: 'Axis Communications', categoryId: cctvCategory?.id || '', vendorId: fallbackVendor?.id || '' },
      ];

      const modelMap = new Map<string, string>();
      for (const dmd of deviceModelDefs) {
        if (dmd.categoryId && dmd.vendorId) {
          const mod = await prisma.deviceModel.upsert({
            where: { modelCode: dmd.modelCode },
            update: { name: dmd.name, manufacturer: dmd.manufacturer, categoryId: dmd.categoryId, vendorId: dmd.vendorId },
            create: { modelCode: dmd.modelCode, name: dmd.name, manufacturer: dmd.manufacturer, categoryId: dmd.categoryId, vendorId: dmd.vendorId },
          });
          modelMap.set(dmd.modelCode, mod.id);
        }
      }

      // Canonical 28 Endpoints
      const canonicalEndpoints = [
        // 4 Servers (Dual-Homed)
        { tag: 'AST-SRV-01', model: 'MOD-DELL-R750', serial: '7N991A2-BSL', notes: 'Dell PowerEdge R750 Enterprise Server 01 (Dual-Homed)', domain: InfrastructureDomain.NETWORK },
        { tag: 'AST-SRV-02', model: 'MOD-DELL-R660', serial: '9K114B3-BSL', notes: 'Dell PowerEdge R660 Virtualization Host 02 (Dual-Homed)', domain: InfrastructureDomain.NETWORK },
        { tag: 'AST-SRV-03', model: 'MOD-DELL-R750', serial: '7N992B1-BSL', notes: 'Dell PowerEdge R750 Enterprise Server 03 (Dual-Homed)', domain: InfrastructureDomain.NETWORK },
        { tag: 'AST-SRV-04', model: 'MOD-DELL-R660', serial: '9K115C2-BSL', notes: 'Dell PowerEdge R660 Virtualization Host 04 (Dual-Homed)', domain: InfrastructureDomain.NETWORK },
        // 6 Wi-Fi 6 Access Points
        { tag: 'AST-AP-01', model: 'MOD-CISCO-9120AX', serial: 'FOC-AP9120-01', notes: 'Cisco Catalyst AP 9120AX Floor 1 Production', domain: InfrastructureDomain.NETWORK },
        { tag: 'AST-AP-02', model: 'MOD-CISCO-9120AX', serial: 'FOC-AP9120-02', notes: 'Cisco Catalyst AP 9120AX Floor 1 Assembly Lines', domain: InfrastructureDomain.NETWORK },
        { tag: 'AST-AP-03', model: 'MOD-CISCO-9120AX', serial: 'FOC-AP9120-03', notes: 'Cisco Catalyst AP 9120AX Floor 2 Executive Office', domain: InfrastructureDomain.NETWORK },
        { tag: 'AST-AP-04', model: 'MOD-CISCO-9120AX', serial: 'FOC-AP9120-04', notes: 'Cisco Catalyst AP 9120AX Floor 2 Open Workspace', domain: InfrastructureDomain.NETWORK },
        { tag: 'AST-AP-05', model: 'MOD-CISCO-9120AX', serial: 'FOC-AP9120-05', notes: 'Cisco Catalyst AP 9120AX Warehouse Intake Staging', domain: InfrastructureDomain.NETWORK },
        { tag: 'AST-AP-06', model: 'MOD-CISCO-9120AX', serial: 'FOC-AP9120-06', notes: 'Cisco Catalyst AP 9120AX Warehouse Shipping Docks', domain: InfrastructureDomain.NETWORK },
        // 2 NVR Storage Arrays
        { tag: 'AST-NVR-01', model: 'MOD-HTW-NVR64', serial: 'HTW-NVR-6401', notes: 'Hanwha Techwin 64CH Enterprise NVR Primary Storage Array', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-NVR-02', model: 'MOD-HTW-NVR64', serial: 'HTW-NVR-6402', notes: 'Hanwha Techwin 64CH Enterprise NVR Secondary Storage Array', domain: InfrastructureDomain.CCTV },
        // 16 4K IP Surveillance Cameras
        { tag: 'AST-CAM-001', model: 'MOD-HTW-XNO6080', serial: 'HTW-CAM-001', notes: 'Hanwha XNO-6080R 4K Bullet Camera Main Gate', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-002', model: 'MOD-HTW-QND6082', serial: 'HTW-CAM-002', notes: 'Hanwha QND-6082R 4K Dome Camera MDF Server Room', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-003', model: 'MOD-HIK-2CD2143', serial: 'HK-CAM-003', notes: 'Hikvision DS-2CD2143G2 4K Dome Camera Corridor', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-004', model: 'MOD-HIK-2CD2043', serial: 'HK-CAM-004', notes: 'Hikvision DS-2CD2043G2 4K Bullet Camera Solar Yard', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-005', model: 'MOD-AXIS-Q6075', serial: 'AX-CAM-005', notes: 'Axis Q6075-E 4K PTZ Camera South Perimeter', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-006', model: 'MOD-HTW-XNP6400', serial: 'HTW-CAM-006', notes: 'Hanwha XNP-6400RW 4K PTZ Camera Quad Center', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-007', model: 'MOD-HIK-2CD2347', serial: 'HK-CAM-007', notes: 'Hikvision DS-2CD2347G2 Turret Camera North Gate', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-008', model: 'MOD-HTW-XNO8080', serial: 'HTW-CAM-008', notes: 'Hanwha XNO-8080R 4K Bullet Camera East Perimeter', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-009', model: 'MOD-HIK-2CD2143', serial: 'HK-CAM-009', notes: 'Hikvision DS-2CD2143G2 4K Dome Camera Line A', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-010', model: 'MOD-HIK-2CD2143', serial: 'HK-CAM-010', notes: 'Hikvision DS-2CD2143G2 4K Dome Camera Line B', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-011', model: 'MOD-HTW-QND6082', serial: 'HTW-CAM-011', notes: 'Hanwha QND-6082R 4K Dome Camera Cutting Room', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-012', model: 'MOD-HTW-QND6082', serial: 'HTW-CAM-012', notes: 'Hanwha QND-6082R 4K Dome Camera Finishing Area', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-013', model: 'MOD-AXIS-P3245', serial: 'AX-CAM-013', notes: 'Axis P3245-LVE 4K Dome Camera WH Staging', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-014', model: 'MOD-AXIS-P3245', serial: 'AX-CAM-014', notes: 'Axis P3245-LVE 4K Dome Camera Loading Bay 1', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-015', model: 'MOD-HTW-XNO6080', serial: 'HTW-CAM-015', notes: 'Hanwha XNO-6080R 4K Bullet Camera Loading Bay 2', domain: InfrastructureDomain.CCTV },
        { tag: 'AST-CAM-016', model: 'MOD-HIK-2CD2043', serial: 'HK-CAM-016', notes: 'Hikvision DS-2CD2043G2 4K Bullet Camera Exit F1', domain: InfrastructureDomain.CCTV },
      ];

      for (const ep of canonicalEndpoints) {
        const modelId = modelMap.get(ep.model) || (await prisma.deviceModel.findFirst({ select: { id: true } }))?.id;
        if (modelId) {
          const created = await prisma.asset.upsert({
            where: { subcode: ep.tag },
            update: {
              assetTag: ep.tag,
              serialNumber: ep.serial,
              deviceModelId: modelId,
              departmentId: fallbackDeptId,
              domain: ep.domain,
              status: 'IN_USE',
              notes: ep.notes,
            },
            create: {
              assetTag: ep.tag,
              subcode: ep.tag,
              serialNumber: ep.serial,
              deviceModelId: modelId,
              departmentId: fallbackDeptId,
              domain: ep.domain,
              status: 'IN_USE',
              notes: ep.notes,
            },
          });
          assetMap.set(ep.tag, created.id);
          if (ctx?.assets) ctx.assets.set(ep.tag, created.id);
        }
      }

      // Also ensure legacy asset tags are mapped
      const existingAssets = await prisma.asset.findMany({
        where: {
          OR: [
            { assetTag: { in: ['AST-1009', 'AST-1010', 'AST-1014', 'AST-1017', 'AST-1018', 'AST-1019', 'AST-1035', 'AST-1036'] } },
            { subcode: { in: ['AST-1009', 'AST-1010', 'AST-1014', 'AST-1017', 'AST-1018', 'AST-1019', 'AST-1035', 'AST-1036'] } },
          ],
        },
        select: { id: true, assetTag: true, subcode: true },
      });
      for (const a of existingAssets) {
        if (a.assetTag) assetMap.set(a.assetTag, a.id);
        if (a.subcode) assetMap.set(a.subcode, a.id);
      }
      logger.log(`Mapped ${assetMap.size} physical hardware assets.`);

      // 4b. Seed Endpoint IP Addresses
      const srvSubnet = await prisma.subnet.findUnique({ where: { cidr: '10.0.20.0/24' } });
      const corpSubnet = await prisma.subnet.findUnique({ where: { cidr: '10.0.30.0/24' } });
      const camSubnet = await prisma.subnet.findUnique({ where: { cidr: '172.16.110.0/23' } });
      const nvrSubnet = await prisma.subnet.findUnique({ where: { cidr: '172.16.120.0/24' } });

      const endpointIpDefs = [
        // 4 Servers
        { ip: '10.0.20.11', subnetId: srvSubnet?.id || '', vlanId: vlanMap.get(20) || null, tag: 'AST-SRV-01', desc: 'IP for AST-SRV-01' },
        { ip: '10.0.20.12', subnetId: srvSubnet?.id || '', vlanId: vlanMap.get(20) || null, tag: 'AST-SRV-02', desc: 'IP for AST-SRV-02' },
        { ip: '10.0.20.13', subnetId: srvSubnet?.id || '', vlanId: vlanMap.get(20) || null, tag: 'AST-SRV-03', desc: 'IP for AST-SRV-03' },
        { ip: '10.0.20.14', subnetId: srvSubnet?.id || '', vlanId: vlanMap.get(20) || null, tag: 'AST-SRV-04', desc: 'IP for AST-SRV-04' },
        // 6 APs
        { ip: '10.0.30.21', subnetId: corpSubnet?.id || '', vlanId: vlanMap.get(30) || null, tag: 'AST-AP-01', desc: 'IP for AST-AP-01' },
        { ip: '10.0.30.22', subnetId: corpSubnet?.id || '', vlanId: vlanMap.get(30) || null, tag: 'AST-AP-02', desc: 'IP for AST-AP-02' },
        { ip: '10.0.30.23', subnetId: corpSubnet?.id || '', vlanId: vlanMap.get(30) || null, tag: 'AST-AP-03', desc: 'IP for AST-AP-03' },
        { ip: '10.0.30.24', subnetId: corpSubnet?.id || '', vlanId: vlanMap.get(30) || null, tag: 'AST-AP-04', desc: 'IP for AST-AP-04' },
        { ip: '10.0.30.25', subnetId: corpSubnet?.id || '', vlanId: vlanMap.get(30) || null, tag: 'AST-AP-05', desc: 'IP for AST-AP-05' },
        { ip: '10.0.30.26', subnetId: corpSubnet?.id || '', vlanId: vlanMap.get(30) || null, tag: 'AST-AP-06', desc: 'IP for AST-AP-06' },
        // 2 NVRs
        { ip: '172.16.120.10', subnetId: nvrSubnet?.id || '', vlanId: vlanMap.get(120) || null, tag: 'AST-NVR-01', desc: 'IP for AST-NVR-01' },
        { ip: '172.16.120.11', subnetId: nvrSubnet?.id || '', vlanId: vlanMap.get(120) || null, tag: 'AST-NVR-02', desc: 'IP for AST-NVR-02' },
      ];

      // 16 Cameras
      for (let c = 1; c <= 16; c++) {
        const tag = `AST-CAM-${c.toString().padStart(3, '0')}`;
        endpointIpDefs.push({
          ip: `172.16.110.${100 + c}`,
          subnetId: camSubnet?.id || '',
          vlanId: vlanMap.get(110) || null,
          tag,
          desc: `IP for ${tag}`,
        });
      }

      for (const eip of endpointIpDefs) {
        const assetId = assetMap.get(eip.tag) || null;
        let rec = await prisma.iPAddress.findFirst({ where: { address: eip.ip } });
        if (!rec) {
          rec = await prisma.iPAddress.create({
            data: {
              address: eip.ip,
              subnetId: eip.subnetId || null,
              vlanId: eip.vlanId,
              assetId,
              status: 'ASSIGNED',
              deviceType: eip.tag.startsWith('AST-CAM') ? 'Camera' : eip.tag.startsWith('AST-NVR') ? 'NVR' : eip.tag.startsWith('AST-AP') ? 'Wireless AP' : 'Server',
              description: eip.desc,
              pingStatus: 'online',
            },
          });
        }
        mgmtIpMap.set(eip.ip, rec.id);
      }

      // 5. Seed 10 Canonical Switches + 6 Legacy Switches
      const allSwitchRows = [...canonicalSwitchRows, ...legacySwitchRows];
      const swResults = await inTransactionChunks(prisma, allSwitchRows, 50, async (tx, row) => {
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
        const role = roleStr as SwitchRole;
        const domain = domainStr === 'CCTV' ? InfrastructureDomain.CCTV : InfrastructureDomain.NETWORK;
        const totalPorts = parseInt(portsStr, 10);
        const rackPosition = parseInt(posStr, 10);
        const defaultVlanId = vlanNumStr ? vlanMap.get(parseInt(vlanNumStr, 10)) || null : null;
        const assetId = assetTag ? assetMap.get(assetTag) || null : null;
        const positionX = posXStr ? parseFloat(posXStr) : null;
        const positionY = posYStr ? parseFloat(posYStr) : null;

        // Mgmt IP resolution
        const mgmtIdx = parseInt(mgmtIdxStr, 10);
        const mgmtIpItem = allMgmtAddresses[mgmtIdx];
        const ipAddressId = mgmtIpItem ? mgmtIpMap.get(mgmtIpItem.ip) || null : null;

        const swData = {
          name,
          model,
          vendor,
          serialNumber: serial,
          macAddress: mac,
          ipAddressId,
          firmwareVersion: fw,
          role,
          domain,
          status: SwitchStatus.ONLINE,
          totalPorts,
          uplinkPorts: totalPorts === 16 ? 2 : 4,
          fiberPorts: totalPorts === 16 ? 2 : 4,
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

      logger.log(`Seeded ${swResults.length} enterprise switches with hardware bindings.`);

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

      let totalCreatedPorts = 0;
      for (const sw of swResults) {
        const isPoeSwitch = sw.role === SwitchRole.POE_ACCESS;
        const swDomain = sw.domain;

        for (let p = 1; p <= sw.totalPorts; p++) {
          const statusItem = getPortStatus(totalCreatedPorts + p);
          let connectedAssetId: string | null = null;
          let ipAddressId: string | null = null;
          let desc = `Access Port ${p}`;
          let poeEnabled = isPoeSwitch;
          let adminStatus = statusItem.admin;
          let operStatus = statusItem.oper;
          let speed: string | null = statusItem.oper === 'DOWN' ? null : '1 Gbps';

          // Canonical Switch Endpoint Attachments
          if (sw.name === 'SW-CORE-01' || sw.name === 'SW-CORE-02') {
            poeEnabled = false;
            if (p >= 1 && p <= 4) {
              const srvTag = `AST-SRV-0${p}`;
              connectedAssetId = assetMap.get(srvTag) || null;
              ipAddressId = mgmtIpMap.get(`10.0.20.1${p}`) || null;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              speed = '10 Gbps';
              desc = `Dual-Homed Server Uplink: ${srvTag} (${sw.name === 'SW-CORE-01' ? 'NIC 1' : 'NIC 2'})`;
            }
          } else if (sw.name === 'SW-ACC-F1-01') {
            if (p === 1 || p === 2) {
              const apTag = p === 1 ? 'AST-AP-01' : 'AST-AP-02';
              connectedAssetId = assetMap.get(apTag) || null;
              ipAddressId = mgmtIpMap.get(p === 1 ? '10.0.30.21' : '10.0.30.22') || null;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              poeEnabled = true;
              desc = `Access Point: ${apTag} (Floor 1)`;
            }
          } else if (sw.name === 'SW-ACC-F2-01') {
            if (p === 1 || p === 2) {
              const apTag = p === 1 ? 'AST-AP-03' : 'AST-AP-04';
              connectedAssetId = assetMap.get(apTag) || null;
              ipAddressId = mgmtIpMap.get(p === 1 ? '10.0.30.23' : '10.0.30.24') || null;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              poeEnabled = true;
              desc = `Access Point: ${apTag} (Floor 2)`;
            }
          } else if (sw.name === 'SW-ACC-WH-01') {
            if (p === 1 || p === 2) {
              const apTag = p === 1 ? 'AST-AP-05' : 'AST-AP-06';
              connectedAssetId = assetMap.get(apTag) || null;
              ipAddressId = mgmtIpMap.get(p === 1 ? '10.0.30.25' : '10.0.30.26') || null;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              poeEnabled = true;
              desc = `Access Point: ${apTag} (Warehouse)`;
            }
          } else if (sw.name === 'SW-CCTV-01') {
            poeEnabled = true;
            if (p === 1 || p === 2) {
              const nvrTag = p === 1 ? 'AST-NVR-01' : 'AST-NVR-02';
              connectedAssetId = assetMap.get(nvrTag) || null;
              ipAddressId = mgmtIpMap.get(p === 1 ? '172.16.120.10' : '172.16.120.11') || null;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              poeEnabled = false;
              desc = `NVR Storage Array: ${nvrTag}`;
            } else if (p >= 3 && p <= 10) {
              const camIdx = p - 2;
              const camTag = `AST-CAM-00${camIdx}`;
              connectedAssetId = assetMap.get(camTag) || null;
              ipAddressId = mgmtIpMap.get(`172.16.110.10${camIdx}`) || null;
              if (camIdx === 7) {
                adminStatus = 'UP';
                operStatus = 'CONNECTED_NO_SIGNAL';
                speed = '100 Mbps';
                desc = `CCTV: ${camTag} (Signal Loss)`;
              } else if (camIdx === 8) {
                adminStatus = 'DOWN';
                operStatus = 'DOWN';
                speed = null;
                poeEnabled = false;
                desc = `CCTV: ${camTag} (Offline)`;
              } else {
                adminStatus = 'UP';
                operStatus = 'ACTIVE';
                desc = `CCTV: ${camTag} (4K Stream)`;
              }
            }
          } else if (sw.name === 'SW-CCTV-02') {
            poeEnabled = true;
            if (p >= 1 && p <= 8) {
              const camIdx = 8 + p;
              const camTag = `AST-CAM-0${camIdx}`;
              connectedAssetId = assetMap.get(camTag) || null;
              ipAddressId = mgmtIpMap.get(`172.16.110.1${camIdx}`) || null;
              if (camIdx === 16) {
                adminStatus = 'UP';
                operStatus = 'CONNECTED_NO_SIGNAL';
                speed = '100 Mbps';
                desc = `CCTV: ${camTag} (Signal Loss)`;
              } else {
                adminStatus = 'UP';
                operStatus = 'ACTIVE';
                desc = `CCTV: ${camTag} (4K Stream)`;
              }
            }
          }

          // Legacy Switch Endpoint Attachments
          else if (sw.name === 'BSL-CORE-SW01') {
            poeEnabled = false;
            if (p === 1 && ast1009Id) {
              connectedAssetId = ast1009Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              desc = 'Uplink: Dell PowerEdge R750 Enterprise Server (AST-1009)';
            } else if (p === 2 && ast1017Id) {
              connectedAssetId = ast1017Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              desc = 'Uplink: Dell PowerEdge R660 Virtualization Host (AST-1017)';
            }
          } else if (sw.name === 'BSL-F1-ACC01') {
            if (p === 1 && ast1014Id) {
              connectedAssetId = ast1014Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              poeEnabled = true;
              desc = 'Access Point: Cisco Catalyst AP 9130AX (AST-1014)';
            } else if (p === 2 && ast1035Id) {
              connectedAssetId = ast1035Id;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              poeEnabled = true;
              desc = 'Terminal: Hikvision DS-K1T671MF Face Terminal (AST-1035)';
            }
          } else if (sw.name === 'BSL-CCTV-SW01') {
            poeEnabled = true;
            if (p === 1 && assetMap.get('AST-NVR-01')) {
              connectedAssetId = assetMap.get('AST-NVR-01') || null;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              poeEnabled = false;
              desc = 'NVR Storage: Hanwha Techwin 64CH Enterprise NVR';
            } else if (p === 2 && assetMap.get('AST-CAM-001')) {
              connectedAssetId = assetMap.get('AST-CAM-001') || null;
              adminStatus = 'UP';
              operStatus = 'ACTIVE';
              desc = 'CCTV: Hanwha XNO-6080R Bullet Camera Main Perimeter';
            }
          }

          allPortsData.push({
            switchId: sw.id,
            portNumber: p,
            name: `Gi1/0/${p}`,
            formFactor: 'RJ45_1G',
            domain: swDomain,
            poeEnabled,
            adminStatus,
            operStatus,
            speed,
            duplex: operStatus === 'DOWN' ? null : 'Full',
            vlanId: sw.defaultVlanId,
            mode: 'ACCESS',
            connectedAssetId,
            ipAddressId,
            description: desc,
          });
        }

        // Dedicated Uplinks (4 uplinks per switch, or 2 for 16-port switch)
        const numUplinks = sw.totalPorts === 16 ? 2 : 4;
        const uplinkFormFactor = sw.name.includes('CORE') ? 'QSFP28_100G' : 'SFP_PLUS_10G';
        const uplinkSpeed = sw.name.includes('CORE') ? '40 Gbps' : '10 Gbps';

        for (let u = 1; u <= numUplinks; u++) {
          const portNum = sw.totalPorts + u;
          const portName = sw.name.includes('CORE') ? `QSFP1/0/${portNum}` : `Te1/0/${portNum}`;
          allPortsData.push({
            switchId: sw.id,
            portNumber: portNum,
            name: portName,
            formFactor: uplinkFormFactor,
            domain: swDomain,
            poeEnabled: false,
            adminStatus: 'UP',
            operStatus: 'DOWN', // Will be set to ACTIVE by inter-switch trunk links
            speed: uplinkSpeed,
            duplex: 'Full',
            vlanId: null,
            mode: 'TRUNK',
            taggedVlanIds: swDomain === InfrastructureDomain.CCTV ? [105, 110, 120] : [10, 20, 30, 40],
            description: `Dedicated Uplink ${u}`,
          });
        }
        totalCreatedPorts += sw.totalPorts + numUplinks;
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

      const portLookup = new Map<string, { id: string; switchId: string }>(); // `${switchName}:${portNumber}` -> { id, switchId }
      for (const cp of createdPorts) {
        portLookup.set(`${cp.switch.name}:${cp.portNumber}`, { id: cp.id, switchId: cp.switchId });
      }

      const allTrunkLinks = [...canonicalTrunkLinks, ...legacyTrunkLinks];
      for (const link of allTrunkLinks) {
        const portAInfo = portLookup.get(`${link.switchA}:${link.portNumA}`);
        const portBInfo = portLookup.get(`${link.switchB}:${link.portNumB}`);

        if (portAInfo && portBInfo) {
          await prisma.switchPort.update({
            where: { id: portAInfo.id },
            data: {
              connectedPortId: portBInfo.id,
              connectedSwitchId: portBInfo.switchId,
              mode: 'TRUNK',
              adminStatus: 'UP',
              operStatus: 'ACTIVE',
              speed: link.speed,
              taggedVlanIds: link.taggedVlans,
              description: link.descA,
            },
          });

          await prisma.switchPort.update({
            where: { id: portBInfo.id },
            data: {
              connectedPortId: portAInfo.id,
              connectedSwitchId: portAInfo.switchId,
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
      logger.log(`Connected ${allTrunkLinks.length} symmetrical inter-switch trunk links.`);

      // 8. Seed Multi-Perspective Coordinates in CanvasNodePosition
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
        isPinned?: boolean;
      }

      const initialPositions: SeedPositionDef[] = [];

      // -------------------------------------------------------------
      // View Mode: ALL (Unified Full Infrastructure)
      // -------------------------------------------------------------
      // Racks
      for (const r of allRackRows) {
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

      // Switches in ALL view
      for (const sw of allSwitchRows) {
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

      // Endpoints in ALL view
      // 4 Servers (150, 250, 350, 450; y: 40)
      for (let s = 1; s <= 4; s++) {
        const tag = `AST-SRV-0${s}`;
        const assetId = assetMap.get(tag);
        if (assetId) {
          initialPositions.push({
            nodeId: assetId,
            nodeType: TopologyNodeType.SERVER,
            viewMode: TopologyViewMode.ALL,
            x: 50 + s * 100,
            y: 40,
          });
        }
      }

      // 6 APs (1000, 1150, 1350, 1500, 1700, 1850; y: 700)
      const apAllCoords = [1000, 1150, 1350, 1500, 1700, 1850];
      for (let a = 1; a <= 6; a++) {
        const tag = `AST-AP-0${a}`;
        const assetId = assetMap.get(tag);
        if (assetId) {
          initialPositions.push({
            nodeId: assetId,
            nodeType: TopologyNodeType.ACCESS_POINT,
            viewMode: TopologyViewMode.ALL,
            x: apAllCoords[a - 1],
            y: 700,
          });
        }
      }

      // 2 NVRs (450, 550; y: 680)
      const nvr1Id = assetMap.get('AST-NVR-01');
      if (nvr1Id) {
        initialPositions.push({
          nodeId: nvr1Id,
          nodeType: TopologyNodeType.NVR,
          viewMode: TopologyViewMode.ALL,
          x: 450,
          y: 680,
        });
      }
      const nvr2Id = assetMap.get('AST-NVR-02');
      if (nvr2Id) {
        initialPositions.push({
          nodeId: nvr2Id,
          nodeType: TopologyNodeType.NVR,
          viewMode: TopologyViewMode.ALL,
          x: 550,
          y: 680,
        });
      }

      // 16 Cameras (320 + i*60, y: 720 for 1..8; 650 + i*60, y: 720 for 9..16)
      for (let c = 1; c <= 8; c++) {
        const tag = `AST-CAM-00${c}`;
        const assetId = assetMap.get(tag);
        if (assetId) {
          initialPositions.push({
            nodeId: assetId,
            nodeType: TopologyNodeType.CAMERA,
            viewMode: TopologyViewMode.ALL,
            x: 320 + c * 60,
            y: 720,
          });
        }
      }
      for (let c = 9; c <= 16; c++) {
        const tag = `AST-CAM-0${c}`;
        const assetId = assetMap.get(tag);
        if (assetId) {
          initialPositions.push({
            nodeId: assetId,
            nodeType: TopologyNodeType.CAMERA,
            viewMode: TopologyViewMode.ALL,
            x: 650 + (c - 8) * 60,
            y: 720,
          });
        }
      }

      // -------------------------------------------------------------
      // View Mode: NETWORK (Enterprise Network Perspective)
      // -------------------------------------------------------------
      const networkSwitchPositions: Record<string, { x: number; y: number }> = {
        'SW-CORE-01': { x: 400, y: 140 },
        'SW-CORE-02': { x: 800, y: 140 },
        'SW-DIST-01': { x: 400, y: 340 },
        'SW-DIST-02': { x: 800, y: 340 },
        'SW-ACC-F1-01': { x: 250, y: 540 },
        'SW-ACC-F2-01': { x: 550, y: 540 },
        'SW-ACC-WH-01': { x: 850, y: 540 },
        'SW-ACC-WH-02': { x: 1150, y: 540 },
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

      // Endpoints in NETWORK view: Servers and APs
      const serverNetCoords = [250, 450, 750, 950];
      for (let s = 1; s <= 4; s++) {
        const tag = `AST-SRV-0${s}`;
        const assetId = assetMap.get(tag);
        if (assetId) {
          initialPositions.push({
            nodeId: assetId,
            nodeType: TopologyNodeType.SERVER,
            viewMode: TopologyViewMode.NETWORK,
            x: serverNetCoords[s - 1],
            y: 40,
          });
        }
      }

      const apNetCoords = [200, 300, 500, 600, 800, 900];
      for (let a = 1; a <= 6; a++) {
        const tag = `AST-AP-0${a}`;
        const assetId = assetMap.get(tag);
        if (assetId) {
          initialPositions.push({
            nodeId: assetId,
            nodeType: TopologyNodeType.ACCESS_POINT,
            viewMode: TopologyViewMode.NETWORK,
            x: apNetCoords[a - 1],
            y: 720,
          });
        }
      }

      // -------------------------------------------------------------
      // View Mode: CCTV (Surveillance Subsystem Perspective)
      // -------------------------------------------------------------
      const cctvSwitchPositions: Record<string, { x: number; y: number }> = {
        'SW-DIST-02': { x: 600, y: 120 },
        'SW-CCTV-01': { x: 400, y: 280 },
        'SW-CCTV-02': { x: 800, y: 280 },
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

      // Endpoints in CCTV view: NVRs and Cameras
      if (nvr1Id) {
        initialPositions.push({
          nodeId: nvr1Id,
          nodeType: TopologyNodeType.NVR,
          viewMode: TopologyViewMode.CCTV,
          x: 320,
          y: 460,
        });
      }
      if (nvr2Id) {
        initialPositions.push({
          nodeId: nvr2Id,
          nodeType: TopologyNodeType.NVR,
          viewMode: TopologyViewMode.CCTV,
          x: 480,
          y: 460,
        });
      }

      for (let c = 1; c <= 8; c++) {
        const tag = `AST-CAM-00${c}`;
        const assetId = assetMap.get(tag);
        if (assetId) {
          initialPositions.push({
            nodeId: assetId,
            nodeType: TopologyNodeType.CAMERA,
            viewMode: TopologyViewMode.CCTV,
            x: 160 + c * 65,
            y: 650,
          });
        }
      }
      for (let c = 9; c <= 16; c++) {
        const tag = `AST-CAM-0${c}`;
        const assetId = assetMap.get(tag);
        if (assetId) {
          initialPositions.push({
            nodeId: assetId,
            nodeType: TopologyNodeType.CAMERA,
            viewMode: TopologyViewMode.CCTV,
            x: 640 + (c - 8) * 65,
            y: 650,
          });
        }
      }

      // Persist all layout coordinates in CanvasNodePosition
      for (const ip of initialPositions) {
        await prisma.canvasNodePosition.upsert({
          where: {
            nodeId_viewMode: {
              nodeId: ip.nodeId,
              viewMode: ip.viewMode,
            },
          },
          update: {
            x: ip.x,
            y: ip.y,
            isPinned: ip.isPinned ?? false,
            nodeType: ip.nodeType,
          },
          create: {
            nodeId: ip.nodeId,
            nodeType: ip.nodeType,
            viewMode: ip.viewMode,
            x: ip.x,
            y: ip.y,
            isPinned: ip.isPinned ?? false,
          },
        });
      }
      logger.log(`Seeded ${initialPositions.length} persistent multi-perspective canvas layout positions.`);
    },
  );
}
