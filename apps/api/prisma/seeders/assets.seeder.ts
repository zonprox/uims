import type { PrismaClient } from '@prisma/client';
import { inTransactionChunks, runDomainSeeder, type SeederContext } from './seeder.utils';

export const assetRows: string[] = [
  // 1. Laptops (cat-laptop) - 5 active + 1 spare
  'AST-1001|MacBook Pro 16" M3 Pro|Apple|MacBookPro18,2 (Space Black)|C02G8392MD6R|IN_USE|cat-laptop|tri.doan@youngonevn.com|loc-bsh-d7|DEPT-BSH-EXEC|2024-02-10|2027-02-10|Assigned to Managing Director (BSH Ho Chi Minh Office).',
  'AST-1003|ThinkPad T14 Gen 4|Lenovo|21HD001YUS|PF-388271A|IN_USE|cat-laptop|binh.tran@youngonevn.com|loc-bsl-bc-exec|DEPT-BSL-MGMT|2024-01-10|2027-01-10|Assigned to Factory General Director (BSL Soc Trang).',
  'AST-1004|ThinkPad T14s Gen 4|Lenovo|21F8002LUS|PF-291882K|IN_USE|cat-laptop|nam.pham@youngonevn.com|loc-bsl-bc-datacenter|DEPT-BSL-IT|2024-01-10|2027-01-10|Assigned to Factory IT Manager (BSL Soc Trang).',
  'AST-1011|ThinkPad X1 Carbon Gen 11|Lenovo|21HM002RUS|PF-491AK82|IN_USE|cat-laptop|phong.dang@youngonevn.com|loc-bsh-d7|DEPT-BSH-IT|2024-01-15|2027-01-15|Assigned to Enterprise IT Systems Architect (BSH).',
  'AST-1012|Dell Latitude 5440 Laptop|Dell|Latitude 5440 Business|7N881M2-HCM|IN_USE|cat-laptop|lan.nguyen@youngonevn.com|loc-bsh-d3|DEPT-BSH-MERCH|2024-03-01|2027-03-01|Assigned to Apparel Merchandising Manager (BSH).',
  'AST-1013|Dell Latitude 5440 Laptop|Dell|Latitude 5440 Business|7N882M3-FIN|IN_USE|cat-laptop|ngoc.vu@youngonevn.com|loc-bsh-d7|DEPT-BSH-FIN|2024-03-01|2027-03-01|Assigned to Chief Accountant (BSH).',
  'AST-1020|Dell Latitude 3440 (Spare Pool)|Dell|Latitude 3440 Essential|9M88210-SPARE|AVAILABLE|cat-laptop||loc-bsl-bc-datacenter|DEPT-BSL-IT|2024-04-01|2027-04-01|BSL Factory IT replacement buffer laptop.',
  // 2. Workstations & Desktops (cat-desktop) - 3 units
  'AST-1005|Dell OptiPlex 7010 Tower Workstation|Dell|OptiPlex 7010 MT|8B821A-CAD|IN_USE|cat-desktop|huy.nguyen@youngonevn.com|loc-bsl-bc-datacenter|DEPT-BSL-QA-SMP|2023-10-15|2026-10-15|Production Development CAD workstation for garment pattern design.',
  'AST-1006|Dell OptiPlex 7010 Micro Terminal|Dell|OptiPlex 7010 MFF|8B823K-QA|IN_USE|cat-desktop|thu.le@youngonevn.com|loc-bsl-bc-admin|DEPT-BSL-QA-AUDIT|2023-10-15|2026-10-15|Quality Assurance Lab test reporting and inspection terminal.',
  'AST-1025|Dell Precision 3660 Tower Workstation|Dell|Precision 3660|5N88192-CAD|IN_USE|cat-desktop|kim.vo@youngonevn.com|loc-bsl-bc-tech|DEPT-BSL-QA-SMP|2023-11-01|2026-11-01|3D garment sample rendering and marker optimization workstation.',
  // 3. Enterprise Rackmount Servers (cat-server) - 3 units
  'AST-1009|Dell PowerEdge R750 Enterprise Server|Dell Enterprise|PowerEdge R750 2U|7N991A2-BSL|IN_USE|cat-server||loc-bsl-bc-datacenter|DEPT-BSL-IT|2023-07-20|2026-07-20|BSL On-Premise Host running local manufacturing ERP & factory shopfloor PBX.',
  'AST-1014|HPE ProLiant DL380 Gen10 Server|Hewlett Packard Enterprise|ProLiant DL380 Gen10 2U|USE-994821|IN_USE|cat-server||loc-bsh-d7|DEPT-BSH-IT|2023-11-20|2026-11-20|BSH Regional Data Center application host.',
  'AST-1017|Dell PowerEdge R660 1U Host|Dell Enterprise|PowerEdge R660 1U|9K114B3-BSL|IN_USE|cat-server||loc-bsl-bc-datacenter|DEPT-BSL-IT|2024-02-15|2027-02-15|Virtualization host for manufacturing telemetry.',
  // 4. Switches (cat-switch) - 3 units
  'AST-1010|Cisco Catalyst 9300-48P PoE+ Switch|Cisco Systems|C9300-48P-A|FOC2488102|IN_USE|cat-switch||loc-bsl-bc-datacenter|DEPT-BSL-IT|2023-07-20|2028-07-20|BSL Factory Core Switch in Datacenter Rack 01.',
  'AST-1018|Cisco Catalyst 9200L-24P Switch|Cisco Systems|C9200L-24P-4G|FOC2533K92|IN_USE|cat-switch||loc-bsl-bc-datacenter|DEPT-BSL-IT|2023-08-15|2028-08-15|Access layer switch for Business Center offices.',
  'AST-1019|Aruba CX 6200F 48G PoE+ Switch|Aruba Networks|JL726A|SG2410881|IN_USE|cat-switch||loc-bsl-bc-datacenter|DEPT-BSL-IT|2023-11-10|2028-11-10|Factory distribution switch for IoT and floor cameras.',
  // 5. Firewalls & Routers (cat-router) - 2 units
  'AST-1015|Cisco Meraki MX85 Cloud Security Appliance|Cisco Meraki|MX85-HW|Q2QN-9981-LKM9|IN_USE|cat-router||loc-bsh-d7|DEPT-BSH-IT|2024-01-10|2027-01-10|BSH Corporate Gateway with Auto VPN to BSL Soc Trang.',
  'AST-1021|Fortinet FortiGate 100F Next-Gen Firewall|Fortinet|FG-100F|FGT100F-889102|IN_USE|cat-router||loc-bsl-bc-datacenter|DEPT-BSL-IT|2023-09-01|2026-09-01|Primary perimeter NGFW and SD-WAN controller for BSL campus.',
  // 6. Access Points (cat-ap) - 3 units
  'AST-1016|Cisco Catalyst 9120AXI Access Point|Cisco Systems|C9120AXI-E|FOC2519A01|IN_USE|cat-ap||loc-bsl-bc-exec|DEPT-BSL-IT|2023-09-10|2028-09-10|BSL Executive floor wireless coverage.',
  'AST-1022|Cisco Meraki MR46 Wi-Fi 6 Cloud AP|Cisco Meraki|MR46-HW|Q2MN-8841-B831|IN_USE|cat-ap||loc-bsh-d7|DEPT-BSH-IT|2024-01-15|2028-01-15|BSH Corporate 7th floor open office wireless.',
  'AST-1023|Aruba AP-515 Campus Access Point|Aruba Networks|Q9H62A|CN9821764|IN_USE|cat-ap||loc-bsh-d3|DEPT-BSH-IT|2023-12-05|2028-12-05|BSH District 3 showroom & meeting floor wireless.',
  // 7. Displays (cat-monitor) - 2 units
  'AST-1002|Dell UltraSharp 27" 4K USB-C Hub Monitor|Dell|U2723QE (IPS Black)|CN-0N179F-74261|IN_USE|cat-monitor|tri.doan@youngonevn.com|loc-bsh-d7|DEPT-BSH-EXEC|2024-02-12|2027-02-12|Primary executive desk display at BSH Ho Chi Minh.',
  'AST-1024|Dell UltraSharp 34" Curved Monitor|Dell|U3423WE|CN-0K8812-7819|IN_USE|cat-monitor|binh.tran@youngonevn.com|loc-bsl-bc-exec|DEPT-BSL-MGMT|2024-02-15|2027-02-15|General Director panoramic productivity display.',
  // 8. Network Printers (cat-printer) - 2 units
  'AST-1007|Zebra ZT411 Industrial Barcode Printer|Zebra Technologies|ZT41142-T010000Z|ZT411-998214|IN_USE|cat-printer||loc-bsl-wh-raw|DEPT-BSL-LOG-MAT|2023-08-01|2026-08-01|Raw materials central warehouse barcode intake and inventory labeling.',
  'AST-1026|HP LaserJet Enterprise MFP M635f|HP|LaserJet M635f|CNB882194|IN_USE|cat-printer||loc-bsh-d7|DEPT-BSH-FIN|2024-01-20|2027-01-20|BSH Corporate Finance Department multi-function department copier.',
  // 9. Storage Units (cat-storage) - 2 units
  'AST-1027|Synology DiskStation DS1821+ NAS|Synology|DS1821+|2180Q8R8190|IN_USE|cat-storage||loc-bsl-bc-datacenter|DEPT-BSL-IT|2023-08-20|2026-08-20|Centralized backup and file server for BSL factory.',
  'AST-1028|Dell PowerVault ME5024 SAN Storage|Dell Enterprise|PowerVault ME5024|7N88192-SAN|IN_USE|cat-storage||loc-bsh-d7|DEPT-BSH-IT|2023-12-01|2026-12-01|High-performance SAN storage array for ERP database clusters.',
  // 10. UPS Units (cat-ups) - 2 units
  'AST-1029|APC Smart-UPS RT 3000VA On-Line 2U|Schneider Electric|SRT3000XLI|AS231889102|IN_USE|cat-ups||loc-bsl-bc-datacenter|DEPT-BSL-IT|2023-07-20|2026-07-20|Rack 01 core switch and hypervisor power protection.',
  'AST-1030|Eaton 9PX 3000RT 3kVA Online UPS|Eaton|9PX3000RT|ET9PX-99214|IN_USE|cat-ups||loc-bsh-d7|DEPT-BSH-IT|2023-11-25|2026-11-25|BSH server room rack 02 backup power protection.',
  // 11. Peripherals (cat-peripheral) - 3 units
  'AST-1008|Honeywell ScanPal EDA51 Mobile Computer|Honeywell|EDA51|HW-EDA51-88192|IN_USE|cat-peripheral|kim.vo@youngonevn.com|loc-bsl-wh-raw|DEPT-BSL-LOG-MAT|2023-09-01|2025-09-01|Central Warehouse fabric roll intake & barcode inventory stocktaking scanner.',
  'AST-1031|Dell Thunderbolt 4 Dock WD22TB4|Dell|WD22TB4|CN-0T9812-9918|IN_USE|cat-peripheral|tri.doan@youngonevn.com|loc-bsh-d7|DEPT-BSH-EXEC|2024-02-12|2027-02-12|Managing Director executive desk docking station.',
  'AST-1032|Logitech Rally Bar All-in-One Video Bar|Logitech|Rally Bar|2128LZ88102|IN_USE|cat-peripheral||loc-bsh-d7|DEPT-BSH-IT|2024-02-01|2026-02-01|BSH Executive Boardroom conference video bar.',
  // 12. Factory 1-7 Operational IT & Production Infrastructure
  'AST-1033|SINDOH D410 Color Multifunction Printer|Sindoh|D410 MFP|SD-D410-F1001|IN_USE|cat-printer||loc-bsl-f1|DEPT-BSL-IT|2023-09-01|2026-09-01|Factory 1 floor office SINDOH color multifunction printer.',
  'AST-1034|HP LaserJet Enterprise MFP M635f|HP|LaserJet M635f|CNB-HP-F1002|IN_USE|cat-printer||loc-bsl-f1|DEPT-BSL-IT|2023-09-01|2026-09-01|Factory 1 production floor document & work order printer.',
  'AST-1035|Hikvision DS-K1T671MF Face Terminal|Hikvision|DS-K1T671MF|HK-DSK671-F101|IN_USE|cat-peripheral||loc-bsl-f1|DEPT-BSL-IT|2023-09-01|2026-09-01|Factory 1 main entrance biometric time and attendance terminal.',
  'AST-1036|Hikvision IP Camera DS-2CD2143G2|Hikvision|DS-2CD2143G2-I|HK-CAM-F1001|IN_USE|cat-peripheral||loc-bsl-f1|DEPT-BSL-IT|2023-09-01|2026-09-01|Factory 1 production floor IP security camera.',
  'AST-1037|Zebra ZT411 Industrial Barcode Printer|Zebra Technologies|ZT41142-T010000Z|ZT411-F1-9901|IN_USE|cat-printer||loc-bsl-f1-pack-st1|DEPT-BSL-F1-PCK|2023-08-15|2026-08-15|Factory 1 finishing packing export carton barcode label printer.',
  'AST-1038|Zebra ZT411 Industrial Barcode Printer|Zebra Technologies|ZT41142-T010000Z|ZT411-F2-9902|IN_USE|cat-printer||loc-bsl-f2-pack-st1|DEPT-BSL-F2-PCK|2023-09-01|2026-09-01|Factory 2 packing finishing barcode label printer.',
  'AST-1039|Zebra ZT411 Industrial Barcode Printer|Zebra Technologies|ZT41142-T010000Z|ZT411-F3-9903|IN_USE|cat-printer||loc-bsl-f3-pack-st1|DEPT-BSL-F3-PCK|2023-10-01|2026-10-01|Factory 3 packing finishing barcode label printer.',
  'AST-1040|Zebra ZT411 Industrial Barcode Printer|Zebra Technologies|ZT41142-T010000Z|ZT411-F4-9904|IN_USE|cat-printer||loc-bsl-f4-pack-st1|DEPT-BSL-F4-PCK|2023-10-15|2026-10-15|Factory 4 packing finishing barcode label printer.',
  'AST-1041|Zebra ZT411 Industrial Barcode Printer|Zebra Technologies|ZT41142-T010000Z|ZT411-F5-9905|IN_USE|cat-printer||loc-bsl-f5-pack-st1|DEPT-BSL-F5-PCK|2023-11-01|2026-11-01|Factory 5 packing finishing barcode label printer.',
  'AST-1042|Zebra ZT411 Industrial Barcode Printer|Zebra Technologies|ZT41142-T010000Z|ZT411-F6-9906|IN_USE|cat-printer||loc-bsl-f6-pack-st1|DEPT-BSL-F6-PCK|2023-11-20|2026-11-20|Factory 6 fleece hoodie export carton packing label printer.',
  'AST-1043|Zebra ZT411 Industrial Barcode Printer|Zebra Technologies|ZT41142-T010000Z|ZT411-F7-9907|IN_USE|cat-printer||loc-bsl-f7-pack-st1|DEPT-BSL-F7-PCK|2023-12-05|2026-12-05|Factory 7 rapid-turn packaging barcode station.',
];

function resolveVendorId(mfr: string, vendorMap?: Map<string, string>): string | null {
  if (!vendorMap) return null;
  const lower = mfr.toLowerCase();
  if (vendorMap.has(lower)) return vendorMap.get(lower)!;
  const known: Array<[string, string]> = [
    ['apple', 'ven-apple'],
    ['lenovo', 'ven-lenovo'],
    ['dell', 'ven-dell'],
    ['cisco', 'ven-cisco'],
    ['meraki', 'ven-cisco'],
    ['sap', 'ven-sap'],
    ['microsoft', 'ven-msft'],
    ['lectra', 'ven-lectra'],
    ['gerber', 'ven-gerber'],
    ['coats', 'ven-coats'],
    ['juki', 'ven-juki'],
    ['brother', 'ven-brother'],
  ];
  for (const [kw, id] of known) {
    if (lower.includes(kw)) return vendorMap.get(id) || id;
  }
  return null;
}

export async function seedAssets(
  prisma: PrismaClient,
  taxonomyOrCtx?: unknown,
  _users?: unknown,
  _orgResult?: unknown,
  vendorMap?: Map<string, string>,
  explicitCtx?: SeederContext,
): Promise<Record<string, { id: string; assetTag: string }>> {
  return runDomainSeeder(
    'AssetsSeeder',
    '💻',
    'Enterprise Physical Hardware Assets',
    async (logger) => {
      const ctx: SeederContext | undefined =
        explicitCtx ||
        (taxonomyOrCtx && typeof taxonomyOrCtx === 'object' && 'locations' in taxonomyOrCtx
          ? (taxonomyOrCtx as SeederContext)
          : undefined);

      let getLoc = (id: string) => id;
      let getDept = (code: string) => code;
      let getUser = (_email: string): string | null => null;
      const effectiveVendors = vendorMap || ctx?.vendors;

      if (ctx && ctx.locations.size > 0) {
        getLoc = (id: string) => ctx.locations.get(id) || id;
        getDept = (code: string) =>
          ctx.departments.get(code) || ctx.departments.get('DEPT-BSL-MGMT') || code;
        getUser = (email: string) => (email ? ctx.directoryUsers.get(email) || null : null);
      } else {
        const [departments, locations, dirUsers] = await Promise.all([
          prisma.department.findMany({ take: 200 }),
          prisma.location.findMany({ take: 500 }),
          prisma.directoryUser.findMany({ take: 100 }),
        ]);
        const deptMap = new Map(departments.map((d) => [d.code, d.id]));
        const locMap = new Map<string, string>();
        for (const l of locations) {
          locMap.set(l.id, l.id);
          if (l.code) {
            locMap.set(l.code, l.id);
            locMap.set(l.code.toUpperCase(), l.id);
          }
        }
        const userMap = new Map(dirUsers.map((u) => [u.email, u.id]));
        getLoc = (id: string) => locMap.get(id) || locations[0]?.id || id;
        getDept = (code: string) =>
          deptMap.get(code) || deptMap.get('DEPT-BSL-MGMT') || departments[0]?.id || code;
        getUser = (email: string) => (email ? userMap.get(email) || null : null);
      }

      const getCatId = (catKey: string): string => {
        if (ctx?.assetCategories.has(catKey)) return ctx.assetCategories.get(catKey)!;
        return catKey;
      };

      const createdAssets: Record<string, { id: string; assetTag: string }> = {};

      const records = await inTransactionChunks(prisma, assetRows, 50, async (tx, row) => {
        const [
          tag,
          name,
          mfr,
          model,
          serial,
          status,
          catKey,
          userKey,
          locId,
          deptCode,
          pDate,
          wDate,
          notes,
        ] = row.split('|');

        const vendorId = resolveVendorId(mfr, effectiveVendors);
        const assignedToId = userKey ? getUser(userKey) : null;
        const categoryId = getCatId(catKey);
        const locationId = getLoc(locId);
        const departmentId = getDept(deptCode);
        const purchaseDate = new Date(pDate);
        const warrantyExpiry = new Date(wDate);
        const assetStatus = status as 'IN_USE' | 'AVAILABLE';

        return tx.asset.upsert({
          where: { assetTag: tag },
          update: {
            name,
            manufacturer: mfr,
            vendorId,
            model,
            serialNumber: serial,
            status: assetStatus,
            categoryId,
            assignedToId,
            locationId,
            departmentId,
            purchaseDate,
            warrantyExpiry,
            notes,
          },
          create: {
            assetTag: tag,
            name,
            manufacturer: mfr,
            vendorId,
            model,
            serialNumber: serial,
            status: assetStatus,
            categoryId,
            assignedToId,
            locationId,
            departmentId,
            purchaseDate,
            warrantyExpiry,
            notes,
          },
        });
      });

      for (let i = 0; i < assetRows.length; i++) {
        const tag = assetRows[i].split('|')[0];
        const record = records[i];
        createdAssets[tag] = { id: record.id, assetTag: tag };
        if (ctx) {
          ctx.assets.set(tag, record.id);
          ctx.assets.set(record.id, record.id);
        }
      }

      logger.log(
        `✅ Seeded ${Object.keys(createdAssets).length} Hardware Assets across BSL & BSH.`,
      );
      return createdAssets;
    },
  );
}
