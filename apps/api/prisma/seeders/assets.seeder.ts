import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

const logger = new Logger('AssetsSeeder');

interface SeedTaxonomyResult {
  locations: Record<string, { id: string }>;
  categories: Record<string, { id: string }>;
}

interface SeedUsersResult {
  roles?: Record<string, { id: string }>;
  users: Record<string, { id: string }>;
}

interface SeedOrgResult {
  organizations?: Record<string, { id: string }>;
  locations?: Record<string, { id: string }>;
  departments?: Record<string, { id: string }>;
  positions?: Record<string, { id: string }>;
}

export async function seedAssets(
  prisma: PrismaClient,
  taxonomy: SeedTaxonomyResult,
  users: SeedUsersResult,
  _orgResult?: SeedOrgResult,
  vendorMap?: Map<string, string>,
) {
  const { categories } = taxonomy;
  const { users: u } = users;

  // Resolve departments and locations from DB for maximum referential fidelity
  const [departments, locations] = await Promise.all([
    prisma.department.findMany(),
    prisma.location.findMany(),
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

  const getLoc = (id: string, fallbackCode?: string): string => {
    if (locMap.has(id)) return locMap.get(id)!;
    if (fallbackCode && locMap.has(fallbackCode)) return locMap.get(fallbackCode)!;
    const match = locations.find((l) => l.id === id || (fallbackCode && l.code === fallbackCode));
    return match?.id || locMap.get('loc-bsl-st') || locations[0]?.id || id;
  };

  const getDept = (code: string): string => {
    return deptMap.get(code) || departments[0]?.id || code;
  };

  const getVendorId = (manufacturer?: string | null): string | null => {
    if (!manufacturer) return null;
    const lower = manufacturer.toLowerCase();
    if (vendorMap?.has(lower)) return vendorMap.get(lower)!;
    if (lower.includes('juki')) return vendorMap?.get('ven-juki') || 'ven-juki';
    if (lower.includes('brother')) return vendorMap?.get('ven-brother') || 'ven-brother';
    if (lower.includes('dell')) return vendorMap?.get('ven-dell') || 'ven-dell';
    if (lower.includes('lenovo')) return vendorMap?.get('ven-lenovo') || 'ven-lenovo';
    if (lower.includes('apple')) return vendorMap?.get('ven-apple') || 'ven-apple';
    if (lower.includes('cisco')) return vendorMap?.get('ven-cisco') || 'ven-cisco';
    if (lower.includes('lectra')) return vendorMap?.get('ven-lectra') || 'ven-lectra';
    if (lower.includes('gerber')) return vendorMap?.get('ven-gerber') || 'ven-gerber';
    if (lower.includes('microsoft')) return vendorMap?.get('ven-msft') || 'ven-msft';
    if (lower.includes('sap')) return vendorMap?.get('ven-sap') || 'ven-sap';
    return null;
  };

  const defaultUser = Object.values(u)[0];
  const userBinh = u['binh.tran@broadpeak.youngone.com'] || u.userAlex || defaultUser;
  const userNam = u['nam.pham@broadpeak.youngone.com'] || u.userSarah || defaultUser;
  const userThu = u['thu.le@broadpeak.youngone.com'] || u.userCarlosMendez || defaultUser;
  const userHuy = u['huy.nguyen@broadpeak.youngone.com'] || u.userElena || defaultUser;
  const userKim = u['kim.vo@broadpeak.youngone.com'] || u.userRobertTorres || defaultUser;
  const userTri = u['tri.doan@broadpeak.youngone.com'] || u.userMarcusVance || defaultUser;
  const userPhong = u['phong.dang@broadpeak.youngone.com'] || u.userMichael || defaultUser;
  const userLan = u['lan.nguyen@broadpeak.youngone.com'] || u.userSophiaPatel || defaultUser;
  const userNgoc = u['ngoc.vu@broadpeak.youngone.com'] || u.userMarcusBell || defaultUser;
  const _userPhuong = u['phuong.bui@broadpeak.youngone.com'] || u.userChloeMartin || defaultUser;

  // Categories helper
  const catSewing = categories.catSewing?.id || categories.catPeripherals?.id;
  const catCutting = categories.catCutting?.id || categories.catPeripherals?.id;
  const catPrinting = categories.catPrinting?.id || categories.catPrinter?.id;
  const catQA = categories.catQA?.id || categories.catDesktop?.id;
  const catServer = (categories.catITHardware || categories.catServer)?.id;
  const catWorkstation = (categories.catWorkstation || categories.catDesktop)?.id;
  const catLaptop = categories.catLaptop?.id;
  const catNetworking = categories.catNetworking?.id;
  const catPrinter = categories.catPrinter?.id;
  const catMonitor = categories.catMonitor?.id;
  const catMobile = (categories.catMobile || categories.catPeripherals)?.id;

  const assetDefinitions = [
    // ── 1. Sewing Machines Distributed Across Factories 1 to 7 ────────────────
    {
      assetTag: 'AST-SEW-001',
      name: 'Juki DDL-9000C Direct Drive Lockstitch Machine',
      manufacturer: 'Juki Corporation',
      model: 'DDL-9000C-SMS',
      serialNumber: 'JK-9000C-10482',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f1-sew-st1'), // Factory 1 > Sewing Line 01 > Station 01
      departmentId: getDept('DEPT-BSL-F1-SEW'), // Factory 1 Sewing Assembly Section
      purchaseDate: new Date('2023-06-15'),
      purchaseCost: 1450,
      warrantyExpiry: new Date('2026-06-15'),
      specs: {
        type: 'Direct-Drive High-Speed 1-Needle Lockstitch',
        maxSpeed: '5000 sti/min',
        needleSystem: 'DBx1 #11-#14',
        motor: 'AC Servomotor 450W with Electronic Thread Trimmer',
      },
      notes: 'High-speed automated sewing station on Factory 1 Sewing Line 01.',
    },
    {
      assetTag: 'AST-SEW-002',
      name: 'Brother S-7300A Nexio Direct Drive Lockstitch',
      manufacturer: 'Brother Industries',
      model: 'S-7300A-403P',
      serialNumber: 'BR-7300A-88491',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f1-sew-st2'), // Factory 1 > Sewing Line 01 > Station 02
      departmentId: getDept('DEPT-BSL-F1-SEW'), // Factory 1 Sewing Assembly Section
      purchaseDate: new Date('2023-06-15'),
      purchaseCost: 1550,
      warrantyExpiry: new Date('2026-06-15'),
      specs: {
        type: 'DigiFlex Feed Electronic Direct Drive Lockstitch',
        maxSpeed: '5000 sti/min',
        needleSystem: 'DBx1 #14',
        features: 'Color LCD touch panel with material thickness sensor',
      },
      notes: 'Factory 1 Sewing Line 01 Station 02 precision garment assembly.',
    },
    {
      assetTag: 'AST-SEW-003',
      name: 'Pegasus M952 4-Thread Super High Speed Overlock',
      manufacturer: 'Pegasus Sewing Machine',
      model: 'M952-52-2X4',
      serialNumber: 'PG-M952-44021',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f1-sew-st3'), // Factory 1 > Sewing Line 01 > Station 03
      departmentId: getDept('DEPT-BSL-F1-SEW'), // Factory 1 Sewing Assembly Section
      purchaseDate: new Date('2023-08-20'),
      purchaseCost: 1680,
      warrantyExpiry: new Date('2026-08-20'),
      specs: {
        type: '4-Thread Safety Stitch Overlock Machine',
        maxSpeed: '7000 sti/min',
        needleSystem: 'DCx27 #11',
      },
      notes: 'Factory 1 Sewing Line 01 Station 03 knitwear side-seam serging.',
    },
    {
      assetTag: 'AST-SEW-004',
      name: 'Yamato VG2700 3-Needle Cylinder Bed Interlock Machine',
      manufacturer: 'Yamato Sewing Machine',
      model: 'VG2700-156M-8F',
      serialNumber: 'YM-VG27-99120',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f2-sew-st1', 'loc-bsl-f2-sew1-st1'), // Factory 2 > Sewing Line 01 > Station 01
      departmentId: getDept('DEPT-BSL-F2-SEW'), // Factory 2 Sewing Assembly Section
      purchaseDate: new Date('2023-09-10'),
      purchaseCost: 2200,
      warrantyExpiry: new Date('2026-09-10'),
      specs: {
        type: 'Variable Top Feed Cylinder Bed Interlock',
        maxSpeed: '6500 sti/min',
        needleSystem: 'UY128GAS #10',
      },
      notes: 'Factory 2 Sewing Line 01 sleeve and hem finishing workstation.',
    },
    {
      assetTag: 'AST-SEW-005',
      name: 'Brother S-7300A Nexio Direct Drive Lockstitch',
      manufacturer: 'Brother Industries',
      model: 'S-7300A-403P',
      serialNumber: 'BR-7300A-90112',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f2-sew-st2'), // Factory 2 > Sewing Line 01 > Station 02
      departmentId: getDept('DEPT-BSL-F2-SEW'), // Factory 2 Sewing Assembly Section
      purchaseDate: new Date('2023-09-15'),
      purchaseCost: 1550,
      warrantyExpiry: new Date('2026-09-15'),
      specs: {
        type: 'Direct Drive Electronic Lockstitch',
        maxSpeed: '5000 sti/min',
        needleSystem: 'DBx1 #14',
      },
      notes: 'Factory 2 Sewing Line 01 sportswear panel assembly.',
    },
    {
      assetTag: 'AST-SEW-006',
      name: 'Juki DDL-9000C Direct Drive Lockstitch Machine',
      manufacturer: 'Juki Corporation',
      model: 'DDL-9000C-FMS',
      serialNumber: 'JK-9000C-33019',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f3-sew-st1'), // Factory 3 > Sewing Line 01 > Station 01
      departmentId: getDept('DEPT-BSL-F3-SEW'), // Factory 3 Sewing Assembly Section
      purchaseDate: new Date('2023-10-01'),
      purchaseCost: 1480,
      warrantyExpiry: new Date('2026-10-01'),
      specs: {
        type: 'Direct-Drive High-Speed 1-Needle Lockstitch',
        maxSpeed: '5000 sti/min',
        needleSystem: 'DBx1 #11',
      },
      notes: 'Factory 3 Sewing Line 01 activewear assembly.',
    },
    {
      assetTag: 'AST-SEW-007',
      name: 'Juki MO-6814S High-Speed 4-Thread Overlock',
      manufacturer: 'Juki Corporation',
      model: 'MO-6814S-DD6',
      serialNumber: 'JK-MO6814-41902',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f4-sew-st1'), // Factory 4 > Sewing Line 01 > Station 01
      departmentId: getDept('DEPT-BSL-F4-SEW'), // Factory 4 Sewing Assembly Section
      purchaseDate: new Date('2023-10-15'),
      purchaseCost: 1720,
      warrantyExpiry: new Date('2026-10-15'),
      specs: {
        type: 'Super High Speed 4-Thread Overlock',
        maxSpeed: '7000 sti/min',
        needleSystem: 'DCx27 #11',
      },
      notes: 'Factory 4 Sewing Line 01 outerwear seam sealing and serging.',
    },
    {
      assetTag: 'AST-SEW-008',
      name: 'Brother S-7300A Nexio Direct Drive Lockstitch',
      manufacturer: 'Brother Industries',
      model: 'S-7300A-403P',
      serialNumber: 'BR-7300A-55102',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f5-sew-st1'), // Factory 5 > Sewing Line 01 > Station 01
      departmentId: getDept('DEPT-BSL-F5-SEW'), // Factory 5 Sewing Assembly Section
      purchaseDate: new Date('2023-11-01'),
      purchaseCost: 1550,
      warrantyExpiry: new Date('2026-11-01'),
      specs: {
        type: 'DigiFlex Electronic Direct Drive Lockstitch',
        maxSpeed: '5000 sti/min',
        needleSystem: 'DBx1 #16',
      },
      notes: 'Factory 5 Sewing Line 01 woven trouser and cargo assembly.',
    },
    {
      assetTag: 'AST-SEW-009',
      name: 'Yamato VG2700 3-Needle Cylinder Bed Interlock',
      manufacturer: 'Yamato Sewing Machine',
      model: 'VG2700-156M',
      serialNumber: 'YM-VG27-66281',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f6-sew-st1'), // Factory 6 > Sewing Line 01 > Station 01
      departmentId: getDept('DEPT-BSL-F6-SEW'), // Factory 6 Sewing Assembly Section
      purchaseDate: new Date('2023-11-15'),
      purchaseCost: 2250,
      warrantyExpiry: new Date('2026-11-15'),
      specs: {
        type: '3-Needle 5-Thread Cylinder Bed Interlock',
        maxSpeed: '6500 sti/min',
        needleSystem: 'UY128GAS #11',
      },
      notes: 'Factory 6 Sewing Line 01 knitwear fleece hem and cuff assembly.',
    },
    {
      assetTag: 'AST-SEW-010',
      name: 'Juki DDL-9000C Direct Drive Lockstitch Machine',
      manufacturer: 'Juki Corporation',
      model: 'DDL-9000C-SMS',
      serialNumber: 'JK-9000C-77401',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f7-sew-st1'), // Factory 7 > Sewing Line 01 > Station 01
      departmentId: getDept('DEPT-BSL-F7-SEW'), // Factory 7 Sewing Assembly Section
      purchaseDate: new Date('2023-12-01'),
      purchaseCost: 1450,
      warrantyExpiry: new Date('2026-12-01'),
      specs: {
        type: 'Direct-Drive High-Speed 1-Needle Lockstitch',
        maxSpeed: '5000 sti/min',
        needleSystem: 'DBx1 #11-#14',
      },
      notes: 'Factory 7 Sewing Line 01 high-speed automated quick-turn pilot lines.',
    },

    // ── 2. Fabric Cutters & Plotters Allocated to Cutting Areas ───────────────
    {
      assetTag: 'AST-CUT-001',
      name: 'Gerber Paragon Automated Fabric Cutting System',
      manufacturer: 'Gerber Technology',
      model: 'Paragon HX Series',
      serialNumber: 'GB-HX-Paragon-2024-01',
      status: 'IN_USE' as const,
      categoryId: catCutting,
      locationId: getLoc('loc-bsl-f1-cut-tbl1'), // Factory 1 > Cutting Area > Auto Cutting Table 01
      departmentId: getDept('DEPT-BSL-F1-CUT'), // Factory 1 Cutting Section
      purchaseDate: new Date('2023-04-12'),
      purchaseCost: 68000,
      warrantyExpiry: new Date('2027-04-12'),
      specs: {
        cuttingHeight: '7.2 cm compressed vacuum ply',
        workingWidth: '2.0 meters conveyor bed',
        controlUnit: 'Industrial IPC with Gerber CutWorks OS',
      },
      notes: 'Automated conveyorized high-ply fabric cutting table in Factory 1 Cutting Area.',
    },
    {
      assetTag: 'AST-PLT-001',
      name: 'Lectra Alys 30 High-Speed Pattern Plotter',
      manufacturer: 'Lectra',
      model: 'Alys 30 Inkjet',
      serialNumber: 'LC-ALYS30-7731',
      status: 'IN_USE' as const,
      categoryId: catCutting,
      locationId: getLoc('loc-bsl-f1-cut'), // Factory 1 > Fabric Cutting Area
      departmentId: getDept('DEPT-BSL-F1-CUT'), // Factory 1 Cutting Section
      purchaseDate: new Date('2023-05-18'),
      purchaseCost: 9800,
      warrantyExpiry: new Date('2026-05-18'),
      specs: {
        printSpeed: '120 m2/hour',
        paperWidth: '183 cm (72 in)',
        resolution: '300 dpi HP TIJ2.5 cartridge heads',
      },
      notes: 'Marker and pattern plotter directly networked to Lectra Modaris CAD server.',
    },
    {
      assetTag: 'AST-1005',
      name: 'Dell OptiPlex 7010 Tower CAD Workstation',
      manufacturer: 'Dell',
      model: 'OptiPlex 7010 MT',
      serialNumber: '8KK9921-BSL',
      status: 'IN_USE' as const,
      categoryId: catWorkstation,
      assignedToId: userThu.id,
      locationId: getLoc('loc-bsl-f1-cut'), // Factory 1 > Fabric Cutting Area
      departmentId: getDept('DEPT-BSL-F1-CUT'), // Factory 1 Cutting Section
      purchaseDate: new Date('2023-10-05'),
      purchaseCost: 1100,
      warrantyExpiry: new Date('2026-10-05'),
      specs: {
        cpu: 'Intel Core i7-13700 (16-Core)',
        ram: '32 GB DDR5-4800',
        storage: '1 TB NVMe SSD',
        os: 'Windows 11 Pro with Lectra Modaris CAD & Gerber AccuMark',
      },
      notes: 'Pattern nesting & CAD marker engineering workstation in Factory 1.',
    },
    {
      assetTag: 'AST-CUT-002',
      name: 'Gerber Paragon Automated Fabric Cutting System',
      manufacturer: 'Gerber Technology',
      model: 'Paragon HX Series',
      serialNumber: 'GB-HX-Paragon-2024-03',
      status: 'IN_USE' as const,
      categoryId: catCutting,
      locationId: getLoc('loc-bsl-f3-cut-tbl1'), // Factory 3 > Cutting Table 01
      departmentId: getDept('DEPT-BSL-F3-CUT'), // Factory 3 Cutting Section
      purchaseDate: new Date('2023-06-20'),
      purchaseCost: 68000,
      warrantyExpiry: new Date('2027-06-20'),
      specs: {
        cuttingHeight: '7.2 cm compressed vacuum ply',
        workingWidth: '2.0 meters conveyor bed',
        controlUnit: 'Industrial IPC with Gerber CutWorks OS',
      },
      notes: 'Automated fabric cutting table supporting Factory 3 activewear production.',
    },
    {
      assetTag: 'AST-1025',
      name: 'Dell OptiPlex 7010 CAD Workstation',
      manufacturer: 'Dell',
      model: 'OptiPlex 7010 MT',
      serialNumber: '8KK9944-F3',
      status: 'IN_USE' as const,
      categoryId: catWorkstation,
      locationId: getLoc('loc-bsl-f3-cut'), // Factory 3 > Cutting Area
      departmentId: getDept('DEPT-BSL-F3-CUT'), // Factory 3 Cutting Section
      purchaseDate: new Date('2023-11-10'),
      purchaseCost: 1100,
      warrantyExpiry: new Date('2026-11-10'),
      specs: {
        cpu: 'Intel Core i7-13700',
        ram: '32 GB DDR5',
        storage: '1 TB NVMe SSD',
      },
      notes: 'Factory 3 automated marker nesting workstation.',
    },

    // ── 3. Printing & Heat Press Equipment ────────────────────────────────────
    {
      assetTag: 'AST-PRN-001',
      name: 'Monti Antonio 901-3600 Rotary Heat Transfer Calender',
      manufacturer: 'Monti Antonio S.p.A.',
      model: 'Model 901-3600',
      serialNumber: 'MA-901-88341',
      status: 'IN_USE' as const,
      categoryId: catPrinting,
      locationId: getLoc('loc-bsl-f1-print-hp1'), // Factory 1 > Printing & Heat Press > Heat Press Station 01
      departmentId: getDept('DEPT-BSL-F1-PRT'), // Factory 1 Printing Section
      purchaseDate: new Date('2023-03-22'),
      purchaseCost: 45000,
      warrantyExpiry: new Date('2026-03-22'),
      specs: {
        cylinderWidth: '3600 mm',
        heatedDiameter: '350 mm thermal oil heated drum',
        maxTemperature: '230 C (+/- 1 C accuracy)',
      },
      notes: 'Sublimation transfer printing and continuous heat fusing in Factory 1.',
    },
    {
      assetTag: 'AST-PRN-002',
      name: 'Mimaki TS300P-1800 Digital Sublimation Textile Printer',
      manufacturer: 'Mimaki Engineering',
      model: 'TS300P-1800',
      serialNumber: 'MMK-TS300P-5521',
      status: 'IN_USE' as const,
      categoryId: catPrinting,
      locationId: getLoc('loc-bsl-f1-print'), // Factory 1 > Printing & Heat Press
      departmentId: getDept('DEPT-BSL-F1-PRT'), // Factory 1 Printing Section
      purchaseDate: new Date('2023-04-10'),
      purchaseCost: 24000,
      warrantyExpiry: new Date('2026-04-10'),
      specs: {
        printWidth: '1940 mm',
        resolution: '1080 dpi',
        inkSystem: 'Sublimation Sb410 (2L Bulk Ink Tanks)',
      },
      notes: 'Digital transfer paper graphics printer for sportswear print panels.',
    },
    {
      assetTag: 'AST-PRN-003',
      name: 'Tajima 8-Head Automated Embroidery Machine',
      manufacturer: 'Tajima Industries',
      model: 'TMAR-KC1208',
      serialNumber: 'TJ-KC1208-9941',
      status: 'IN_USE' as const,
      categoryId: catPrinting,
      locationId: getLoc('loc-bsl-f4-print'), // Factory 4 > Printing & Embroidery Area
      departmentId: getDept('DEPT-BSL-F4-PRT'), // Factory 4 Printing Section
      purchaseDate: new Date('2023-07-15'),
      purchaseCost: 52000,
      warrantyExpiry: new Date('2027-07-15'),
      specs: {
        heads: '8 Multi-Needle Automated Embroidery Heads',
        maxSpeed: '1000 sti/min',
        needleCount: '12 Needles per Head with Automatic Thread Trimming',
      },
      notes: 'Factory 4 brand embroidery logo and applique embellishment system.',
    },

    // ── 4. Inspection Terminals Allocated to QA Stations ──────────────────────
    {
      assetTag: 'AST-QA-001',
      name: 'Datacolor 800 Spectrophotometer & Judge QC Light Booth',
      manufacturer: 'Datacolor',
      model: 'Datacolor 800 + Judge QC',
      serialNumber: 'DC-800-99412',
      status: 'IN_USE' as const,
      categoryId: catQA,
      locationId: getLoc('loc-bsl-f1-qa-bench1'), // Factory 1 > QA Lab > Inspection Bench 01
      departmentId: getDept('DEPT-BSL-F1-QA'), // Factory 1 QA Section
      purchaseDate: new Date('2023-07-05'),
      purchaseCost: 18500,
      warrantyExpiry: new Date('2026-07-05'),
      specs: {
        geometry: 'd/8 true dual-beam spectrophotometer',
        lightSources: 'D65, TL84, CWF, Incandescent A, Horizon, UV LED',
      },
      notes: 'Lab color matching, spectrophotometer pass/fail and shade verification.',
    },
    {
      assetTag: 'AST-1006',
      name: 'Dell OptiPlex 7010 Micro QA Terminal',
      manufacturer: 'Dell',
      model: 'OptiPlex 7010 MFF',
      serialNumber: '4LL8812-QA',
      status: 'IN_USE' as const,
      categoryId: catWorkstation,
      assignedToId: userHuy.id,
      locationId: getLoc('loc-bsl-f1-qa-bench1'), // Factory 1 > QA Lab > Inspection Bench 01
      departmentId: getDept('DEPT-BSL-F1-QA'), // Factory 1 QA Section
      purchaseDate: new Date('2023-10-05'),
      purchaseCost: 850,
      warrantyExpiry: new Date('2026-10-05'),
      specs: {
        cpu: 'Intel Core i5-13500T (14-Core)',
        ram: '16 GB DDR5-4800',
        storage: '512 GB NVMe SSD',
        os: 'Windows 11 Pro with Datacolor Tools software',
      },
      notes: 'Factory 1 QA lab inline inspection terminal.',
    },
    {
      assetTag: 'AST-QA-002',
      name: 'Datacolor Check 3 Portable Spectrophotometer',
      manufacturer: 'Datacolor',
      model: 'Check 3 Portable',
      serialNumber: 'DC-CHK3-88120',
      status: 'IN_USE' as const,
      categoryId: catQA,
      locationId: getLoc('loc-bsl-f2-qa-bench1'), // Factory 2 > QA Inspection Bench 01
      departmentId: getDept('DEPT-BSL-F2-QA'), // Factory 2 QA Section
      purchaseDate: new Date('2023-08-10'),
      purchaseCost: 9500,
      warrantyExpiry: new Date('2026-08-10'),
      specs: {
        geometry: 'Diffuse 8 deg sphere',
        aperture: 'Dual aperture (SAV/LAV)',
      },
      notes: 'Factory 2 shopfloor shade sorting and fabric roll swatch verification.',
    },
    {
      assetTag: 'AST-QA-003',
      name: 'Hashima HN-880C Fabric Metal Detector & Inspection System',
      manufacturer: 'Hashima Co., Ltd.',
      model: 'HN-880C-120',
      serialNumber: 'HSM-880C-55419',
      status: 'IN_USE' as const,
      categoryId: catQA,
      locationId: getLoc('loc-bsl-f7-qa-bench1'), // Factory 7 > QA Bench 01
      departmentId: getDept('DEPT-BSL-F7-QA'), // Factory 7 QA Section
      purchaseDate: new Date('2023-09-01'),
      purchaseCost: 12800,
      warrantyExpiry: new Date('2026-09-01'),
      specs: {
        detectionMethod: 'Magnetic induction conveyor sensor',
        sensitivity: 'Ferrous 0.8mm test card standard',
      },
      notes: 'Factory 7 endline needle detection safety compliance.',
    },

    // ── 5. Maintenance Workbenches & Mechanical Calibration Equipment ─────────
    {
      assetTag: 'AST-MNT-001',
      name: 'Industrial Sewing Machine Mechanical Calibration Workbench',
      manufacturer: 'Mitutoyo / Juki Engineering',
      model: 'MNT-WB-PRO-200',
      serialNumber: 'MNT-WB-1001-F1',
      status: 'IN_USE' as const,
      categoryId: catWorkstation,
      locationId: getLoc('loc-bsl-f1-maint'), // Factory 1 > Maintenance Area
      departmentId: getDept('DEPT-BSL-F1-MAINT'), // Factory 1 Maintenance Section
      purchaseDate: new Date('2023-05-10'),
      purchaseCost: 4500,
      warrantyExpiry: new Date('2026-05-10'),
      specs: {
        benchSize: '2400 x 1000 mm heavy-duty steel frame with anti-static ESD rubber mat',
        tooling: 'Dial gauges, timing adjustment kits, torque screwdrivers, motor rpm tachometer',
      },
      notes:
        'Factory 1 mechanical maintenance and sewing line machine timing adjustment workbench.',
    },
    {
      assetTag: 'AST-MNT-002',
      name: 'Motor Drive Repair & Pneumatic Servicing Station',
      manufacturer: 'SMC Pneumatics / Ho Hsing',
      model: 'MNT-PN-500',
      serialNumber: 'MNT-PN-5002-F5',
      status: 'IN_USE' as const,
      categoryId: catWorkstation,
      locationId: getLoc('loc-bsl-f5-maint'), // Factory 5 > Maintenance Area
      departmentId: getDept('DEPT-BSL-F5-MAINT'), // Factory 5 Maintenance Section
      purchaseDate: new Date('2023-07-20'),
      purchaseCost: 5800,
      warrantyExpiry: new Date('2026-07-20'),
      specs: {
        pressure: '10 bar compressed air supply manifold with oil-water separator',
        electronics: 'AC servo motor inverter test bench and digital multimeter oscilloscope',
      },
      notes: 'Factory 5 mechanical and electrical repair workbench for automated line motors.',
    },

    // ── 6. Sample Prototyping Equipment ───────────────────────────────────────
    {
      assetTag: 'AST-SMP-001',
      name: 'Juki DDL-9000C Sample Prototyping Lockstitch Machine',
      manufacturer: 'Juki Corporation',
      model: 'DDL-9000C-SMS',
      serialNumber: 'JK-9000C-SMP01',
      status: 'IN_USE' as const,
      categoryId: catSewing,
      locationId: getLoc('loc-bsl-f1-sample'), // Factory 1 > Sample Section
      departmentId: getDept('DEPT-BSL-F1-SMP'), // Factory 1 Sample Section
      purchaseDate: new Date('2023-08-01'),
      purchaseCost: 1550,
      warrantyExpiry: new Date('2026-08-01'),
      specs: {
        type: 'High-Speed Precision Lockstitch with Digital Feed',
        motor: 'Direct drive servo 450W',
      },
      notes: 'Factory 1 pre-production sample making and buyer fit-trial mockups.',
    },

    // ── 7. Shopfloor & Warehouse Handhelds & Industrial Printers ──────────────
    {
      assetTag: 'AST-1007',
      name: 'Zebra ZT411 Industrial Barcode Printer',
      manufacturer: 'Zebra Technologies',
      model: 'ZT41142-T010000Z',
      serialNumber: 'ZBR-ZT411-99218',
      status: 'IN_USE' as const,
      categoryId: catPrinter,
      locationId: getLoc('loc-bsl-f1-pack-st1'), // Factory 1 > Packing Table 01
      departmentId: getDept('DEPT-BSL-F1-PCK'), // Factory 1 Packing Section
      purchaseDate: new Date('2023-08-15'),
      purchaseCost: 1850,
      warrantyExpiry: new Date('2026-08-15'),
      specs: {
        resolution: '203 dpi Thermal Transfer / Direct Thermal',
        printWidth: '4.09 in (104 mm)',
        connectivity: 'Ethernet, USB, Serial, Bluetooth 4.1',
      },
      notes: 'Finished garment export shipping carton & polybag barcode label printer.',
    },
    {
      assetTag: 'AST-PCK-002',
      name: 'Zebra ZT411 Industrial Barcode Printer',
      manufacturer: 'Zebra Technologies',
      model: 'ZT41142-T010000Z',
      serialNumber: 'ZBR-ZT411-88129',
      status: 'IN_USE' as const,
      categoryId: catPrinter,
      locationId: getLoc('loc-bsl-f2-pack-st1'), // Factory 2 > Packing Table 01
      departmentId: getDept('DEPT-BSL-F2-PCK'), // Factory 2 Packing Section
      purchaseDate: new Date('2023-09-01'),
      purchaseCost: 1850,
      warrantyExpiry: new Date('2026-09-01'),
      specs: {
        resolution: '203 dpi',
        connectivity: 'Ethernet, USB',
      },
      notes: 'Factory 2 packing finishing barcode label printer.',
    },
    {
      assetTag: 'AST-PCK-006',
      name: 'Zebra ZT411 Industrial Barcode Printer',
      manufacturer: 'Zebra Technologies',
      model: 'ZT41142-T010000Z',
      serialNumber: 'ZBR-ZT411-66401',
      status: 'IN_USE' as const,
      categoryId: catPrinter,
      locationId: getLoc('loc-bsl-f6-pack-st1'), // Factory 6 > Packing Table 01
      departmentId: getDept('DEPT-BSL-F6-PCK'), // Factory 6 Packing Section
      purchaseDate: new Date('2023-11-20'),
      purchaseCost: 1850,
      warrantyExpiry: new Date('2026-11-20'),
      specs: {
        resolution: '203 dpi',
      },
      notes: 'Factory 6 fleece hoodie export carton packing label printer.',
    },
    {
      assetTag: 'AST-PCK-007',
      name: 'Zebra ZT411 Industrial Barcode Printer',
      manufacturer: 'Zebra Technologies',
      model: 'ZT41142-T010000Z',
      serialNumber: 'ZBR-ZT411-77302',
      status: 'IN_USE' as const,
      categoryId: catPrinter,
      locationId: getLoc('loc-bsl-f7-pack-st1'), // Factory 7 > Packing Table 01
      departmentId: getDept('DEPT-BSL-F7-PCK'), // Factory 7 Packing Section
      purchaseDate: new Date('2023-12-05'),
      purchaseCost: 1850,
      warrantyExpiry: new Date('2026-12-05'),
      specs: {
        resolution: '203 dpi',
      },
      notes: 'Factory 7 rapid-turn packaging barcode station.',
    },
    {
      assetTag: 'AST-1008',
      name: 'Honeywell ScanPal EDA51 Barcode Scanner',
      manufacturer: 'Honeywell',
      model: 'EDA51-0-B121SNGUK',
      serialNumber: 'HW-EDA51-88491',
      status: 'IN_USE' as const,
      categoryId: catMobile,
      assignedToId: userKim.id,
      locationId: getLoc('loc-bsl-wh-raw'), // Central Warehouse > Raw Materials Storage
      departmentId: getDept('DEPT-BSL-LOG-MAT'), // Central Fabric & Raw Material Store
      purchaseDate: new Date('2023-09-01'),
      purchaseCost: 650,
      warrantyExpiry: new Date('2025-09-01'),
      specs: {
        scanner: '2D Imager N6603',
        os: 'Android 10 with GMS',
        memory: '3GB RAM / 32GB Flash',
      },
      notes: 'Central Warehouse fabric roll intake & barcode inventory stocktaking scanner.',
    },

    // ── 8. Enterprise Rack Servers & Networking in IT Server Room ────────────
    {
      assetTag: 'AST-1009',
      name: 'Dell PowerEdge R750 Enterprise Server',
      manufacturer: 'Dell Enterprise',
      model: 'PowerEdge R750 2U',
      serialNumber: '7N991A2-BSL',
      status: 'IN_USE' as const,
      categoryId: catServer,
      locationId: getLoc('loc-bsl-bc-datacenter'), // Business Center > IT Server Room / Datacenter (Room 102)
      departmentId: getDept('DEPT-BSL-IT'), // Factory IT Department
      purchaseDate: new Date('2023-07-20'),
      purchaseCost: 9500,
      warrantyExpiry: new Date('2026-07-20'),
      specs: {
        cpu: '2x Intel Xeon Gold 5318Y (48-Core total)',
        ram: '128 GB DDR4 ECC Registered',
        storage: '8x 1.92TB SAS SSD (RAID-10 array)',
        os: 'Windows Server 2022 Datacenter (Hyper-V Production Host)',
      },
      notes: 'BSL On-Premise Host running local manufacturing ERP & factory shopfloor PBX.',
    },
    {
      assetTag: 'AST-1010',
      name: 'Cisco Catalyst 9300-48P PoE+ Switch',
      manufacturer: 'Cisco Systems',
      model: 'C9300-48P-A',
      serialNumber: 'FOC2488102',
      status: 'IN_USE' as const,
      categoryId: catNetworking,
      locationId: getLoc('loc-bsl-bc-datacenter'), // Business Center > IT Server Room / Datacenter (Room 102)
      departmentId: getDept('DEPT-BSL-IT'), // Factory IT Department
      purchaseDate: new Date('2023-07-20'),
      purchaseCost: 5200,
      warrantyExpiry: new Date('2028-07-20'),
      specs: {
        ports: '48x 10/100/1000 PoE+ (740W power budget)',
        uplink: '8x 10G SFP+ Network Module',
        os: 'Cisco IOS-XE 17.9.4a',
      },
      notes: 'BSL Factory Core Switch in Datacenter Rack 01.',
    },

    // ── 9. Business Center Office Laptops & Workstations ──────────────────────
    {
      assetTag: 'AST-1003',
      name: 'ThinkPad T14 Gen 4',
      manufacturer: 'Lenovo',
      model: '21HD001YUS',
      serialNumber: 'PF-388271A',
      status: 'IN_USE' as const,
      categoryId: catLaptop,
      assignedToId: userBinh.id,
      locationId: getLoc('loc-bsl-bc-exec'), // Business Center > Executive Office (Floor 3)
      departmentId: getDept('DEPT-BSL-MGMT'), // Factory Executive Leadership
      purchaseDate: new Date('2024-01-10'),
      purchaseCost: 1450,
      warrantyExpiry: new Date('2027-01-10'),
      specs: {
        cpu: 'AMD Ryzen 7 PRO 7840U (8-Core, 16-Thread)',
        ram: '32 GB LPDDR5x-6400',
        storage: '1 TB PCIe Gen4 NVMe SSD',
        os: 'Windows 11 Pro 23H2',
      },
      notes: 'Assigned to Factory General Director (BSL Soc Trang).',
    },
    {
      assetTag: 'AST-1004',
      name: 'ThinkPad T14s Gen 4',
      manufacturer: 'Lenovo',
      model: '21F8002LUS',
      serialNumber: 'PF-291882K',
      status: 'IN_USE' as const,
      categoryId: catLaptop,
      assignedToId: userNam.id,
      locationId: getLoc('loc-bsl-bc-datacenter'), // Business Center > IT Server Room / Datacenter (Room 102)
      departmentId: getDept('DEPT-BSL-IT'), // Factory IT Department
      purchaseDate: new Date('2024-01-10'),
      purchaseCost: 1350,
      warrantyExpiry: new Date('2027-01-10'),
      specs: {
        cpu: 'Intel Core i7-1355U (10-Core)',
        ram: '16 GB LPDDR5-4800',
        storage: '512 GB NVMe SSD',
        os: 'Windows 11 Pro',
      },
      notes: 'Assigned to Factory IT Manager (BSL Soc Trang).',
    },
    {
      assetTag: 'AST-1020',
      name: 'Dell Latitude 3440 (Spare Pool)',
      manufacturer: 'Dell',
      model: 'Latitude 3440 Essential',
      serialNumber: '9M88210-SPARE',
      status: 'AVAILABLE' as const,
      categoryId: catLaptop,
      locationId: getLoc('loc-bsl-bc-datacenter'), // Business Center > IT Server Room
      departmentId: getDept('DEPT-BSL-IT'), // Factory IT Department
      purchaseDate: new Date('2024-04-01'),
      purchaseCost: 950,
      warrantyExpiry: new Date('2027-04-01'),
      specs: {
        cpu: 'Intel Core i5-1335U (10-Core)',
        ram: '16 GB DDR4',
        storage: '512 GB SSD',
        os: 'Windows 11 Pro Pre-configured',
      },
      notes: 'BSL Factory IT replacement buffer laptop.',
    },

    // ── 10. BSH Corporate (Ho Chi Minh Headquarters) Assets ───────────────────
    {
      assetTag: 'AST-1001',
      name: 'MacBook Pro 16" M3 Pro',
      manufacturer: 'Apple',
      model: 'MacBookPro18,2 (Space Black)',
      serialNumber: 'C02G8392MD6R',
      status: 'IN_USE' as const,
      categoryId: catLaptop,
      assignedToId: userTri.id,
      locationId: getLoc('loc-bsh-d7'), // BSH Ho Chi Minh Office D7
      departmentId: getDept('DEPT-BSH-EXEC'), // BSH Corporate Leadership
      purchaseDate: new Date('2024-02-10'),
      purchaseCost: 2899,
      warrantyExpiry: new Date('2027-02-10'),
      specs: {
        cpu: 'Apple M3 Pro (12-Core CPU, 18-Core GPU)',
        ram: '36 GB Unified Memory',
        storage: '512 GB PCIe NVMe SSD',
        os: 'macOS Sonoma 14.6',
      },
      notes: 'Assigned to Managing Director (BSH Ho Chi Minh Office).',
    },
    {
      assetTag: 'AST-1002',
      name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
      manufacturer: 'Dell',
      model: 'U2723QE (IPS Black)',
      serialNumber: 'CN-0N179F-74261',
      status: 'IN_USE' as const,
      categoryId: catMonitor,
      assignedToId: userTri.id,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-EXEC'),
      purchaseDate: new Date('2024-02-12'),
      purchaseCost: 650,
      warrantyExpiry: new Date('2027-02-12'),
      specs: {
        resolution: '4K UHD (3840x2160) 60Hz',
        ports: '90W USB-C PD, RJ45 Ethernet, DisplayPort 1.4',
      },
      notes: 'Primary executive desk display at BSH Ho Chi Minh.',
    },
    {
      assetTag: 'AST-1011',
      name: 'ThinkPad X1 Carbon Gen 11',
      manufacturer: 'Lenovo',
      model: '21HM002RUS',
      serialNumber: 'PF-491AK82',
      status: 'IN_USE' as const,
      categoryId: catLaptop,
      assignedToId: userPhong.id,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-IT'),
      purchaseDate: new Date('2024-01-15'),
      purchaseCost: 1850,
      warrantyExpiry: new Date('2027-01-15'),
      specs: {
        cpu: 'Intel Core i7-1365U vPro (10-Core)',
        ram: '32 GB LPDDR5-6400',
        storage: '1 TB NVMe PCIe Gen4 SSD',
        os: 'Windows 11 Pro 23H2',
      },
      notes: 'Assigned to Enterprise IT Systems Architect (BSH).',
    },
    {
      assetTag: 'AST-1012',
      name: 'Dell Latitude 5440 Laptop',
      manufacturer: 'Dell',
      model: 'Latitude 5440 Business',
      serialNumber: '7N881M2-HCM',
      status: 'IN_USE' as const,
      categoryId: catLaptop,
      assignedToId: userLan.id,
      locationId: getLoc('loc-bsh-d3'), // BSH Ho Chi Minh Office D3
      departmentId: getDept('DEPT-BSH-MERCH'), // BSH Merchandising Department
      purchaseDate: new Date('2024-03-01'),
      purchaseCost: 1250,
      warrantyExpiry: new Date('2027-03-01'),
      specs: {
        cpu: 'Intel Core i5-1335U (10-Core)',
        ram: '16 GB DDR4-3200',
        storage: '512 GB NVMe SSD',
        os: 'Windows 11 Pro',
      },
      notes: 'Assigned to Apparel Merchandising Manager (BSH).',
    },
    {
      assetTag: 'AST-1013',
      name: 'Dell Latitude 5440 Laptop',
      manufacturer: 'Dell',
      model: 'Latitude 5440 Business',
      serialNumber: '7N882M3-FIN',
      status: 'IN_USE' as const,
      categoryId: catLaptop,
      assignedToId: userNgoc.id,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-FIN'), // BSH Finance Department
      purchaseDate: new Date('2024-03-01'),
      purchaseCost: 1250,
      warrantyExpiry: new Date('2027-03-01'),
      specs: {
        cpu: 'Intel Core i5-1335U (10-Core)',
        ram: '16 GB DDR4-3200',
        storage: '512 GB NVMe SSD',
        os: 'Windows 11 Pro',
      },
      notes: 'Assigned to Chief Accountant (BSH).',
    },
    {
      assetTag: 'AST-1014',
      name: 'HPE ProLiant DL380 Gen10 Server',
      manufacturer: 'Hewlett Packard Enterprise',
      model: 'ProLiant DL380 Gen10 2U',
      serialNumber: 'USE-994821',
      status: 'IN_USE' as const,
      categoryId: catServer,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-IT'),
      purchaseDate: new Date('2023-11-20'),
      purchaseCost: 8900,
      warrantyExpiry: new Date('2026-11-20'),
      specs: {
        cpu: '2x Intel Xeon Silver 4314 (32-Core total)',
        ram: '128 GB DDR4 ECC Registered',
        storage: '8x 1.92TB SAS SSD RAID-10',
        os: 'VMware ESXi 8.0 Update 2',
      },
      notes: 'BSH Regional Data Center application host.',
    },
    {
      assetTag: 'AST-1015',
      name: 'Cisco Meraki MX85 Cloud Security Appliance',
      manufacturer: 'Cisco Meraki',
      model: 'MX85-HW',
      serialNumber: 'Q2QN-9981-LKM9',
      status: 'IN_USE' as const,
      categoryId: catNetworking,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-IT'),
      purchaseDate: new Date('2024-01-10'),
      purchaseCost: 2400,
      warrantyExpiry: new Date('2027-01-10'),
      specs: {
        throughput: '1 Gbps Stateful Firewall / SD-WAN',
        interfaces: '2x 1G SFP WAN, 8x GbE LAN',
      },
      notes: 'BSH Corporate Gateway with Auto VPN to BSL Soc Trang.',
    },
  ];

  const createdAssets: Record<string, { id: string; assetTag: string }> = {};

  for (const asset of assetDefinitions) {
    const vendorId = getVendorId(asset.manufacturer);
    const record = await prisma.asset.upsert({
      where: { assetTag: asset.assetTag },
      update: {
        name: asset.name,
        manufacturer: asset.manufacturer,
        vendorId,
        model: asset.model,
        serialNumber: asset.serialNumber,
        status: asset.status,
        categoryId: asset.categoryId,
        assignedToId: asset.assignedToId || null,
        locationId: asset.locationId,
        departmentId: asset.departmentId,
        purchaseDate: asset.purchaseDate,
        purchaseCost: asset.purchaseCost,
        warrantyExpiry: asset.warrantyExpiry,
        specs: asset.specs,
        notes: asset.notes,
      },
      create: {
        ...asset,
        vendorId,
      },
    });
    createdAssets[asset.assetTag] = record;
  }

  logger.log(`✅ Seeded ${Object.keys(createdAssets).length} Hardware Assets across BSL & BSH.`);
  return createdAssets;
}
