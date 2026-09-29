import type { InventoryItem, PrismaClient } from '@prisma/client';
import { inTransactionChunks, runDomainSeeder, type SeederContext } from './seeder.utils';

export const itemRows: string[] = [
  // Central Warehouse: Raw Materials Fabric Rolls
  'FAB-COT-TWILL-40S|100% Combed Cotton Twill 40s Fabric Roll (1000m/roll, Navy Blue)|inv-cat-fabrics|loc-bsl-wh-bin1|Bin B-01|85|20|4.85|Thanh Cong Textile Garment JSC|Premium combed cotton twill rolls for outerwear and cargo pants.',
  'FAB-POLY-FLEECE-280|Recycled Polyester Microfleece 280gsm (500m/roll, Heather Grey)|inv-cat-fabrics|loc-bsl-wh-bin2|Bin B-02|60|15|6.2|Formosa Taffeta Vietnam|Anti-pilling recycled polyester fleece for sportswear hoodies.',
  'FAB-NYL-TAFFETA-210|Water-Repellent Nylon Taffeta 210T (1200m/roll, Black)|inv-cat-fabrics|loc-bsl-wh-bin3|Bin B-03|45|10|3.9|Formosa Taffeta Vietnam|DWR-coated nylon taffeta for windbreaker jackets.',
  'FAB-SPX-INTERLOCK-220|Poly-Spandex 4-Way Stretch Interlock (800m/roll, Olive Green)|inv-cat-fabrics|loc-bsl-wh-bin4|Bin B-04|40|12|7.5|Toray International Vietnam|Performance compression stretch fabric for activewear legging lines.',
  // Central Warehouse: Finished Goods Export Bays
  'FG-OUT-JKT-01|Weatherproof Technical Mountain Shell Jacket (Pack of 50, Navy/Black, Export Batch)|inv-cat-finished-goods|loc-bsl-wh-fg-bay1|Bay 01|120|30|45.0|Broadpeak Soc Trang (Factory 1 & 4)|Inspection passed, boxed & staged for North America export container loading.',
  'FG-CRG-PNT-02|Tactical Outdoor Utility Cargo Trousers (Pack of 100, Khaki, Export Batch)|inv-cat-finished-goods|loc-bsl-wh-fg-bay1|Bay 01|90|25|28.5|Broadpeak Soc Trang (Factory 5)|Customs inspected, palletized for North America vessel departure.',
  'FG-ACT-HDY-03|Recycled Microfleece Performance Hoodie (Pack of 75, Heather Grey, EU Export)|inv-cat-finished-goods|loc-bsl-wh-fg-bay2|Bay 02|110|20|32.0|Broadpeak Soc Trang (Factory 3 & 6)|Polybagged with EU compliance barcode tags, staged at Bay 02.',
  'FG-DRS-SHT-04|Classic Combed Cotton Long Sleeve Dress Shirt (Pack of 120, White/Blue, Asia Export)|inv-cat-finished-goods|loc-bsl-wh-fg-bay2|Bay 02|80|15|22.0|Broadpeak Soc Trang (Factory 2 & 7)|Export quality assured, packed for regional APAC retail stores.',
  // Factory MDC Sub-Warehouses Across All 7 Factories
  'ZIP-YKK-5VIS-NAVY|YKK #5 Vislon Open-End Zippers 65cm (Pack of 100, Navy)|inv-cat-accessories|loc-bsl-f1-mdc-bin1|Bin MDC-01|350|100|1.25|YKK Vietnam Co., Ltd.|Front opening zippers for Factory 1 production jackets.',
  'BTN-MLM-4H-PEARL|Melamine 4-Hole Shirt Buttons 18L (Gross of 144, Pearl White)|inv-cat-accessories|loc-bsl-f1-mdc-bin2|Bin MDC-02|500|150|3.4|Universal Fasteners Vietnam|Cross-stitched shirt buttons for dress shirt production lines.',
  'THD-COATS-EPIC-BLK|Coats Epic Poly-Wrapped Core Sewing Thread Tex 27 5000m (Black)|inv-cat-accessories|loc-bsl-f1-mdc-bin3|Bin MDC-03|240|50|4.15|Coats Phong Phu Vietnam|High-tenacity corespun polyester thread for Factory 1 lockstitch lines.',
  'ZIP-YKK-3COIL-BLK|YKK #3 Nylon Coil Closed-End Zippers 20cm (Pack of 100, Black)|inv-cat-accessories|loc-bsl-f2-mdc-bin1|Bin MDC-01|280|80|0.85|YKK Vietnam Co., Ltd.|Pocket and sleeve zippers for Factory 2 sportswear lines.',
  'THD-COATS-EPIC-WHT|Coats Epic Poly-Wrapped Core Sewing Thread Tex 27 5000m (White)|inv-cat-accessories|loc-bsl-f2-mdc-bin3|Bin MDC-03|200|40|4.15|Coats Phong Phu Vietnam|Factory 2 production thread spools for white sports jerseys.',
  'CRD-ELAS-4MM-BLK|High-Elasticity Drawstring Cord & Toggle Locks 4mm (1000m Reel, Black)|inv-cat-accessories|loc-bsl-f3-mdc-bin1|Bin MDC-01|180|40|0.45|Formosa Taffeta Trims|Activewear waist cord and toggle stoppers for Factory 3 activewear lines.',
  'TPE-SEAM-SEAL-20MM|Waterproof 3-Ply Hot Melt Seam Sealing Tape (20mm x 100m Roll, Charcoal)|inv-cat-accessories|loc-bsl-f4-mdc-bin1|Bin MDC-01|220|50|8.9|Bemis Associates Vietnam|Technical rainwear and outerwear seam tape for Factory 4 sealing machines.',
  'RVT-BRS-JEAN-10MM|Heavy-Duty Antique Brass Pocket Rivets & Tack Buttons (Box of 500)|inv-cat-accessories|loc-bsl-f5-mdc-bin1|Bin MDC-01|160|35|12.5|YKK Fastening Products|Pocket reinforcement rivets for Factory 5 cargo pants & utility apparel.',
  'KNT-RIB-CUFF-GRY|Cotton-Spandex 1x1 Heavy Ribbed Cuffs & Collars (Pack of 200, Heather Grey)|inv-cat-accessories|loc-bsl-f6-mdc-bin1|Bin MDC-01|190|40|5.6|Thanh Cong Textile|Tubular rib trims for Factory 6 fleece hoodies and sweatshirts.',
  'TAG-HNG-BAR-POLY|Quick-Turn RFID Brand Hangtags & Micro-Polybag Kits (Pack of 1000)|inv-cat-accessories|loc-bsl-f7-mdc-bin1|Bin MDC-01|300|75|14.0|Avery Dennison Vietnam|Factory 7 rapid turnaround production tagging kits.',
  // Spare Parts Bins: Needles, Motors & Mechanical Spares
  'NDL-GB-DBX1-9014|Groz-Beckert DBx1 Size 90/14 Sewing Needles (Box of 100)|inv-cat-spares|loc-bsl-wh-sp-bin01|Bin SP-01|150|40|18.5|Groz-Beckert Vietnam|Precision industrial lockstitch needles with GEBEDUR titanium coating.',
  'NDL-ORG-DPX5-11018|Organ DPx5 Size 110/18 Overlock Needles (Box of 100)|inv-cat-spares|loc-bsl-wh-sp-bin01|Bin SP-01|120|30|16.8|Organ Needle Vietnam|Heavy-duty industrial needles for denim and multi-layer seam serging.',
  'MTR-HOH-550W-SERVO|Ho Hsing 550W AC Direct Drive Servomotor Assembly|inv-cat-spares|loc-bsl-wh-sp-bin02|Bin SP-02|18|5|220.0|Ho Hsing Machinery Co.|Energy-saving direct drive replacement motor with synchronized needle positioner.',
  'HK-JK-DDL9000-ROTARY|Juki Hirose Full Rotary Hook for DDL-9000C|inv-cat-spares|loc-bsl-wh-sp-bin03|Bin SP-03|35|10|42.0|Juki Vietnam|Original Japanese rotary hook replacement for Juki lockstitch machines.',
  'BLD-GB-CUT-8IN|Gerber 8-Inch High-Speed Steel Auto-Cutter Blades (Pack of 12)|inv-cat-spares|loc-bsl-wh-sp-bin05|Bin SP-05|25|6|85.0|Gerber Technology Vietnam|Replacement straight knives for Gerber Paragon automated cutting tables.',
  // General IT & Shopfloor Consumables
  'LBL-ZBR-100X150|Zebra Thermal Transfer Barcode Labels (100mm x 150mm, 1000/roll)|inv-cat-it-consumables|loc-bsl-wh-sp-bin08|Bin SP-08|120|30|14.5|Zebra Technologies Vietnam|Standard carton shipping and tracking labels for export garments.',
  'RBN-ZBR-110X300|Zebra 5095 Resin Thermal Ribbon (110mm x 300m, Black)|inv-cat-it-consumables|loc-bsl-wh-sp-bin08|Bin SP-08|45|15|18.0|Zebra Technologies Vietnam|High durability resin ribbons for garment wash-care barcode labels.',
  'CBL-CAT6-UTP-3M|Cat6 UTP RJ45 Factory Patch Cable (3m, Blue, Molded Boot)|inv-cat-it-consumables|loc-bsl-wh-sp-bin09|Bin SP-09|150|40|3.2|CommScope Vietnam|Cat6 patch cords for shopfloor network switches and inspection terminals.',
  'BAT-HW-EDA51-LI|Honeywell ScanPal EDA51 Li-Ion Battery Pack (4000mAh)|inv-cat-it-consumables|loc-bsl-wh-sp-bin10|Bin SP-10|12|4|65.0|Honeywell Scanning & Mobility|Replacement Li-Ion battery pack for shopfloor stocktaking PDAs.',
];

export async function seedInventory(
  prisma: PrismaClient,
  ctx?: SeederContext,
): Promise<Record<string, InventoryItem>> {
  return runDomainSeeder(
    'InventorySeeder',
    '📦',
    'Hardware Stockroom Inventory',
    async (logger) => {
      let getLoc = (id: string) => id;

      if (ctx && ctx.locations.size > 0) {
        getLoc = (id: string) => ctx.locations.get(id) || id;
      } else {
        const allLocations = await prisma.location.findMany({ take: 200 });
        const locMap = new Map<string, string>();
        for (const l of allLocations) {
          locMap.set(l.id, l.id);
          if (l.code) {
            locMap.set(l.code, l.id);
            locMap.set(l.code.toUpperCase(), l.id);
          }
        }
        getLoc = (id: string) => locMap.get(id) || allLocations[0]?.id || id;
      }

      const getCatId = (id: string) => ctx?.inventoryCategories.get(id) || id;
      const createdItems: Record<string, InventoryItem> = {};

      const records = await inTransactionChunks(prisma, itemRows, 50, async (tx, row) => {
        const [
          sku,
          name,
          categoryKey,
          locRef,
          binNumber,
          qtyStr,
          threshStr,
          costStr,
          supplier,
          notes,
        ] = row.split('|');

        const categoryId = getCatId(categoryKey);
        const locationId = getLoc(locRef);
        const quantity = parseInt(qtyStr, 10);
        const minThreshold = parseInt(threshStr, 10);
        const unitCost = parseFloat(costStr);

        return tx.inventoryItem.upsert({
          where: { sku },
          update: {
            name,
            categoryId,
            locationId,
            binNumber,
            quantity,
            minThreshold,
            unitCost,
            supplier,
            notes,
          },
          create: {
            sku,
            name,
            categoryId,
            locationId,
            binNumber,
            quantity,
            minThreshold,
            unitCost,
            supplier,
            notes,
          },
        });
      });

      for (let i = 0; i < itemRows.length; i++) {
        const sku = itemRows[i].split('|')[0];
        const record = records[i];
        createdItems[sku] = record;
        if (ctx) {
          ctx.inventory.set(sku, record.id);
          ctx.inventory.set(record.id, record.id);
        }
      }

      logger.log(
        `✅ Seeded ${itemRows.length} Inventory Items allocated to spatial warehouse racks & MDC bins across BSL.`,
      );

      return createdItems;
    },
  );
}
