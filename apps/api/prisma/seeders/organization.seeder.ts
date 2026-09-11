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
    '🏢 Seeding Broadpeak (BSL & BSH) Organizations, Spatial Locations, Departments & Positions...',
  );

  // 1. Two Companies: BSL (Soc Trang - Garment Manufacturing) and BSH (Ho Chi Minh - Corporate HQ)
  const orgBSL = await prisma.organization.upsert({
    where: { code: 'BSL' },
    update: {
      name: 'Broadpeak Soc Trang (BSL)',
      taxId: '2200194820',
      email: 'contact.bsl@broadpeak.youngone.com',
      phone: '+84 (299) 387-9000',
      address: 'An Nghiep Industrial Zone, Soc Trang Province, Vietnam',
      website: 'https://broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    create: {
      id: 'org-bsl',
      name: 'Broadpeak Soc Trang (BSL)',
      code: 'BSL',
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
      name: 'Broadpeak Ho Chi Minh (BSH)',
      taxId: '0314892019',
      email: 'contact.bsh@broadpeak.youngone.com',
      phone: '+84 (28) 3997-8000',
      address: 'District 7, Ho Chi Minh City, Vietnam',
      website: 'https://broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    create: {
      id: 'org-bsh',
      name: 'Broadpeak Ho Chi Minh (BSH)',
      code: 'BSH',
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
      name: `Factory ${f} - Sales & Merchandising Office`,
      code: `F${f}-SALES`,
      type: LocationType.ROOM,
      status: 'ACTIVE',
      parentId: fId,
      fullPath: `${fPath} > Factory ${f} - Sales & Merchandising Office`,
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

    // 4. Printing / Embroidery (Phòng in / ép nhiệt)
    const printPath = `${fPath} > Factory ${f} - Printing & Heat Press`;
    locationDefs.push(
      {
        id: `loc-bsl-f${f}-print`,
        name: `Factory ${f} - Printing & Heat Press`,
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

    // 5. MDC (Material Distribution Center - kho phụ liệu cấp phát trong xưởng)
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

    // 6. Packing (Khu hoàn thiện / đóng gói)
    const packPath = `${fPath} > Factory ${f} - Packing & Finishing Area`;
    locationDefs.push(
      {
        id: `loc-bsl-f${f}-pack`,
        name: `Factory ${f} - Packing & Finishing Area`,
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

    // 7. Sewing Lines (Chuyền may 1 through Chuyền may 4, each with Operator Stations)
    for (let l = 1; l <= 4; l++) {
      // Preserve loc-bsl-f1-sew ID for Factory 1 Line 1 for unit test contract alignment
      const lineId = f === 1 && l === 1 ? 'loc-bsl-f1-sew' : `loc-bsl-f${f}-sew${l}`;
      const lineName = `Factory ${f} - Sewing Line 0${l} (Chuyền may 0${l})`;
      const lineCode = `F${f}-SEW-L0${l}`;
      const linePath = `${fPath} > ${lineName}`;

      locationDefs.push({
        id: lineId,
        name: lineName,
        code: lineCode,
        type: LocationType.LINE,
        status: 'ACTIVE',
        parentId: fId,
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

  // 3. Standardized Departments Catalog
  const departmentsData = [
    // ── BSL Departments (Soc Trang Manufacturing Hub) ─────────────
    {
      id: 'dept-bsl-mgmt',
      name: 'Factory Executive Leadership',
      code: 'DEPT-BSL-MGMT',
      description: 'Factory general management, plant leadership & operational governance',
      organizationId: orgBSL.id,
      parentId: null,
      managerName: 'Tran Van Binh',
      managerEmail: 'binh.tran@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    // Business Center Departments
    {
      id: 'dept-bsl-it',
      name: 'Factory IT & Industrial Automation',
      code: 'DEPT-BSL-IT',
      description:
        'Shop floor networking, barcode systems, CAD/CAM workstations & IT infrastructure',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Pham Hoang Nam',
      managerEmail: 'nam.pham@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-imex',
      name: 'Import-Export Department (Xuất nhập khẩu)',
      code: 'DEPT-BSL-IMEX',
      description:
        'Customs declaration, raw material importation, and global garment export logistics',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Hoang Van Minh',
      managerEmail: 'minh.hoang@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-acc',
      name: 'Accounting & Cost Finance (Kế toán)',
      code: 'DEPT-BSL-ACC',
      description:
        'Factory cost accounting, shop floor labor payroll, taxation & financial reporting',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Nguyen Mai Lan',
      managerEmail: 'lan.nguyenmai@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-admin',
      name: 'General Administration & Plant Affairs',
      code: 'DEPT-BSL-ADMIN',
      description:
        'General plant administration, workplace safety, cafeteria & physical facilities',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Truong Van Hai',
      managerEmail: 'hai.truong@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-hr',
      name: 'Human Resources & General Affairs',
      code: 'DEPT-BSL-HR',
      description: 'Factory workforce recruitment, employee relations, training & labor compliance',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Dang Minh Chau',
      managerEmail: 'chau.dang@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    // Central Warehouse Department
    {
      id: 'dept-bsl-log',
      name: 'Central Warehouse & Logistics (Kho tổng)',
      code: 'DEPT-BSL-LOG',
      description:
        'Central fabric warehouse, accessories stockroom & export finished goods logistics',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Vo Thi Kim',
      managerEmail: 'kim.vo@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    // QA Department
    {
      id: 'dept-bsl-qa',
      name: 'Quality Assurance & Technical Audit',
      code: 'DEPT-BSL-QA',
      description:
        'Garment inline/endline inspection, AQL standards & brand buyer technical audits',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Nguyen Quoc Huy',
      managerEmail: 'huy.nguyen@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    // Production Division
    {
      id: 'dept-bsl-prod',
      name: 'Garment Production Division',
      code: 'DEPT-BSL-PROD',
      description: 'Overall apparel manufacturing management across all 7 production factories',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-mgmt',
      managerName: 'Le Thi Thu',
      managerEmail: 'thu.le@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    // 7 Factory Departments (Factory 1 to 7)
    {
      id: 'dept-bsl-f1',
      name: 'Factory 1 Production (Phân xưởng 1)',
      code: 'DEPT-BSL-F1',
      description: 'Factory 1 sewing lines, cutting, printing & packaging operations',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Le Thi Thu',
      managerEmail: 'thu.le@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f2',
      name: 'Factory 2 Production (Phân xưởng 2)',
      code: 'DEPT-BSL-F2',
      description: 'Factory 2 sportswear & jacket production lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Doan Van Thanh',
      managerEmail: 'thanh.doan@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f3',
      name: 'Factory 3 Production (Phân xưởng 3)',
      code: 'DEPT-BSL-F3',
      description: 'Factory 3 seamless activewear & performance apparel lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Tran Minh Tuan',
      managerEmail: 'tuan.tran@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f4',
      name: 'Factory 4 Production (Phân xưởng 4)',
      code: 'DEPT-BSL-F4',
      description: 'Factory 4 outdoor outerwear & seam-sealed garment lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Nguyen Van Sang',
      managerEmail: 'sang.nguyen@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f5',
      name: 'Factory 5 Production (Phân xưởng 5)',
      code: 'DEPT-BSL-F5',
      description: 'Factory 5 woven trousers & casual garment lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Bui Quang Hieu',
      managerEmail: 'hieu.bui@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f6',
      name: 'Factory 6 Production (Phân xưởng 6)',
      code: 'DEPT-BSL-F6',
      description: 'Factory 6 knitwear & fleece assembly lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Phan Quoc Dat',
      managerEmail: 'dat.phan@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsl-f7',
      name: 'Factory 7 Production (Phân xưởng 7)',
      code: 'DEPT-BSL-F7',
      description: 'Factory 7 high-speed automated sewing & sample development lines',
      organizationId: orgBSL.id,
      parentId: 'dept-bsl-prod',
      managerName: 'Vu Dinh Nam',
      managerEmail: 'nam.vudinh@broadpeak.youngone.com',
      status: 'ACTIVE',
    },

    // ── BSH Departments (Ho Chi Minh Corporate & Commercial Hub) ──
    {
      id: 'dept-bsh-exec',
      name: 'Corporate Leadership & Strategy',
      code: 'DEPT-BSH-EXEC',
      description: 'Broadpeak executive management, global buyer coordination & strategy',
      organizationId: orgBSH.id,
      parentId: null,
      managerName: 'Doan Minh Tri',
      managerEmail: 'tri.doan@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsh-it',
      name: 'Enterprise IT & Cloud Systems',
      code: 'DEPT-BSH-IT',
      description: 'Enterprise ERP systems, cloud security, SD-WAN & regional infrastructure',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-exec',
      managerName: 'Dang Thanh Phong',
      managerEmail: 'phong.dang@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsh-merch',
      name: 'Apparel Merchandising & Sourcing',
      code: 'DEPT-BSH-MERCH',
      description: 'Customer accounts, sample development, garment sourcing & order management',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-exec',
      managerName: 'Nguyen Thi Lan',
      managerEmail: 'lan.nguyen@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsh-fin',
      name: 'Finance, Treasury & Cost Accounting',
      code: 'DEPT-BSH-FIN',
      description: 'Corporate accounting, financial reporting, customs tariffs & payroll',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-exec',
      managerName: 'Vu Bich Ngoc',
      managerEmail: 'ngoc.vu@broadpeak.youngone.com',
      status: 'ACTIVE',
    },
    {
      id: 'dept-bsh-hr',
      name: 'People Operations & Talent Acquisition',
      code: 'DEPT-BSH-HR',
      description: 'Talent recruitment, corporate development & training',
      organizationId: orgBSH.id,
      parentId: 'dept-bsh-exec',
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

  // 4. Job Positions Catalog
  const positionsData = [
    // BSL Positions
    {
      id: 'pos-bsl-gm',
      title: 'Factory General Director',
      code: 'POS-BSL-GM',
      deptCode: 'DEPT-BSL-MGMT',
      level: 'Executive',
    },
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
      id: 'pos-bsl-prod-mgr',
      title: 'Garment Production Manager',
      code: 'POS-BSL-PROD-MGR',
      deptCode: 'DEPT-BSL-PROD',
      level: 'Manager',
    },
    {
      id: 'pos-bsl-qa-lead',
      title: 'Quality Assurance Lead',
      code: 'POS-BSL-QA-LEAD',
      deptCode: 'DEPT-BSL-QA',
      level: 'Lead',
    },
    {
      id: 'pos-bsl-wh-sup',
      title: 'Warehouse & Inventory Supervisor',
      code: 'POS-BSL-WH-SUP',
      deptCode: 'DEPT-BSL-LOG',
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
      id: 'pos-bsl-f1-sup',
      title: 'Factory 1 Production Supervisor',
      code: 'POS-BSL-F1-SUP',
      deptCode: 'DEPT-BSL-F1',
      level: 'Mid',
    },

    // BSH Positions
    {
      id: 'pos-bsh-md',
      title: 'Managing Director',
      code: 'POS-BSH-MD',
      deptCode: 'DEPT-BSH-EXEC',
      level: 'Executive',
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
      id: 'pos-bsh-fin-ctrl',
      title: 'Chief Accountant & Controller',
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
    `✅ Seeded 2 Broadpeak companies (BSL & BSH), ${locationDefs.length} spatial locations, ${Object.keys(seededDepartments).length} departments, and ${Object.keys(seededPositions).length} positions.`,
  );

  return {
    organizations: { orgBSL, orgBSH },
    locations: seededLocations,
    departments: seededDepartments,
    positions: seededPositions,
  };
}
