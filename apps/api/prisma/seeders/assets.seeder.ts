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
  const userBinh = u['binh.tran@youngonevn.com'] || u.userAlex || defaultUser;
  const userNam = u['nam.pham@youngonevn.com'] || u.userSarah || defaultUser;
  const userThu = u['thu.le@youngonevn.com'] || u.userCarlosMendez || defaultUser;
  const userHuy = u['huy.nguyen@youngonevn.com'] || u.userElena || defaultUser;
  const userKim = u['kim.vo@youngonevn.com'] || u.userRobertTorres || defaultUser;
  const userTri = u['tri.doan@youngonevn.com'] || u.userMarcusVance || defaultUser;
  const userPhong = u['phong.dang@youngonevn.com'] || u.userMichael || defaultUser;
  const userLan = u['lan.nguyen@youngonevn.com'] || u.userSophiaPatel || defaultUser;
  const userNgoc = u['ngoc.vu@youngonevn.com'] || u.userMarcusBell || defaultUser;
  const _userPhuong = u['phuong.bui@youngonevn.com'] || u.userChloeMartin || defaultUser;

  // 11 Authoritative IT Categories Helper
  const catLaptop = categories.catLaptop?.id || 'cat-laptop';
  const catDesktop = categories.catDesktop?.id || 'cat-desktop';
  const catServer = categories.catServer?.id || 'cat-server';
  const catSwitch = (categories.catSwitch || categories.catNetworking)?.id || 'cat-switch';
  const catRouter = (categories.catRouter || categories.catNetworking)?.id || 'cat-router';
  const catAP = (categories.catAP || categories.catNetworking)?.id || 'cat-ap';
  const catMonitor = categories.catMonitor?.id || 'cat-monitor';
  const catPrinter = categories.catPrinter?.id || 'cat-printer';
  const catStorage = categories.catStorage?.id || 'cat-storage';
  const catUPS = categories.catUPS?.id || 'cat-ups';
  const catPeripheral =
    (categories.catPeripheral || categories.catPeripherals || categories.catMobile)?.id ||
    'cat-peripheral';

  const assetDefinitions = [
    // ── 1. Laptops / Notebooks (cat-laptop) ──────────────────────────────────
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
      notes: 'Assigned to Managing Director (BSH Ho Chi Minh Office).',
    },
    {
      assetTag: 'AST-1003',
      name: 'ThinkPad T14 Gen 4',
      manufacturer: 'Lenovo',
      model: '21HD001YUS',
      serialNumber: 'PF-388271A',
      status: 'IN_USE' as const,
      categoryId: catLaptop,
      assignedToId: userBinh.id,
      locationId: getLoc('loc-bsl-bc-exec'), // Business Center > Executive Office
      departmentId: getDept('DEPT-BSL-MGMT'), // Factory Executive Leadership
      purchaseDate: new Date('2024-01-10'),
      purchaseCost: 1450,
      warrantyExpiry: new Date('2027-01-10'),
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
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'), // Factory IT Department
      purchaseDate: new Date('2024-01-10'),
      purchaseCost: 1350,
      warrantyExpiry: new Date('2027-01-10'),
      notes: 'Assigned to Factory IT Manager (BSL Soc Trang).',
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
      notes: 'Assigned to Chief Accountant (BSH).',
    },
    {
      assetTag: 'AST-1020',
      name: 'Dell Latitude 3440 (Spare Pool)',
      manufacturer: 'Dell',
      model: 'Latitude 3440 Essential',
      serialNumber: '9M88210-SPARE',
      status: 'AVAILABLE' as const,
      categoryId: catLaptop,
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2024-04-01'),
      purchaseCost: 950,
      warrantyExpiry: new Date('2027-04-01'),
      notes: 'BSL Factory IT replacement buffer laptop.',
    },

    // ── 2. Desktops & Workstations (cat-desktop) ─────────────────────────────
    {
      assetTag: 'AST-1005',
      name: 'Dell OptiPlex 7010 Tower Workstation',
      manufacturer: 'Dell',
      model: 'OptiPlex 7010 MT',
      serialNumber: '8B821A-CAD',
      status: 'IN_USE' as const,
      categoryId: catDesktop,
      assignedToId: userHuy.id,
      locationId: getLoc('loc-bsl-bc-tech'),
      departmentId: getDept('DEPT-BSL-PROD-DEV'),
      purchaseDate: new Date('2023-10-15'),
      purchaseCost: 1450,
      warrantyExpiry: new Date('2026-10-15'),
      notes: 'Production Development CAD workstation for garment pattern design.',
    },
    {
      assetTag: 'AST-1006',
      name: 'Dell OptiPlex 7010 Micro Terminal',
      manufacturer: 'Dell',
      model: 'OptiPlex 7010 MFF',
      serialNumber: '8B823K-QA',
      status: 'IN_USE' as const,
      categoryId: catDesktop,
      assignedToId: userThu.id,
      locationId: getLoc('loc-bsl-lab-qa'),
      departmentId: getDept('DEPT-BSL-QA-AUD'),
      purchaseDate: new Date('2023-10-15'),
      purchaseCost: 950,
      warrantyExpiry: new Date('2026-10-15'),
      notes: 'Quality Assurance Lab test reporting and inspection terminal.',
    },
    {
      assetTag: 'AST-1025',
      name: 'Dell Precision 3660 Tower Workstation',
      manufacturer: 'Dell',
      model: 'Precision 3660',
      serialNumber: '5N88192-CAD',
      status: 'IN_USE' as const,
      categoryId: catDesktop,
      assignedToId: userKim.id,
      locationId: getLoc('loc-bsl-bc-tech'),
      departmentId: getDept('DEPT-BSL-PROD-DEV'),
      purchaseDate: new Date('2023-11-01'),
      purchaseCost: 2450,
      warrantyExpiry: new Date('2026-11-01'),
      notes: '3D garment sample rendering and marker optimization workstation.',
    },

    // ── 3. Servers (Rackmount / Host) (cat-server) ───────────────────────────
    {
      assetTag: 'AST-1009',
      name: 'Dell PowerEdge R750 Enterprise Server',
      manufacturer: 'Dell Enterprise',
      model: 'PowerEdge R750 2U',
      serialNumber: '7N991A2-BSL',
      status: 'IN_USE' as const,
      categoryId: catServer,
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2023-07-20'),
      purchaseCost: 9500,
      warrantyExpiry: new Date('2026-07-20'),
      notes: 'BSL On-Premise Host running local manufacturing ERP & factory shopfloor PBX.',
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
      notes: 'BSH Regional Data Center application host.',
    },
    {
      assetTag: 'AST-1017',
      name: 'Dell PowerEdge R660 1U Host',
      manufacturer: 'Dell Enterprise',
      model: 'PowerEdge R660 1U',
      serialNumber: '9K114B3-BSL',
      status: 'IN_USE' as const,
      categoryId: catServer,
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2024-02-15'),
      purchaseCost: 7800,
      warrantyExpiry: new Date('2027-02-15'),
      notes: 'Virtualization host for manufacturing telemetry.',
    },

    // ── 4. Network Switches (cat-switch) ─────────────────────────────────────
    {
      assetTag: 'AST-1010',
      name: 'Cisco Catalyst 9300-48P PoE+ Switch',
      manufacturer: 'Cisco Systems',
      model: 'C9300-48P-A',
      serialNumber: 'FOC2488102',
      status: 'IN_USE' as const,
      categoryId: catSwitch,
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2023-07-20'),
      purchaseCost: 5200,
      warrantyExpiry: new Date('2028-07-20'),
      notes: 'BSL Factory Core Switch in Datacenter Rack 01.',
    },
    {
      assetTag: 'AST-1018',
      name: 'Cisco Catalyst 9200L-24P Switch',
      manufacturer: 'Cisco Systems',
      model: 'C9200L-24P-4G',
      serialNumber: 'FOC2533K92',
      status: 'IN_USE' as const,
      categoryId: catSwitch,
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2023-08-15'),
      purchaseCost: 3100,
      warrantyExpiry: new Date('2028-08-15'),
      notes: 'Access layer switch for Business Center offices.',
    },
    {
      assetTag: 'AST-1019',
      name: 'Aruba CX 6200F 48G PoE+ Switch',
      manufacturer: 'Aruba Networks',
      model: 'JL726A',
      serialNumber: 'SG2410881',
      status: 'IN_USE' as const,
      categoryId: catSwitch,
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2023-11-10'),
      purchaseCost: 4800,
      warrantyExpiry: new Date('2028-11-10'),
      notes: 'Factory distribution switch for IoT and floor cameras.',
    },

    // ── 5. Routers & Firewalls (cat-router) ──────────────────────────────────
    {
      assetTag: 'AST-1015',
      name: 'Cisco Meraki MX85 Cloud Security Appliance',
      manufacturer: 'Cisco Meraki',
      model: 'MX85-HW',
      serialNumber: 'Q2QN-9981-LKM9',
      status: 'IN_USE' as const,
      categoryId: catRouter,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-IT'),
      purchaseDate: new Date('2024-01-10'),
      purchaseCost: 2400,
      warrantyExpiry: new Date('2027-01-10'),
      notes: 'BSH Corporate Gateway with Auto VPN to BSL Soc Trang.',
    },
    {
      assetTag: 'AST-1021',
      name: 'Fortinet FortiGate 100F Next-Gen Firewall',
      manufacturer: 'Fortinet',
      model: 'FG-100F',
      serialNumber: 'FGT100F-889102',
      status: 'IN_USE' as const,
      categoryId: catRouter,
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2023-09-01'),
      purchaseCost: 3900,
      warrantyExpiry: new Date('2026-09-01'),
      notes: 'Primary perimeter NGFW and SD-WAN controller for BSL campus.',
    },

    // ── 6. Wireless Access Points (AP) (cat-ap) ──────────────────────────────
    {
      assetTag: 'AST-1016',
      name: 'Cisco Catalyst 9120AXI Access Point',
      manufacturer: 'Cisco Systems',
      model: 'C9120AXI-E',
      serialNumber: 'FOC2519A01',
      status: 'IN_USE' as const,
      categoryId: catAP,
      locationId: getLoc('loc-bsl-bc-exec'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2023-09-10'),
      purchaseCost: 850,
      warrantyExpiry: new Date('2028-09-10'),
      notes: 'BSL Executive floor wireless coverage.',
    },
    {
      assetTag: 'AST-1022',
      name: 'Cisco Meraki MR46 Wi-Fi 6 Cloud AP',
      manufacturer: 'Cisco Meraki',
      model: 'MR46-HW',
      serialNumber: 'Q2MN-8841-B831',
      status: 'IN_USE' as const,
      categoryId: catAP,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-IT'),
      purchaseDate: new Date('2024-01-15'),
      purchaseCost: 920,
      warrantyExpiry: new Date('2028-01-15'),
      notes: 'BSH Corporate 7th floor open office wireless.',
    },
    {
      assetTag: 'AST-1023',
      name: 'Aruba AP-515 Campus Access Point',
      manufacturer: 'Aruba Networks',
      model: 'Q9H62A',
      serialNumber: 'CN9821764',
      status: 'IN_USE' as const,
      categoryId: catAP,
      locationId: getLoc('loc-bsh-d3'),
      departmentId: getDept('DEPT-BSH-IT'),
      purchaseDate: new Date('2023-12-05'),
      purchaseCost: 780,
      warrantyExpiry: new Date('2028-12-05'),
      notes: 'BSH District 3 showroom & meeting floor wireless.',
    },

    // ── 7. Monitors & Displays (cat-monitor) ──────────────────────────────────
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
      notes: 'Primary executive desk display at BSH Ho Chi Minh.',
    },
    {
      assetTag: 'AST-1024',
      name: 'Dell UltraSharp 34" Curved Monitor',
      manufacturer: 'Dell',
      model: 'U3423WE',
      serialNumber: 'CN-0K8812-7819',
      status: 'IN_USE' as const,
      categoryId: catMonitor,
      assignedToId: userBinh.id,
      locationId: getLoc('loc-bsl-bc-exec'),
      departmentId: getDept('DEPT-BSL-MGMT'),
      purchaseDate: new Date('2024-02-15'),
      purchaseCost: 980,
      warrantyExpiry: new Date('2027-02-15'),
      notes: 'General Director panoramic productivity display.',
    },

    // ── 8. Printers & Scanners (cat-printer) ──────────────────────────────────
    {
      assetTag: 'AST-1007',
      name: 'Zebra ZT411 Industrial Barcode Printer',
      manufacturer: 'Zebra Technologies',
      model: 'ZT41142-T010000Z',
      serialNumber: 'ZT411-998214',
      status: 'IN_USE' as const,
      categoryId: catPrinter,
      locationId: getLoc('loc-bsl-wh-raw'),
      departmentId: getDept('DEPT-BSL-LOG-MAT'),
      purchaseDate: new Date('2023-08-01'),
      purchaseCost: 1850,
      warrantyExpiry: new Date('2026-08-01'),
      notes: 'Raw materials central warehouse barcode intake and inventory labeling.',
    },
    {
      assetTag: 'AST-1026',
      name: 'HP LaserJet Enterprise MFP M635f',
      manufacturer: 'HP',
      model: 'LaserJet M635f',
      serialNumber: 'CNB882194',
      status: 'IN_USE' as const,
      categoryId: catPrinter,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-FIN'),
      purchaseDate: new Date('2024-01-20'),
      purchaseCost: 2600,
      warrantyExpiry: new Date('2027-01-20'),
      notes: 'BSH Corporate Finance Department multi-function department copier.',
    },

    // ── 9. Storage (NAS / SAN) (cat-storage) ─────────────────────────────────
    {
      assetTag: 'AST-1027',
      name: 'Synology DiskStation DS1821+ NAS',
      manufacturer: 'Synology',
      model: 'DS1821+',
      serialNumber: '2180Q8R8190',
      status: 'IN_USE' as const,
      categoryId: catStorage,
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2023-08-20'),
      purchaseCost: 3200,
      warrantyExpiry: new Date('2026-08-20'),
      notes: 'Centralized backup and file server for BSL factory.',
    },
    {
      assetTag: 'AST-1028',
      name: 'Dell PowerVault ME5024 SAN Storage',
      manufacturer: 'Dell Enterprise',
      model: 'PowerVault ME5024',
      serialNumber: '7N88192-SAN',
      status: 'IN_USE' as const,
      categoryId: catStorage,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-IT'),
      purchaseDate: new Date('2023-12-01'),
      purchaseCost: 18500,
      warrantyExpiry: new Date('2026-12-01'),
      notes: 'High-performance SAN storage array for ERP database clusters.',
    },

    // ── 10. Power & UPS (cat-ups) ────────────────────────────────────────────
    {
      assetTag: 'AST-1029',
      name: 'APC Smart-UPS RT 3000VA On-Line 2U',
      manufacturer: 'Schneider Electric',
      model: 'SRT3000XLI',
      serialNumber: 'AS231889102',
      status: 'IN_USE' as const,
      categoryId: catUPS,
      locationId: getLoc('loc-bsl-bc-datacenter'),
      departmentId: getDept('DEPT-BSL-IT'),
      purchaseDate: new Date('2023-07-20'),
      purchaseCost: 2400,
      warrantyExpiry: new Date('2026-07-20'),
      notes: 'Rack 01 core switch and hypervisor power protection.',
    },
    {
      assetTag: 'AST-1030',
      name: 'Eaton 9PX 3000RT 3kVA Online UPS',
      manufacturer: 'Eaton',
      model: '9PX3000RT',
      serialNumber: 'ET9PX-99214',
      status: 'IN_USE' as const,
      categoryId: catUPS,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-IT'),
      purchaseDate: new Date('2023-11-25'),
      purchaseCost: 2550,
      warrantyExpiry: new Date('2026-11-25'),
      notes: 'BSH server room rack 02 backup power protection.',
    },

    // ── 11. Peripherals & Accessories (cat-peripheral) ───────────────────────
    {
      assetTag: 'AST-1008',
      name: 'Honeywell ScanPal EDA51 Mobile Computer',
      manufacturer: 'Honeywell',
      model: 'EDA51',
      serialNumber: 'HW-EDA51-88192',
      status: 'IN_USE' as const,
      categoryId: catPeripheral,
      assignedToId: userKim.id,
      locationId: getLoc('loc-bsl-wh-raw'),
      departmentId: getDept('DEPT-BSL-LOG-MAT'),
      purchaseDate: new Date('2023-09-01'),
      purchaseCost: 650,
      warrantyExpiry: new Date('2025-09-01'),
      notes: 'Central Warehouse fabric roll intake & barcode inventory stocktaking scanner.',
    },
    {
      assetTag: 'AST-1031',
      name: 'Dell Thunderbolt 4 Dock WD22TB4',
      manufacturer: 'Dell',
      model: 'WD22TB4',
      serialNumber: 'CN-0T9812-9918',
      status: 'IN_USE' as const,
      categoryId: catPeripheral,
      assignedToId: userTri.id,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-EXEC'),
      purchaseDate: new Date('2024-02-12'),
      purchaseCost: 320,
      warrantyExpiry: new Date('2027-02-12'),
      notes: 'Managing Director executive desk docking station.',
    },
    {
      assetTag: 'AST-1032',
      name: 'Logitech Rally Bar All-in-One Video Bar',
      manufacturer: 'Logitech',
      model: 'Rally Bar',
      serialNumber: '2128LZ88102',
      status: 'IN_USE' as const,
      categoryId: catPeripheral,
      locationId: getLoc('loc-bsh-d7'),
      departmentId: getDept('DEPT-BSH-IT'),
      purchaseDate: new Date('2024-02-01'),
      purchaseCost: 3999,
      warrantyExpiry: new Date('2026-02-01'),
      notes: 'BSH Executive Boardroom conference video bar.',
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
