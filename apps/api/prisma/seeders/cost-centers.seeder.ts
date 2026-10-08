import type { PrismaClient } from '@prisma/client';
import { runDomainSeeder, type SeederContext } from './seeder.utils';

export interface CostCenterDef {
  code: string;
  name: string;
  description: string;
}

export const costCenterRows: CostCenterDef[] = [
  {
    code: 'IT-OPS',
    name: 'IT Operations & Infrastructure',
    description:
      'Enterprise datacenters, cloud hosts, networking, and IT infrastructure operations.',
  },
  {
    code: 'ENG-DEV',
    name: 'Engineering & Software Development',
    description: 'Engineering workstations, software development, DevOps, and testing appliances.',
  },
  {
    code: 'FIN-ACC',
    name: 'Finance & Accounting',
    description: 'Corporate finance, auditing terminals, general ledger, and accounting hardware.',
  },
  {
    code: 'HR-ADMIN',
    name: 'Human Resources & Administration',
    description: 'People operations, recruitment, workplace facilities, and office administration.',
  },
  {
    code: 'EXEC-MGMT',
    name: 'Executive Management',
    description: 'Executive leadership, corporate strategy, and board governance operations.',
  },
  {
    code: 'SALES-MKT',
    name: 'Sales & Marketing',
    description: 'Commercial sales, global apparel accounts, sourcing development, and marketing.',
  },
];

export async function seedCostCenters(
  prisma: PrismaClient,
  _ctx?: SeederContext,
): Promise<Map<string, string>> {
  return runDomainSeeder('CostCentersSeeder', '💳', 'Enterprise Cost Centers', async (logger) => {
    const map = new Map<string, string>();

    for (const item of costCenterRows) {
      const record = await prisma.costCenter.upsert({
        where: { code: item.code },
        update: {
          name: item.name,
          description: item.description,
        },
        create: {
          code: item.code,
          name: item.name,
          description: item.description,
        },
      });

      map.set(item.code, record.id);
      map.set(item.code.toLowerCase(), record.id);
      map.set(item.name, record.id);
      map.set(`CC-${item.code}`, record.id);
    }

    logger.log(`✅ Seeded ${costCenterRows.length} enterprise cost centers.`);
    return map;
  });
}
