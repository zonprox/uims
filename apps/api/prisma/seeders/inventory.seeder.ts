import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

const logger = new Logger('InventorySeeder');

export async function seedInventory(prisma: PrismaClient) {
  logger.log('📦 Seeding Inventory Categories & Garment Manufacturing Stockroom Items...');

  // 1. Ensure Master Inventory Categories
  const inventoryCategories = [
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
      id: 'inv-cat-finished-goods',
      name: 'Finished Apparel Goods',
      description:
        'Export-ready outerwear jackets, cargo trousers, activewear hoodies & shirts staged for export shipment',
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

  for (const cat of inventoryCategories) {
    await prisma.inventoryCategory.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        description: cat.description,
      },
      create: cat,
    });
  }

  // 2. Resolve target leaf Location IDs from database
  const allLocations = await prisma.location.findMany();
  const locMap = new Map<string, string>();
  for (const l of allLocations) {
    locMap.set(l.id, l.id);
    if (l.code) {
      locMap.set(l.code, l.id);
      locMap.set(l.code.toUpperCase(), l.id);
    }
  }

  const getLoc = (id: string, fallbackCode?: string): string => {
    if (locMap.has(id)) return locMap.get(id)!;
    if (fallbackCode && locMap.has(fallbackCode)) return locMap.get(fallbackCode)!;
    const match = allLocations.find(
      (l) => l.id === id || (fallbackCode && l.code === fallbackCode),
    );
    return match?.id || locMap.get('loc-bsl-wh') || allLocations[0]?.id || id;
  };

  // 3. Relational Stockroom Items
  const inventoryItems = [
    // ── Central Warehouse: Raw Materials Fabric Rolls ───────────────────────
    {
      sku: 'FAB-COT-TWILL-40S',
      name: '100% Combed Cotton Twill 40s Fabric Roll (1000m/roll, Navy Blue)',
      categoryId: 'inv-cat-fabrics',
      locationId: getLoc('loc-bsl-wh-bin1', 'WH-BIN-01'), // Central Warehouse > Raw Materials > Rack R-01 > Shelf 1 > Bin B-01
      binNumber: 'Bin B-01',
      quantity: 85,
      minThreshold: 20,
      unitCost: 4.85,
      supplier: 'Thanh Cong Textile Garment JSC',
      notes: 'Premium combed cotton twill rolls for outerwear and cargo pants.',
    },
    {
      sku: 'FAB-POLY-FLEECE-280',
      name: 'Recycled Polyester Microfleece 280gsm (500m/roll, Heather Grey)',
      categoryId: 'inv-cat-fabrics',
      locationId: getLoc('loc-bsl-wh-bin2', 'WH-BIN-02'), // Central Warehouse > Raw Materials > Rack R-01 > Shelf 1 > Bin B-02
      binNumber: 'Bin B-02',
      quantity: 60,
      minThreshold: 15,
      unitCost: 6.2,
      supplier: 'Formosa Taffeta Vietnam',
      notes: 'Anti-pilling recycled polyester fleece for sportswear hoodies.',
    },
    {
      sku: 'FAB-NYL-TAFFETA-210',
      name: 'Water-Repellent Nylon Taffeta 210T (1200m/roll, Black)',
      categoryId: 'inv-cat-fabrics',
      locationId: getLoc('loc-bsl-wh-bin3', 'WH-BIN-03'), // Central Warehouse > Raw Materials > Rack R-02 > Shelf 2 > Bin B-03
      binNumber: 'Bin B-03',
      quantity: 45,
      minThreshold: 10,
      unitCost: 3.9,
      supplier: 'Formosa Taffeta Vietnam',
      notes: 'DWR-coated nylon taffeta for windbreaker jackets.',
    },
    {
      sku: 'FAB-SPX-INTERLOCK-220',
      name: 'Poly-Spandex 4-Way Stretch Interlock (800m/roll, Olive Green)',
      categoryId: 'inv-cat-fabrics',
      locationId: getLoc('loc-bsl-wh-bin4', 'WH-BIN-04'), // Central Warehouse > Raw Materials > Rack R-03 > Shelf 3 > Bin B-04
      binNumber: 'Bin B-04',
      quantity: 40,
      minThreshold: 12,
      unitCost: 7.5,
      supplier: 'Toray International Vietnam',
      notes: 'Performance compression stretch fabric for activewear legging lines.',
    },

    // ── Central Warehouse: Finished Goods Export Bays ───────────────────────
    {
      sku: 'FG-OUT-JKT-01',
      name: 'Weatherproof Technical Mountain Shell Jacket (Pack of 50, Navy/Black, Export Batch)',
      categoryId: 'inv-cat-finished-goods',
      locationId: getLoc('loc-bsl-wh-fg-bay1', 'WH-FG-BAY01'), // Central Warehouse > Finished Goods > Export Bay 01 (North America)
      binNumber: 'Bay 01',
      quantity: 120,
      minThreshold: 30,
      unitCost: 45.0,
      supplier: 'Broadpeak Soc Trang (Factory 1 & 4)',
      notes: 'Inspection passed, boxed & staged for North America export container loading.',
    },
    {
      sku: 'FG-CRG-PNT-02',
      name: 'Tactical Outdoor Utility Cargo Trousers (Pack of 100, Khaki, Export Batch)',
      categoryId: 'inv-cat-finished-goods',
      locationId: getLoc('loc-bsl-wh-fg-bay1', 'WH-FG-BAY01'), // Central Warehouse > Finished Goods > Export Bay 01 (North America)
      binNumber: 'Bay 01',
      quantity: 90,
      minThreshold: 25,
      unitCost: 28.5,
      supplier: 'Broadpeak Soc Trang (Factory 5)',
      notes: 'Customs inspected, palletized for North America vessel departure.',
    },
    {
      sku: 'FG-ACT-HDY-03',
      name: 'Recycled Microfleece Performance Hoodie (Pack of 75, Heather Grey, EU Export)',
      categoryId: 'inv-cat-finished-goods',
      locationId: getLoc('loc-bsl-wh-fg-bay2', 'WH-FG-BAY02'), // Central Warehouse > Finished Goods > Export Bay 02 (Europe & Asia)
      binNumber: 'Bay 02',
      quantity: 110,
      minThreshold: 20,
      unitCost: 32.0,
      supplier: 'Broadpeak Soc Trang (Factory 3 & 6)',
      notes: 'Polybagged with EU compliance barcode tags, staged at Bay 02.',
    },
    {
      sku: 'FG-DRS-SHT-04',
      name: 'Classic Combed Cotton Long Sleeve Dress Shirt (Pack of 120, White/Blue, Asia Export)',
      categoryId: 'inv-cat-finished-goods',
      locationId: getLoc('loc-bsl-wh-fg-bay2', 'WH-FG-BAY02'), // Central Warehouse > Finished Goods > Export Bay 02 (Europe & Asia)
      binNumber: 'Bay 02',
      quantity: 80,
      minThreshold: 15,
      unitCost: 22.0,
      supplier: 'Broadpeak Soc Trang (Factory 2 & 7)',
      notes: 'Export quality assured, packed for regional APAC retail stores.',
    },

    // ── Factory MDC Sub-Warehouses Across All 7 Factories ───────────────────
    {
      sku: 'ZIP-YKK-5VIS-NAVY',
      name: 'YKK #5 Vislon Open-End Zippers 65cm (Pack of 100, Navy)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f1-mdc-bin1', 'F1-MDC-B01'), // Factory 1 > MDC > Shelf 01 > Bin MDC-01 (Zippers)
      binNumber: 'Bin MDC-01',
      quantity: 350,
      minThreshold: 100,
      unitCost: 1.25,
      supplier: 'YKK Vietnam Co., Ltd.',
      notes: 'Front opening zippers for Factory 1 production jackets.',
    },
    {
      sku: 'BTN-MLM-4H-PEARL',
      name: 'Melamine 4-Hole Shirt Buttons 18L (Gross of 144, Pearl White)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f1-mdc-bin2', 'F1-MDC-B02'), // Factory 1 > MDC > Shelf 01 > Bin MDC-02 (Buttons)
      binNumber: 'Bin MDC-02',
      quantity: 500,
      minThreshold: 150,
      unitCost: 3.4,
      supplier: 'Universal Fasteners Vietnam',
      notes: 'Cross-stitched shirt buttons for dress shirt production lines.',
    },
    {
      sku: 'THD-COATS-EPIC-BLK',
      name: 'Coats Epic Poly-Wrapped Core Sewing Thread Tex 27 5000m (Black)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f1-mdc-bin3', 'F1-MDC-B03'), // Factory 1 > MDC > Shelf 01 > Bin MDC-03 (Threads)
      binNumber: 'Bin MDC-03',
      quantity: 240,
      minThreshold: 50,
      unitCost: 4.15,
      supplier: 'Coats Phong Phu Vietnam',
      notes: 'High-tenacity corespun polyester thread for Factory 1 lockstitch lines.',
    },
    {
      sku: 'ZIP-YKK-3COIL-BLK',
      name: 'YKK #3 Nylon Coil Closed-End Zippers 20cm (Pack of 100, Black)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f2-mdc-bin1', 'F2-MDC-B01'), // Factory 2 > MDC > Shelf 01 > Bin MDC-01
      binNumber: 'Bin MDC-01',
      quantity: 280,
      minThreshold: 80,
      unitCost: 0.85,
      supplier: 'YKK Vietnam Co., Ltd.',
      notes: 'Pocket and sleeve zippers for Factory 2 sportswear lines.',
    },
    {
      sku: 'THD-COATS-EPIC-WHT',
      name: 'Coats Epic Poly-Wrapped Core Sewing Thread Tex 27 5000m (White)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f2-mdc-bin3', 'F2-MDC-B03'), // Factory 2 > MDC > Shelf 01 > Bin MDC-03
      binNumber: 'Bin MDC-03',
      quantity: 200,
      minThreshold: 40,
      unitCost: 4.15,
      supplier: 'Coats Phong Phu Vietnam',
      notes: 'Factory 2 production thread spools for white sports jerseys.',
    },
    {
      sku: 'CRD-ELAS-4MM-BLK',
      name: 'High-Elasticity Drawstring Cord & Toggle Locks 4mm (1000m Reel, Black)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f3-mdc-bin1', 'F3-MDC-B01'), // Factory 3 > MDC > Shelf 01 > Bin MDC-01
      binNumber: 'Bin MDC-01',
      quantity: 180,
      minThreshold: 40,
      unitCost: 0.45,
      supplier: 'Formosa Taffeta Trims',
      notes: 'Activewear waist cord and toggle stoppers for Factory 3 activewear lines.',
    },
    {
      sku: 'TPE-SEAM-SEAL-20MM',
      name: 'Waterproof 3-Ply Hot Melt Seam Sealing Tape (20mm x 100m Roll, Charcoal)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f4-mdc-bin1', 'F4-MDC-B01'), // Factory 4 > MDC > Shelf 01 > Bin MDC-01
      binNumber: 'Bin MDC-01',
      quantity: 220,
      minThreshold: 50,
      unitCost: 8.9,
      supplier: 'Bemis Associates Vietnam',
      notes: 'Technical rainwear and outerwear seam tape for Factory 4 sealing machines.',
    },
    {
      sku: 'RVT-BRS-JEAN-10MM',
      name: 'Heavy-Duty Antique Brass Pocket Rivets & Tack Buttons (Box of 500)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f5-mdc-bin1', 'F5-MDC-B01'), // Factory 5 > MDC > Shelf 01 > Bin MDC-01
      binNumber: 'Bin MDC-01',
      quantity: 160,
      minThreshold: 35,
      unitCost: 12.5,
      supplier: 'YKK Fastening Products',
      notes: 'Pocket reinforcement rivets for Factory 5 cargo pants & utility apparel.',
    },
    {
      sku: 'KNT-RIB-CUFF-GRY',
      name: 'Cotton-Spandex 1x1 Heavy Ribbed Cuffs & Collars (Pack of 200, Heather Grey)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f6-mdc-bin1', 'F6-MDC-B01'), // Factory 6 > MDC > Shelf 01 > Bin MDC-01
      binNumber: 'Bin MDC-01',
      quantity: 190,
      minThreshold: 40,
      unitCost: 5.6,
      supplier: 'Thanh Cong Textile',
      notes: 'Tubular rib trims for Factory 6 fleece hoodies and sweatshirts.',
    },
    {
      sku: 'TAG-HNG-BAR-POLY',
      name: 'Quick-Turn RFID Brand Hangtags & Micro-Polybag Kits (Pack of 1000)',
      categoryId: 'inv-cat-accessories',
      locationId: getLoc('loc-bsl-f7-mdc-bin1', 'F7-MDC-B01'), // Factory 7 > MDC > Shelf 01 > Bin MDC-01
      binNumber: 'Bin MDC-01',
      quantity: 300,
      minThreshold: 75,
      unitCost: 14.0,
      supplier: 'Avery Dennison Vietnam',
      notes: 'Factory 7 rapid turnaround production tagging kits.',
    },

    // ── Spare Parts Bins: Needles, Motors & Mechanical Spares ───────────────
    {
      sku: 'NDL-GB-DBX1-9014',
      name: 'Groz-Beckert DBx1 Size 90/14 Sewing Needles (Box of 100)',
      categoryId: 'inv-cat-spares',
      locationId: getLoc('loc-bsl-wh-sp-bin01', 'WH-SP-01'), // Central Warehouse > Spare Parts > Bin SP-01
      binNumber: 'Bin SP-01',
      quantity: 150,
      minThreshold: 40,
      unitCost: 18.5,
      supplier: 'Groz-Beckert Vietnam',
      notes: 'Precision industrial lockstitch needles with GEBEDUR titanium coating.',
    },
    {
      sku: 'NDL-ORG-DPX5-11018',
      name: 'Organ DPx5 Size 110/18 Overlock Needles (Box of 100)',
      categoryId: 'inv-cat-spares',
      locationId: getLoc('loc-bsl-wh-sp-bin01', 'WH-SP-01'), // Central Warehouse > Spare Parts > Bin SP-01
      binNumber: 'Bin SP-01',
      quantity: 120,
      minThreshold: 30,
      unitCost: 16.8,
      supplier: 'Organ Needle Vietnam',
      notes: 'Heavy-duty industrial needles for denim and multi-layer seam serging.',
    },
    {
      sku: 'MTR-HOH-550W-SERVO',
      name: 'Ho Hsing 550W AC Direct Drive Servomotor Assembly',
      categoryId: 'inv-cat-spares',
      locationId: getLoc('loc-bsl-wh-sp-bin02', 'WH-SP-02'), // Central Warehouse > Spare Parts > Bin SP-02
      binNumber: 'Bin SP-02',
      quantity: 18,
      minThreshold: 5,
      unitCost: 220.0,
      supplier: 'Ho Hsing Machinery Co.',
      notes: 'Energy-saving direct drive replacement motor with synchronized needle positioner.',
    },
    {
      sku: 'HK-JK-DDL9000-ROTARY',
      name: 'Juki Hirose Full Rotary Hook for DDL-9000C',
      categoryId: 'inv-cat-spares',
      locationId: getLoc('loc-bsl-wh-sp-bin03', 'WH-SP-03'), // Central Warehouse > Spare Parts > Bin SP-03
      binNumber: 'Bin SP-03',
      quantity: 35,
      minThreshold: 10,
      unitCost: 42.0,
      supplier: 'Juki Vietnam',
      notes: 'Original Japanese rotary hook replacement for Juki lockstitch machines.',
    },
    {
      sku: 'BLD-GB-CUT-8IN',
      name: 'Gerber 8-Inch High-Speed Steel Auto-Cutter Blades (Pack of 12)',
      categoryId: 'inv-cat-spares',
      locationId: getLoc('loc-bsl-wh-sp-bin05', 'WH-SP-05'), // Central Warehouse > Spare Parts > Bin SP-05
      binNumber: 'Bin SP-05',
      quantity: 25,
      minThreshold: 6,
      unitCost: 85.0,
      supplier: 'Gerber Technology Vietnam',
      notes: 'Replacement straight knives for Gerber Paragon automated cutting tables.',
    },

    // ── General IT & Shopfloor Consumables ──────────────────────────────────
    {
      sku: 'LBL-ZBR-100X150',
      name: 'Zebra Thermal Transfer Barcode Labels (100mm x 150mm, 1000/roll)',
      categoryId: 'inv-cat-it-consumables',
      locationId: getLoc('loc-bsl-wh-sp-bin08', 'WH-SP-08'), // Central Warehouse > Spare Parts > Bin SP-08 (Zebra Consumables)
      binNumber: 'Bin SP-08',
      quantity: 120,
      minThreshold: 30,
      unitCost: 14.5,
      supplier: 'Zebra Technologies Vietnam',
      notes: 'Standard carton shipping and tracking labels for export garments.',
    },
    {
      sku: 'RBN-ZBR-110X300',
      name: 'Zebra 5095 Resin Thermal Ribbon (110mm x 300m, Black)',
      categoryId: 'inv-cat-it-consumables',
      locationId: getLoc('loc-bsl-wh-sp-bin08', 'WH-SP-08'), // Central Warehouse > Spare Parts > Bin SP-08
      binNumber: 'Bin SP-08',
      quantity: 45,
      minThreshold: 15,
      unitCost: 18.0,
      supplier: 'Zebra Technologies Vietnam',
      notes: 'High durability resin ribbons for garment wash-care barcode labels.',
    },
    {
      sku: 'CBL-CAT6-UTP-3M',
      name: 'Cat6 UTP RJ45 Factory Patch Cable (3m, Blue, Molded Boot)',
      categoryId: 'inv-cat-it-consumables',
      locationId: getLoc('loc-bsl-wh-sp-bin09', 'WH-SP-09'), // Central Warehouse > Spare Parts > Bin SP-09
      binNumber: 'Bin SP-09',
      quantity: 150,
      minThreshold: 40,
      unitCost: 3.2,
      supplier: 'CommScope Vietnam',
      notes: 'Cat6 patch cords for shopfloor network switches and inspection terminals.',
    },
    {
      sku: 'BAT-HW-EDA51-LI',
      name: 'Honeywell ScanPal EDA51 Li-Ion Battery Pack (4000mAh)',
      categoryId: 'inv-cat-it-consumables',
      locationId: getLoc('loc-bsl-wh-sp-bin10', 'WH-SP-10'), // Central Warehouse > Spare Parts > Bin SP-10
      binNumber: 'Bin SP-10',
      quantity: 12,
      minThreshold: 4,
      unitCost: 65.0,
      supplier: 'Honeywell Scanning & Mobility',
      notes: 'Replacement Li-Ion battery pack for shopfloor stocktaking PDAs.',
    },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        categoryId: item.categoryId,
        locationId: item.locationId,
        binNumber: item.binNumber,
        quantity: item.quantity,
        minThreshold: item.minThreshold,
        unitCost: item.unitCost,
        supplier: item.supplier,
        notes: item.notes,
      },
      create: item,
    });
  }

  logger.log(
    `✅ Seeded ${inventoryItems.length} Inventory Items allocated to spatial warehouse racks & MDC bins across BSL.`,
  );
}
