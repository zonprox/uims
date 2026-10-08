import type { PrismaClient } from '@prisma/client';
import { inTransactionChunks, runDomainSeeder, type SeederContext } from './seeder.utils';

export interface DeviceModelSeedDef {
  assetCode: string;
  name: string;
  manufacturer: string;
  model: string;
  categoryKey: string;
  specifications: string;
  unitCost: number;
  costCenterCode: string;
  notes?: string;
}

export interface PhysicalUnitSeedDef {
  subcode: string;
  modelCode: string;
  name?: string;
  serialNumber: string;
  status: 'IN_USE' | 'AVAILABLE';
  userEmail?: string;
  locationKey: string;
  departmentCode: string;
  costCenterCode?: string;
  purchaseDate: string;
  warrantyExpiry: string;
  notes?: string;
}

// ============================================================================
// 1. Realistic Enterprise Device Models (Parent Assets, parentId = null)
// ============================================================================
export const deviceModelRows: DeviceModelSeedDef[] = [
  // Laptops (Prompt requirements: DELL-5420, DELL-7420, MBP-14, MBP-16, THINKPAD-T14)
  {
    assetCode: 'MOD-DELL-5420',
    name: 'Dell Latitude 5420',
    manufacturer: 'Dell',
    model: 'Latitude 5420',
    categoryKey: 'cat-laptop',
    specifications: 'Intel Core i7-1185G7, 16GB RAM, 512GB SSD',
    unitCost: 1150.0,
    costCenterCode: 'IT-OPS',
    notes: 'Standard enterprise business laptop for operational workforce.',
  },
  {
    assetCode: 'MOD-DELL-7420',
    name: 'Dell Latitude 7420',
    manufacturer: 'Dell',
    model: 'Latitude 7420',
    categoryKey: 'cat-laptop',
    specifications: 'Intel Core i7-1185G7, 32GB RAM, 1TB SSD',
    unitCost: 1450.0,
    costCenterCode: 'ENG-DEV',
    notes: 'High-performance ultrabook for software engineering and technical staff.',
  },
  {
    assetCode: 'MOD-MBP-14',
    name: 'Apple MacBook Pro 14" M3 Pro',
    manufacturer: 'Apple',
    model: 'MacBookPro15,3',
    categoryKey: 'cat-laptop',
    specifications: '18GB Unified Memory, 512GB SSD',
    unitCost: 1999.0,
    costCenterCode: 'ENG-DEV',
    notes: 'Apple Silicon workstation for software development & mobile engineers.',
  },
  {
    assetCode: 'MOD-MBP-16',
    name: 'Apple MacBook Pro 16" M3 Max',
    manufacturer: 'Apple',
    model: 'MacBookPro18,2',
    categoryKey: 'cat-laptop',
    specifications: '36GB Unified Memory, 1TB SSD',
    unitCost: 3499.0,
    costCenterCode: 'ENG-DEV',
    notes: 'Flagship engineering and executive mobile workstation.',
  },
  {
    assetCode: 'MOD-THINKPAD-T14',
    name: 'Lenovo ThinkPad T14 Gen 4',
    manufacturer: 'Lenovo',
    model: '21HD001YUS',
    categoryKey: 'cat-laptop',
    specifications: 'AMD Ryzen 7 PRO, 16GB RAM',
    unitCost: 1350.0,
    costCenterCode: 'FIN-ACC',
    notes: 'Corporate productivity laptop for finance, audit, and operations management.',
  },

  // Desktops & Workstations (Prompt requirement: PRECISION-3660)
  {
    assetCode: 'MOD-PRECISION-3660',
    name: 'Dell Precision 3660 Tower',
    manufacturer: 'Dell',
    model: 'Precision 3660',
    categoryKey: 'cat-desktop',
    specifications: 'Intel i9-13900, 64GB RAM',
    unitCost: 2650.0,
    costCenterCode: 'ENG-DEV',
    notes: 'High-performance tower workstation for CAD garment modeling and 3D rendering.',
  },
  {
    assetCode: 'MOD-DELL-OPT7010',
    name: 'Dell OptiPlex 7010 Micro Terminal',
    manufacturer: 'Dell',
    model: 'OptiPlex 7010 MFF',
    categoryKey: 'cat-desktop',
    specifications: 'Intel Core i5-13500T, 16GB DDR5, 512GB PCIe NVMe SSD',
    unitCost: 780.0,
    costCenterCode: 'IT-OPS',
    notes: 'Compact business desktop terminal for QA labs and shopfloor administration.',
  },

  // Monitors (Prompt requirements: DELL-U2723QE, LG-27UK850)
  {
    assetCode: 'MOD-DELL-U2723QE',
    name: 'Dell UltraSharp 27 4K Monitor',
    manufacturer: 'Dell',
    model: 'U2723QE (IPS Black)',
    categoryKey: 'cat-monitor',
    specifications: '27-inch 4K UHD (3840 x 2160), IPS Black, USB-C Hub 90W PD',
    unitCost: 580.0,
    costCenterCode: 'IT-OPS',
    notes: 'UltraSharp 4K USB-C hub display with color accuracy.',
  },
  {
    assetCode: 'MOD-LG-27UK850',
    name: 'LG 27" 4K UHD Monitor',
    manufacturer: 'LG',
    model: '27UK850-W',
    categoryKey: 'cat-monitor',
    specifications: '27-inch 4K UHD (3840 x 2160), HDR10, USB-C',
    unitCost: 450.0,
    costCenterCode: 'IT-OPS',
    notes: '4K productivity display for workstations and terminals.',
  },

  // Servers (Preserve downstream canonicals: AST-1009, AST-1017, AST-1014)
  {
    assetCode: 'MOD-DELL-R750',
    name: 'Dell PowerEdge R750 Enterprise Server',
    manufacturer: 'Dell Enterprise',
    model: 'PowerEdge R750 2U',
    categoryKey: 'cat-server',
    specifications: 'Dual Intel Xeon Gold 6330, 128GB DDR4, 8x 1.92TB NVMe',
    unitCost: 6500.0,
    costCenterCode: 'IT-OPS',
    notes: 'BSL On-Premise Host running local manufacturing ERP & factory PBX.',
  },
  {
    assetCode: 'MOD-DELL-R660',
    name: 'Dell PowerEdge R660 1U Host',
    manufacturer: 'Dell Enterprise',
    model: 'PowerEdge R660 1U',
    categoryKey: 'cat-server',
    specifications: 'Dual Intel Xeon Silver 4410Y, 64GB DDR5, 4x 960GB SSD',
    unitCost: 4800.0,
    costCenterCode: 'IT-OPS',
    notes: 'Virtualization host for manufacturing telemetry.',
  },
  {
    assetCode: 'MOD-HPE-DL380',
    name: 'HPE ProLiant DL380 Gen10 Server',
    manufacturer: 'Hewlett Packard Enterprise',
    model: 'ProLiant DL380 Gen10 2U',
    categoryKey: 'cat-server',
    specifications: 'Dual Intel Xeon Silver 4210R, 64GB RAM, 8x SFF',
    unitCost: 5200.0,
    costCenterCode: 'IT-OPS',
    notes: 'BSH Regional Data Center application host.',
  },

  // Switches (Preserve downstream canonicals: AST-1010, AST-1018, AST-1019)
  {
    assetCode: 'MOD-CISCO-C9300',
    name: 'Cisco Catalyst 9300-48P PoE+ Switch',
    manufacturer: 'Cisco Systems',
    model: 'C9300-48P-A',
    categoryKey: 'cat-switch',
    specifications: '48-Port PoE+ Layer 3 Switch, 715W AC, Network Advantage',
    unitCost: 3850.0,
    costCenterCode: 'IT-OPS',
    notes: 'BSL Factory Core Switch in Datacenter Rack 01.',
  },
  {
    assetCode: 'MOD-CISCO-C9200',
    name: 'Cisco Catalyst 9200L-24P Switch',
    manufacturer: 'Cisco Systems',
    model: 'C9200L-24P-4G',
    categoryKey: 'cat-switch',
    specifications: '24-Port PoE+ Layer 2/3 Switch, 4x 1G SFP uplinks',
    unitCost: 2200.0,
    costCenterCode: 'IT-OPS',
    notes: 'Access layer switch for Business Center offices.',
  },
  {
    assetCode: 'MOD-ARUBA-6200F',
    name: 'Aruba CX 6200F 48G PoE+ Switch',
    manufacturer: 'Aruba Networks',
    model: 'JL726A',
    categoryKey: 'cat-switch',
    specifications: '48G Class 4 PoE 4SFP+ 370W Switch',
    unitCost: 2400.0,
    costCenterCode: 'IT-OPS',
    notes: 'Factory distribution switch for IoT and floor cameras.',
  },

  // Routers, APs, Printers, Storage, UPS, Peripherals
  {
    assetCode: 'MOD-CISCO-MX85',
    name: 'Cisco Meraki MX85 Cloud Security Appliance',
    manufacturer: 'Cisco Meraki',
    model: 'MX85-HW',
    categoryKey: 'cat-router',
    specifications: '1 Gbps Stateful Firewall Throughput, Dual WAN',
    unitCost: 2950.0,
    costCenterCode: 'IT-OPS',
    notes: 'BSH Corporate Gateway with Auto VPN to BSL Soc Trang.',
  },
  {
    assetCode: 'MOD-FORTI-100F',
    name: 'Fortinet FortiGate 100F Next-Gen Firewall',
    manufacturer: 'Fortinet',
    model: 'FG-100F',
    categoryKey: 'cat-router',
    specifications: '1 Gbps Threat Protection, 16x GE RJ45, 4x 10GE SFP+',
    unitCost: 3100.0,
    costCenterCode: 'IT-OPS',
    notes: 'Primary perimeter NGFW and SD-WAN controller for BSL campus.',
  },
  {
    assetCode: 'MOD-CISCO-9120AX',
    name: 'Cisco Catalyst 9120AXI Access Point',
    manufacturer: 'Cisco Systems',
    model: 'C9120AXI-E',
    categoryKey: 'cat-ap',
    specifications: 'Wi-Fi 6 (802.11ax), 4x4:4 MIMO, Internal Antennas',
    unitCost: 650.0,
    costCenterCode: 'IT-OPS',
    notes: 'BSL Executive floor wireless coverage.',
  },
  {
    assetCode: 'MOD-ZEBRA-ZT411',
    name: 'Zebra ZT411 Industrial Barcode Printer',
    manufacturer: 'Zebra Technologies',
    model: 'ZT41142-T010000Z',
    categoryKey: 'cat-printer',
    specifications: '4-inch 203dpi Thermal Transfer / Direct Thermal, USB, Serial, Ethernet',
    unitCost: 1420.0,
    costCenterCode: 'IT-OPS',
    notes: 'Raw materials and packaging barcode station printer.',
  },
  {
    assetCode: 'MOD-HP-M635F',
    name: 'HP LaserJet Enterprise MFP M635f',
    manufacturer: 'HP',
    model: 'LaserJet M635f',
    categoryKey: 'cat-printer',
    specifications: 'Multifunction Copier, 65 ppm, Duplex, Network Ethernet',
    unitCost: 1950.0,
    costCenterCode: 'FIN-ACC',
    notes: 'Multi-function department copier.',
  },
  {
    assetCode: 'MOD-SYNOLOGY-DS1821',
    name: 'Synology DiskStation DS1821+ NAS',
    manufacturer: 'Synology',
    model: 'DS1821+',
    categoryKey: 'cat-storage',
    specifications: '8-Bay NAS, AMD Ryzen V1500B Quad-core 2.2 GHz, 32GB ECC RAM',
    unitCost: 1250.0,
    costCenterCode: 'IT-OPS',
    notes: 'Centralized backup and file server for BSL factory.',
  },
  {
    assetCode: 'MOD-DELL-ME5024',
    name: 'Dell PowerVault ME5024 SAN Storage',
    manufacturer: 'Dell Enterprise',
    model: 'PowerVault ME5024',
    categoryKey: 'cat-storage',
    specifications: '24x 2.5" SAS Drives, Dual Controller 16Gb FC, 48TB Raw',
    unitCost: 11500.0,
    costCenterCode: 'IT-OPS',
    notes: 'High-performance SAN storage array for ERP database clusters.',
  },
  {
    assetCode: 'MOD-APC-SRT3000',
    name: 'APC Smart-UPS RT 3000VA On-Line 2U',
    manufacturer: 'Schneider Electric',
    model: 'SRT3000XLI',
    categoryKey: 'cat-ups',
    specifications: '3000VA / 2700W On-Line Double Conversion, 230V, 2U Rackmount',
    unitCost: 1850.0,
    costCenterCode: 'IT-OPS',
    notes: 'Rack core switch and hypervisor power protection.',
  },
  {
    assetCode: 'MOD-HONEYWELL-EDA51',
    name: 'Honeywell ScanPal EDA51 Mobile Computer',
    manufacturer: 'Honeywell',
    model: 'EDA51',
    categoryKey: 'cat-peripheral',
    specifications: 'Android Enterprise Handheld, 2D Imager N6603, 4000mAh Battery',
    unitCost: 650.0,
    costCenterCode: 'IT-OPS',
    notes: 'Central Warehouse fabric roll intake & barcode inventory stocktaking scanner.',
  },
  {
    assetCode: 'MOD-HIK-TERMINAL',
    name: 'Hikvision DS-K1T671MF Face Terminal',
    manufacturer: 'Hikvision',
    model: 'DS-K1T671MF',
    categoryKey: 'cat-peripheral',
    specifications: 'Face Recognition Terminal, 7-inch LCD Touch Screen, Mifare Card',
    unitCost: 480.0,
    costCenterCode: 'HR-ADMIN',
    notes: 'Factory main entrance biometric time and attendance terminal.',
  },
];

// ============================================================================
// 2. Realistic Physical Units (Child Assets, parentId linked to Device Models)
// ============================================================================
export const physicalUnitRows: PhysicalUnitSeedDef[] = [
  // Units under MOD-DELL-5420 (Dell Latitude 5420)
  {
    subcode: 'AST-DELL-001',
    modelCode: 'MOD-DELL-5420',
    serialNumber: '7N881M2-001',
    status: 'IN_USE',
    userEmail: 'minh.nguyen@youngonevn.com',
    locationKey: 'loc-bsl-f1-cut',
    departmentCode: 'DEPT-BSL-F1-CUT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-03-01',
    warrantyExpiry: '2027-03-01',
    notes: 'Assigned to Cutting Section Team Leader (BSL Factory 1).',
  },
  {
    subcode: 'AST-DELL-002',
    modelCode: 'MOD-DELL-5420',
    serialNumber: '7N881M2-002',
    status: 'IN_USE',
    userEmail: 'mai.tran@youngonevn.com',
    locationKey: 'loc-bsl-f1-sew',
    departmentCode: 'DEPT-BSL-F1-SEW',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-03-01',
    warrantyExpiry: '2027-03-01',
    notes: 'Assigned to Sewing Assembly Line Leader (BSL Factory 1).',
  },
  {
    subcode: 'AST-DELL-003',
    modelCode: 'MOD-DELL-5420',
    serialNumber: '7N881M2-003',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-03-01',
    warrantyExpiry: '2027-03-01',
    notes: 'Operational spare unit at BSL IT stockroom.',
  },
  {
    subcode: 'AST-DELL-004',
    modelCode: 'MOD-DELL-5420',
    serialNumber: '7N881M2-004',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-03-01',
    warrantyExpiry: '2027-03-01',
    notes: 'Ready for employee onboarding deployment.',
  },
  {
    subcode: 'AST-DELL-005',
    modelCode: 'MOD-DELL-5420',
    serialNumber: '7N881M2-005',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-03-01',
    warrantyExpiry: '2027-03-01',
    notes: 'Operational reserve unit at BSL IT inventory.',
  },
  // Preserved canonical units under MOD-DELL-5420
  {
    subcode: 'AST-1012',
    modelCode: 'MOD-DELL-5420',
    serialNumber: '7N881M2-HCM',
    status: 'IN_USE',
    userEmail: 'lan.nguyen@youngonevn.com',
    locationKey: 'loc-bsh-d3',
    departmentCode: 'DEPT-BSH-MERCH',
    costCenterCode: 'SALES-MKT',
    purchaseDate: '2024-03-01',
    warrantyExpiry: '2027-03-01',
    notes: 'Assigned to Apparel Merchandising Manager (BSH).',
  },
  {
    subcode: 'AST-1013',
    modelCode: 'MOD-DELL-5420',
    serialNumber: '7N882M3-FIN',
    status: 'IN_USE',
    userEmail: 'ngoc.vu@youngonevn.com',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-FIN',
    costCenterCode: 'FIN-ACC',
    purchaseDate: '2024-03-01',
    warrantyExpiry: '2027-03-01',
    notes: 'Assigned to Chief Accountant (BSH).',
  },
  {
    subcode: 'AST-1020',
    modelCode: 'MOD-DELL-5420',
    serialNumber: '9M88210-SPARE',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-04-01',
    warrantyExpiry: '2027-04-01',
    notes: 'BSL Factory IT replacement buffer laptop.',
  },
  {
    subcode: 'AST-1031',
    modelCode: 'MOD-DELL-5420',
    serialNumber: 'CN-0T9812-9918',
    status: 'IN_USE',
    userEmail: 'tri.doan@youngonevn.com',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-EXEC',
    costCenterCode: 'EXEC-MGMT',
    purchaseDate: '2024-02-12',
    warrantyExpiry: '2027-02-12',
    notes: 'Managing Director executive desk docking station.',
  },

  // Units under MOD-DELL-7420 (Dell Latitude 7420)
  {
    subcode: 'AST-DELL-006',
    modelCode: 'MOD-DELL-7420',
    serialNumber: '7N991K4-001',
    status: 'IN_USE',
    userEmail: 'bao.pham@youngonevn.com',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2024-01-15',
    warrantyExpiry: '2027-01-15',
    notes: 'Assigned to Industrial IT & Automation Specialist (BSL Soc Trang).',
  },
  {
    subcode: 'AST-DELL-007',
    modelCode: 'MOD-DELL-7420',
    serialNumber: '7N991K4-002',
    status: 'AVAILABLE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2024-01-15',
    warrantyExpiry: '2027-01-15',
    notes: 'Developer laptop available in BSH IT inventory.',
  },
  {
    subcode: 'AST-DELL-008',
    modelCode: 'MOD-DELL-7420',
    serialNumber: '7N991K4-003',
    status: 'AVAILABLE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2024-01-15',
    warrantyExpiry: '2027-01-15',
    notes: 'Engineering spare unit at BSH office.',
  },

  // Units under MOD-MBP-14 (Apple MacBook Pro 14" M3 Pro)
  {
    subcode: 'AST-MBP-001',
    modelCode: 'MOD-MBP-14',
    serialNumber: 'C02L9123MD14',
    status: 'IN_USE',
    userEmail: 'thinh.nguyen@youngonevn.com',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-SRC',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2024-02-15',
    warrantyExpiry: '2027-02-15',
    notes: 'Assigned to Global Fabric Sourcing Specialist (BSH Ho Chi Minh).',
  },
  {
    subcode: 'AST-MBP-002',
    modelCode: 'MOD-MBP-14',
    serialNumber: 'C02L9124MD14',
    status: 'IN_USE',
    userEmail: 'long.vu@youngonevn.com',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2024-02-15',
    warrantyExpiry: '2027-02-15',
    notes: 'Assigned to Enterprise IT Systems Architect (BSH Ho Chi Minh).',
  },
  {
    subcode: 'AST-MBP-003',
    modelCode: 'MOD-MBP-14',
    serialNumber: 'C02L9125MD14',
    status: 'AVAILABLE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2024-02-15',
    warrantyExpiry: '2027-02-15',
    notes: 'Available developer workstation at BSH IT equipment pool.',
  },

  // Units under MOD-MBP-16 (Apple MacBook Pro 16" M3 Max)
  {
    subcode: 'AST-1001',
    modelCode: 'MOD-MBP-16',
    serialNumber: 'C02G8392MD6R',
    status: 'IN_USE',
    userEmail: 'tri.doan@youngonevn.com',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-EXEC',
    costCenterCode: 'EXEC-MGMT',
    purchaseDate: '2024-02-10',
    warrantyExpiry: '2027-02-10',
    notes: 'Assigned to Managing Director (BSH Ho Chi Minh Office).',
  },
  {
    subcode: 'AST-MBP-004',
    modelCode: 'MOD-MBP-16',
    serialNumber: 'C02G8393MD6R',
    status: 'IN_USE',
    userEmail: 'phong.dang@youngonevn.com',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2024-02-10',
    warrantyExpiry: '2027-02-10',
    notes: 'Assigned to Lead Cloud Architect (BSH Ho Chi Minh).',
  },
  {
    subcode: 'AST-MBP-005',
    modelCode: 'MOD-MBP-16',
    serialNumber: 'C02G8394MD6R',
    status: 'AVAILABLE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2024-02-10',
    warrantyExpiry: '2027-02-10',
    notes: 'Available high-end mobile workstation at BSH stockroom.',
  },
  {
    subcode: 'AST-MBP-006',
    modelCode: 'MOD-MBP-16',
    serialNumber: 'C02G8395MD6R',
    status: 'AVAILABLE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2024-02-10',
    warrantyExpiry: '2027-02-10',
    notes: 'Engineering spare unit at BSH datacenter.',
  },

  // Units under MOD-THINKPAD-T14 (Lenovo ThinkPad T14 Gen 4)
  {
    subcode: 'AST-1003',
    modelCode: 'MOD-THINKPAD-T14',
    serialNumber: 'PF-388271A',
    status: 'IN_USE',
    userEmail: 'binh.tran@youngonevn.com',
    locationKey: 'loc-bsl-bc-exec',
    departmentCode: 'DEPT-BSL-MGMT',
    costCenterCode: 'EXEC-MGMT',
    purchaseDate: '2024-01-10',
    warrantyExpiry: '2027-01-10',
    notes: 'Assigned to Factory General Director (BSL Soc Trang).',
  },
  {
    subcode: 'AST-1004',
    modelCode: 'MOD-THINKPAD-T14',
    serialNumber: 'PF-291882K',
    status: 'IN_USE',
    userEmail: 'nam.pham@youngonevn.com',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-01-10',
    warrantyExpiry: '2027-01-10',
    notes: 'Assigned to Factory IT Manager (BSL Soc Trang).',
  },
  {
    subcode: 'AST-1011',
    modelCode: 'MOD-THINKPAD-T14',
    serialNumber: 'PF-491AK82',
    status: 'IN_USE',
    userEmail: 'dat.trinh@youngonevn.com',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-FIN',
    costCenterCode: 'FIN-ACC',
    purchaseDate: '2024-01-15',
    warrantyExpiry: '2027-01-15',
    notes: 'Assigned to Chief Accountant & Financial Controller (BSH).',
  },
  {
    subcode: 'AST-TP-001',
    modelCode: 'MOD-THINKPAD-T14',
    serialNumber: 'PF-991A01',
    status: 'IN_USE',
    userEmail: 'anh.tran@youngonevn.com',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-HR',
    costCenterCode: 'HR-ADMIN',
    purchaseDate: '2024-01-20',
    warrantyExpiry: '2027-01-20',
    notes: 'Assigned to Talent Acquisition & HR Manager (BSH).',
  },
  {
    subcode: 'AST-TP-002',
    modelCode: 'MOD-THINKPAD-T14',
    serialNumber: 'PF-991A02',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'FIN-ACC',
    purchaseDate: '2024-01-20',
    warrantyExpiry: '2027-01-20',
    notes: 'Available corporate laptop at BSL IT warehouse.',
  },
  {
    subcode: 'AST-TP-003',
    modelCode: 'MOD-THINKPAD-T14',
    serialNumber: 'PF-991A03',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'FIN-ACC',
    purchaseDate: '2024-01-20',
    warrantyExpiry: '2027-01-20',
    notes: 'Standard business productivity laptop pool.',
  },
  {
    subcode: 'AST-TP-004',
    modelCode: 'MOD-THINKPAD-T14',
    serialNumber: 'PF-991A04',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'FIN-ACC',
    purchaseDate: '2024-01-20',
    warrantyExpiry: '2027-01-20',
    notes: 'Operational spare unit ready for deployment.',
  },
  {
    subcode: 'AST-TP-005',
    modelCode: 'MOD-THINKPAD-T14',
    serialNumber: 'PF-991A05',
    status: 'AVAILABLE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'FIN-ACC',
    purchaseDate: '2024-01-20',
    warrantyExpiry: '2027-01-20',
    notes: 'Corporate pool laptop at BSH office.',
  },

  // Units under MOD-PRECISION-3660 (Dell Precision 3660 Tower)
  {
    subcode: 'AST-1025',
    modelCode: 'MOD-PRECISION-3660',
    serialNumber: '5N88192-CAD',
    status: 'IN_USE',
    userEmail: 'kim.vo@youngonevn.com',
    locationKey: 'loc-bsl-bc-tech',
    departmentCode: 'DEPT-BSL-QA-SMP',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2023-11-01',
    warrantyExpiry: '2026-11-01',
    notes: '3D garment sample rendering and marker optimization workstation.',
  },
  {
    subcode: 'AST-PREC-001',
    modelCode: 'MOD-PRECISION-3660',
    serialNumber: '5N88192-001',
    status: 'IN_USE',
    userEmail: 'huy.nguyen@youngonevn.com',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-QA-SMP',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2023-11-01',
    warrantyExpiry: '2026-11-01',
    notes: 'Pattern nesting & fabric cut optimization workstation.',
  },
  {
    subcode: 'AST-PREC-002',
    modelCode: 'MOD-PRECISION-3660',
    serialNumber: '5N88192-002',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2023-11-01',
    warrantyExpiry: '2026-11-01',
    notes: 'Engineering workstation pool at BSL tech center.',
  },
  {
    subcode: 'AST-PREC-003',
    modelCode: 'MOD-PRECISION-3660',
    serialNumber: '5N88192-003',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'ENG-DEV',
    purchaseDate: '2023-11-01',
    warrantyExpiry: '2026-11-01',
    notes: 'Reserve CAD workstation unit.',
  },

  // Units under MOD-DELL-U2723QE (Dell UltraSharp 27 4K Monitor)
  {
    subcode: 'AST-1002',
    modelCode: 'MOD-DELL-U2723QE',
    serialNumber: 'CN-0N179F-74261',
    status: 'IN_USE',
    userEmail: 'tri.doan@youngonevn.com',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-EXEC',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-02-12',
    warrantyExpiry: '2027-02-12',
    notes: 'Primary executive desk display at BSH Ho Chi Minh.',
  },
  {
    subcode: 'AST-1024',
    modelCode: 'MOD-DELL-U2723QE',
    serialNumber: 'CN-0K8812-7819',
    status: 'IN_USE',
    userEmail: 'binh.tran@youngonevn.com',
    locationKey: 'loc-bsl-bc-exec',
    departmentCode: 'DEPT-BSL-MGMT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-02-15',
    warrantyExpiry: '2027-02-15',
    notes: 'General Director panoramic productivity display.',
  },
  {
    subcode: 'AST-MON-001',
    modelCode: 'MOD-DELL-U2723QE',
    serialNumber: 'CN-0N179F-001',
    status: 'IN_USE',
    userEmail: 'lan.nguyen@youngonevn.com',
    locationKey: 'loc-bsh-d3',
    departmentCode: 'DEPT-BSH-MERCH',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-02-15',
    warrantyExpiry: '2027-02-15',
    notes: 'Merchandising design display at BSH D3 showroom.',
  },
  {
    subcode: 'AST-MON-002',
    modelCode: 'MOD-DELL-U2723QE',
    serialNumber: 'CN-0N179F-002',
    status: 'AVAILABLE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-02-15',
    warrantyExpiry: '2027-02-15',
    notes: '4K monitor available for executive desk setup.',
  },
  {
    subcode: 'AST-MON-003',
    modelCode: 'MOD-DELL-U2723QE',
    serialNumber: 'CN-0N179F-003',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-02-15',
    warrantyExpiry: '2027-02-15',
    notes: 'Available display unit at BSL IT warehouse.',
  },

  // Units under MOD-LG-27UK850 (LG 27" 4K UHD Monitor)
  {
    subcode: 'AST-MON-004',
    modelCode: 'MOD-LG-27UK850',
    serialNumber: 'LG-27UK-001',
    status: 'IN_USE',
    userEmail: 'nam.pham@youngonevn.com',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-01-20',
    warrantyExpiry: '2027-01-20',
    notes: 'IT Manager console monitor in server room.',
  },
  {
    subcode: 'AST-MON-005',
    modelCode: 'MOD-LG-27UK850',
    serialNumber: 'LG-27UK-002',
    status: 'AVAILABLE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-01-20',
    warrantyExpiry: '2027-01-20',
    notes: 'Available display unit in BSL stockroom.',
  },
  {
    subcode: 'AST-MON-006',
    modelCode: 'MOD-LG-27UK850',
    serialNumber: 'LG-27UK-003',
    status: 'AVAILABLE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-01-20',
    warrantyExpiry: '2027-01-20',
    notes: 'Available monitor in BSH inventory pool.',
  },

  // Preserved Enterprise Infrastructure Units (Canonicals for network.seeder & audit.seeder)
  {
    subcode: 'AST-1009',
    modelCode: 'MOD-DELL-R750',
    serialNumber: '7N991A2-BSL',
    status: 'IN_USE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-07-20',
    warrantyExpiry: '2026-07-20',
    notes: 'BSL On-Premise Host running local manufacturing ERP & factory shopfloor PBX.',
  },
  {
    subcode: 'AST-1014',
    modelCode: 'MOD-HPE-DL380',
    serialNumber: 'USE-994821',
    status: 'IN_USE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-11-20',
    warrantyExpiry: '2026-11-20',
    notes: 'BSH Regional Data Center application host.',
  },
  {
    subcode: 'AST-1017',
    modelCode: 'MOD-DELL-R660',
    serialNumber: '9K114B3-BSL',
    status: 'IN_USE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-02-15',
    warrantyExpiry: '2027-02-15',
    notes: 'Virtualization host for manufacturing telemetry.',
  },
  {
    subcode: 'AST-1010',
    modelCode: 'MOD-CISCO-C9300',
    serialNumber: 'FOC2488102',
    status: 'IN_USE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-07-20',
    warrantyExpiry: '2028-07-20',
    notes: 'BSL Factory Core Switch in Datacenter Rack 01.',
  },
  {
    subcode: 'AST-1018',
    modelCode: 'MOD-CISCO-C9200',
    serialNumber: 'FOC2533K92',
    status: 'IN_USE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-08-15',
    warrantyExpiry: '2028-08-15',
    notes: 'Access layer switch for Business Center offices.',
  },
  {
    subcode: 'AST-1019',
    modelCode: 'MOD-ARUBA-6200F',
    serialNumber: 'SG2410881',
    status: 'IN_USE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-11-10',
    warrantyExpiry: '2028-11-10',
    notes: 'Factory distribution switch for IoT and floor cameras.',
  },
  {
    subcode: 'AST-1015',
    modelCode: 'MOD-CISCO-MX85',
    serialNumber: 'Q2QN-9981-LKM9',
    status: 'IN_USE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-01-10',
    warrantyExpiry: '2027-01-10',
    notes: 'BSH Corporate Gateway with Auto VPN to BSL Soc Trang.',
  },
  {
    subcode: 'AST-1021',
    modelCode: 'MOD-FORTI-100F',
    serialNumber: 'FGT100F-889102',
    status: 'IN_USE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-09-01',
    warrantyExpiry: '2026-09-01',
    notes: 'Primary perimeter NGFW and SD-WAN controller for BSL campus.',
  },
  {
    subcode: 'AST-1016',
    modelCode: 'MOD-CISCO-9120AX',
    serialNumber: 'FOC2519A01',
    status: 'IN_USE',
    locationKey: 'loc-bsl-bc-exec',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-09-10',
    warrantyExpiry: '2028-09-10',
    notes: 'BSL Executive floor wireless coverage.',
  },
  {
    subcode: 'AST-1022',
    modelCode: 'MOD-CISCO-9120AX',
    serialNumber: 'Q2MN-8841-B831',
    status: 'IN_USE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-01-15',
    warrantyExpiry: '2028-01-15',
    notes: 'BSH Corporate 7th floor open office wireless.',
  },
  {
    subcode: 'AST-1023',
    modelCode: 'MOD-CISCO-9120AX',
    serialNumber: 'CN9821764',
    status: 'IN_USE',
    locationKey: 'loc-bsh-d3',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-12-05',
    warrantyExpiry: '2028-12-05',
    notes: 'BSH District 3 showroom & meeting floor wireless.',
  },
  {
    subcode: 'AST-1005',
    modelCode: 'MOD-DELL-OPT7010',
    serialNumber: '8B821A-CAD',
    status: 'IN_USE',
    userEmail: 'huy.nguyen@youngonevn.com',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-QA-SMP',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-10-15',
    warrantyExpiry: '2026-10-15',
    notes: 'Production Development CAD workstation for garment pattern design.',
  },
  {
    subcode: 'AST-1006',
    modelCode: 'MOD-DELL-OPT7010',
    serialNumber: '8B823K-QA',
    status: 'IN_USE',
    userEmail: 'thu.le@youngonevn.com',
    locationKey: 'loc-bsl-bc-admin',
    departmentCode: 'DEPT-BSL-QA-AUDIT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-10-15',
    warrantyExpiry: '2026-10-15',
    notes: 'Quality Assurance Lab test reporting and inspection terminal.',
  },
  {
    subcode: 'AST-1007',
    modelCode: 'MOD-ZEBRA-ZT411',
    serialNumber: 'ZT411-998214',
    status: 'IN_USE',
    locationKey: 'loc-bsl-wh-raw',
    departmentCode: 'DEPT-BSL-LOG-MAT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-08-01',
    warrantyExpiry: '2026-08-01',
    notes: 'Raw materials central warehouse barcode intake and inventory labeling.',
  },
  {
    subcode: 'AST-1026',
    modelCode: 'MOD-HP-M635F',
    serialNumber: 'CNB882194',
    status: 'IN_USE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-FIN',
    costCenterCode: 'FIN-ACC',
    purchaseDate: '2024-01-20',
    warrantyExpiry: '2027-01-20',
    notes: 'BSH Corporate Finance Department multi-function department copier.',
  },
  {
    subcode: 'AST-1027',
    modelCode: 'MOD-SYNOLOGY-DS1821',
    serialNumber: '2180Q8R8190',
    status: 'IN_USE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-08-20',
    warrantyExpiry: '2026-08-20',
    notes: 'Centralized backup and file server for BSL factory.',
  },
  {
    subcode: 'AST-1028',
    modelCode: 'MOD-DELL-ME5024',
    serialNumber: '7N88192-SAN',
    status: 'IN_USE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-12-01',
    warrantyExpiry: '2026-12-01',
    notes: 'High-performance SAN storage array for ERP database clusters.',
  },
  {
    subcode: 'AST-1029',
    modelCode: 'MOD-APC-SRT3000',
    serialNumber: 'AS231889102',
    status: 'IN_USE',
    locationKey: 'loc-bsl-bc-datacenter',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-07-20',
    warrantyExpiry: '2026-07-20',
    notes: 'Rack 01 core switch and hypervisor power protection.',
  },
  {
    subcode: 'AST-1030',
    modelCode: 'MOD-APC-SRT3000',
    serialNumber: 'ET9PX-99214',
    status: 'IN_USE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-11-25',
    warrantyExpiry: '2026-11-25',
    notes: 'BSH server room rack 02 backup power protection.',
  },
  {
    subcode: 'AST-1008',
    modelCode: 'MOD-HONEYWELL-EDA51',
    serialNumber: 'HW-EDA51-88192',
    status: 'IN_USE',
    userEmail: 'kim.vo@youngonevn.com',
    locationKey: 'loc-bsl-wh-raw',
    departmentCode: 'DEPT-BSL-LOG-MAT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-09-01',
    warrantyExpiry: '2025-09-01',
    notes: 'Central Warehouse fabric roll intake & barcode inventory stocktaking scanner.',
  },
  {
    subcode: 'AST-1032',
    modelCode: 'MOD-HIK-TERMINAL',
    serialNumber: '2128LZ88102',
    status: 'IN_USE',
    locationKey: 'loc-bsh-d7',
    departmentCode: 'DEPT-BSH-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2024-02-01',
    warrantyExpiry: '2026-02-01',
    notes: 'BSH Executive Boardroom conference video bar.',
  },
  {
    subcode: 'AST-1033',
    modelCode: 'MOD-HP-M635F',
    serialNumber: 'SD-D410-F1001',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f1',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-09-01',
    warrantyExpiry: '2026-09-01',
    notes: 'Factory 1 floor office SINDOH color multifunction printer.',
  },
  {
    subcode: 'AST-1034',
    modelCode: 'MOD-HP-M635F',
    serialNumber: 'CNB-HP-F1002',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f1',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-09-01',
    warrantyExpiry: '2026-09-01',
    notes: 'Factory 1 production floor document & work order printer.',
  },
  {
    subcode: 'AST-1035',
    modelCode: 'MOD-HIK-TERMINAL',
    serialNumber: 'HK-DSK671-F101',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f1',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'HR-ADMIN',
    purchaseDate: '2023-09-01',
    warrantyExpiry: '2026-09-01',
    notes: 'Factory 1 main entrance biometric time and attendance terminal.',
  },
  {
    subcode: 'AST-1036',
    modelCode: 'MOD-HIK-TERMINAL',
    serialNumber: 'HK-CAM-F1001',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f1',
    departmentCode: 'DEPT-BSL-IT',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-09-01',
    warrantyExpiry: '2026-09-01',
    notes: 'Factory 1 production floor IP security camera.',
  },
  {
    subcode: 'AST-1037',
    modelCode: 'MOD-ZEBRA-ZT411',
    serialNumber: 'ZT411-F1-9901',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f1-pack-st1',
    departmentCode: 'DEPT-BSL-F1-PCK',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-08-15',
    warrantyExpiry: '2026-08-15',
    notes: 'Factory 1 finishing packing export carton barcode label printer.',
  },
  {
    subcode: 'AST-1038',
    modelCode: 'MOD-ZEBRA-ZT411',
    serialNumber: 'ZT411-F2-9902',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f2-pack-st1',
    departmentCode: 'DEPT-BSL-F2-PCK',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-09-01',
    warrantyExpiry: '2026-09-01',
    notes: 'Factory 2 packing finishing barcode label printer.',
  },
  {
    subcode: 'AST-1039',
    modelCode: 'MOD-ZEBRA-ZT411',
    serialNumber: 'ZT411-F3-9903',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f3-pack-st1',
    departmentCode: 'DEPT-BSL-F3-PCK',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-10-01',
    warrantyExpiry: '2026-10-01',
    notes: 'Factory 3 packing finishing barcode label printer.',
  },
  {
    subcode: 'AST-1040',
    modelCode: 'MOD-ZEBRA-ZT411',
    serialNumber: 'ZT411-F4-9904',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f4-pack-st1',
    departmentCode: 'DEPT-BSL-F4-PCK',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-10-15',
    warrantyExpiry: '2026-10-15',
    notes: 'Factory 4 packing finishing barcode label printer.',
  },
  {
    subcode: 'AST-1041',
    modelCode: 'MOD-ZEBRA-ZT411',
    serialNumber: 'ZT411-F5-9905',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f5-pack-st1',
    departmentCode: 'DEPT-BSL-F5-PCK',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-11-01',
    warrantyExpiry: '2026-11-01',
    notes: 'Factory 5 packing finishing barcode label printer.',
  },
  {
    subcode: 'AST-1042',
    modelCode: 'MOD-ZEBRA-ZT411',
    serialNumber: 'ZT411-F6-9906',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f6-pack-st1',
    departmentCode: 'DEPT-BSL-F6-PCK',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-11-20',
    warrantyExpiry: '2026-11-20',
    notes: 'Factory 6 fleece hoodie export carton packing label printer.',
  },
  {
    subcode: 'AST-1043',
    modelCode: 'MOD-ZEBRA-ZT411',
    serialNumber: 'ZT411-F7-9907',
    status: 'IN_USE',
    locationKey: 'loc-bsl-f7-pack-st1',
    departmentCode: 'DEPT-BSL-F7-PCK',
    costCenterCode: 'IT-OPS',
    purchaseDate: '2023-12-05',
    warrantyExpiry: '2026-12-05',
    notes: 'Factory 7 rapid-turn packaging barcode station.',
  },
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
  costCenterMap?: Map<string, string>,
): Promise<Record<string, { id: string; assetTag: string }>> {
  return runDomainSeeder(
    'AssetsSeeder',
    '💻',
    'Hardware Assets Fleet (Device Models & Physical Units)',
    async (logger) => {
      const ctx: SeederContext | undefined =
        explicitCtx ||
        (taxonomyOrCtx && typeof taxonomyOrCtx === 'object' && 'departments' in taxonomyOrCtx
          ? (taxonomyOrCtx as SeederContext)
          : undefined);

      let getDept = (code: string) => code;
      let getUser = (_email: string): string | null => null;
      const effectiveVendors = vendorMap || ctx?.vendors;

      if (ctx) {
        getDept = (code: string) =>
          ctx.departments.get(code) || ctx.departments.get('DEPT-BSL-MGMT') || code;
        getUser = (email: string) => (email ? ctx.directoryUsers.get(email) || null : null);
      } else {
        const [departments, dirUsers] = await Promise.all([
          prisma.department.findMany({ take: 200 }),
          prisma.directoryUser.findMany({ take: 100 }),
        ]);
        const deptMap = new Map<string, string>(departments.map((d: { code: string; id: string }) => [d.code, d.id]));
        const userMap = new Map<string, string>(dirUsers.map((u: { email: string; id: string }) => [u.email, u.id]));
        getDept = (code: string) =>
          deptMap.get(code) || deptMap.get('DEPT-BSL-MGMT') || departments[0]?.id || code;
        getUser = (email: string) => (email ? userMap.get(email) || null : null);
      }

      const getCatId = (catKey: string): string => {
        if (ctx?.assetCategories.has(catKey)) return ctx.assetCategories.get(catKey)!;
        return catKey;
      };

      const getCcId = (ccCode: string): string | null => {
        if (!costCenterMap) return null;
        return (
          costCenterMap.get(ccCode) ||
          costCenterMap.get(ccCode.toLowerCase()) ||
          costCenterMap.get(`CC-${ccCode}`) ||
          null
        );
      };

      const createdAssets: Record<string, { id: string; assetTag: string }> = {};
      const modelMap = new Map<string, { id: string; row: DeviceModelSeedDef }>();

      // ------------------------------------------------------------------------
      // Phase 1: Seed Device Models (Parents, parentId = null)
      // ------------------------------------------------------------------------
      logger.log(`Seeding ${deviceModelRows.length} Device Models (catalog parents)...`);
      const modelRecords = await inTransactionChunks(
        prisma,
        deviceModelRows,
        50,
        async (tx, modelRow) => {
          const categoryId = getCatId(modelRow.categoryKey);
          const vendorId = resolveVendorId(modelRow.manufacturer, effectiveVendors);
          const costCenterId = getCcId(modelRow.costCenterCode);
          const departmentId =
            getDept('DEPT-BSL-IT') || (ctx ? Array.from(ctx.departments.values())[0] : null) || null;

          return tx.asset.upsert({
            where: { assetCode: modelRow.assetCode },
            update: {
              name: modelRow.name,
              manufacturer: modelRow.manufacturer,
              model: modelRow.model,
              specifications: modelRow.specifications,
              unitCost: modelRow.unitCost,
              categoryId,
              vendorId,
              costCenterId,
              departmentId,
              parentId: null,
              subcode: null,
              assetTag: modelRow.assetCode, // Mirrored tag for compatibility
              notes: modelRow.notes,
            },
            create: {
              assetCode: modelRow.assetCode,
              name: modelRow.name,
              manufacturer: modelRow.manufacturer,
              model: modelRow.model,
              specifications: modelRow.specifications,
              unitCost: modelRow.unitCost,
              categoryId,
              vendorId,
              costCenterId,
              departmentId,
              parentId: null,
              subcode: null,
              assetTag: modelRow.assetCode, // Mirrored tag for compatibility
              status: 'AVAILABLE',
              notes: modelRow.notes,
            },
          });
        },
      );

      for (let i = 0; i < deviceModelRows.length; i++) {
        const mRow = deviceModelRows[i];
        const record = modelRecords[i];
        modelMap.set(mRow.assetCode, { id: record.id, row: mRow });
        createdAssets[mRow.assetCode] = {
          id: record.id,
          assetTag: record.assetTag || mRow.assetCode,
        };
        if (ctx) {
          ctx.assets.set(mRow.assetCode, record.id);
          ctx.assets.set(record.id, record.id);
        }
      }

      // ------------------------------------------------------------------------
      // Phase 2: Seed Physical Units (Children, parentId linked to Device Models)
      // ------------------------------------------------------------------------
      logger.log(`Seeding ${physicalUnitRows.length} Physical Units (fleet children)...`);
      const unitRecords = await inTransactionChunks(
        prisma,
        physicalUnitRows,
        50,
        async (tx, unitRow) => {
          const parentModel = modelMap.get(unitRow.modelCode);
          if (!parentModel) {
            throw new Error(
              `Parent device model ${unitRow.modelCode} not found for unit ${unitRow.subcode}`,
            );
          }

          const vendorId = resolveVendorId(parentModel.row.manufacturer, effectiveVendors);
          const categoryId = getCatId(parentModel.row.categoryKey);
          const departmentId = getDept(unitRow.departmentCode);
          const assignedToId =
            unitRow.status === 'IN_USE' && unitRow.userEmail ? getUser(unitRow.userEmail) : null;
          const costCenterId =
            getCcId(unitRow.costCenterCode || parentModel.row.costCenterCode) ||
            getCcId(parentModel.row.costCenterCode);
          const purchaseDate = new Date(unitRow.purchaseDate);
          const warrantyExpiry = new Date(unitRow.warrantyExpiry);

          return tx.asset.upsert({
            where: { subcode: unitRow.subcode },
            update: {
              name: unitRow.name || parentModel.row.name,
              manufacturer: parentModel.row.manufacturer,
              model: parentModel.row.model,
              serialNumber: unitRow.serialNumber,
              status: unitRow.status,
              parentId: parentModel.id,
              assetCode: null, // Models only
              assetTag: unitRow.subcode, // Mirrored tag = subcode
              categoryId,
              vendorId,
              departmentId,
              assignedToId,
              costCenterId,
              purchaseDate,
              warrantyExpiry,
              notes: unitRow.notes,
            },
            create: {
              subcode: unitRow.subcode,
              name: unitRow.name || parentModel.row.name,
              manufacturer: parentModel.row.manufacturer,
              model: parentModel.row.model,
              serialNumber: unitRow.serialNumber,
              status: unitRow.status,
              parentId: parentModel.id,
              assetCode: null, // Models only
              assetTag: unitRow.subcode, // Mirrored tag = subcode
              categoryId,
              vendorId,
              departmentId,
              assignedToId,
              costCenterId,
              purchaseDate,
              warrantyExpiry,
              notes: unitRow.notes,
            },
          });
        },
      );

      for (let i = 0; i < physicalUnitRows.length; i++) {
        const uRow = physicalUnitRows[i];
        const record = unitRecords[i];
        createdAssets[uRow.subcode] = { id: record.id, assetTag: record.assetTag || uRow.subcode };
        if (ctx) {
          ctx.assets.set(uRow.subcode, record.id);
          ctx.assets.set(record.id, record.id);
        }
      }

      logger.log(
        `✅ Seeded ${deviceModelRows.length} Device Models and ${physicalUnitRows.length} Physical Units across BSL & BSH.`,
      );
      return createdAssets;
    },
  );
}
