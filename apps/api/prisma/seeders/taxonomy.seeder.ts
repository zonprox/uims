import type { PrismaClient } from '@prisma/client';

export async function seedTaxonomy(prisma: PrismaClient) {
  // 4. Locations
  const locNYF4 = await prisma.location.upsert({
    where: { id: 'loc-ny-f4' },
    update: {},
    create: {
      id: 'loc-ny-f4',
      name: 'NY HQ - Floor 4',
      building: 'Empire State Tech Hub',
      floor: 'Floor 4',
      room: 'Open Workspace & Tech Bay',
      address: '350 5th Ave, New York, NY 10118',
    },
  });

  const locNYF5 = await prisma.location.upsert({
    where: { id: 'loc-ny-f5' },
    update: {},
    create: {
      id: 'loc-ny-f5',
      name: 'NY HQ - Floor 5',
      building: 'Empire State Tech Hub',
      floor: 'Floor 5',
      room: 'Executive Suite & Boardroom',
      address: '350 5th Ave, New York, NY 10118',
    },
  });

  const locSF = await prisma.location.upsert({
    where: { id: 'loc-sf-bay' },
    update: {},
    create: {
      id: 'loc-sf-bay',
      name: 'SF HQ - Tech Bay',
      building: 'Mission Bay Center',
      floor: 'Floor 2',
      room: 'IT Tech Lab & Prototyping Bay',
      address: '500 Howard St, San Francisco, CA 94105',
    },
  });

  const locLondon = await prisma.location.upsert({
    where: { id: 'loc-london' },
    update: {},
    create: {
      id: 'loc-london',
      name: 'London Global Hub',
      building: 'Bishopsgate Tower',
      floor: 'Floor 12',
      room: 'EMEA Operations Center',
      address: '100 Bishopsgate, London EC2N 4AG, UK',
    },
  });

  const locSingapore = await prisma.location.upsert({
    where: { id: 'loc-singapore' },
    update: {},
    create: {
      id: 'loc-singapore',
      name: 'Singapore Regional Hub',
      building: 'Marina Bay Financial Centre',
      floor: 'Floor 28',
      room: 'APAC Enterprise Suite',
      address: '1 Marina Blvd, Singapore 018989',
    },
  });

  const locDCNY4 = await prisma.location.upsert({
    where: { id: 'loc-dc-ny4' },
    update: {},
    create: {
      id: 'loc-dc-ny4',
      name: 'Equinix NY4 Data Center',
      building: 'Equinix NY4 Facility',
      floor: 'Secure Server Vault',
      room: 'Cage B-04 / Rack R01-R04',
      address: '755 Secaucus Rd, Secaucus, NJ 07094',
    },
  });

  const locDCSV5 = await prisma.location.upsert({
    where: { id: 'loc-dc-sv5' },
    update: {},
    create: {
      id: 'loc-dc-sv5',
      name: 'Equinix SV5 Silicon Valley DC',
      building: 'Equinix SV5 Facility',
      floor: 'Floor 1 Compute Row',
      room: 'Cage S-12 / Rack K08',
      address: '1111 Equinix Way, San Jose, CA 95131',
    },
  });

  // 5. Asset Categories
  const catLaptop = await prisma.assetCategory.upsert({
    where: { id: 'cat-laptop' },
    update: {},
    create: {
      id: 'cat-laptop',
      name: 'Laptop',
      description: 'Workstation laptops, MacBooks & ultrabooks',
    },
  });

  const catDesktop = await prisma.assetCategory.upsert({
    where: { id: 'cat-desktop' },
    update: {},
    create: {
      id: 'cat-desktop',
      name: 'Desktop',
      description: 'High-performance engineering workstations',
    },
  });

  const catServer = await prisma.assetCategory.upsert({
    where: { id: 'cat-server' },
    update: {},
    create: {
      id: 'cat-server',
      name: 'Server',
      description: '2U/4U Rackmount compute and virtualization hosts',
    },
  });

  const catNetworking = await prisma.assetCategory.upsert({
    where: { id: 'cat-networking' },
    update: {},
    create: {
      id: 'cat-networking',
      name: 'Networking',
      description: 'Managed switches, edge routers & firewalls',
    },
  });

  const catMonitor = await prisma.assetCategory.upsert({
    where: { id: 'cat-monitor' },
    update: {},
    create: {
      id: 'cat-monitor',
      name: 'Monitor',
      description: '4K, 5K Retina & Ultrawide design displays',
    },
  });

  const catStorage = await prisma.assetCategory.upsert({
    where: { id: 'cat-storage' },
    update: {},
    create: {
      id: 'cat-storage',
      name: 'Storage',
      description: 'Enterprise SAN/NAS arrays & backup appliances',
    },
  });

  const catMobile = await prisma.assetCategory.upsert({
    where: { id: 'cat-mobile' },
    update: {},
    create: {
      id: 'cat-mobile',
      name: 'Mobile',
      description: 'Corporate iPads, testing tablets & 5G devices',
    },
  });

  const catPeripherals = await prisma.assetCategory.upsert({
    where: { id: 'cat-peripherals' },
    update: {},
    create: {
      id: 'cat-peripherals',
      name: 'Peripherals',
      description: 'Thunderbolt 4 docks, conference A/V & printers',
    },
  });

  return {
    locations: { locNYF4, locNYF5, locSF, locLondon, locSingapore, locDCNY4, locDCSV5 },
    categories: {
      catLaptop,
      catDesktop,
      catServer,
      catNetworking,
      catMonitor,
      catStorage,
      catMobile,
      catPeripherals,
    },
  };
}
