import type { PrismaClient } from '@prisma/client';

export async function seedDirectory(prisma: PrismaClient) {
  // Directory Groups (Mail Distribution & Security Groups)
  const directoryGroups = [
    {
      id: 'grp-all-company',
      name: 'All Company Employees',
      email: 'all-employees@company.com',
      memberCount: 148,
      scope: 'Internal Only',
      managedBy: 'People Operations (Rachel Adams)',
      description: 'Broadcast distribution list for entire enterprise workforce.',
    },
    {
      id: 'grp-engineering-core',
      name: 'Engineering & DevOps Core',
      email: 'engineering-core@company.com',
      memberCount: 52,
      scope: 'Internal Only',
      managedBy: 'David Kim',
      description: 'Software engineers, architects, backend and frontend developers.',
    },
    {
      id: 'grp-it-infrastructure',
      name: 'IT Infrastructure & Operations',
      email: 'it-ops@company.com',
      memberCount: 12,
      scope: 'Internal Only',
      managedBy: 'Robert Torres',
      description: 'Systems, network, and data center engineering teams.',
    },
    {
      id: 'grp-security-sirt',
      name: 'Security Incident Response Team (SIRT)',
      email: 'security-response@company.com',
      memberCount: 8,
      scope: 'Restricted / Security High',
      managedBy: 'Sarah Chen',
      description: 'SecOps engineers, auditors and 24/7 incident responders.',
    },
    {
      id: 'grp-product-design',
      name: 'Product Design & UX Research',
      email: 'product-design@company.com',
      memberCount: 14,
      scope: 'Internal Only',
      managedBy: 'Marcus Vance',
      description: 'Design systems, UI/UX and product managers.',
    },
    {
      id: 'grp-growth-marketing',
      name: 'Growth Marketing & Public Relations',
      email: 'press-media@company.com',
      memberCount: 16,
      scope: 'Public / External Allowed',
      managedBy: 'Elena Rostova',
      description: 'Marketing campaigns, social media and PR press inquiries.',
    },
    {
      id: 'grp-finance-procure',
      name: 'Finance & Hardware Procurement',
      email: 'procurement-finance@company.com',
      memberCount: 9,
      scope: 'Internal Only',
      managedBy: 'Lisa Wang',
      description: 'Hardware asset budgets, software renewals and vendor contracts.',
    },
    {
      id: 'grp-executive-steering',
      name: 'Executive Steering Committee',
      email: 'executive-leadership@company.com',
      memberCount: 7,
      scope: 'Confidential / Board Level',
      managedBy: 'Alex Johnson',
      description: 'Executive VPs, Directors and Legal Counsel.',
    },
  ];

  for (const dg of directoryGroups) {
    await prisma.directoryGroup.upsert({
      where: { id: dg.id },
      update: dg,
      create: dg,
    });
  }
}
