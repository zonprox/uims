import type { PrismaClient } from '@prisma/client';

export async function seedDirectory(prisma: PrismaClient) {
  // Directory Groups (Enterprise Mail Distribution & Active Directory Security Groups)
  const directoryGroups = [
    // 1. Corporate HQ Distribution & Functional Groups
    {
      id: 'grp-all-company',
      name: 'All Company Employees',
      email: 'all-employees@company.com',
      type: 'Distribution',
      scope: 'Universal / Global Distribution',
      ouPath: 'OU=Distribution,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Rachel Adams (Head of People Operations)',
      description:
        'Enterprise-wide distribution list for the entire workforce across all global locations.',
    },
    {
      id: 'grp-engineering-core',
      name: 'Engineering & DevOps Core',
      email: 'engineering-core@company.com',
      type: 'Security',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'David Kim (Lead Cloud Architect)',
      description:
        'Software engineers, cloud architects, platform developers, and site reliability engineers.',
    },
    {
      id: 'grp-it-infrastructure',
      name: 'IT Infrastructure & Operations',
      email: 'it-ops@company.com',
      type: 'Security',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Robert Torres (IT Infrastructure Operations Manager)',
      description:
        'Systems administration, network engineering, and data center operations personnel.',
    },
    {
      id: 'grp-security-sirt',
      name: 'Security Incident Response Team (SIRT)',
      email: 'security-response@company.com',
      type: 'Security',
      scope: 'Restricted / Security High',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Sarah Chen (Senior Systems Administrator)',
      description:
        'SecOps engineers, compliance auditors, and 24/7 security incident response coordinators.',
    },
    {
      id: 'grp-product-design',
      name: 'Product Design & UX Research',
      email: 'product-design@company.com',
      type: 'Distribution',
      scope: 'Internal Only',
      ouPath: 'OU=Distribution,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Marcus Vance (Principal Product Designer)',
      description: 'Design systems specialists, UI/UX designers, and user experience researchers.',
    },
    {
      id: 'grp-growth-marketing',
      name: 'Growth Marketing & Public Relations',
      email: 'press-media@company.com',
      type: 'Distribution',
      scope: 'Public / External Allowed',
      ouPath: 'OU=Distribution,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Elena Rostova (Director of Growth Marketing)',
      description:
        'Marketing campaigns, brand communications, sales representatives, and public relations.',
    },
    {
      id: 'grp-finance-procure',
      name: 'Finance & Hardware Procurement',
      email: 'procurement-finance@company.com',
      type: 'Security',
      scope: 'Internal Only',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Lisa Wang (Financial Controller)',
      description:
        'Hardware asset budgets, software renewals, accounting, and vendor procurement contracts.',
    },
    {
      id: 'grp-executive-steering',
      name: 'Executive Steering Committee',
      email: 'executive-leadership@company.com',
      type: 'Security',
      scope: 'Confidential / Board Level',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Alex Johnson (VP of Information Technology)',
      description: 'Executive Vice Presidents, Directors, Department Leads, and Legal Counsel.',
    },

    // 2. Production Plant Active Directory Security Groups
    {
      id: 'grp-ad-bsloth-printing',
      name: 'GR_BSLOTHPrinting',
      email: 'gr-bsloth-printing@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Printing,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Phung Thi Nhu Y (Asst. Officer)',
      description:
        'Production Printing Division Active Directory Security and Access Control Group.',
    },
    {
      id: 'grp-ad-bsloth-sample',
      name: 'GR_BSLOTHSample',
      email: 'gr-bsloth-sample@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Sample,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Nguyen Doan Quang Huy (Asst. Manager)',
      description:
        'Sample Development and Pattern Marker Division Active Directory Security Group.',
    },
    {
      id: 'grp-ad-bsloth-embroidery',
      name: 'GR_BSLOTHLogo Embroidery',
      email: 'gr-bsloth-embroidery@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Embroidery,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Huynh Kim Ngan (Chief of Section)',
      description: 'Logo Embroidery and Embellishment Division Active Directory Security Group.',
    },
    {
      id: 'grp-ad-bsl1-prod-office',
      name: 'GR_BSL1Production Office',
      email: 'gr-bsl1-prod-office@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Operations,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Le Thi Kim Chi (Junior Technician)',
      description: 'BSL-1 Plant Production Office Operations Active Directory Security Group.',
    },
    {
      id: 'grp-ad-bsl1-cutting',
      name: 'GR_BSL1Cutting',
      email: 'gr-bsl1-cutting@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Cutting,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Son Thi Ngoc Huyen (Junior Supervisor)',
      description:
        'BSL-1 Plant Cutting Operations and Material Staging Active Directory Security Group.',
    },

    // 3. Headquarters Active Directory Security Groups
    {
      id: 'grp-ad-hq-exec',
      name: 'GR_HQ_ExecutiveLeadership',
      email: 'gr-hq-exec@uims.internal',
      type: 'AD Security Group',
      scope: 'Universal Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Alex Johnson (VP of Information Technology)',
      description: 'Enterprise Headquarters Executive Leadership Active Directory Security Group.',
    },
    {
      id: 'grp-ad-hq-it',
      name: 'GR_HQ_ITInfrastructure',
      email: 'gr-hq-it@uims.internal',
      type: 'AD Security Group',
      scope: 'Universal Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Robert Torres (IT Infrastructure Operations Manager)',
      description:
        'Enterprise Headquarters IT Infrastructure and Systems Administration Security Group.',
    },
    {
      id: 'grp-ad-hq-eng',
      name: 'GR_HQ_EngineeringCore',
      email: 'gr-hq-eng@uims.internal',
      type: 'AD Security Group',
      scope: 'Universal Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'David Kim (Lead Cloud Architect)',
      description:
        'Enterprise Headquarters Core Engineering and DevOps Active Directory Security Group.',
    },
    {
      id: 'grp-ad-hq-sec',
      name: 'GR_HQ_SecurityCompliance',
      email: 'gr-hq-sec@uims.internal',
      type: 'AD Security Group',
      scope: 'Universal Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Marcus Bell (Principal Security Compliance Auditor)',
      description:
        'Enterprise Headquarters Information Security and Compliance Audit Security Group.',
    },
    {
      id: 'grp-ad-hq-design',
      name: 'GR_HQ_ProductDesign',
      email: 'gr-hq-design@uims.internal',
      type: 'AD Security Group',
      scope: 'Universal Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Marcus Vance (Principal Product Designer)',
      description: 'Enterprise Headquarters Product Design and UX Active Directory Security Group.',
    },
    {
      id: 'grp-ad-hq-growth',
      name: 'GR_HQ_GrowthMarketing',
      email: 'gr-hq-growth@uims.internal',
      type: 'AD Security Group',
      scope: 'Universal Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Elena Rostova (Director of Growth Marketing)',
      description:
        'Enterprise Headquarters Growth Marketing and PR Active Directory Security Group.',
    },
    {
      id: 'grp-ad-hq-fin',
      name: 'GR_HQ_FinanceProcurement',
      email: 'gr-hq-fin@uims.internal',
      type: 'AD Security Group',
      scope: 'Universal Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Lisa Wang (Financial Controller)',
      description:
        'Enterprise Headquarters Finance and Procurement Active Directory Security Group.',
    },
  ];

  // 1. Upsert Directory Group Records
  for (const dg of directoryGroups) {
    await prisma.directoryGroup.upsert({
      where: { id: dg.id },
      update: {
        name: dg.name,
        email: dg.email,
        description: dg.description,
        type: dg.type,
        scope: dg.scope,
        ouPath: dg.ouPath,
        managedBy: dg.managedBy,
      },
      create: {
        id: dg.id,
        name: dg.name,
        email: dg.email,
        description: dg.description,
        type: dg.type,
        scope: dg.scope,
        ouPath: dg.ouPath,
        managedBy: dg.managedBy,
        memberCount: 0,
      },
    });
  }

  // 2. Fetch All Seeded Users to Build Complete Directory Memberships
  const allUsers = await prisma.user.findMany();

  for (const group of directoryGroups) {
    let eligibleUsers: typeof allUsers = [];

    if (group.name.startsWith('GR_')) {
      // AD Security Group: Match exact assigned adGroup property
      eligibleUsers = allUsers.filter((u) => u.adGroup === group.name);
    } else if (group.id === 'grp-all-company') {
      // All active enterprise personnel
      eligibleUsers = allUsers.filter((u) => u.status === 'ACTIVE');
    } else if (group.id === 'grp-engineering-core') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department === 'Engineering' ||
          u.adGroup === 'GR_HQ_EngineeringCore' ||
          u.jobTitle?.includes('Engineer') ||
          u.jobTitle?.includes('Architect'),
      );
    } else if (group.id === 'grp-it-infrastructure') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department === 'IT & Infrastructure' ||
          u.adGroup === 'GR_HQ_ITInfrastructure' ||
          u.jobTitle?.includes('Administrator') ||
          u.jobTitle?.includes('Network'),
      );
    } else if (group.id === 'grp-security-sirt') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department === 'Security & Compliance' ||
          u.adGroup === 'GR_HQ_SecurityCompliance' ||
          u.roleName === 'Auditor' ||
          u.jobTitle?.includes('Security'),
      );
    } else if (group.id === 'grp-product-design') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department === 'Product & Design' ||
          u.adGroup === 'GR_HQ_ProductDesign' ||
          u.jobTitle?.includes('Design') ||
          u.jobTitle?.includes('UX'),
      );
    } else if (group.id === 'grp-growth-marketing') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department === 'Marketing' ||
          u.department === 'Sales' ||
          u.adGroup === 'GR_HQ_GrowthMarketing',
      );
    } else if (group.id === 'grp-finance-procure') {
      eligibleUsers = allUsers.filter(
        (u) => u.department === 'Finance' || u.adGroup === 'GR_HQ_FinanceProcurement',
      );
    } else if (group.id === 'grp-executive-steering') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.roleName === 'Super Admin' ||
          u.roleName === 'Manager' ||
          u.jobTitle?.includes('VP') ||
          u.jobTitle?.includes('Director') ||
          u.jobTitle?.includes('Head') ||
          u.jobTitle?.includes('Counsel') ||
          u.jobTitle?.includes('Controller'),
      );
    }

    // Insert Directory Membership records
    for (const u of eligibleUsers) {
      await prisma.directoryMembership.upsert({
        where: {
          userId_groupId: {
            userId: u.id,
            groupId: group.id,
          },
        },
        update: {},
        create: {
          userId: u.id,
          groupId: group.id,
        },
      });
    }

    // Update Directory Group member count to reflect actual memberships
    await prisma.directoryGroup.update({
      where: { id: group.id },
      data: { memberCount: eligibleUsers.length },
    });
  }
}
