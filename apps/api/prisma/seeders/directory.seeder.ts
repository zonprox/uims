import { AccountStatus, DirectorySource, type PrismaClient } from '@prisma/client';
import { enterpriseAdMasterData } from './ad-directory-data';

export interface StaffProfile {
  email: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  company?: string;
  groupCompany?: string;
  plant?: string;
  section?: string;
  subSection?: string;
  computerName?: string;
  computerName2?: string;
  adGroup?: string;
  telephone?: string;
  phone?: string;
  ouPath?: string;
  managerName?: string;
  isClosed?: boolean;
  status?: string;
  source?: string;
}

export async function seedDirectory(prisma: PrismaClient, staffProfiles?: StaffProfile[]) {
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

  // 1b. Seed Corporate Staff Profiles into Directory
  if (staffProfiles && staffProfiles.length > 0) {
    for (const s of staffProfiles) {
      const status: AccountStatus =
        s.status === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.DISABLED;
      await prisma.directoryUser.upsert({
        where: { email: s.email },
        update: {
          employeeCode: s.employeeCode || null,
          firstName: s.firstName,
          lastName: s.lastName,
          displayName: s.displayName,
          jobTitle: s.jobTitle || 'Employee',
          company: s.company || 'Acme Enterprise',
          groupCompany: s.groupCompany || 'Acme Global',
          plant: s.plant || 'HQ Campus',
          department: s.department || 'IT & Infrastructure',
          location: s.location || 'NY HQ - Floor 4',
          section: s.section || null,
          subSection: s.subSection || null,
          computerName: s.computerName || null,
          computerName2: s.computerName2 || null,
          adGroup: s.adGroup || null,
          telephone: s.telephone || s.phone || null,
          phone: s.phone || null,
          ouPath: s.ouPath || 'OU=Management,OU=HQ,DC=uims,DC=internal',
          managerName: s.managerName || null,
          isClosed: Boolean(s.isClosed),
          status,
          source: (s.source as DirectorySource) || DirectorySource.LOCAL,
        },
        create: {
          email: s.email,
          employeeCode: s.employeeCode || null,
          firstName: s.firstName,
          lastName: s.lastName,
          displayName: s.displayName,
          jobTitle: s.jobTitle || 'Employee',
          company: s.company || 'Acme Enterprise',
          groupCompany: s.groupCompany || 'Acme Global',
          plant: s.plant || 'HQ Campus',
          department: s.department || 'IT & Infrastructure',
          location: s.location || 'NY HQ - Floor 4',
          section: s.section || null,
          subSection: s.subSection || null,
          computerName: s.computerName || null,
          computerName2: s.computerName2 || null,
          adGroup: s.adGroup || null,
          telephone: s.telephone || s.phone || null,
          phone: s.phone || null,
          ouPath: s.ouPath || 'OU=Management,OU=HQ,DC=uims,DC=internal',
          managerName: s.managerName || null,
          isClosed: Boolean(s.isClosed),
          status,
          source: (s.source as DirectorySource) || DirectorySource.LOCAL,
        },
      });
    }
  }

  // 1c. Seed Production / Enterprise Active Directory Dataset
  for (const ad of enterpriseAdMasterData) {
    const nameParts = ad.displayName.trim().split(' ');
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    const sectionName = ad.section || 'Operations';
    let defaultOuPath = 'OU=Operations,OU=Plant1,DC=company,DC=internal';
    let defaultManagerName = 'Operations Division Head';

    if (sectionName.toLowerCase().includes('printing')) {
      defaultOuPath = 'OU=Printing,OU=Production,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Phung Thi Nhu Y (Asst. Officer)';
    } else if (sectionName.toLowerCase().includes('sample')) {
      defaultOuPath = 'OU=Sample,OU=Production,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Nguyen Doan Quang Huy (Asst. Manager)';
    } else if (sectionName.toLowerCase().includes('embroidery')) {
      defaultOuPath = 'OU=Embroidery,OU=Production,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Huynh Kim Ngan (Chief of Section)';
    } else if (sectionName.toLowerCase().includes('cutting')) {
      defaultOuPath = 'OU=Cutting,OU=Production,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Son Thi Ngoc Huyen (Junior Supervisor)';
    } else if (
      sectionName.toLowerCase().includes('production') ||
      sectionName.toLowerCase().includes('office')
    ) {
      defaultOuPath = 'OU=Operations,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Le Thi Kim Chi (Junior Technician)';
    }

    const isClosed = Boolean(ad.isClosed);
    const status: AccountStatus = isClosed ? AccountStatus.DISABLED : AccountStatus.ACTIVE;

    await prisma.directoryUser.upsert({
      where: { email: ad.email },
      update: {
        employeeCode: ad.employeeCode,
        firstName,
        lastName,
        displayName: ad.displayName,
        jobTitle: ad.jobTitle,
        company: ad.company || 'BSL Others',
        groupCompany: ad.groupCompany || 'BSL',
        plant: ad.plant || 'Plant 1',
        department: ad.department || 'Production',
        section: ad.section || 'Production',
        subSection: ad.subSection || 'General Operations',
        computerName: ad.computerName || `WS-${ad.employeeCode}`,
        computerName2: (ad as { computerName2?: string }).computerName2 || `LT-${ad.employeeCode}`,
        adGroup: ad.adGroup || 'GR_BSL1Production Office',
        telephone:
          (ad as { telephone?: string }).telephone || `+84 28 3810 ${ad.employeeCode.slice(-4)}`,
        phone: (ad as { telephone?: string }).telephone
          ? `+84 ${(ad as { telephone?: string }).telephone}`
          : `+84 28 3810 ${ad.employeeCode.slice(-4)}`,
        ouPath: (ad as { ouPath?: string }).ouPath || defaultOuPath,
        managerName: (ad as { managerName?: string }).managerName || defaultManagerName,
        isClosed,
        status,
        source: DirectorySource.LDAP,
      },
      create: {
        email: ad.email,
        employeeCode: ad.employeeCode,
        firstName,
        lastName,
        displayName: ad.displayName,
        jobTitle: ad.jobTitle,
        company: ad.company || 'BSL Others',
        groupCompany: ad.groupCompany || 'BSL',
        plant: ad.plant || 'Plant 1',
        department: ad.department || 'Production',
        section: ad.section || 'Production',
        subSection: ad.subSection || 'General Operations',
        computerName: ad.computerName || `WS-${ad.employeeCode}`,
        computerName2: (ad as { computerName2?: string }).computerName2 || `LT-${ad.employeeCode}`,
        adGroup: ad.adGroup || 'GR_BSL1Production Office',
        telephone:
          (ad as { telephone?: string }).telephone || `+84 28 3810 ${ad.employeeCode.slice(-4)}`,
        phone: (ad as { telephone?: string }).telephone
          ? `+84 ${(ad as { telephone?: string }).telephone}`
          : `+84 28 3810 ${ad.employeeCode.slice(-4)}`,
        ouPath: (ad as { ouPath?: string }).ouPath || defaultOuPath,
        managerName: (ad as { managerName?: string }).managerName || defaultManagerName,
        isClosed,
        status,
        source: DirectorySource.LDAP,
      },
    });
  }

  // 2. Fetch All Seeded Directory Users to Build Complete Directory Memberships
  const allUsers = await prisma.directoryUser.findMany({ take: 10000 });

  for (const group of directoryGroups) {
    let eligibleUsers: typeof allUsers = [];

    if (group.name.startsWith('GR_')) {
      // AD Security Group: Match exact assigned adGroup property
      eligibleUsers = allUsers.filter((u) => u.adGroup === group.name);
    } else if (group.id === 'grp-all-company') {
      // All active enterprise personnel
      eligibleUsers = allUsers.filter((u) => u.status === AccountStatus.ACTIVE);
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
          u.jobTitle?.includes('Auditor') ||
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
          u.email === 'admin@uims.local' ||
          u.email === 'admin@uims.internal' ||
          u.jobTitle?.includes('VP') ||
          u.jobTitle?.includes('Director') ||
          u.jobTitle?.includes('Head') ||
          u.jobTitle?.includes('Counsel') ||
          u.jobTitle?.includes('Controller') ||
          u.jobTitle?.includes('Administrator'),
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

  const seededDirUsers: Record<string, import('@prisma/client').DirectoryUser> = {};
  for (const u of allUsers) {
    seededDirUsers[u.email] = u;
  }

  return {
    users: {
      userAdminLocal: seededDirUsers['admin@uims.local'],
      userAlex: seededDirUsers['admin@uims.internal'],
      userSarah: seededDirUsers['sarah.chen@company.com'],
      userMichael: seededDirUsers['michael.wong@company.com'],
      userMarcusBell: seededDirUsers['compliance@uims.internal'],
      userDavidKim: seededDirUsers['david.kim@company.com'],
      userSophiaPatel: seededDirUsers['sophia.patel@company.com'],
      userLiamNguyen: seededDirUsers['liam.nguyen@company.com'],
      userCarlosMendez: seededDirUsers['carlos.mendez@company.com'],
      userMarcusVance: seededDirUsers['marcus.vance@company.com'],
      userChloeMartin: seededDirUsers['chloe.martin@company.com'],
      userElena: seededDirUsers['elena.rostova@company.com'],
      userRobertTorres: seededDirUsers['robert.torres@company.com'],
      userLisaWang: seededDirUsers['lisa.wang@company.com'],
      userRachelAdams: seededDirUsers['rachel.adams@company.com'],
      userJamesWilson: seededDirUsers['james.wilson@company.com'],
      userHannahScott: seededDirUsers['hannah.scott@company.com'],
      userThomas: seededDirUsers['thomas.wright@company.com'],
      userJessica: seededDirUsers['jessica.taylor@company.com'],
      ...seededDirUsers,
    },
  };
}
