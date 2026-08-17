import type { PrismaClient } from '@prisma/client';

export async function seedDirectory(prisma: PrismaClient) {
  // Directory Groups (Mail Distribution & Active Directory Security Groups)
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
    // Enterprise AD Security Groups from Active Directory Master
    {
      id: 'grp-ad-bsloth-printing',
      name: 'GR_BSLOTHPrinting',
      email: 'gr-bsloth-printing@youngonevn.com',
      memberCount: 18,
      scope: 'AD Security Group',
      managedBy: 'Printing Section Head',
      description: 'Production Printing Division Active Directory Security & Access Control Group',
    },
    {
      id: 'grp-ad-bsloth-sample',
      name: 'GR_BSLOTHSample',
      email: 'gr-bsloth-sample@youngonevn.com',
      memberCount: 26,
      scope: 'AD Security Group',
      managedBy: 'Nguyen Doan Quang Huy (Asst. Manager)',
      description: 'Sample Development & Pattern Marker Division Active Directory Security Group',
    },
    {
      id: 'grp-ad-bsloth-embroidery',
      name: 'GR_BSLOTHLogo Embroidery',
      email: 'gr-bsloth-embroidery@youngonevn.com',
      memberCount: 12,
      scope: 'AD Security Group',
      managedBy: 'Huynh Kim Ngan (Chief Of Section)',
      description: 'Logo Embroidery Division Active Directory Security Group',
    },
    {
      id: 'grp-ad-bsl1-prod-office',
      name: 'GR_BSL1Production Office',
      email: 'gr-bsl1-prod-office@youngonevn.com',
      memberCount: 8,
      scope: 'AD Security Group',
      managedBy: 'Le Thi Kim Chi (Junior Technician)',
      description: 'BSL-1 Plant Production Office Operations AD Security Group',
    },
    {
      id: 'grp-ad-bsl1-cutting',
      name: 'GR_BSL1Cutting',
      email: 'gr-bsl1-cutting@youngonevn.com',
      memberCount: 15,
      scope: 'AD Security Group',
      managedBy: 'Son Thi Ngoc Huyen (Junior Supervisor)',
      description: 'BSL-1 Plant Cutting Operations AD Security Group',
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
