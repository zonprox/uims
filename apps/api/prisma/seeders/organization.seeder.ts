import { Logger } from '@nestjs/common';
import { LocationType, type PrismaClient } from '@prisma/client';

const logger = new Logger('OrganizationSeeder');

interface LocationDef {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  status: string;
  building?: string;
  floor?: string;
  room?: string;
  address?: string;
  parentId?: string | null;
  fullPath: string;
  organizationId: string;
}

export async function seedOrganizations(prisma: PrismaClient) {
  logger.log(
    '🏢 Seeding Youngone / Broadpeak Group (Holding, BSL & BSH) Organizations, Spatial Locations, Departments & Positions...',
  );

  // 1. Corporate Hierarchy: Holding Company (Youngone / Broadpeak Group) and 2 Operating Subsidiaries (BSL & BSH)
  const orgHolding = await prisma.organization.upsert({
    where: { code: 'HOLDING' },
    update: {
      name: 'Youngone / Broadpeak Group',
      taxId: '0100100100',
      email: 'contact@broadpeak.youngone.com',
      phone: '+84 (28) 3997-8888',
      address: 'Broadpeak Tower, Ho Chi Minh City / Seoul',
      website: 'https://broadpeak.youngone.com',
      status: 'ACTIVE',
      parentId: null,
    },
    create: {
      id: 'org-holding',
      name: 'Youngone / Broadpeak Group',
      code: 'HOLDING',
      taxId: '0100100100',
      email: 'contact@broadpeak.youngone.com',
      phone: '+84 (28) 3997-8888',
      address: 'Broadpeak Tower, Ho Chi Minh City / Seoul',
      website: 'https://broadpeak.youngone.com',
      status: 'ACTIVE',
      parentId: null,
    },
  });

  const orgBSL = await prisma.organization.upsert({
    where: { code: 'BSL' },
    update: {
      name: 'Broadpeak Soc Trang',
      parentId: orgHolding.id,
      taxId: '2200194820',
      email: 'contact.bsl@broadpeak.youngone.com',
      phone: '+84 (299) 387-9000',
      address: 'An Nghiep Industrial Zone, Soc Trang Province, Vietnam',
      website: 'https://broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    create: {
      id: 'org-bsl',
      name: 'Broadpeak Soc Trang',
      code: 'BSL',
      parentId: orgHolding.id,
      taxId: '2200194820',
      email: 'contact.bsl@broadpeak.youngone.com',
      phone: '+84 (299) 387-9000',
      address: 'An Nghiep Industrial Zone, Soc Trang Province, Vietnam',
      website: 'https://broadpeak.youngone.com',
      status: 'ACTIVE',
    },
  });

  const orgBSH = await prisma.organization.upsert({
    where: { code: 'BSH' },
    update: {
      name: 'Broadpeak Ho Chi Minh',
      parentId: orgHolding.id,
      taxId: '0314892019',
      email: 'contact.bsh@broadpeak.youngone.com',
      phone: '+84 (28) 3997-8000',
      address: 'District 7, Ho Chi Minh City, Vietnam',
      website: 'https://broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    create: {
      id: 'org-bsh',
      name: 'Broadpeak Ho Chi Minh',
      code: 'BSH',
      parentId: orgHolding.id,
      taxId: '0314892019',
      email: 'contact.bsh@broadpeak.youngone.com',
      phone: '+84 (28) 3997-8000',
      address: 'District 7, Ho Chi Minh City, Vietnam',
      website: 'https://broadpeak.youngone.com',
      status: 'ACTIVE',
    },
  });

  // 2. Spatial Locations Hierarchy Definition
  const locationDefs: LocationDef[] = [];

  // ── BSH (Corporate HQ & Branch Offices) ──────────────────────────
  locationDefs.push(
    {
      id: 'loc-bsh-d7',
      name: 'BSH - Ho Chi Minh Office (D7)',
      code: 'HCM-D7',
      type: LocationType.BRANCH,
      status: 'ACTIVE',
      building: 'Broadpeak Tower (BSH1 + BSH2)',
      floor: 'Floor 6',
      room: 'Corporate Operations Center',
      address: 'District 7, Ho Chi Minh City, Vietnam',
      parentId: null,
      fullPath: 'BSH - Ho Chi Minh Office (D7)',
      organizationId: orgBSH.id,
    },
    {
      id: 'loc-bsh-d3',
      name: 'BSH - Ho Chi Minh Office (D3)',
      code: 'HCM-D3',
      type: LocationType.BRANCH,
      status: 'ACTIVE',
      building: 'District 3 Commercial Office',
      floor: 'Floor 3',
      room: 'Merchandising & Sourcing Studio',
      address: 'District 3, Ho Chi Minh City, Vietnam',
      parentId: null,
      fullPath: 'BSH - Ho Chi Minh Office (D3)',
      organizationId: orgBSH.id,
    },
  );

  // ── BSL Campus Root ─────────────────────────────────────────────
  const bslCampusPath = 'BSL - Soc Trang Campus';
  locationDefs.push({
    id: 'loc-bsl-st',
    name: 'BSL - Soc Trang Campus',
    code: 'BSL-ST',
    type: LocationType.CAMPUS,
    status: 'ACTIVE',
    building: 'Main Manufacturing Complex (F1-F7)',
    address: 'An Nghiep Industrial Zone, Soc Trang Province, Vietnam',
    parentId: null,
    fullPath: bslCampusPath,
    organizationId: orgBSL.id,
  });

  // ── Business Center Building ────────────────────────────────────
  const bcPath = `${bslCampusPath} > Business Center Building`;
  locationDefs.push(
    {
      id: 'loc-bsl-bc',
      name: 'Business Center Building',
      code: 'BSL-BC',
      type: LocationType.BUILDING,
      status: 'ACTIVE',
      building: 'Business Center Building',
      address: 'An Nghiep Industrial Zone, Soc Trang Province, Vietnam',
      parentId: 'loc-bsl-st',
      fullPath: bcPath,
      organizationId: orgBSL.id,
    },
    {
      id: 'loc-bsl-bc-exec',
      name: 'Executive Office (Floor 3)',
      code: 'BC-F3-EXEC',
      type: LocationType.FLOOR,
      status: 'ACTIVE',
      building: 'Business Center Building',
      floor: 'Floor 3',
      room: 'Executive Boardroom 301',
      parentId: 'loc-bsl-bc',
      fullPath: `${bcPath} > Executive Office (Floor 3)`,
      organizationId: orgBSL.id,
    },
    {
      id: 'loc-bsl-bc-imex',
      name: 'Import-Export (Xuất nhập khẩu) (Floor 2)',
      code: 'BC-F2-IMEX',
      type: LocationType.FLOOR,
      status: 'ACTIVE',
      building: 'Business Center Building',
      floor: 'Floor 2',
      room: 'Import-Export Operations Office 201',
      parentId: 'loc-bsl-bc',
      fullPath: `${bcPath} > Import-Export (Xuất nhập khẩu) (Floor 2)`,
      organizationId: orgBSL.id,
    },
    {
      id: 'loc-bsl-bc-acc',
      name: 'Accounting (Kế toán) (Floor 2)',
      code: 'BC-F2-ACC',
      type: LocationType.FLOOR,
      status: 'ACTIVE',
      building: 'Business Center Building',
      floor: 'Floor 2',
      room: 'Accounting & Finance Office 202',
      parentId: 'loc-bsl-bc',
      fullPath: `${bcPath} > Accounting (Kế toán) (Floor 2)`,
      organizationId: orgBSL.id,
    },
    {
      id: 'loc-bsl-bc-admin',
      name: 'Administration (Floor 1)',
      code: 'BC-F1-ADMIN',
      type: LocationType.FLOOR,
      status: 'ACTIVE',
      building: 'Business Center Building',
      floor: 'Floor 1',
      room: 'General Administration Hall 101',
      parentId: 'loc-bsl-bc',
      fullPath: `${bcPath} > Administration (Floor 1)`,
      organizationId: orgBSL.id,
    },
    {
      id: 'loc-bsl-bc-hr',
      name: 'Human Resources & Compliance (Floor 1)',
      code: 'BC-F1-HR',
      type: LocationType.FLOOR,
      status: 'ACTIVE',
      building: 'Business Center Building',
      floor: 'Floor 1',
      room: 'HR & Compliance Office 103',
      parentId: 'loc-bsl-bc',
      fullPath: `${bcPath} > Human Resources & Compliance (Floor 1)`,
      organizationId: orgBSL.id,
    },
    {
      id: 'loc-bsl-bc-datacenter',
      name: 'IT Server Room / Datacenter (Floor 1, Room 102)',
      code: 'BC-F1-DC102',
      type: LocationType.ROOM,
      status: 'ACTIVE',
      building: 'Business Center Building',
      floor: 'Floor 1',
      room: 'Room 102',
      parentId: 'loc-bsl-bc',
      fullPath: `${bcPath} > IT Server Room / Datacenter (Floor 1, Room 102)`,
      organizationId: orgBSL.id,
    },
  );

  // ── Central Warehouse Building (Kho tổng) ───────────────────────
  const whPath = `${bslCampusPath} > Central Warehouse Building (Kho tổng)`;
  locationDefs.push({
    id: 'loc-bsl-wh',
    name: 'Central Warehouse Building (Kho tổng)',
    code: 'BSL-WH',
    type: LocationType.WAREHOUSE,
    status: 'ACTIVE',
    building: 'Central Warehouse Building',
    address: 'An Nghiep Industrial Zone, Soc Trang Province, Vietnam',
    parentId: 'loc-bsl-st',
    fullPath: whPath,
    organizationId: orgBSL.id,
  });

  // Central Warehouse — Raw Materials Storage
  const rawPath = `${whPath} > Raw Materials Storage (Kho vải / NPL chính)`;
  locationDefs.push({
    id: 'loc-bsl-wh-raw',
    name: 'Raw Materials Storage (Kho vải / NPL chính)',
    code: 'WH-RAW',
    type: LocationType.ZONE,
    status: 'ACTIVE',
    building: 'Central Warehouse Building',
    floor: 'Ground Floor',
    parentId: 'loc-bsl-wh',
    fullPath: rawPath,
    organizationId: orgBSL.id,
  });

  // Fabric Bay 01 to 04 with Racks, Shelves, and Bins
  const fabricBays = [
    {
      bayId: 'loc-bsl-wh-bay1',
      bayName: 'Fabric Bay 01',
      bayCode: 'WH-BAY-01',
      rackId: 'loc-bsl-wh-rack1',
      rackName: 'Fabric Rack R-01',
      rackCode: 'WH-RCK-01',
      shelfId: 'loc-bsl-wh-shelf1',
      shelfName: 'Shelf Level 1',
      shelfCode: 'WH-SH-01',
      bins: [
        { id: 'loc-bsl-wh-bin1', name: 'Bin B-01 (Cotton Twill)', code: 'WH-BIN-01' },
        { id: 'loc-bsl-wh-bin2', name: 'Bin B-02 (Polyester Fleece)', code: 'WH-BIN-02' },
      ],
    },
    {
      bayId: 'loc-bsl-wh-bay2',
      bayName: 'Fabric Bay 02',
      bayCode: 'WH-BAY-02',
      rackId: 'loc-bsl-wh-rack2',
      rackName: 'Fabric Rack R-02',
      rackCode: 'WH-RCK-02',
      shelfId: 'loc-bsl-wh-shelf2',
      shelfName: 'Shelf Level 2',
      shelfCode: 'WH-SH-02',
      bins: [{ id: 'loc-bsl-wh-bin3', name: 'Bin B-03 (Nylon Taffeta)', code: 'WH-BIN-03' }],
    },
    {
      bayId: 'loc-bsl-wh-bay3',
      bayName: 'Fabric Bay 03',
      bayCode: 'WH-BAY-03',
      rackId: 'loc-bsl-wh-rack3',
      rackName: 'Fabric Rack R-03',
      rackCode: 'WH-RCK-03',
      shelfId: 'loc-bsl-wh-shelf3',
      shelfName: 'Shelf Level 3',
      shelfCode: 'WH-SH-03',
      bins: [{ id: 'loc-bsl-wh-bin4', name: 'Bin B-04 (Elastane Spandex)', code: 'WH-BIN-04' }],
    },
    {
      bayId: 'loc-bsl-wh-bay4',
      bayName: 'Fabric Bay 04',
      bayCode: 'WH-BAY-04',
      rackId: 'loc-bsl-wh-rack4',
      rackName: 'Fabric Rack R-04',
      rackCode: 'WH-RCK-04',
      shelfId: 'loc-bsl-wh-shelf4',
      shelfName: 'Shelf Level 4',
      shelfCode: 'WH-SH-04',
      bins: [],
    },
  ];

  for (const b of fabricBays) {
    const bayPath = `${rawPath} > ${b.bayName}`;
    locationDefs.push({
      id: b.bayId,
      name: b.bayName,
      code: b.bayCode,
      type: LocationType.AREA,
      status: 'ACTIVE',
      parentId: 'loc-bsl-wh-raw',
      fullPath: bayPath,
      organizationId: orgBSL.id,
    });

    const rackPath = `${bayPath} > ${b.rackName}`;
    locationDefs.push({
      id: b.rackId,
      name: b.rackName,
      code: b.rackCode,
      type: LocationType.RACK,
      status: 'ACTIVE',
      parentId: b.bayId,
      fullPath: rackPath,
      organizationId: orgBSL.id,
    });

    const shelfPath = `${rackPath} > ${b.shelfName}`;
    locationDefs.push({
      id: b.shelfId,
      name: b.shelfName,
      code: b.shelfCode,
      type: LocationType.SHELF,
      status: 'ACTIVE',
      parentId: b.rackId,
      fullPath: shelfPath,
      organizationId: orgBSL.id,
    });

    for (const bin of b.bins) {
      locationDefs.push({
        id: bin.id,
        name: bin.name,
        code: bin.code,
        type: LocationType.BIN,
        status: 'ACTIVE',
        parentId: b.shelfId,
        fullPath: `${shelfPath} > ${bin.name}`,
        organizationId: orgBSL.id,
      });
    }
  }

  // Central Warehouse — Finished Goods Storage (Kho thành phẩm xuất khẩu)
  const fgPath = `${whPath} > Finished Goods Storage (Kho thành phẩm)`;
  locationDefs.push(
    {
      id: 'loc-bsl-wh-fg',
      name: 'Finished Goods Storage (Kho thành phẩm)',
      code: 'WH-FG',
      type: LocationType.ZONE,
      status: 'ACTIVE',
      building: 'Central Warehouse Building',
      parentId: 'loc-bsl-wh',
      fullPath: fgPath,
      organizationId: orgBSL.id,
    },
    {
      id: 'loc-bsl-wh-fg-bay1',
      name: 'Bay FG-01 (Export North America)',
      code: 'WH-FG-01',
      type: LocationType.AREA,
      status: 'ACTIVE',
      parentId: 'loc-bsl-wh-fg',
      fullPath: `${fgPath} > Bay FG-01 (Export North America)`,
      organizationId: orgBSL.id,
    },
    {
      id: 'loc-bsl-wh-fg-bay2',
      name: 'Bay FG-02 (Export Europe & Asia)',
      code: 'WH-FG-02',
      type: LocationType.AREA,
      status: 'ACTIVE',
      parentId: 'loc-bsl-wh-fg',
      fullPath: `${fgPath} > Bay FG-02 (Export Europe & Asia)`,
      organizationId: orgBSL.id,
    },
  );

  // Central Warehouse — Spare Parts & Peripherals Storage (Phòng phụ tùng)
  const spPath = `${whPath} > Spare Parts & Peripherals Storage (Phòng phụ tùng)`;
  locationDefs.push({
    id: 'loc-bsl-wh-sp',
    name: 'Spare Parts & Peripherals Storage (Phòng phụ tùng)',
    code: 'WH-SP',
    type: LocationType.ROOM,
    status: 'ACTIVE',
    building: 'Central Warehouse Building',
    room: 'Spare Parts Room 105',
    parentId: 'loc-bsl-wh',
    fullPath: spPath,
    organizationId: orgBSL.id,
  });

  const spareBins = [
    { num: '01', name: 'Bin SP-01 (Sewing Needles DBx1 & DPx5)' },
    { num: '02', name: 'Bin SP-02 (Servo Motors & Drivers)' },
    { num: '03', name: 'Bin SP-03 (Rotary Hooks & Bobbin Cases)' },
    { num: '04', name: 'Bin SP-04 (Presser Feet & Feed Dogs)' },
    { num: '05', name: 'Bin SP-05 (Cutter Blades & Sharpeners)' },
    { num: '06', name: 'Bin SP-06 (Pneumatic Valves & Cylinders)' },
    { num: '07', name: 'Bin SP-07 (Heat Press Teflon Sheets)' },
    { num: '08', name: 'Bin SP-08 (Zebra Printheads & Rollers)' },
    { num: '09', name: 'Bin SP-09 (Cat6 Patch Cables & Transceivers)' },
    { num: '10', name: 'Bin SP-10 (Honeywell PDA Batteries & Docks)' },
  ];

  for (const sb of spareBins) {
    locationDefs.push({
      id: `loc-bsl-wh-sp-bin${sb.num}`,
      name: sb.name,
      code: `WH-SP-${sb.num}`,
      type: LocationType.BIN,
      status: 'ACTIVE',
      parentId: 'loc-bsl-wh-sp',
      fullPath: `${spPath} > ${sb.name}`,
      organizationId: orgBSL.id,
    });
  }

  // ── 7 Factories (Factory 1 through Factory 7 - Phân xưởng 1–7) ──
  for (let f = 1; f <= 7; f++) {
    const fId = `loc-bsl-f${f}`;
    const fName = `Factory ${f} (Phân xưởng ${f})`;
    const fCode = `BSL-F${f}`;
    const fPath = `${bslCampusPath} > ${fName}`;

    locationDefs.push({
      id: fId,
      name: fName,
      code: fCode,
      type: LocationType.WORKSHOP,
      status: 'ACTIVE',
      building: `Production Hall ${f}`,
      address: 'An Nghiep Industrial Zone, Soc Trang Province, Vietnam',
      parentId: 'loc-bsl-st',
      fullPath: fPath,
      organizationId: orgBSL.id,
    });

    // 1. QA (Quality Assurance Lab / Inspection Bench)
    const qaPath = `${fPath} > Factory ${f} - QA Lab & Technical Inspection`;
    locationDefs.push(
      {
        id: `loc-bsl-f${f}-qa`,
        name: `Factory ${f} - QA Lab & Technical Inspection`,
        code: `F${f}-QA`,
        type: LocationType.ZONE,
        status: 'ACTIVE',
        parentId: fId,
        fullPath: qaPath,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-qa-bench1`,
        name: 'Inspection Bench 01',
        code: `F${f}-QA-B01`,
        type: LocationType.STATION,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-qa`,
        fullPath: `${qaPath} > Inspection Bench 01`,
        organizationId: orgBSL.id,
      },
    );

    // 2. Sales / Merchandising (Showroom / Office)
    locationDefs.push({
      id: `loc-bsl-f${f}-sales`,
      name: `Factory ${f} - Sales & Planning Office`,
      code: `F${f}-SALES`,
      type: LocationType.ROOM,
      status: 'ACTIVE',
      parentId: fId,
      fullPath: `${fPath} > Factory ${f} - Sales & Planning Office`,
      organizationId: orgBSL.id,
    });

    // 3. Cutting (Phòng cắt vải / Bàn cắt tự động)
    const cutPath = `${fPath} > Factory ${f} - Fabric Cutting Area`;
    locationDefs.push(
      {
        id: `loc-bsl-f${f}-cut`,
        name: `Factory ${f} - Fabric Cutting Area`,
        code: `F${f}-CUT`,
        type: LocationType.ZONE,
        status: 'ACTIVE',
        parentId: fId,
        fullPath: cutPath,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-cut-tbl1`,
        name: 'Auto Cutting Table 01',
        code: `F${f}-CUT-T01`,
        type: LocationType.STATION,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-cut`,
        fullPath: `${cutPath} > Auto Cutting Table 01`,
        organizationId: orgBSL.id,
      },
    );

    // 4. Printing & Embroidery (Phòng in, thêu & ép nhiệt)
    const printPath = `${fPath} > Factory ${f} - Printing & Embroidery Zone`;
    locationDefs.push(
      {
        id: `loc-bsl-f${f}-print`,
        name: `Factory ${f} - Printing & Embroidery Zone`,
        code: `F${f}-PRINT`,
        type: LocationType.ZONE,
        status: 'ACTIVE',
        parentId: fId,
        fullPath: printPath,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-print-hp1`,
        name: 'Heat Press Station 01',
        code: `F${f}-PRN-HP1`,
        type: LocationType.STATION,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-print`,
        fullPath: `${printPath} > Heat Press Station 01`,
        organizationId: orgBSL.id,
      },
    );

    // 5. Maintenance (Khu bảo trì cơ điện & máy móc xưởng)
    const maintPath = `${fPath} > Factory ${f} - Equipment Maintenance Workshop`;
    locationDefs.push(
      {
        id: `loc-bsl-f${f}-maint`,
        name: `Factory ${f} - Equipment Maintenance Workshop (Khu Bảo Trì Cơ Điện)`,
        code: `F${f}-MAINT`,
        type: LocationType.WORKSHOP,
        status: 'ACTIVE',
        parentId: fId,
        fullPath: maintPath,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-maint-ws1`,
        name: 'Maintenance Workbench 01',
        code: `F${f}-MNT-W01`,
        type: LocationType.STATION,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-maint`,
        fullPath: `${maintPath} > Maintenance Workbench 01`,
        organizationId: orgBSL.id,
      },
    );

    // 6. MDC (Material Distribution Center - kho phụ liệu cấp phát trong xưởng)
    const mdcPath = `${fPath} > Factory ${f} - Material Distribution Center (MDC)`;
    const mdcShelfPath = `${mdcPath} > Accessories Shelf 01`;
    locationDefs.push(
      {
        id: `loc-bsl-f${f}-mdc`,
        name: `Factory ${f} - Material Distribution Center (MDC)`,
        code: `F${f}-MDC`,
        type: LocationType.WAREHOUSE,
        status: 'ACTIVE',
        parentId: fId,
        fullPath: mdcPath,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-mdc-sh1`,
        name: 'Accessories Shelf 01',
        code: `F${f}-MDC-SH1`,
        type: LocationType.SHELF,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-mdc`,
        fullPath: mdcShelfPath,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-mdc-bin1`,
        name: 'Bin MDC-01 (Zippers)',
        code: `F${f}-MDC-B01`,
        type: LocationType.BIN,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-mdc-sh1`,
        fullPath: `${mdcShelfPath} > Bin MDC-01 (Zippers)`,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-mdc-bin2`,
        name: 'Bin MDC-02 (Buttons)',
        code: `F${f}-MDC-B02`,
        type: LocationType.BIN,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-mdc-sh1`,
        fullPath: `${mdcShelfPath} > Bin MDC-02 (Buttons)`,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-mdc-bin3`,
        name: 'Bin MDC-03 (Threads)',
        code: `F${f}-MDC-B03`,
        type: LocationType.BIN,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-mdc-sh1`,
        fullPath: `${mdcShelfPath} > Bin MDC-03 (Threads)`,
        organizationId: orgBSL.id,
      },
    );

    // 7. Packing (Khu hoàn thiện / đóng gói)
    const packPath = `${fPath} > Factory ${f} - Finishing & Packing Hall`;
    locationDefs.push(
      {
        id: `loc-bsl-f${f}-pack`,
        name: `Factory ${f} - Finishing & Packing Hall`,
        code: `F${f}-PACK`,
        type: LocationType.ZONE,
        status: 'ACTIVE',
        parentId: fId,
        fullPath: packPath,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-pack-st1`,
        name: 'Packing Table 01',
        code: `F${f}-PCK-T01`,
        type: LocationType.STATION,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-pack`,
        fullPath: `${packPath} > Packing Table 01`,
        organizationId: orgBSL.id,
      },
    );

    // 8. Sample (Phòng may mẫu & phát triển rập)
    const samplePath = `${fPath} > Factory ${f} - Sample Making & Pattern Prototyping (Phòng May Mẫu & Rập)`;
    locationDefs.push(
      {
        id: `loc-bsl-f${f}-sample`,
        name: `Factory ${f} - Sample Making & Pattern Prototyping (Phòng May Mẫu & Rập)`,
        code: `F${f}-SAMPLE`,
        type: LocationType.ROOM,
        status: 'ACTIVE',
        parentId: fId,
        fullPath: samplePath,
        organizationId: orgBSL.id,
      },
      {
        id: `loc-bsl-f${f}-sample-st1`,
        name: 'Sample Sewing Station 01',
        code: `F${f}-SMP-S01`,
        type: LocationType.STATION,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-sample`,
        fullPath: `${samplePath} > Sample Sewing Station 01`,
        organizationId: orgBSL.id,
      },
    );

    // 9. Production / Sewing Lines Hall
    const prodPath = `${fPath} > Factory ${f} - Garment Production & Sewing Floor`;
    locationDefs.push({
      id: `loc-bsl-f${f}-prod`,
      name: `Factory ${f} - Garment Production & Sewing Floor`,
      code: `F${f}-PROD`,
      type: LocationType.ZONE,
      status: 'ACTIVE',
      parentId: fId,
      fullPath: prodPath,
      organizationId: orgBSL.id,
    });

    for (let l = 1; l <= 4; l++) {
      // Preserve loc-bsl-f1-sew ID for Factory 1 Line 1 for unit test contract alignment
      const lineId =
        f === 1 && l === 1
          ? 'loc-bsl-f1-sew'
          : l === 1
            ? `loc-bsl-f${f}-sew`
            : `loc-bsl-f${f}-sew${l}`;
      const lineName = `Factory ${f} - Sewing Line 0${l} (Chuyền may 0${l})`;
      const lineCode = l === 1 ? `F${f}-PROD` : `F${f}-SEW-L0${l}`;
      const linePath = `${prodPath} > ${lineName}`;

      locationDefs.push({
        id: lineId,
        name: lineName,
        code: lineCode,
        type: LocationType.LINE,
        status: 'ACTIVE',
        parentId: `loc-bsl-f${f}-prod`,
        fullPath: linePath,
        organizationId: orgBSL.id,
      });

      for (let s = 1; s <= 4; s++) {
        // Preserve loc-bsl-f1-sew-st1 ID for Factory 1 Line 1 Station 1
        const stId =
          f === 1 && l === 1 && s === 1
            ? 'loc-bsl-f1-sew-st1'
            : f === 1 && l === 1
              ? `loc-bsl-f1-sew-st${s}`
              : l === 1
                ? `loc-bsl-f${f}-sew-st${s}`
                : `loc-bsl-f${f}-sew${l}-st${s}`;
        const stName = `Station 0${s} (Bàn may 0${s})`;
        const stCode = `F${f}-S${l}-ST0${s}`;

        locationDefs.push({
          id: stId,
          name: stName,
          code: stCode,
          type: LocationType.STATION,
          status: 'ACTIVE',
          parentId: lineId,
          fullPath: `${linePath} > ${stName}`,
          organizationId: orgBSL.id,
        });
      }

      // Legacy alias support for downstream seeders (e.g. loc-bsl-f2-sew1-st1 in assets.seeder.ts)
      if (f > 1 && l === 1) {
        locationDefs.push({
          id: `loc-bsl-f${f}-sew1-st1`,
          name: `Station 01 (Bàn may 01) [Legacy Alias]`,
          code: `F${f}-S1-ST01-LEGACY`,
          type: LocationType.STATION,
          status: 'ACTIVE',
          parentId: lineId,
          fullPath: `${linePath} > Station 01 (Legacy Alias)`,
          organizationId: orgBSL.id,
        });
      }
    }
  }

  // Insert/Upsert Locations sequentially to honor hierarchy
  const seededLocations: Record<string, import('@prisma/client').Location> = {};
  for (const loc of locationDefs) {
    const record = await prisma.location.upsert({
      where: { id: loc.id },
      update: {
        name: loc.name,
        code: loc.code,
        type: loc.type,
        status: loc.status,
        building: loc.building,
        floor: loc.floor,
        room: loc.room,
        address: loc.address,
        parentId: loc.parentId,
        fullPath: loc.fullPath,
        organizationId: loc.organizationId,
      },
      create: {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        type: loc.type,
        status: loc.status,
        building: loc.building,
        floor: loc.floor,
        room: loc.room,
        address: loc.address,
        parentId: loc.parentId,
        fullPath: loc.fullPath,
        organizationId: loc.organizationId,
      },
    });
    seededLocations[loc.id] = record;
  }

  logger.log(`✅ Seeded ${locationDefs.length} hierarchical spatial locations across BSL & BSH.`);

  // 3. Standardized Departments Catalog (4-Tier Enterprise Hierarchy)
  // Level 1: Executive Leadership
  // Level 2: Operating Divisions (Khối Nghiệp Vụ, Khối Kho Vận, Khối Chất Lượng, Khối Sản Xuất)
  // Level 3: Specialized Departments & Factories (Phòng Ban & 7 Phân Xưởng May)
  // Level 4: Factory Functional Sections (Cắt, In/Thêu, May, MDC, QA/KCS, Kế Hoạch/Sale, Đóng Gói)
  const factorySections = Array.from({ length: 7 }, (_, index) => {
    const fNum = index + 1;
    const fId = `dept-bsl-f${fNum}`;
    return [
      {
        id: `${fId}-cut`,
        name: `Factory ${fNum} - Cutting Section (Tổ Cắt Vải)`,
        code: `DEPT-BSL-F${fNum}-CUT`,
        description: `Fabric spreading, CAD marker plotting, automated knife cutting & bundling for Factory ${fNum}`,
        organizationId: orgBSL.id,
        parentId: fId,
        managerName: `Section Lead F${fNum} Cutting`,
        managerEmail: `cut.f${fNum}@broadpeak.youngone.com`,
        status: 'ACTIVE',
      },
      {
        id: `${fId}-prt`,
        name: `Factory ${fNum} - Printing & Embroidery Section (Tổ In & Thêu)`,
        code: `DEPT-BSL-F${fNum}-PRT`,
        description: `Screen printing, heat-transfer vinyl & multi-head automated embroidery for Factory ${fNum}`,
        organizationId: orgBSL.id,
        parentId: fId,
        managerName: `Section Lead F${fNum} Printing`,
        managerEmail: `prt.f${fNum}@broadpeak.youngone.com`,
        status: 'ACTIVE',
      },
      {
        id: `${fId}-sew`,
        name: `Factory ${fNum} - Sewing Assembly Lines (Chuyền May Công Nghiệp)`,
        code: `DEPT-BSL-F${fNum}-SEW`,
        description: `Industrial lockstitch, overlock, flatlock sewing & seam-sealing lines for Factory ${fNum}`,
        organizationId: orgBSL.id,
        parentId: fId,
        managerName: `Line Supervisor F${fNum} Sewing`,
        managerEmail: `sew.f${fNum}@broadpeak.youngone.com`,
        status: 'ACTIVE',
      },
      {
        id: `${fId}-maint`,
        name: `Factory ${fNum} - Machine Maintenance Section (Tổ Bảo Trì Máy Móc Thiết Bị)`,
        code: `DEPT-BSL-F${fNum}-MAINT`,
        description: `Industrial sewing machine servicing, preventive maintenance, motor repairs & mechanical adjustments for Factory ${fNum}`,
        organizationId: orgBSL.id,
        parentId: fId,
        managerName: `Maintenance Lead F${fNum}`,
        managerEmail: `maint.f${fNum}@broadpeak.youngone.com`,
        status: 'ACTIVE',
      },
      {
        id: `${fId}-mdc`,
        name: `Factory ${fNum} - MDC Sub-Warehouse (Kho Cấp Phát Phụ Liệu MDC)`,
        code: `DEPT-BSL-F${fNum}-MDC`,
        description: `Material Distribution Center (MDC) sub-warehouse staging point for accessories, thread, zippers & trims in Factory ${fNum}`,
        organizationId: orgBSL.id,
        parentId: fId,
        managerName: `Storekeeper F${fNum} MDC`,
        managerEmail: `mdc.f${fNum}@broadpeak.youngone.com`,
        status: 'ACTIVE',
      },
      {
        id: `${fId}-qa`,
        name: `Factory ${fNum} - Inline QA/QC Section (Tổ Kiểm Định Chất Lượng KCS)`,
        code: `DEPT-BSL-F${fNum}-QA`,
        description: `Inline traffic-light inspection, endline AQL audit & metal detector safety for Factory ${fNum}`,
        organizationId: orgBSL.id,
        parentId: fId,
        managerName: `QA Lead F${fNum}`,
        managerEmail: `qa.f${fNum}@broadpeak.youngone.com`,
        status: 'ACTIVE',
      },
      {
        id: `${fId}-smp`,
        name: `Factory ${fNum} - Sample & Pattern Development (Tổ May Mẫu & Rập)`,
        code: `DEPT-BSL-F${fNum}-SMP`,
        description: `Pre-production sample sewing, pattern prototyping, sizing adjustments & fit trials for Factory ${fNum}`,
        organizationId: orgBSL.id,
        parentId: fId,
        managerName: `Sample Lead F${fNum}`,
        managerEmail: `sample.f${fNum}@broadpeak.youngone.com`,
        status: 'ACTIVE',
      },
      {
        id: `${fId}-sale`,
        name: `Factory ${fNum} - Factory Sales & Planning (Tổ Kế Hoạch Đơn Hàng & Sale)`,
        code: `DEPT-BSL-F${fNum}-SALE`,
        description: `Production scheduling, daily output tracking, buyer progress updates & factory line balancing`,
        organizationId: orgBSL.id,
        parentId: fId,
        managerName: `Planner F${fNum}`,
        managerEmail: `plan.f${fNum}@broadpeak.youngone.com`,
        status: 'ACTIVE',
      },
      {
        id: `${fId}-pck`,
        name: `Factory ${fNum} - Finishing & Packing Section (Tổ Hoàn Tất & Đóng Gói)`,
        code: `DEPT-BSL-F${fNum}-PCK`,
        description: `Thread trimming, steam ironing, barcode hang-tagging, polybagging & export carton packing for Factory ${fNum}`,
        organizationId: orgBSL.id,
        parentId: fId,
        managerName: `Packing Lead F${fNum}`,
        managerEmail: `pck.f${fNum}@broadpeak.youngone.com`,
        status: 'ACTIVE',
      },
    ];
  }).flat();

  const departmentsData = [
    // ═════════════════════════════════════════════════════════════════
    // ── BSL: LEVEL 1 — EXECUTIVE LEADERSHIP ───────────────────────────
    // ═════════════════════════════════════════════════════════════════
    {
      id: 'dept-bsl-mgmt',
      name: 'Factory Executive Leadership (Ban Giám Đốc Nhà Máy)',
      code: 'DEPT-BSL-MGMT',
      description: 'Factory general management, plant leadership & operational governance',
      organizationId: orgBSL.id,
      parentId: null,
      managerName: 'Tran Van Binh',
      managerEmail: 'binh.tran@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // ═════════════════════════════════════════════════════════════════
    // ── BSL: LEVEL 2 — OPERATING DIVISIONS (KHỐI CHỨC NĂNG) ──────────
    // ═════════════════════════════════════════════════════════════════
    {
      id: 'dept-bsl-ops',
      name: 'Business Operations Division (Khối Nghiệp Vụ - Business Center)',
      code: 'DEPT-BSL-OPS',
      description:
        'Business Center operational administration, commercial support, finance, compliance & IT',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Hoang Van Minh',
      managerEmail: 'minh.hoang@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-log',
      name: 'Supply Chain & Central Warehouse Division (Khối Kho Vận Tổng - Tòa Warehouse)',
      code: 'DEPT-BSL-LOG',
      description:
        'Central warehouse logistics, fabric receiving, trims storage, spare parts & export distribution',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Vo Thi Kim',
      managerEmail: 'kim.vo@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-qa',
      name: 'Quality Assurance & Technical Audit Division (Khối Quản Lý Chất Lượng & Kỹ Thuật)',
      code: 'DEPT-BSL-QA',
      description:
        'Enterprise quality management, technical compliance, brand buyer audits & sample CAD/CAM',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Nguyen Quoc Huy',
      managerEmail: 'huy.nguyen@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-prod',
      name: 'Garment Manufacturing Division (Khối Sản Xuất May Mặc)',
      code: 'DEPT-BSL-PROD',
      description:
        'Overall apparel manufacturing operations across all 7 production factories (F1 - F7)',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Le Thi Thu',
      managerEmail: 'thu.le@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // ═════════════════════════════════════════════════════════════════
    // ── BSL: LEVEL 3 — DEPARTMENTS & FACTORIES ────────────────────────
    // ═════════════════════════════════════════════════════════════════
    // Under Business Operations Division (Business Center Building)
    {
      id: 'dept-bsl-imex',
      name: 'Import-Export Department (Phòng Xuất Nhập Khẩu)',
      code: 'DEPT-BSL-IMEX',
      description:
        'Customs clearance, raw material importation, and global apparel export shipping logistics',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-ops',
      managerName: 'Hoang Van Minh',
      managerEmail: 'minh.hoang@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-acc',
      name: 'Accounting & Cost Finance (Phòng Kế Toán & Tài Chính)',
      code: 'DEPT-BSL-ACC',
      description:
        'Factory cost accounting, shop floor labor payroll, taxation & financial reporting',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-ops',
      managerName: 'Nguyen Mai Lan',
      managerEmail: 'lan.nguyenmai@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-hr',
      name: 'Human Resources & Compliance (Phòng Nhân Sự & Tuân Thủ)',
      code: 'DEPT-BSL-HR',
      description:
        'Factory workforce recruitment, employee relations, training, payroll administration & labor compliance',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-ops',
      managerName: 'Dang Minh Chau',
      managerEmail: 'chau.dang@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-it',
      name: 'Factory IT & Industrial Automation (Phòng CNTT & Tự Động Hóa)',
      code: 'DEPT-BSL-IT',
      description:
        'Shop floor networking, barcode systems, CAD/CAM workstations & plant OT/IT infrastructure',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-ops',
      managerName: 'Pham Hoang Nam',
      managerEmail: 'nam.pham@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-admin',
      name: 'General Administration & Plant Affairs (Phòng Hành Chính & Tổng Hợp)',
      code: 'DEPT-BSL-ADMIN',
      description:
        'General plant administration, workplace safety, medical clinic, cafeteria & physical facilities',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-ops',
      managerName: 'Truong Van Hai',
      managerEmail: 'hai.truong@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // Under Supply Chain & Central Warehouse Division (Warehouse Building)
    {
      id: 'dept-bsl-log-mat',
      name: 'Central Fabric & Raw Material Store (Kho Nguyên Phụ Liệu & Vải)',
      code: 'DEPT-BSL-LOG-MAT',
      description:
        'Central receiving, inspection, 4-point fabric grading, rack storage & supply dispatching',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-log',
      managerName: 'Vo Thi Kim',
      managerEmail: 'kim.vo@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-log-fg',
      name: 'Finished Goods Export Warehouse (Kho Thành Phẩm Xuất Khẩu)',
      code: 'DEPT-BSL-LOG-FG',
      description:
        'Export carton consolidation, container loading, customs seal inspection & distribution staging',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-log',
      managerName: 'Tran Van Phuc',
      managerEmail: 'phuc.tran@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-log-sp',
      name: 'Spare Parts & Mechanical Store (Kho Phụ Tùng & Cơ Điện)',
      code: 'DEPT-BSL-LOG-SP',
      description:
        'Industrial sewing machine needles, presser feet, loopers, motor drives, belts & pneumatic spares',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-log',
      managerName: 'Nguyen Van Thang',
      managerEmail: 'thang.nguyen@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // Under Quality Assurance Division
    {
      id: 'dept-bsl-qa-audit',
      name: 'Quality Compliance & Buyer Audits (Bộ Phận Đảm Bảo & Audit Khách Hàng)',
      code: 'DEPT-BSL-QA-AUDIT',
      description:
        'Brand buyer quality audits, ISO/WRAP/BSCI certifications, lab testing & defect root-cause analysis',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-qa',
      managerName: 'Nguyen Quoc Huy',
      managerEmail: 'huy.nguyen@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-qa-smp',
      name: 'Technical CAD/CAM & Sample Development (Phòng Mẫu & Thiết Kế Rập)',
      code: 'DEPT-BSL-QA-SMP',
      description:
        'Pattern making, digital grading, sample prototype sewing, pre-production approval & tech packs',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-qa',
      managerName: 'Phan Thi Mai',
      managerEmail: 'mai.phan@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // Under Garment Manufacturing Division: 7 Production Factories
    {
      id: 'dept-bsl-f1',
      name: 'Factory 1 Production (Phân Xưởng 1)',
      code: 'DEPT-BSL-F1',
      description: 'Factory 1 technical outerwear, cutting, printing, sewing lines & packaging',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Le Thi Thu',
      managerEmail: 'thu.le@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f2',
      name: 'Factory 2 Production (Phân Xưởng 2)',
      code: 'DEPT-BSL-F2',
      description: 'Factory 2 sportswear, jackets, cutting, printing & sewing assembly lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Doan Van Thanh',
      managerEmail: 'thanh.doan@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f3',
      name: 'Factory 3 Production (Phân Xưởng 3)',
      code: 'DEPT-BSL-F3',
      description: 'Factory 3 seamless activewear, performance apparel & high-stretch garments',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Tran Minh Tuan',
      managerEmail: 'tuan.tran@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f4',
      name: 'Factory 4 Production (Phân Xưởng 4)',
      code: 'DEPT-BSL-F4',
      description: 'Factory 4 outdoor technical outerwear, seam-sealed jackets & rainwear lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Nguyen Van Sang',
      managerEmail: 'sang.nguyen@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f5',
      name: 'Factory 5 Production (Phân Xưởng 5)',
      code: 'DEPT-BSL-F5',
      description: 'Factory 5 woven trousers, cargo pants & casual utility garment lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Bui Quang Hieu',
      managerEmail: 'hieu.bui@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f6',
      name: 'Factory 6 Production (Phân Xưởng 6)',
      code: 'DEPT-BSL-F6',
      description: 'Factory 6 knitwear, fleece hoodies & sweatshirts automated assembly lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Phan Quoc Dat',
      managerEmail: 'dat.phan@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f7',
      name: 'Factory 7 Production (Phân Xưởng 7)',
      code: 'DEPT-BSL-F7',
      description: 'Factory 7 high-speed automated sewing lines & quick-turn pilot runs',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Vu Dinh Nam',
      managerEmail: 'nam.vudinh@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // ═════════════════════════════════════════════════════════════════
    // ── BSL: LEVEL 4 — FACTORY FUNCTIONAL SECTIONS (TỔ PHÂN XƯỞNG) ───
    // ═════════════════════════════════════════════════════════════════
    ...factorySections,

    // ═════════════════════════════════════════════════════════════════
    // ── BSH: LEVEL 1 — CORPORATE LEADERSHIP & STRATEGY ───────────────
    // ═════════════════════════════════════════════════════════════════
    {
      id: 'dept-bsh-exec',
      name: 'Corporate Leadership & Strategy (Ban Tổng Giám Đốc)',
      code: 'DEPT-BSH-EXEC',
      description:
        'Broadpeak corporate executive management, international buyer relations & board strategy',
      organizationId: orgBSH.id,
      parentId: null,
      managerName: 'Doan Minh Tri',
      managerEmail: 'tri.doan@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // ═════════════════════════════════════════════════════════════════
    // ── BSH: LEVEL 2 — CORPORATE DIVISIONS (KHỐI DOANH NGHIỆP) ───────
    // ═════════════════════════════════════════════════════════════════
    {
      id: 'dept-bsh-comm',
      name: 'Commercial & Sourcing Division (Khối Kinh Doanh & Nguồn Cung Quốc Tế)',
      code: 'DEPT-BSH-COMM',
      description:
        'Global buyer accounts, apparel merchandising, international fabric sourcing & contract negotiation',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-exec',
      managerName: 'Nguyen Thi Lan',
      managerEmail: 'lan.nguyen@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsh-corp',
      name: 'Corporate Shared Services Division (Khối Dịch Vụ Doanh Nghiệp)',
      code: 'DEPT-BSH-CORP',
      description:
        'Enterprise ERP systems, financial treasury, regional IT infrastructure & human capital operations',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-exec',
      managerName: 'Vu Bich Ngoc',
      managerEmail: 'ngoc.vu@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // ═════════════════════════════════════════════════════════════════
    // ── BSH: LEVEL 3 — SPECIALIZED CORPORATE DEPARTMENTS ──────────────
    // ═════════════════════════════════════════════════════════════════
    // Under Commercial Division
    {
      id: 'dept-bsh-merch',
      name: 'Apparel Merchandising & Buyer Accounts (Phòng Quản Lý Đơn Hàng & Khách Hàng)',
      code: 'DEPT-BSH-MERCH',
      description:
        'Global customer accounts, pre-costing, sample development & order fulfillment coordination',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-comm',
      managerName: 'Nguyen Thi Lan',
      managerEmail: 'lan.nguyen@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsh-src',
      name: 'Global Sourcing & Raw Material Development (Phòng Phát Triển Nguồn Cung Vải)',
      code: 'DEPT-BSH-SRC',
      description:
        'Overseas fabric mills, trims vendors, yarn pricing & sustainable material certifications',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-comm',
      managerName: 'Ha Van Hung',
      managerEmail: 'hung.ha@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // Under Corporate Shared Services Division
    {
      id: 'dept-bsh-it',
      name: 'Enterprise IT & Cloud Systems (Phòng CNTT Doanh Nghiệp & Đám Mây)',
      code: 'DEPT-BSH-IT',
      description:
        'Enterprise ERP systems, cloud security, SD-WAN, data platforms & regional corporate infrastructure',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-corp',
      managerName: 'Dang Thanh Phong',
      managerEmail: 'phong.dang@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsh-fin',
      name: 'Finance, Treasury & Cost Accounting (Phòng Tài Chính & Kế Toán Tổng Hợp)',
      code: 'DEPT-BSH-FIN',
      description:
        'Corporate accounting, financial audit, banking facilities, customs tariffs & cash flow treasury',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-corp',
      managerName: 'Vu Bich Ngoc',
      managerEmail: 'ngoc.vu@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsh-hr',
      name: 'People Operations & Talent Acquisition (Phòng Nhân Sự & Thu Hút Nhân Tài)',
      code: 'DEPT-BSH-HR',
      description:
        'Executive headhunting, employer branding, organizational development & professional corporate training',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-corp',
      managerName: 'Bui Mai Phuong',
      managerEmail: 'phuong.bui@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
  ];

  const seededDepartments: Record<string, import('@prisma/client').Department> = {};
  for (const d of departmentsData) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: {
        name: d.name,
        description: d.description,
        organizationId: d.organizationId,
        parentId: d.parentId,
        managerName: d.managerName,
        managerEmail: d.managerEmail,
        status: d.status,
      },
      create: d,
    });
    seededDepartments[d.code] = dept;
  }

  // 4. Job Positions Catalog (Aligned with Multi-Tier Hierarchy)
  const positionsData = [
    // ── BSL Level 1 & 2 Positions ────────────────────────────────────
    {
      id: 'pos-bsl-gm',
      title: 'Factory General Director (Tổng Giám Đốc Nhà Máy)',
      code: 'POS-BSL-GM',
      deptCode: 'DEPT-BSL-MGMT',
      level: 'Executive',
    },
    {
      id: 'pos-bsl-ops-dir',
      title: 'Business Operations Director (Giám Đốc Khối Nghiệp Vụ)',
      code: 'POS-BSL-OPS-DIR',
      deptCode: 'DEPT-BSL-OPS',
      level: 'Director',
    },
    {
      id: 'pos-bsl-sc-dir',
      title: 'Supply Chain & Logistics Director (Giám Đốc Khối Kho Vận)',
      code: 'POS-BSL-SC-DIR',
      deptCode: 'DEPT-BSL-LOG',
      level: 'Director',
    },
    {
      id: 'pos-bsl-qa-dir',
      title: 'Quality Assurance Director (Giám Đốc Khối Chất Lượng)',
      code: 'POS-BSL-QA-DIR',
      deptCode: 'DEPT-BSL-QA',
      level: 'Director',
    },
    {
      id: 'pos-bsl-prod-mgr',
      title: 'Garment Production Operations Director (Giám Đốc Sản Xuất)',
      code: 'POS-BSL-PROD-MGR',
      deptCode: 'DEPT-BSL-PROD',
      level: 'Director',
    },

    // ── BSL Level 3 Department Positions ─────────────────────────────
    {
      id: 'pos-bsl-it-mgr',
      title: 'Factory IT Manager',
      code: 'POS-BSL-IT-MGR',
      deptCode: 'DEPT-BSL-IT',
      level: 'Manager',
    },
    {
      id: 'pos-bsl-it-spec',
      title: 'Industrial IT & Automation Specialist',
      code: 'POS-BSL-IT-SPEC',
      deptCode: 'DEPT-BSL-IT',
      level: 'Senior',
    },
    {
      id: 'pos-bsl-imex-lead',
      title: 'Senior Import-Export Specialist',
      code: 'POS-BSL-IMEX-LEAD',
      deptCode: 'DEPT-BSL-IMEX',
      level: 'Senior',
    },
    {
      id: 'pos-bsl-acc-mgr',
      title: 'Chief Cost Accountant',
      code: 'POS-BSL-ACC-MGR',
      deptCode: 'DEPT-BSL-ACC',
      level: 'Manager',
    },
    {
      id: 'pos-bsl-admin-lead',
      title: 'Plant Administration & HSE Officer',
      code: 'POS-BSL-ADMIN-LEAD',
      deptCode: 'DEPT-BSL-ADMIN',
      level: 'Mid',
    },
    {
      id: 'pos-bsl-hr-exec',
      title: 'HR & Employee Relations Officer',
      code: 'POS-BSL-HR-EXEC',
      deptCode: 'DEPT-BSL-HR',
      level: 'Mid',
    },
    {
      id: 'pos-bsl-wh-sup',
      title: 'Central Warehouse & Fabric Supervisor',
      code: 'POS-BSL-WH-SUP',
      deptCode: 'DEPT-BSL-LOG-MAT',
      level: 'Mid',
    },
    {
      id: 'pos-bsl-qa-lead',
      title: 'Corporate QA Audit & Compliance Lead',
      code: 'POS-BSL-QA-LEAD',
      deptCode: 'DEPT-BSL-QA-AUDIT',
      level: 'Lead',
    },
    {
      id: 'pos-bsl-cad-spec',
      title: 'CAD/CAM Pattern Development Specialist',
      code: 'POS-BSL-CAD-SPEC',
      deptCode: 'DEPT-BSL-QA-SMP',
      level: 'Senior',
    },

    // ── BSL Level 3 & 4 Factory Positions (Factory 1 Example) ────────
    {
      id: 'pos-bsl-f1-mgr',
      title: 'Factory 1 Production Manager (Trưởng Phân Xưởng 1)',
      code: 'POS-BSL-F1-MGR',
      deptCode: 'DEPT-BSL-F1',
      level: 'Manager',
    },
    {
      id: 'pos-bsl-f1-sup',
      title: 'Factory 1 Production Supervisor',
      code: 'POS-BSL-F1-SUP',
      deptCode: 'DEPT-BSL-F1',
      level: 'Mid',
    },
    {
      id: 'pos-bsl-f1-cut-lead',
      title: 'Cutting Section Team Leader (Tổ Trưởng Cắt F1)',
      code: 'POS-BSL-F1-CUT-LEAD',
      deptCode: 'DEPT-BSL-F1-CUT',
      level: 'Lead',
    },
    {
      id: 'pos-bsl-f1-prt-lead',
      title: 'Printing & Screen Technician (Tổ Trưởng In F1)',
      code: 'POS-BSL-F1-PRT-LEAD',
      deptCode: 'DEPT-BSL-F1-PRT',
      level: 'Senior',
    },
    {
      id: 'pos-bsl-f1-sew-sup',
      title: 'Sewing Assembly Line Leader (Trưởng Chuyền May F1)',
      code: 'POS-BSL-F1-SEW-SUP',
      deptCode: 'DEPT-BSL-F1-SEW',
      level: 'Lead',
    },
    {
      id: 'pos-bsl-f1-mdc-sup',
      title: 'MDC Sub-Warehouse Storekeeper (Thủ Kho MDC F1)',
      code: 'POS-BSL-F1-MDC-SUP',
      deptCode: 'DEPT-BSL-F1-MDC',
      level: 'Mid',
    },
    {
      id: 'pos-bsl-f1-qa-lead',
      title: 'Inline QA/QC Inspector (KCS Trưởng Xưởng F1)',
      code: 'POS-BSL-F1-QA-LEAD',
      deptCode: 'DEPT-BSL-F1-QA',
      level: 'Lead',
    },
    {
      id: 'pos-bsl-f1-sale-plan',
      title: 'Factory Production Planner & Merchandiser (Kế Hoạch F1)',
      code: 'POS-BSL-F1-PLAN',
      deptCode: 'DEPT-BSL-F1-SALE',
      level: 'Senior',
    },
    {
      id: 'pos-bsl-f1-pck-sup',
      title: 'Finishing & Packing Team Leader (Tổ Trưởng Đóng Gói F1)',
      code: 'POS-BSL-F1-PCK-SUP',
      deptCode: 'DEPT-BSL-F1-PCK',
      level: 'Lead',
    },
    {
      id: 'pos-bsl-f1-maint-lead',
      title: 'Maintenance Team Leader (Tổ Trưởng Bảo Trì F1)',
      code: 'POS-BSL-F1-MAINT-LEAD',
      deptCode: 'DEPT-BSL-F1-MAINT',
      level: 'Lead',
    },
    {
      id: 'pos-bsl-f1-smp-lead',
      title: 'Sample Development Team Leader (Tổ Trưởng May Mẫu F1)',
      code: 'POS-BSL-F1-SMP-LEAD',
      deptCode: 'DEPT-BSL-F1-SMP',
      level: 'Lead',
    },

    // ── BSH Corporate Positions ──────────────────────────────────────
    {
      id: 'pos-bsh-md',
      title: 'Managing Director (Tổng Giám Đốc)',
      code: 'POS-BSH-MD',
      deptCode: 'DEPT-BSH-EXEC',
      level: 'Executive',
    },
    {
      id: 'pos-bsh-comm-dir',
      title: 'Commercial & Sourcing Director (Giám Đốc Thương Mại)',
      code: 'POS-BSH-COMM-DIR',
      deptCode: 'DEPT-BSH-COMM',
      level: 'Director',
    },
    {
      id: 'pos-bsh-corp-dir',
      title: 'Corporate Services Director (Giám Đốc Dịch Vụ)',
      code: 'POS-BSH-CORP-DIR',
      deptCode: 'DEPT-BSH-CORP',
      level: 'Director',
    },
    {
      id: 'pos-bsh-it-arch',
      title: 'Enterprise IT Systems Architect',
      code: 'POS-BSH-IT-ARCH',
      deptCode: 'DEPT-BSH-IT',
      level: 'Lead',
    },
    {
      id: 'pos-bsh-it-eng',
      title: 'Systems & Network Engineer',
      code: 'POS-BSH-IT-ENG',
      deptCode: 'DEPT-BSH-IT',
      level: 'Senior',
    },
    {
      id: 'pos-bsh-merch-mgr',
      title: 'Senior Merchandising Manager',
      code: 'POS-BSH-MERCH-MGR',
      deptCode: 'DEPT-BSH-MERCH',
      level: 'Manager',
    },
    {
      id: 'pos-bsh-merch-spec',
      title: 'Apparel Merchandiser',
      code: 'POS-BSH-MERCH-SPEC',
      deptCode: 'DEPT-BSH-MERCH',
      level: 'Mid',
    },
    {
      id: 'pos-bsh-src-spec',
      title: 'Global Fabric Sourcing Specialist',
      code: 'POS-BSH-SRC-SPEC',
      deptCode: 'DEPT-BSH-SRC',
      level: 'Senior',
    },
    {
      id: 'pos-bsh-fin-ctrl',
      title: 'Chief Accountant & Financial Controller',
      code: 'POS-BSH-FIN-CTRL',
      deptCode: 'DEPT-BSH-FIN',
      level: 'Director',
    },
    {
      id: 'pos-bsh-hr-mgr',
      title: 'Talent Acquisition & HR Manager',
      code: 'POS-BSH-HR-MGR',
      deptCode: 'DEPT-BSH-HR',
      level: 'Manager',
    },
  ];

  const seededPositions: Record<string, import('@prisma/client').Position> = {};
  for (const p of positionsData) {
    const dept = seededDepartments[p.deptCode];
    if (!dept) continue;
    const pos = await prisma.position.upsert({
      where: { code: p.code },
      update: { title: p.title, departmentId: dept.id, level: p.level },
      create: {
        id: p.id,
        title: p.title,
        code: p.code,
        description: `${p.level} role in ${dept.name}`,
        departmentId: dept.id,
        level: p.level,
        status: 'ACTIVE',
      },
    });
    seededPositions[p.code] = pos;
  }

  logger.log(
    `✅ Seeded 3 Youngone / Broadpeak Group entities (Holding, BSL & BSH), ${locationDefs.length} spatial locations, ${Object.keys(seededDepartments).length} departments, and ${Object.keys(seededPositions).length} positions.`,
  );

  return {
    organizations: { orgHolding, orgBSL, orgBSH },
    locations: seededLocations,
    departments: seededDepartments,
    positions: seededPositions,
  };
}
