import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

const logger = new Logger('VendorsSeeder');

export interface CanonicalVendorDefinition {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  website: string;
  notes?: string;
  aliases?: string[];
}

export const CANONICAL_VENDORS: CanonicalVendorDefinition[] = [
  {
    id: 'ven-msft',
    name: 'Microsoft Corporation',
    contactEmail: 'licensing@microsoft.com',
    contactPhone: '+1-800-642-7676',
    website: 'https://microsoft.com',
    notes: 'Primary enterprise operating systems, productivity and cloud subscription provider.',
    aliases: ['microsoft', 'microsoft corporation', 'msft'],
  },
  {
    id: 'ven-sap',
    name: 'SAP SE',
    contactEmail: 'enterprise-sales@sap.com',
    contactPhone: '+49-6227-747474',
    website: 'https://sap.com',
    notes: 'Global ERP solutions provider for manufacturing, supply chain and financials.',
    aliases: ['sap', 'sap se'],
  },
  {
    id: 'ven-lectra',
    name: 'Lectra',
    contactEmail: 'contact@lectra.com',
    contactPhone: '+33-1-5364-4200',
    website: 'https://lectra.com',
    notes:
      'Industrial textile CAD/CAM pattern design, 3D prototyping and automated cutting systems.',
    aliases: ['lectra'],
  },
  {
    id: 'ven-gerber',
    name: 'Gerber Technology',
    contactEmail: 'service@gerbertechnology.com',
    contactPhone: '+1-860-871-8082',
    website: 'https://gerbertechnology.com',
    notes: 'Integrated garment manufacturing, pattern design and marker optimization software.',
    aliases: ['gerber', 'gerber technology'],
  },
  {
    id: 'ven-coats',
    name: 'Coats Digital',
    contactEmail: 'support@coatsdigital.com',
    contactPhone: '+44-208-210-5000',
    website: 'https://coatsdigital.com',
    notes: 'Supply chain management and FastReact production planning software.',
    aliases: ['coats', 'coats digital'],
  },
  {
    id: 'ven-adobe',
    name: 'Adobe Systems Inc',
    contactEmail: 'enterprise@adobe.com',
    contactPhone: '+1-800-833-6687',
    website: 'https://adobe.com',
    notes: 'Creative Cloud graphic design, technical illustration and digital media suite.',
    aliases: ['adobe', 'adobe systems', 'adobe systems inc'],
  },
  {
    id: 'ven-cisco',
    name: 'Cisco Systems',
    contactEmail: 'tac@cisco.com',
    contactPhone: '+1-800-553-2447',
    website: 'https://cisco.com',
    notes: 'Enterprise campus networking hardware, routing, SD-WAN and security infrastructure.',
    aliases: ['cisco', 'cisco systems', 'cisco meraki'],
  },
  {
    id: 'ven-dell',
    name: 'Dell Technologies',
    contactEmail: 'support@dell.com',
    contactPhone: '+1-800-456-3355',
    website: 'https://dell.com',
    notes: 'Enterprise server infrastructure, Precision workstations and Latitude mobile fleet.',
    aliases: ['dell', 'dell technologies'],
  },
  {
    id: 'ven-lenovo',
    name: 'Lenovo',
    contactEmail: 'sales@lenovo.com',
    contactPhone: '+1-855-253-6686',
    website: 'https://lenovo.com',
    notes: 'ThinkPad laptops, ThinkCentre desktops and enterprise mobile compute fleet.',
    aliases: ['lenovo'],
  },
  {
    id: 'ven-apple',
    name: 'Apple Inc.',
    contactEmail: 'business@apple.com',
    contactPhone: '+1-800-692-7753',
    website: 'https://apple.com',
    notes: 'MacBook Pro and iOS device supplier for merchandising and executive leadership.',
    aliases: ['apple', 'apple inc.', 'apple inc'],
  },
  {
    id: 'ven-juki',
    name: 'Juki Corporation',
    contactEmail: 'sales@juki.com',
    contactPhone: '+81-42-357-2211',
    website: 'https://juki.co.jp',
    notes: 'Industrial sewing machines and smart apparel factory automation equipment.',
    aliases: ['juki', 'juki corporation'],
  },
  {
    id: 'ven-brother',
    name: 'Brother Industries',
    contactEmail: 'industrial@brother.com',
    contactPhone: '+81-52-824-2511',
    website: 'https://brother.com',
    notes: 'Industrial lockstitch sewing, barcode printing and labeling machinery.',
    aliases: ['brother', 'brother industries'],
  },
];

export async function seedVendors(prisma: PrismaClient): Promise<Map<string, string>> {
  logger.log('🏢 Seeding Canonical Enterprise Vendors...');
  const vendorMap = new Map<string, string>();

  for (const v of CANONICAL_VENDORS) {
    const record = await prisma.vendor.upsert({
      where: { id: v.id },
      update: {
        name: v.name,
        contactEmail: v.contactEmail,
        contactPhone: v.contactPhone,
        website: v.website,
        notes: v.notes,
      },
      create: {
        id: v.id,
        name: v.name,
        contactEmail: v.contactEmail,
        contactPhone: v.contactPhone,
        website: v.website,
        notes: v.notes,
      },
    });

    vendorMap.set(record.id, record.id);
    vendorMap.set(record.name.toLowerCase(), record.id);
    if (v.aliases) {
      for (const alias of v.aliases) {
        vendorMap.set(alias.toLowerCase(), record.id);
      }
    }
  }

  logger.log(`✅ Seeded ${CANONICAL_VENDORS.length} Canonical Enterprise Vendors.`);
  return vendorMap;
}
