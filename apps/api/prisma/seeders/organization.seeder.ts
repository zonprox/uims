import { LocationType, type PrismaClient } from '@prisma/client';
import {
  type LocationDef,
  type SeederContext,
  generateFactoryLocations,
  generateFactorySections,
  inTransactionChunks,
  runDomainSeeder,
} from './seeder.utils';

export async function seedOrganizations(prisma: PrismaClient, ctx?: SeederContext) {
  return runDomainSeeder(
    'OrganizationSeeder',
    '🏢',
    'Youngone / Broadpeak Group (Holding, BSL & BSH) Organizations, Spatial Locations, Departments & Positions',
    async (logger) => {
      // 1. Corporate Hierarchy: Holding Company and 2 Operating Subsidiaries (BSL & BSH)
      const orgRows = [
        'org-holding|HOLDING|Youngone / Broadpeak Group||0100100100|contact@youngonevn.com|+84 (28) 3997-8888|Broadpeak Tower, Ho Chi Minh City / Seoul|https://youngonevn.com',
        'org-bsl|BSL|Broadpeak Soc Trang|org-holding|2200194820|contact.bsl@youngonevn.com|+84 (299) 387-9000|An Nghiep Industrial Zone, Soc Trang Province, Vietnam|https://youngonevn.com',
        'org-bsh|BSH|Broadpeak Ho Chi Minh|org-holding|0314892019|contact.bsh@youngonevn.com|+84 (28) 3997-8000|District 7, Ho Chi Minh City, Vietnam|https://youngonevn.com',
      ];
      const orgMap: Record<string, import('@prisma/client').Organization> = {};
      for (const row of orgRows) {
        const [id, code, name, parentId, taxId, email, phone, address, website] = row.split('|');
        const record = await prisma.organization.upsert({
          where: { code },
          update: { name, parentId: parentId || null },
          create: {
            id,
            code,
            name,
            parentId: parentId || null,
            taxId,
            email,
            phone,
            address,
            website,
            status: 'ACTIVE',
          },
        });
        orgMap[code] = record;
        if (ctx) {
          ctx.organizations.set(code, record.id);
          ctx.organizations.set(record.id, record.id);
          ctx.organizations.set(name, record.id);
        }
      }
      const orgHolding = orgMap.HOLDING;
      const orgBSL = orgMap.BSL;
      const orgBSH = orgMap.BSH;

      // 2. Spatial Locations Hierarchy Definition
      const locationDefs: LocationDef[] = [];

      // BSH (Corporate HQ & Branch Offices)
      const bshOffices = [
        'loc-bsh-d7|BSH - Ho Chi Minh Office (D7)|HCM-D7|Broadpeak Tower (BSH1 + BSH2)|Floor 6|Corporate Operations Center|District 7, Ho Chi Minh City, Vietnam',
        'loc-bsh-d3|BSH - Ho Chi Minh Office (D3)|HCM-D3|District 3 Commercial Office|Floor 3|Merchandising & Sourcing Studio|District 3, Ho Chi Minh City, Vietnam',
      ];
      for (const row of bshOffices) {
        const [id, name, code, building, floor, room, address] = row.split('|');
        locationDefs.push({
          id,
          name,
          code,
          type: LocationType.BRANCH,
          status: 'ACTIVE',
          building,
          floor,
          room,
          address,
          parentId: null,
          fullPath: name,
          organizationId: orgBSH.id,
        });
      }

      // BSL Campus Root
      const bslCampusPath = 'BSL - Soc Trang Campus';
      locationDefs.push({
        id: 'loc-bsl-st',
        name: bslCampusPath,
        code: 'BSL-ST',
        type: LocationType.CAMPUS,
        status: 'ACTIVE',
        building: 'Main Manufacturing Complex (F1-F7)',
        address: 'An Nghiep Industrial Zone, Soc Trang Province, Vietnam',
        parentId: null,
        fullPath: bslCampusPath,
        organizationId: orgBSL.id,
      });

      // Business Center Building
      const bcPath = `${bslCampusPath} > Business Center Building`;
      locationDefs.push({
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
      });

      const bcRooms = [
        'loc-bsl-bc-exec|Executive Office (Floor 3)|BC-F3-EXEC|FLOOR|Floor 3|Executive Boardroom 301',
        'loc-bsl-bc-imex|Import-Export (Floor 2)|BC-F2-IMEX|FLOOR|Floor 2|Import-Export Operations Office 201',
        'loc-bsl-bc-acc|Accounting (Floor 2)|BC-F2-ACC|FLOOR|Floor 2|Accounting & Finance Office 202',
        'loc-bsl-bc-admin|Administration (Floor 1)|BC-F1-ADMIN|FLOOR|Floor 1|General Administration Hall 101',
        'loc-bsl-bc-hr|Human Resources & Compliance (Floor 1)|BC-F1-HR|FLOOR|Floor 1|HR & Compliance Office 103',
        'loc-bsl-bc-datacenter|IT Server Room / Datacenter (Floor 1, Room 102)|BC-F1-DC102|ROOM|Floor 1|Room 102',
      ];
      for (const row of bcRooms) {
        const [id, name, code, type, floor, room] = row.split('|');
        locationDefs.push({
          id,
          name,
          code,
          type: type as LocationType,
          status: 'ACTIVE',
          building: 'Business Center Building',
          floor,
          room,
          parentId: 'loc-bsl-bc',
          fullPath: `${bcPath} > ${name}`,
          organizationId: orgBSL.id,
        });
      }

      // Business Center Sub-Rooms (Technical CAD & QA Lab)
      const bcSubRooms = [
        'loc-bsl-bc-tech|Technical CAD/CAM & Pattern Office (Floor 2)|BC-F2-TECH|loc-bsl-bc-imex|Floor 2|Room 203',
        'loc-bsl-lab-qa|Central QA Testing Laboratory (Floor 1)|BSL-LAB-QA|loc-bsl-bc-admin|Floor 1|Room 104',
      ];
      for (const row of bcSubRooms) {
        const [id, name, code, parentId, floor, room] = row.split('|');
        locationDefs.push({
          id,
          name,
          code,
          type: LocationType.ROOM,
          status: 'ACTIVE',
          building: 'Business Center Building',
          floor,
          room,
          parentId,
          fullPath: `${bcPath} > ${name}`,
          organizationId: orgBSL.id,
        });
      }

      // Central Warehouse Building (Kho tong)
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

      // Central Warehouse — Raw Materials Storage (Kho vai / NPL chinh)
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

      // Helper for leaf storage locations
      const storageLoc = (
        id: string,
        name: string,
        code: string,
        type: LocationType,
        parentId: string,
        fullPath: string,
      ): LocationDef => ({
        id,
        name,
        code,
        type,
        status: 'ACTIVE',
        parentId,
        fullPath,
        organizationId: orgBSL.id,
      });

      // Fabric Bay 01 to 04 with Racks, Shelves, and Bins
      const fabricBayDefs = [
        {
          id: '1',
          name: 'Fabric Bay 01',
          bins: [
            ['1', 'Cotton Twill'],
            ['2', 'Polyester Fleece'],
          ],
        },
        { id: '2', name: 'Fabric Bay 02', bins: [['3', 'Nylon Taffeta']] },
        { id: '3', name: 'Fabric Bay 03', bins: [['4', 'Elastane Spandex']] },
        { id: '4', name: 'Fabric Bay 04', bins: [] as Array<[string, string]> },
      ];
      for (const b of fabricBayDefs) {
        const bayId = `loc-bsl-wh-bay${b.id}`;
        const bayPath = `${rawPath} > ${b.name}`;
        const rackId = `loc-bsl-wh-rack${b.id}`;
        const rackName = `Fabric Rack R-0${b.id}`;
        const rackPath = `${bayPath} > ${rackName}`;
        const shelfId = `loc-bsl-wh-shelf${b.id}`;
        const shelfName = `Shelf Level ${b.id}`;
        const shelfPath = `${rackPath} > ${shelfName}`;

        locationDefs.push(
          storageLoc(
            bayId,
            b.name,
            `WH-BAY-0${b.id}`,
            LocationType.AREA,
            'loc-bsl-wh-raw',
            bayPath,
          ),
          storageLoc(rackId, rackName, `WH-RCK-0${b.id}`, LocationType.RACK, bayId, rackPath),
          storageLoc(shelfId, shelfName, `WH-SH-0${b.id}`, LocationType.SHELF, rackId, shelfPath),
        );

        for (const [binNum, fabricType] of b.bins) {
          const binName = `Bin B-0${binNum} (${fabricType})`;
          locationDefs.push(
            storageLoc(
              `loc-bsl-wh-bin${binNum}`,
              binName,
              `WH-BIN-0${binNum}`,
              LocationType.BIN,
              shelfId,
              `${shelfPath} > ${binName}`,
            ),
          );
        }
      }

      // Central Warehouse — Finished Goods Storage (Kho thanh pham)
      const fgPath = `${whPath} > Finished Goods Storage (Kho thành phẩm)`;
      locationDefs.push({
        id: 'loc-bsl-wh-fg',
        name: 'Finished Goods Storage (Kho thành phẩm)',
        code: 'WH-FG',
        type: LocationType.ZONE,
        status: 'ACTIVE',
        building: 'Central Warehouse Building',
        parentId: 'loc-bsl-wh',
        fullPath: fgPath,
        organizationId: orgBSL.id,
      });

      const fgBays: Array<[string, string, string]> = [
        ['loc-bsl-wh-fg-bay1', 'Bay FG-01 (Export North America)', 'WH-FG-01'],
        ['loc-bsl-wh-fg-bay2', 'Bay FG-02 (Export Europe & Asia)', 'WH-FG-02'],
      ];
      for (const [id, name, code] of fgBays) {
        locationDefs.push(
          storageLoc(id, name, code, LocationType.AREA, 'loc-bsl-wh-fg', `${fgPath} > ${name}`),
        );
      }

      // Central Warehouse — Spare Parts & Peripherals Storage (Phong phu tung)
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
        '01|Bin SP-01 (Sewing Needles DBx1 & DPx5)',
        '02|Bin SP-02 (Servo Motors & Drivers)',
        '03|Bin SP-03 (Rotary Hooks & Bobbin Cases)',
        '04|Bin SP-04 (Presser Feet & Feed Dogs)',
        '05|Bin SP-05 (Cutter Blades & Sharpeners)',
        '06|Bin SP-06 (Pneumatic Valves & Cylinders)',
        '07|Bin SP-07 (Heat Press Teflon Sheets)',
        '08|Bin SP-08 (Zebra Printheads & Rollers)',
        '09|Bin SP-09 (Cat6 Patch Cables & Transceivers)',
        '10|Bin SP-10 (Honeywell PDA Batteries & Docks)',
      ];
      for (const row of spareBins) {
        const [num, name] = row.split('|');
        locationDefs.push(
          storageLoc(
            `loc-bsl-wh-sp-bin${num}`,
            name,
            `WH-SP-${num}`,
            LocationType.BIN,
            'loc-bsl-wh-sp',
            `${spPath} > ${name}`,
          ),
        );
      }

      // ── Factories 1 through 7 ───────────────────────────────────────
      for (let f = 1; f <= 7; f++) {
        locationDefs.push(...generateFactoryLocations(f, orgBSL.id, bslCampusPath));
      }

      // Upsert Locations in deterministic transaction chunks of 50
      const seededLocations: Record<string, import('@prisma/client').Location> = {};
      const chunkResults = await inTransactionChunks(prisma, locationDefs, 50, async (tx, loc) => {
        const { id, ...data } = loc;
        return tx.location.upsert({
          where: { id },
          update: {
            ...data,
            building: data.building || null,
            floor: data.floor || null,
            room: data.room || null,
            address: data.address || null,
            parentId: data.parentId || null,
          },
          create: loc,
        });
      });

      for (const record of chunkResults) {
        seededLocations[record.id] = record;
        if (ctx) {
          ctx.locations.set(record.id, record.id);
          if (record.code) ctx.locations.set(record.code, record.id);
        }
      }

      // Support canonical test fixtures expecting 'loc-bsl-campus' alias
      if (ctx) {
        ctx.locations.set('loc-bsl-campus', 'loc-bsl-st');
        ctx.locations.set('BSL-CAMPUS', 'loc-bsl-st');
      }

      // 3. Standardized Departments Catalog
      const factorySections = Array.from({ length: 7 }, (_, i) =>
        generateFactorySections(i + 1, orgBSL.id, `dept-bsl-f${i + 1}`),
      ).flat();

      const corporateDeptRows = [
        // BSL Level 1 & 2
        'dept-bsl-mgmt|Factory Executive Leadership|DEPT-BSL-MGMT|Factory general management, plant leadership & operational governance|BSL||Tran Van Binh|binh.tran@youngonevn.com',
        'dept-bsl-ops|Business Operations Division|DEPT-BSL-OPS|Business Center operational administration, commercial support, finance, compliance & IT|BSL|dept-bsl-mgmt|Hoang Van Minh|minh.hoang@youngonevn.com',
        'dept-bsl-log|Supply Chain & Central Warehouse Division|DEPT-BSL-LOG|Central warehouse logistics, fabric receiving, trims storage, spare parts & export distribution|BSL|dept-bsl-mgmt|Vo Thi Kim|kim.vo@youngonevn.com',
        'dept-bsl-qa|Quality Assurance & Technical Audit Division|DEPT-BSL-QA|Enterprise quality management, technical compliance, brand buyer audits & sample CAD/CAM|BSL|dept-bsl-mgmt|Nguyen Quoc Huy|huy.nguyen@youngonevn.com',
        'dept-bsl-prod|Garment Manufacturing Division|DEPT-BSL-PROD|Overall apparel manufacturing operations across all 7 production factories (F1 - F7)|BSL|dept-bsl-mgmt|Le Thi Thu|thu.le@youngonevn.com',
        // BSL Level 3 Departments
        'dept-bsl-imex|Import-Export Department|DEPT-BSL-IMEX|Customs clearance, raw material importation, and global apparel export shipping logistics|BSL|dept-bsl-ops|Hoang Van Minh|minh.hoang@youngonevn.com',
        'dept-bsl-acc|Accounting & Cost Finance|DEPT-BSL-ACC|Factory cost accounting, shop floor labor payroll, taxation & financial reporting|BSL|dept-bsl-ops|Nguyen Mai Lan|lan.nguyenmai@youngonevn.com',
        'dept-bsl-hr|Human Resources & Compliance|DEPT-BSL-HR|Factory workforce recruitment, employee relations, training, payroll administration & labor compliance|BSL|dept-bsl-ops|Dang Minh Chau|chau.dang@youngonevn.com',
        'dept-bsl-it|Factory IT & Industrial Automation|DEPT-BSL-IT|Shop floor networking, barcode systems, CAD/CAM workstations & plant OT/IT infrastructure|BSL|dept-bsl-ops|Pham Hoang Nam|nam.pham@youngonevn.com',
        'dept-bsl-admin|General Administration & Plant Affairs|DEPT-BSL-ADMIN|General plant administration, workplace safety, medical clinic, cafeteria & physical facilities|BSL|dept-bsl-ops|Truong Van Hai|hai.truong@youngonevn.com',
        'dept-bsl-log-mat|Central Fabric & Raw Material Store|DEPT-BSL-LOG-MAT|Central receiving, inspection, 4-point fabric grading, rack storage & supply dispatching|BSL|dept-bsl-log|Vo Thi Kim|kim.vo@youngonevn.com',
        'dept-bsl-log-fg|Finished Goods Export Warehouse|DEPT-BSL-LOG-FG|Export carton consolidation, container loading, customs seal inspection & distribution staging|BSL|dept-bsl-log|Tran Van Phuc|phuc.tran@youngonevn.com',
        'dept-bsl-log-sp|Spare Parts & Mechanical Store|DEPT-BSL-LOG-SP|Industrial sewing machine needles, presser feet, loopers, motor drives, belts & pneumatic spares|BSL|dept-bsl-log|Nguyen Van Thang|thang.nguyen@youngonevn.com',
        'dept-bsl-qa-audit|Quality Compliance & Buyer Audits|DEPT-BSL-QA-AUDIT|Brand buyer quality audits, ISO/WRAP/BSCI certifications, lab testing & defect root-cause analysis|BSL|dept-bsl-qa|Nguyen Quoc Huy|huy.nguyen@youngonevn.com',
        'dept-bsl-qa-smp|Technical CAD/CAM & Sample Development|DEPT-BSL-QA-SMP|Pattern making, digital grading, sample prototype sewing, pre-production approval & tech packs|BSL|dept-bsl-qa|Phan Thi Mai|mai.phan@youngonevn.com',
        // 7 Production Factories
        'dept-bsl-f1|Factory 1 Production|DEPT-BSL-F1|Factory 1 technical outerwear, cutting, printing, sewing lines & packaging|BSL|dept-bsl-prod|Le Thi Thu|thu.le@youngonevn.com',
        'dept-bsl-f2|Factory 2 Production|DEPT-BSL-F2|Factory 2 sportswear, jackets, cutting, printing & sewing assembly lines|BSL|dept-bsl-prod|Doan Van Thanh|thanh.doan@youngonevn.com',
        'dept-bsl-f3|Factory 3 Production|DEPT-BSL-F3|Factory 3 seamless activewear, performance apparel & high-stretch garments|BSL|dept-bsl-prod|Tran Minh Tuan|tuan.tran@youngonevn.com',
        'dept-bsl-f4|Factory 4 Production|DEPT-BSL-F4|Factory 4 outdoor technical outerwear, seam-sealed jackets & rainwear lines|BSL|dept-bsl-prod|Nguyen Van Sang|sang.nguyen@youngonevn.com',
        'dept-bsl-f5|Factory 5 Production|DEPT-BSL-F5|Factory 5 woven trousers, cargo pants & casual utility garment lines|BSL|dept-bsl-prod|Bui Quang Hieu|hieu.bui@youngonevn.com',
        'dept-bsl-f6|Factory 6 Production|DEPT-BSL-F6|Factory 6 knitwear, fleece hoodies & sweatshirts automated assembly lines|BSL|dept-bsl-prod|Phan Quoc Dat|dat.phan@youngonevn.com',
        'dept-bsl-f7|Factory 7 Production|DEPT-BSL-F7|Factory 7 high-speed automated sewing lines & quick-turn pilot runs|BSL|dept-bsl-prod|Vu Dinh Nam|nam.vudinh@youngonevn.com',
        // BSH Level 1 & 2
        'dept-bsh-exec|Corporate Leadership & Strategy|DEPT-BSH-EXEC|Broadpeak corporate executive management, international buyer relations & board strategy|BSH||Doan Minh Tri|tri.doan@youngonevn.com',
        'dept-bsh-comm|Commercial & Sourcing Division|DEPT-BSH-COMM|Global buyer accounts, apparel merchandising, international fabric sourcing & contract negotiation|BSH|dept-bsh-exec|Nguyen Thi Lan|lan.nguyen@youngonevn.com',
        'dept-bsh-corp|Corporate Shared Services Division|DEPT-BSH-CORP|Enterprise ERP systems, financial treasury, regional IT infrastructure & human capital operations|BSH|dept-bsh-exec|Vu Bich Ngoc|ngoc.vu@youngonevn.com',
        // BSH Level 3
        'dept-bsh-merch|Apparel Merchandising & Buyer Accounts|DEPT-BSH-MERCH|Global customer accounts, pre-costing, sample development & order fulfillment coordination|BSH|dept-bsh-comm|Nguyen Thi Lan|lan.nguyen@youngonevn.com',
        'dept-bsh-src|Global Sourcing & Raw Material Development|DEPT-BSH-SRC|Overseas fabric mills, trims vendors, yarn pricing & sustainable material certifications|BSH|dept-bsh-comm|Ha Van Hung|hung.ha@youngonevn.com',
        'dept-bsh-it|Enterprise IT & Cloud Systems|DEPT-BSH-IT|Enterprise ERP systems, cloud security, SD-WAN, data platforms & regional corporate infrastructure|BSH|dept-bsh-corp|Dang Thanh Phong|phong.dang@youngonevn.com',
        'dept-bsh-fin|Finance, Treasury & Cost Accounting|DEPT-BSH-FIN|Corporate accounting, financial audit, banking facilities, customs tariffs & cash flow treasury|BSH|dept-bsh-corp|Vu Bich Ngoc|ngoc.vu@youngonevn.com',
        'dept-bsh-hr|People Operations & Talent Acquisition|DEPT-BSH-HR|Executive headhunting, employer branding, organizational development & professional corporate training|BSH|dept-bsh-corp|Bui Mai Phuong|phuong.bui@youngonevn.com',
      ];

      const departmentsData = [
        ...corporateDeptRows.map((row) => {
          const [id, name, code, description, orgCode, parentId, managerName, managerEmail] =
            row.split('|');
          return {
            id,
            name,
            code,
            description,
            organizationId: orgCode === 'BSH' ? orgBSH.id : orgBSL.id,
            parentId: parentId || null,
            managerName,
            managerEmail,
            status: 'ACTIVE',
          };
        }),
        ...factorySections,
      ];

      const seededDepartments: Record<string, import('@prisma/client').Department> = {};
      const deptResults = await inTransactionChunks(prisma, departmentsData, 50, async (tx, d) => {
        const { code, id: _id, ...updateData } = d;
        return tx.department.upsert({
          where: { code },
          update: updateData,
          create: d,
        });
      });

      for (const dept of deptResults) {
        seededDepartments[dept.code] = dept;
        if (ctx) {
          ctx.departments.set(dept.code, dept.id);
          ctx.departments.set(dept.id, dept.id);
          ctx.departments.set(dept.name, dept.id);
        }
      }
      if (ctx && seededDepartments['DEPT-BSL-QA-SMP']) {
        ctx.departments.set('DEPT-BSL-PROD-DEV', seededDepartments['DEPT-BSL-QA-SMP'].id);
      }

      // 4. Standardized Positions Catalog
      const positionRows = [
        'pos-bsl-gm|Factory General Director|POS-BSL-GM|DEPT-BSL-MGMT|Executive',
        'pos-bsl-ops-mgr|Business Operations Manager|POS-BSL-OPS-MGR|DEPT-BSL-OPS|Manager',
        'pos-bsl-sc-dir|Supply Chain & Logistics Director|POS-BSL-SC-DIR|DEPT-BSL-LOG|Director',
        'pos-bsl-qa-mgr|Corporate QA/QC Director|POS-BSL-QA-MGR|DEPT-BSL-QA|Director',
        'pos-bsl-prod-mgr|Garment Manufacturing Director|POS-BSL-PROD-MGR|DEPT-BSL-PROD|Director',
        'pos-bsl-imex-lead|Import-Export Supervisor|POS-BSL-IMEX-LEAD|DEPT-BSL-IMEX|Lead',
        'pos-bsl-it-mgr|Factory IT Manager|POS-BSL-IT-MGR|DEPT-BSL-IT|Manager',
        'pos-bsl-it-spec|Industrial IT & Automation Specialist|POS-BSL-IT-SPEC|DEPT-BSL-IT|Senior',
        'pos-bsl-acc-mgr|Chief Cost Accountant|POS-BSL-ACC-MGR|DEPT-BSL-ACC|Manager',
        'pos-bsl-admin-lead|Plant Administration & HSE Officer|POS-BSL-ADMIN-LEAD|DEPT-BSL-ADMIN|Mid',
        'pos-bsl-hr-exec|HR & Employee Relations Officer|POS-BSL-HR-EXEC|DEPT-BSL-HR|Mid',
        'pos-bsl-wh-sup|Central Warehouse & Fabric Supervisor|POS-BSL-WH-SUP|DEPT-BSL-LOG-MAT|Mid',
        'pos-bsl-qa-lead|Corporate QA Audit & Compliance Lead|POS-BSL-QA-LEAD|DEPT-BSL-QA-AUDIT|Lead',
        'pos-bsl-cad-spec|CAD/CAM Pattern Development Specialist|POS-BSL-CAD-SPEC|DEPT-BSL-QA-SMP|Senior',
        'pos-bsh-md|Managing Director|POS-BSH-MD|DEPT-BSH-EXEC|Executive',
        'pos-bsh-comm-dir|Commercial & Sourcing Director|POS-BSH-COMM-DIR|DEPT-BSH-COMM|Director',
        'pos-bsh-corp-dir|Corporate Services Director|POS-BSH-CORP-DIR|DEPT-BSH-CORP|Director',
        'pos-bsh-it-arch|Enterprise IT Systems Architect|POS-BSH-IT-ARCH|DEPT-BSH-IT|Lead',
        'pos-bsh-it-eng|Systems & Network Engineer|POS-BSH-IT-ENG|DEPT-BSH-IT|Senior',
        'pos-bsh-merch-mgr|Senior Merchandising Manager|POS-BSH-MERCH-MGR|DEPT-BSH-MERCH|Manager',
        'pos-bsh-merch-spec|Apparel Merchandiser|POS-BSH-MERCH-SPEC|DEPT-BSH-MERCH|Mid',
        'pos-bsh-src-spec|Global Fabric Sourcing Specialist|POS-BSH-SRC-SPEC|DEPT-BSH-SRC|Senior',
        'pos-bsh-fin-ctrl|Chief Accountant & Financial Controller|POS-BSH-FIN-CTRL|DEPT-BSH-FIN|Director',
        'pos-bsh-hr-mgr|Talent Acquisition & HR Manager|POS-BSH-HR-MGR|DEPT-BSH-HR|Manager',
      ];

      const seededPositions: Record<string, import('@prisma/client').Position> = {};
      const posResults = await inTransactionChunks(prisma, positionRows, 50, async (tx, row) => {
        const [id, title, code, deptCode, level] = row.split('|');
        const dept = seededDepartments[deptCode];
        if (!dept) return null;
        return tx.position.upsert({
          where: { code },
          update: { title, departmentId: dept.id, level },
          create: {
            id,
            title,
            code,
            description: `${level} role in ${dept.name}`,
            departmentId: dept.id,
            level,
            status: 'ACTIVE',
          },
        });
      });

      for (const pos of posResults) {
        if (!pos) continue;
        seededPositions[pos.code] = pos;
        if (ctx) {
          ctx.positions.set(pos.code, pos.id);
          ctx.positions.set(pos.id, pos.id);
          ctx.positions.set(pos.title, pos.id);
        }
      }

      logger.log(
        `✅ Seeded 3 Group entities, ${locationDefs.length} spatial locations, ${Object.keys(seededDepartments).length} departments, and ${Object.keys(seededPositions).length} positions.`,
      );

      return {
        organizations: { orgHolding, orgBSL, orgBSH },
        locations: seededLocations,
        departments: seededDepartments,
        positions: seededPositions,
      };
    },
  );
}
