import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

const logger = new Logger('TaxonomySeeder');

export async function seedTaxonomy(prisma: PrismaClient) {
  logger.log('🏷️ Seeding Standardized Pure IT Asset & Inventory Categories...');

  // 1. Resolve Locations from Database (seeded in organization.seeder.ts)
  const allLocations = await prisma.location.findMany();
  const locMapById = new Map(allLocations.map((l) => [l.id, l]));
  const locMapByCode = new Map(
    allLocations.filter((l) => l.code).map((l) => [l.code as string, l]),
  );

  const locBSLST = locMapById.get('loc-bsl-st') || locMapByCode.get('BSL-ST') || allLocations[0];
  const locBSH7 = locMapById.get('loc-bsh-d7') || locMapByCode.get('HCM-D7') || allLocations[0];
  const locBSH3 = locMapById.get('loc-bsh-d3') || locMapByCode.get('HCM-D3') || allLocations[0];

  // 2. Delete legacy textile and deprecated categories if existing
  await prisma.assetCategory.deleteMany({
    where: {
      id: {
        in: [
          'cat-sewing',
          'cat-cutting',
          'cat-printing',
          'cat-qa',
          'cat-networking',
          'cat-mobile',
          'cat-peripherals',
        ],
      },
    },
  });

  // 3. Authoritative Standardized IT Hardware Categories (11 Pure IT Categories)
  const assetCategoriesData = [
    {
      id: 'cat-laptop',
      name: 'Laptops / Notebooks',
      description: 'Enterprise mobile laptops, ultrabooks, and portable engineering notebooks',
    },
    {
      id: 'cat-desktop',
      name: 'Desktops & Workstations',
      description: 'Business desktop PCs, CAD/CAM workstations, and compact client terminals',
    },
    {
      id: 'cat-server',
      name: 'Servers (Rackmount / Host)',
      description:
        'Enterprise 1U/2U/4U rackmount servers, tower hosts, and virtualization compute nodes',
    },
    {
      id: 'cat-switch',
      name: 'Network Switches',
      description: 'Managed L2/L3 access, distribution, and core datacenter ethernet switches',
    },
    {
      id: 'cat-router',
      name: 'Routers & Firewalls',
      description: 'Edge routers, next-generation firewalls (NGFW), and SD-WAN gateway appliances',
    },
    {
      id: 'cat-ap',
      name: 'Wireless Access Points (AP)',
      description:
        'Enterprise indoor/outdoor wireless access points, Wi-Fi 6/6E/7 APs and controllers',
    },
    {
      id: 'cat-monitor',
      name: 'Monitors & Displays',
      description:
        'Professional FHD, 2K, 4K desktop monitors, ultrawide displays, and conference panels',
    },
    {
      id: 'cat-printer',
      name: 'Printers & Scanners',
      description:
        'Network laser printers, multi-function copiers, document scanners, and industrial barcode printers',
    },
    {
      id: 'cat-storage',
      name: 'Storage (NAS / SAN)',
      description:
        'Network attached storage (NAS), SAN storage arrays, and backup deduplication appliances',
    },
    {
      id: 'cat-ups',
      name: 'Power & UPS',
      description:
        'Online double-conversion rackmount UPS units, battery packs, and intelligent PDUs',
    },
    {
      id: 'cat-peripheral',
      name: 'Peripherals & Accessories',
      description:
        'Thunderbolt/USB-C docking stations, conference webcams, speakerphones, and barcode scanners',
    },
  ];

  const seededCategories: Record<string, import('@prisma/client').AssetCategory> = {};
  for (const cat of assetCategoriesData) {
    const record = await prisma.assetCategory.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        description: cat.description,
      },
      create: cat,
    });
    seededCategories[cat.id] = record;
  }

  // 3. Inventory Categories (Garment Manufacturing Domain Standardized)
  const inventoryCategoriesData = [
    {
      id: 'inv-cat-fabrics',
      name: 'Raw Fabrics',
      description:
        'Cotton twill, polyester fleece, nylon taffeta rolls, knitted and woven fabric lots',
    },
    {
      id: 'inv-cat-accessories',
      name: 'Garment Accessories',
      description:
        'YKK zippers, melamine buttons, coats sewing threads, elastic bands, rivets & drawstrings',
    },
    {
      id: 'inv-cat-spares',
      name: 'Spare Motors & Needles',
      description:
        'Servo drive motors, sewing machine needles (DBx1/DPx5), rotary hooks, bobbins, cutter blades & presser feet',
    },
    {
      id: 'inv-cat-it-consumables',
      name: 'General IT & Consumables',
      description:
        'Zebra thermal transfer labels, resin ribbons, Cat6 patch cables, transceivers & PDA batteries',
    },
    // Backwards-compatible categories
    {
      id: 'inv-cat-cables',
      name: 'Cables & Optical',
      description: 'Cat6 network patch cables, optical patch cords, transceivers & interconnects',
    },
    {
      id: 'inv-cat-peripherals',
      name: 'Peripherals & Accessories',
      description: 'Mice, keyboards, USB-C docks, barcode scanners & accessories',
    },
    {
      id: 'inv-cat-components',
      name: 'Storage & Memory',
      description: 'Workstation DDR4/DDR5 memory modules & PCIe NVMe SSD drives',
    },
    {
      id: 'inv-cat-consumables',
      name: 'Thermal Ribbons & Labels',
      description: 'Industrial Zebra thermal transfer ribbons, garment barcode labels & tags',
    },
    {
      id: 'inv-cat-power',
      name: 'Power & Batteries',
      description: 'Laptop chargers, Honeywell handheld PDA batteries & power supplies',
    },
  ];

  const seededInvCategories: Record<string, import('@prisma/client').InventoryCategory> = {};
  for (const icat of inventoryCategoriesData) {
    const record = await prisma.inventoryCategory.upsert({
      where: { id: icat.id },
      update: {
        name: icat.name,
        description: icat.description,
      },
      create: icat,
    });
    seededInvCategories[icat.id] = record;
  }

  logger.log(
    `✅ Seeded ${Object.keys(seededCategories).length} Asset Categories and ${Object.keys(seededInvCategories).length} Inventory Categories.`,
  );

  return {
    locations: {
      locBSLST: locBSLST || { id: 'loc-bsl-st' },
      locBSH7: locBSH7 || { id: 'loc-bsh-d7' },
      locBSH3: locBSH3 || { id: 'loc-bsh-d3' },
      // Compatibility aliases
      locNYF4: locBSLST || { id: 'loc-bsl-st' },
      locNYF5: locBSH7 || { id: 'loc-bsh-d7' },
      locSF: locBSLST || { id: 'loc-bsl-st' },
      locLondon: locBSH7 || { id: 'loc-bsh-d7' },
      locSingapore: locBSH3 || { id: 'loc-bsh-d3' },
      locDCNY4: locBSLST || { id: 'loc-bsl-st' },
      locDCSV5: locBSH7 || { id: 'loc-bsh-d7' },
    },
    categories: {
      catLaptop: seededCategories['cat-laptop'],
      catDesktop: seededCategories['cat-desktop'],
      catServer: seededCategories['cat-server'],
      catSwitch: seededCategories['cat-switch'],
      catRouter: seededCategories['cat-router'],
      catAP: seededCategories['cat-ap'],
      catMonitor: seededCategories['cat-monitor'],
      catPrinter: seededCategories['cat-printer'],
      catStorage: seededCategories['cat-storage'],
      catUPS: seededCategories['cat-ups'],
      catPeripheral: seededCategories['cat-peripheral'],
      // Compatibility aliases
      catWorkstation: seededCategories['cat-desktop'],
      catITHardware: seededCategories['cat-server'],
      catNetworking: seededCategories['cat-switch'],
      catPeripherals: seededCategories['cat-peripheral'],
      catMobile: seededCategories['cat-peripheral'],
    },
    inventoryCategories: seededInvCategories,
  };
}
