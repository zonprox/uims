import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

const logger = new Logger('TaxonomySeeder');

export async function seedTaxonomy(prisma: PrismaClient) {
  logger.log('🏷️ Seeding Asset & Inventory Categories for Apparel Manufacturing...');

  // 1. Resolve Locations from Database (seeded in organization.seeder.ts)
  const allLocations = await prisma.location.findMany();
  const locMapById = new Map(allLocations.map((l) => [l.id, l]));
  const locMapByCode = new Map(
    allLocations.filter((l) => l.code).map((l) => [l.code as string, l]),
  );

  const locBSLST = locMapById.get('loc-bsl-st') || locMapByCode.get('BSL-ST') || allLocations[0];
  const locBSH7 = locMapById.get('loc-bsh-d7') || locMapByCode.get('HCM-D7') || allLocations[0];
  const locBSH3 = locMapById.get('loc-bsh-d3') || locMapByCode.get('HCM-D3') || allLocations[0];

  // 2. Asset Categories (Garment Manufacturing Domain Standardized)
  const assetCategoriesData = [
    {
      id: 'cat-sewing',
      name: 'Sewing Machinery',
      description:
        'Industrial lockstitch, overlock, flatlock, bar-tacking and programmable sewing machines',
    },
    {
      id: 'cat-cutting',
      name: 'Cutting & Plotting',
      description:
        'Automated conveyor fabric cutting tables, laser cutters, fabric spreading machines & pattern plotters',
    },
    {
      id: 'cat-printing',
      name: 'Printing & Heat Press',
      description:
        'Automatic rotary screen printing, digital textile sublimation printers & pneumatic heat presses',
    },
    {
      id: 'cat-qa',
      name: 'QA Inspection',
      description:
        'Fabric roll inspection machines, spectrophotometers, color assessment light cabinets & tensile testers',
    },
    {
      id: 'cat-server',
      name: 'IT Hardware & Server',
      description:
        'Rackmount virtualization servers, ERP database hosts, core switches & datacenter appliances',
    },
    {
      id: 'cat-desktop',
      name: 'Office Workstation',
      description:
        'Pattern design CAD/CAM workstations, production line terminals & desktop business PCs',
    },
    {
      id: 'cat-laptop',
      name: 'Laptop',
      description:
        'Enterprise laptops & mobile workstations for leadership, merchandisers & engineers',
    },
    {
      id: 'cat-networking',
      name: 'Networking',
      description:
        'Managed industrial switches, edge routers, SD-WAN gateways & wireless access points',
    },
    {
      id: 'cat-printer',
      name: 'Industrial Printer',
      description:
        'Industrial Zebra thermal barcode label printers, wash care tag printers & office multi-function copiers',
    },
    {
      id: 'cat-monitor',
      name: 'Monitor',
      description:
        'High-resolution FHD, 2K & 4K production display panels & office dual-monitor setups',
    },
    {
      id: 'cat-storage',
      name: 'Storage',
      description: 'Enterprise SAN/NAS arrays, backup deduplication appliances & storage arrays',
    },
    {
      id: 'cat-mobile',
      name: 'Mobile & Handheld',
      description:
        'Honeywell handheld mobile PDAs, wireless barcode scanners & Android shopfloor tablets',
    },
    {
      id: 'cat-peripherals',
      name: 'Peripherals',
      description: 'Docking stations, barcode scanners, input devices & meeting room A/V units',
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
      catSewing: seededCategories['cat-sewing'],
      catCutting: seededCategories['cat-cutting'],
      catPrinting: seededCategories['cat-printing'],
      catQA: seededCategories['cat-qa'],
      catITHardware: seededCategories['cat-server'],
      catWorkstation: seededCategories['cat-desktop'],
      catLaptop: seededCategories['cat-laptop'],
      catDesktop: seededCategories['cat-desktop'],
      catServer: seededCategories['cat-server'],
      catNetworking: seededCategories['cat-networking'],
      catPrinter: seededCategories['cat-printer'],
      catMonitor: seededCategories['cat-monitor'],
      catStorage: seededCategories['cat-storage'],
      catMobile: seededCategories['cat-mobile'],
      catPeripherals: seededCategories['cat-peripherals'],
    },
    inventoryCategories: seededInvCategories,
  };
}
