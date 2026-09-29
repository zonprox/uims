import type { PrismaClient } from '@prisma/client';
import { runDomainSeeder, type SeederContext, upsertById } from './seeder.utils';

const assetCatRows: string[] = [
  'cat-laptop|Laptops / Notebooks|Enterprise mobile laptops, ultrabooks, and portable engineering notebooks',
  'cat-desktop|Desktops & Workstations|Business desktop PCs, CAD/CAM workstations, and compact client terminals',
  'cat-server|Servers (Rackmount / Host)|Enterprise 1U/2U/4U rackmount servers, tower hosts, and virtualization compute nodes',
  'cat-switch|Network Switches|Managed L2/L3 access, distribution, and core datacenter ethernet switches',
  'cat-router|Routers & Firewalls|Edge routers, next-generation firewalls (NGFW), and SD-WAN gateway appliances',
  'cat-ap|Wireless Access Points (AP)|Enterprise indoor/outdoor wireless access points, Wi-Fi 6/6E/7 APs and controllers',
  'cat-monitor|Monitors & Displays|Professional FHD, 2K, 4K desktop monitors, ultrawide displays, and conference panels',
  'cat-printer|Printers & Scanners|Network laser printers, multi-function copiers, document scanners, and industrial barcode printers',
  'cat-storage|Storage (NAS / SAN)|Network attached storage (NAS), SAN storage arrays, and backup deduplication appliances',
  'cat-ups|Power & UPS|Online double-conversion rackmount UPS units, battery packs, and intelligent PDUs',
  'cat-peripheral|Peripherals & Accessories|Thunderbolt/USB-C docking stations, conference webcams, speakerphones, and barcode scanners',
];

const invCatRows: string[] = [
  'inv-cat-fabrics|Raw Fabrics|Cotton twill, polyester fleece, nylon taffeta rolls, knitted and woven fabric lots',
  'inv-cat-accessories|Garment Accessories|YKK zippers, melamine buttons, coats sewing threads, elastic bands, rivets & drawstrings',
  'inv-cat-finished-goods|Finished Apparel Goods|Export-ready outerwear jackets, cargo trousers, activewear hoodies & shirts staged for export shipment',
  'inv-cat-spares|Spare Motors & Needles|Servo drive motors, sewing machine needles (DBx1/DPx5), rotary hooks, bobbins, cutter blades & presser feet',
  'inv-cat-it-consumables|General IT & Consumables|Zebra thermal transfer labels, resin ribbons, Cat6 patch cables, transceivers & PDA batteries',
];

export async function seedTaxonomy(prisma: PrismaClient, ctx?: SeederContext) {
  return runDomainSeeder(
    'TaxonomySeeder',
    '🏷️',
    'Asset & Inventory Taxonomy Categories',
    async (logger) => {
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

      await prisma.inventoryCategory.deleteMany({
        where: {
          id: {
            in: [
              'inv-cat-cables',
              'inv-cat-peripherals',
              'inv-cat-components',
              'inv-cat-consumables',
              'inv-cat-power',
            ],
          },
        },
      });

      const seededCategories: Record<string, import('@prisma/client').AssetCategory> = {};
      for (const row of assetCatRows) {
        const [id, name, description] = row.split('|');
        const cat = await upsertById(prisma.assetCategory, { id, name, description });
        seededCategories[id] = cat;
        if (ctx) {
          ctx.assetCategories.set(id, cat.id);
          ctx.assetCategories.set(name, cat.id);
        }
      }

      const seededInvCategories: Record<string, import('@prisma/client').InventoryCategory> = {};
      for (const row of invCatRows) {
        const [id, name, description] = row.split('|');
        const invCat = await upsertById(prisma.inventoryCategory, { id, name, description });
        seededInvCategories[id] = invCat;
        if (ctx) {
          ctx.inventoryCategories.set(id, invCat.id);
          ctx.inventoryCategories.set(name, invCat.id);
        }
      }

      if (ctx) {
        ctx.assetCategories.set('catLaptop', seededCategories['cat-laptop'].id);
        ctx.assetCategories.set('catDesktop', seededCategories['cat-desktop'].id);
        ctx.assetCategories.set('catServer', seededCategories['cat-server'].id);
        ctx.assetCategories.set('catSwitch', seededCategories['cat-switch'].id);
        ctx.assetCategories.set('catRouter', seededCategories['cat-router'].id);
        ctx.assetCategories.set('catAP', seededCategories['cat-ap'].id);
        ctx.assetCategories.set('catMonitor', seededCategories['cat-monitor'].id);
        ctx.assetCategories.set('catPrinter', seededCategories['cat-printer'].id);
        ctx.assetCategories.set('catStorage', seededCategories['cat-storage'].id);
        ctx.assetCategories.set('catUPS', seededCategories['cat-ups'].id);
        ctx.assetCategories.set('catPeripheral', seededCategories['cat-peripheral'].id);
        ctx.assetCategories.set('catWorkstation', seededCategories['cat-desktop'].id);
        ctx.assetCategories.set('catITHardware', seededCategories['cat-server'].id);
        ctx.assetCategories.set('catNetworking', seededCategories['cat-switch'].id);
        ctx.assetCategories.set('catPeripherals', seededCategories['cat-peripheral'].id);
        ctx.assetCategories.set('catMobile', seededCategories['cat-peripheral'].id);
      }

      logger.log(
        `✅ Seeded ${Object.keys(seededCategories).length} Asset Categories and ${Object.keys(seededInvCategories).length} Inventory Categories.`,
      );

      return {
        categories: {
          ...seededCategories,
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
          catWorkstation: seededCategories['cat-desktop'],
          catITHardware: seededCategories['cat-server'],
          catNetworking: seededCategories['cat-switch'],
          catPeripherals: seededCategories['cat-peripheral'],
          catMobile: seededCategories['cat-peripheral'],
        },
        inventoryCategories: seededInvCategories,
      };
    },
  );
}
