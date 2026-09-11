import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

const logger = new Logger('InventorySeeder');

export async function seedInventory(prisma: PrismaClient) {
  logger.log('📦 Seeding Standard Master Inventory Categories & Relational Stockroom Items...');

  // 1. Master Inventory Categories Catalog
  const inventoryCategories = [
    {
      id: 'inv-cat-cables',
      name: 'Cables & Adapters',
      description: 'Network patch cables, optical transceivers, USB-C adapters, and interconnects',
    },
    {
      id: 'inv-cat-peripherals',
      name: 'Peripherals',
      description: 'Workplace peripherals, mice, keyboards, docks, headsets, and security keys',
    },
    {
      id: 'inv-cat-components',
      name: 'Storage & RAM',
      description: 'Internal workstation memory modules and NVMe PCIe SSD storage drives',
    },
    {
      id: 'inv-cat-consumables',
      name: 'Power & Battery',
      description:
        'Power adapters, chargers, batteries, packaging materials, and maintenance consumables',
    },
    {
      id: 'inv-cat-tooling',
      name: 'Tooling & Equipment',
      description: 'Diagnostic equipment, patch tools, crimpers, and hardware maintenance kits',
    },
  ];

  for (const cat of inventoryCategories) {
    await prisma.inventoryCategory.upsert({
      where: { id: cat.id },
      update: {
        name: cat.name,
        description: cat.description,
      },
      create: {
        id: cat.id,
        name: cat.name,
        description: cat.description,
      },
    });
  }

  // 2. Resolve target Location IDs
  const [locNYF4, locNYF5, locSF, locDCNY4] = await Promise.all([
    prisma.location.findFirst({ where: { OR: [{ id: 'loc-ny-f4' }, { code: 'loc-ny-f4' }] } }),
    prisma.location.findFirst({ where: { OR: [{ id: 'loc-ny-f5' }, { code: 'loc-ny-f5' }] } }),
    prisma.location.findFirst({ where: { OR: [{ id: 'loc-sf-bay' }, { code: 'loc-sf-bay' }] } }),
    prisma.location.findFirst({ where: { OR: [{ id: 'loc-dc-ny4' }, { code: 'loc-dc-ny4' }] } }),
  ]);

  const fallbackLocationId = locNYF4?.id || (await prisma.location.findFirst())?.id;
  if (!fallbackLocationId) {
    throw new Error('Cannot seed inventory items: No Location records found in database.');
  }

  // 3. Relational Inventory Items Catalog
  const inventoryItems = [
    {
      sku: 'CAB-CAT6A-2M-BLU',
      name: 'Cat6a 10Gbps Snagless RJ45 Patch Cable (2m, Blue)',
      categoryId: 'inv-cat-cables',
      locationId: locNYF4?.id || fallbackLocationId,
      binNumber: 'Bin A-04',
      quantity: 64,
      minThreshold: 20,
      unitCost: 6.5,
      supplier: 'Monoprice B2B Direct',
      notes: 'Standard high-speed desk patch cables.',
    },
    {
      sku: 'ACC-MSE-MX3S-GRY',
      name: 'Logitech MX Master 3S Wireless Performance Mouse',
      categoryId: 'inv-cat-peripherals',
      locationId: locNYF4?.id || fallbackLocationId,
      binNumber: 'Shelf 2',
      quantity: 2,
      minThreshold: 5,
      unitCost: 99.0,
      supplier: 'CDW Direct Enterprise',
      notes: 'Low stock warning! Restock order PO-9921 placed.',
    },
    {
      sku: 'ACC-DOCK-TS4-TB4',
      name: 'CalDigit TS4 Thunderbolt 4 Dock 18-Port (Spare)',
      categoryId: 'inv-cat-peripherals',
      locationId: locNYF5?.id || fallbackLocationId,
      binNumber: 'Cabinet Secure-1',
      quantity: 5,
      minThreshold: 3,
      unitCost: 379.0,
      supplier: 'B&H Photo Video B2B',
      notes: 'Emergency hot-swap docks for executive boardrooms.',
    },
    {
      sku: 'RAM-DDR5-32G-SODIMM',
      name: 'Crucial 32GB DDR5-5600 SODIMM Laptop Memory Module',
      categoryId: 'inv-cat-components',
      locationId: locSF?.id || fallbackLocationId,
      binNumber: 'Anti-Static Drawer 3',
      quantity: 14,
      minThreshold: 6,
      unitCost: 110.0,
      supplier: 'Newegg Business',
      notes: 'Laptop RAM upgrade kit for engineering workstations.',
    },
    {
      sku: 'SSD-NVME-2TB-SAMS',
      name: 'Samsung 990 Pro 2TB PCIe 4.0 NVMe SSD M.2',
      categoryId: 'inv-cat-components',
      locationId: locSF?.id || fallbackLocationId,
      binNumber: 'Anti-Static Drawer 1',
      quantity: 8,
      minThreshold: 4,
      unitCost: 175.0,
      supplier: 'Newegg Business',
      notes: 'Fast internal storage drives for engineer machine refreshes.',
    },
    {
      sku: 'PWR-APL-140W-USBC',
      name: 'Apple 140W USB-C Power Adapter + 2m MagSafe 3 Cable',
      categoryId: 'inv-cat-consumables',
      locationId: locNYF4?.id || fallbackLocationId,
      binNumber: 'Shelf 1',
      quantity: 16,
      minThreshold: 5,
      unitCost: 99.0,
      supplier: 'Apple Corporate B2B',
      notes: 'Replacement chargers for 16-inch MacBook Pro fleet.',
    },
    {
      sku: 'PWR-DELL-130W-USBC',
      name: 'Dell 130W USB-C AC Adapter with Power Cord',
      categoryId: 'inv-cat-consumables',
      locationId: locNYF4?.id || fallbackLocationId,
      binNumber: 'Shelf 1',
      quantity: 12,
      minThreshold: 5,
      unitCost: 79.0,
      supplier: 'Dell Premier B2B',
      notes: 'Power bricks for Dell Precision / Latitude laptops.',
    },
    {
      sku: 'ADP-TB-25GBE-LAN',
      name: 'Belkin USB-C to 2.5Gbps Gigabit Ethernet Adapter',
      categoryId: 'inv-cat-cables',
      locationId: locNYF4?.id || fallbackLocationId,
      binNumber: 'Bin A-12',
      quantity: 0,
      minThreshold: 5,
      unitCost: 35.0,
      supplier: 'CDW Direct Enterprise',
      notes: 'Completely depleted! Pending supplier restock delivery.',
    },
    {
      sku: 'OPT-SFP-10G-SR-CS',
      name: 'Cisco 10GBASE-SR SFP+ Optical Transceiver Module',
      categoryId: 'inv-cat-cables',
      locationId: locDCNY4?.id || fallbackLocationId,
      binNumber: 'Fiber Bin F-02',
      quantity: 18,
      minThreshold: 6,
      unitCost: 120.0,
      supplier: 'Cisco Systems Direct',
      notes: 'Multimode 850nm OM4 fiber transceivers for rack interconnects.',
    },
    {
      sku: 'SEC-YUBIKEY-5C-NFC',
      name: 'Yubico YubiKey 5C NFC FIDO2 / WebAuthn Security Key',
      categoryId: 'inv-cat-peripherals',
      locationId: locNYF5?.id || fallbackLocationId,
      binNumber: 'Vault Locker 2',
      quantity: 35,
      minThreshold: 10,
      unitCost: 55.0,
      supplier: 'Yubico Enterprise Security',
      notes: 'Mandatory hardware MFA token for all employees with cloud access.',
    },
    {
      sku: 'AUD-HEADSET-POLY-V2',
      name: 'Poly Voyager Focus 2 UC Wireless Bluetooth Headset',
      categoryId: 'inv-cat-peripherals',
      locationId: locNYF4?.id || fallbackLocationId,
      binNumber: 'Shelf 4',
      quantity: 9,
      minThreshold: 4,
      unitCost: 229.0,
      supplier: 'HP / Poly Enterprise Direct',
      notes: 'Active noise-canceling headsets with desktop charging stand.',
    },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        categoryId: item.categoryId,
        locationId: item.locationId,
        quantity: item.quantity,
        minThreshold: item.minThreshold,
        unitCost: item.unitCost,
        binNumber: item.binNumber,
        supplier: item.supplier,
        notes: item.notes,
      },
      create: {
        sku: item.sku,
        name: item.name,
        categoryId: item.categoryId,
        locationId: item.locationId,
        quantity: item.quantity,
        minThreshold: item.minThreshold,
        unitCost: item.unitCost,
        binNumber: item.binNumber,
        supplier: item.supplier,
        notes: item.notes,
      },
    });
  }

  logger.log(
    `✅ Seeded ${inventoryCategories.length} inventory categories and ${inventoryItems.length} inventory items.`,
  );
}
