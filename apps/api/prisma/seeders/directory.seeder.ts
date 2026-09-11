import { Logger } from '@nestjs/common';
import { AccountStatus, DirectorySource, type PrismaClient } from '@prisma/client';
import { enterpriseAdMasterData } from './ad-directory-data';
import type { StaffProfile } from './roles-users.seeder';

const logger = new Logger('DirectorySeeder');

export async function seedDirectory(prisma: PrismaClient, staffProfiles?: Array<StaffProfile>) {
  logger.log('👥 Seeding Normalized Corporate Directory (DirectoryUser & Groups)...');

  // 1. Fetch relational master data to resolve foreign keys
  const [organizations, departments, positions, locations] = await Promise.all([
    prisma.organization.findMany(),
    prisma.department.findMany(),
    prisma.position.findMany(),
    prisma.location.findMany(),
  ]);

  const orgMap = new Map<string, string>();
  for (const org of organizations) {
    orgMap.set(org.code, org.id);
    orgMap.set(org.id, org.id);
    orgMap.set(org.name.toLowerCase(), org.id);
  }

  const deptMap = new Map<string, string>();
  for (const dept of departments) {
    deptMap.set(dept.code, dept.id);
    deptMap.set(dept.id, dept.id);
    deptMap.set(dept.name.toLowerCase(), dept.id);
  }

  const posMap = new Map<string, string>();
  for (const pos of positions) {
    posMap.set(pos.code, pos.id);
    posMap.set(pos.id, pos.id);
    posMap.set(pos.title.toLowerCase(), pos.id);
  }

  const locMap = new Map<string, string>();
  for (const loc of locations) {
    if (loc.code) {
      locMap.set(loc.code, loc.id);
    }
    locMap.set(loc.id, loc.id);
    locMap.set(loc.name.toLowerCase(), loc.id);
  }

  const defaultOrgId = orgMap.get('ACME-US') || organizations[0]?.id;
  const apacOrgId = orgMap.get('ACME-APAC') || defaultOrgId;
  const defaultDeptId = deptMap.get('DEPT-IT') || departments[0]?.id;
  const defaultLocId = locMap.get('loc-ny-f4') || locations[0]?.id;

  // 2. Directory Groups Catalog
  const directoryGroups = [
    {
      id: 'grp-all-company',
      name: 'All Company Employees',
      email: 'all-employees@company.com',
      type: 'Distribution',
      scope: 'Universal / Global Distribution',
      ouPath: 'OU=Distribution,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Rachel Adams (Head of People Operations)',
      description: 'Enterprise-wide distribution list for the entire global workforce.',
    },
    {
      id: 'grp-engineering-core',
      name: 'Engineering & DevOps Core',
      email: 'engineering-core@company.com',
      type: 'Security',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'David Kim (Lead Cloud Architect)',
      description: 'Software engineers, cloud architects, and site reliability engineers.',
    },
    {
      id: 'grp-it-infrastructure',
      name: 'IT Infrastructure & Operations',
      email: 'it-ops@company.com',
      type: 'Security',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Robert Torres (IT Infrastructure Operations Manager)',
      description: 'Systems administration, network engineering, and data center operations.',
    },
    {
      id: 'grp-security-sirt',
      name: 'Security Incident Response Team (SIRT)',
      email: 'security-response@company.com',
      type: 'Security',
      scope: 'Restricted / Security High',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Sarah Chen (Senior Systems Administrator)',
      description: 'SecOps engineers, compliance auditors, and security coordinators.',
    },
    {
      id: 'grp-product-design',
      name: 'Product Design & UX Research',
      email: 'product-design@company.com',
      type: 'Distribution',
      scope: 'Internal Only',
      ouPath: 'OU=Distribution,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Marcus Vance (Principal Product Designer)',
      description: 'Design systems specialists, UI/UX designers, and researchers.',
    },
    {
      id: 'grp-growth-marketing',
      name: 'Growth Marketing & Public Relations',
      email: 'press-media@company.com',
      type: 'Distribution',
      scope: 'Public / External Allowed',
      ouPath: 'OU=Distribution,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Elena Rostova (Director of Growth Marketing)',
      description: 'Marketing campaigns, brand communications, and public relations.',
    },
    {
      id: 'grp-finance-procure',
      name: 'Finance & Hardware Procurement',
      email: 'procurement-finance@company.com',
      type: 'Security',
      scope: 'Internal Only',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Lisa Wang (Financial Controller)',
      description: 'Asset budgets, software renewals, accounting, and vendor contracts.',
    },
    {
      id: 'grp-executive-steering',
      name: 'Executive Steering Committee',
      email: 'executive-leadership@company.com',
      type: 'Security',
      scope: 'Confidential / Board Level',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Alex Johnson (VP of Information Technology)',
      description: 'Executive Vice Presidents, Directors, and Legal Counsel.',
    },
    {
      id: 'grp-hq-exec-leadership',
      name: 'GR_HQ_ExecutiveLeadership',
      email: 'hq-exec@company.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Alex Johnson (VP of Information Technology)',
      description: 'HQ Executive Leadership Security Group.',
    },
    {
      id: 'grp-hq-it-infra',
      name: 'GR_HQ_ITInfrastructure',
      email: 'hq-it-infra@company.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Robert Torres (IT Infrastructure Operations Manager)',
      description: 'HQ IT Infrastructure Security Group.',
    },
    {
      id: 'grp-hq-eng-core',
      name: 'GR_HQ_EngineeringCore',
      email: 'hq-eng-core@company.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'David Kim (Lead Cloud Architect)',
      description: 'HQ Engineering Core Security Group.',
    },
    {
      id: 'grp-hq-sec-compliance',
      name: 'GR_HQ_SecurityCompliance',
      email: 'hq-sec-compliance@company.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Marcus Bell (Principal Security Compliance Auditor)',
      description: 'HQ Security & Compliance Security Group.',
    },
    {
      id: 'grp-hq-product-design',
      name: 'GR_HQ_ProductDesign',
      email: 'hq-product-design@company.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Marcus Vance (Principal Product Designer)',
      description: 'HQ Product Design Security Group.',
    },
    {
      id: 'grp-hq-growth-marketing',
      name: 'GR_HQ_GrowthMarketing',
      email: 'hq-growth-marketing@company.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Elena Rostova (Director of Growth Marketing)',
      description: 'HQ Growth Marketing Security Group.',
    },
    {
      id: 'grp-hq-finance-procure',
      name: 'GR_HQ_FinanceProcurement',
      email: 'hq-finance-procure@company.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Lisa Wang (Financial Controller)',
      description: 'HQ Finance & Procurement Security Group.',
    },
    {
      id: 'grp-hq-people-ops',
      name: 'GR_HQ_PeopleOps',
      email: 'hq-people-ops@company.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Groups,OU=HQ,DC=uims,DC=internal',
      managedBy: 'Rachel Adams (Head of People Operations)',
      description: 'HQ People Operations Security Group.',
    },
    // Production Plant Active Directory Security Groups
    {
      id: 'grp-ad-bsloth-printing',
      name: 'GR_BSLOTHPrinting',
      email: 'gr-bsloth-printing@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Printing,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Phung Thi Nhu Y (Asst. Officer)',
      description: 'Production Printing Division Active Directory Security Group.',
    },
    {
      id: 'grp-ad-bsloth-sample',
      name: 'GR_BSLOTHSample',
      email: 'gr-bsloth-sample@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Sample,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Nguyen Doan Quang Huy (Asst. Manager)',
      description: 'Sample Development and Pattern Marker Security Group.',
    },
    {
      id: 'grp-ad-bsloth-embroidery',
      name: 'GR_BSLOTHLogo Embroidery',
      email: 'gr-bsloth-embroidery@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Embroidery,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Huynh Kim Ngan (Chief of Section)',
      description: 'Logo Embroidery Division Active Directory Security Group.',
    },
    {
      id: 'grp-ad-bsl1-prod-office',
      name: 'GR_BSL1Production Office',
      email: 'gr-bsl1-prod-office@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Operations,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Le Thi Kim Chi (Junior Technician)',
      description: 'BSL-1 Plant Production Office Operations Security Group.',
    },
    {
      id: 'grp-ad-bsl1-cutting',
      name: 'GR_BSL1Cutting',
      email: 'gr-bsl1-cutting@youngonevn.com',
      type: 'AD Security Group',
      scope: 'Domain Local Security',
      ouPath: 'OU=SecurityGroups,OU=Cutting,OU=Plant1,DC=company,DC=internal',
      managedBy: 'Son Thi Ngoc Huyen (Junior Supervisor)',
      description: 'BSL-1 Plant Cutting Operations Active Directory Security Group.',
    },
  ];

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

  // In-memory record tracking for group membership assignment
  const userGroupLinks: Array<{ userEmail: string; groupName: string }> = [];

  // 3. Seed Corporate Staff Profiles (Resolved Relational Foreign Keys)
  if (staffProfiles && staffProfiles.length > 0) {
    for (const s of staffProfiles) {
      const status: AccountStatus =
        s.status === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.DISABLED;

      // Resolve relational foreign keys
      const organizationId =
        (s.organizationCode ? orgMap.get(s.organizationCode) : null) || defaultOrgId;
      const departmentId =
        (s.departmentCode ? deptMap.get(s.departmentCode) : null) || defaultDeptId;
      const positionId =
        (s.positionCode ? posMap.get(s.positionCode) : null) ||
        (s.jobTitle ? posMap.get(s.jobTitle.toLowerCase()) : null) ||
        null;
      const locationId =
        (s.locationId ? locMap.get(s.locationId) : null) ||
        (s.locationName ? locMap.get(s.locationName.toLowerCase()) : null) ||
        defaultLocId;

      await prisma.directoryUser.upsert({
        where: { email: s.email },
        update: {
          employeeCode: s.employeeCode || null,
          firstName: s.firstName,
          lastName: s.lastName,
          displayName: s.displayName,
          phone: s.phone || null,
          ouPath: s.ouPath || 'OU=Management,OU=HQ,DC=uims,DC=internal',
          status,
          source: (s.source as DirectorySource) || DirectorySource.LOCAL,
          organizationId,
          departmentId,
          positionId,
          locationId,
        },
        create: {
          email: s.email,
          employeeCode: s.employeeCode || null,
          firstName: s.firstName,
          lastName: s.lastName,
          displayName: s.displayName,
          phone: s.phone || null,
          ouPath: s.ouPath || 'OU=Management,OU=HQ,DC=uims,DC=internal',
          status,
          source: (s.source as DirectorySource) || DirectorySource.LOCAL,
          organizationId,
          departmentId,
          positionId,
          locationId,
        },
      });

      if (s.adGroup) {
        userGroupLinks.push({ userEmail: s.email, groupName: s.adGroup });
      }
    }
  }

  // 4. Seed Production Active Directory Dataset (Relational Resolution)
  for (const ad of enterpriseAdMasterData) {
    const nameParts = ad.displayName.trim().split(' ');
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

    const sectionName = (ad.section || 'Operations').toLowerCase();
    let defaultOuPath = 'OU=Operations,OU=Plant1,DC=company,DC=internal';
    let defaultManagerName = 'Operations Division Head';

    if (sectionName.includes('printing')) {
      defaultOuPath = 'OU=Printing,OU=Production,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Phung Thi Nhu Y (Asst. Officer)';
    } else if (sectionName.includes('sample')) {
      defaultOuPath = 'OU=Sample,OU=Production,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Nguyen Doan Quang Huy (Asst. Manager)';
    } else if (sectionName.includes('embroidery')) {
      defaultOuPath = 'OU=Embroidery,OU=Production,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Huynh Kim Ngan (Chief of Section)';
    } else if (sectionName.includes('cutting')) {
      defaultOuPath = 'OU=Cutting,OU=Production,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Son Thi Ngoc Huyen (Junior Supervisor)';
    } else if (sectionName.includes('production') || sectionName.includes('office')) {
      defaultOuPath = 'OU=Operations,OU=Plant1,DC=company,DC=internal';
      defaultManagerName = 'Le Thi Kim Chi (Junior Technician)';
    }

    const organizationId = apacOrgId;
    const departmentId = deptMap.get('DEPT-IT-OPS') || deptMap.get('DEPT-IT') || defaultDeptId;
    const positionId = posMap.get(ad.jobTitle.toLowerCase()) || null;
    const locationId = locMap.get('BSL-ST') || locMap.get('loc-bsl-st') || defaultLocId;

    const isClosed = Boolean(ad.isClosed);
    const status: AccountStatus = isClosed ? AccountStatus.DISABLED : AccountStatus.ACTIVE;

    await prisma.directoryUser.upsert({
      where: { email: ad.email },
      update: {
        employeeCode: ad.employeeCode,
        firstName,
        lastName,
        displayName: ad.displayName,
        phone: ad.telephone ? `+84 ${ad.telephone}` : `+84 28 3810 ${ad.employeeCode.slice(-4)}`,
        ouPath: defaultOuPath,
        managerName: defaultManagerName,
        status,
        source: DirectorySource.LDAP,
        organizationId,
        departmentId,
        positionId,
        locationId,
      },
      create: {
        email: ad.email,
        employeeCode: ad.employeeCode,
        firstName,
        lastName,
        displayName: ad.displayName,
        phone: ad.telephone ? `+84 ${ad.telephone}` : `+84 28 3810 ${ad.employeeCode.slice(-4)}`,
        ouPath: defaultOuPath,
        managerName: defaultManagerName,
        status,
        source: DirectorySource.LDAP,
        organizationId,
        departmentId,
        positionId,
        locationId,
      },
    });

    if (ad.adGroup) {
      userGroupLinks.push({ userEmail: ad.email, groupName: ad.adGroup });
    }
  }

  // 5. Build Relational Directory Memberships
  const allUsers = await prisma.directoryUser.findMany({
    include: { department: true, position: true },
    take: 10000,
  });

  const userByEmail = new Map(allUsers.map((u) => [u.email, u]));

  // Link AD security groups from parsed manifest
  for (const link of userGroupLinks) {
    const user = userByEmail.get(link.userEmail);
    const targetGroup = directoryGroups.find((g) => g.name === link.groupName);
    if (user && targetGroup) {
      await prisma.directoryMembership.upsert({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: targetGroup.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          groupId: targetGroup.id,
        },
      });
    }
  }

  // Link functional distribution groups relationally
  for (const group of directoryGroups) {
    let eligibleUsers: typeof allUsers = [];

    if (group.id === 'grp-all-company') {
      eligibleUsers = allUsers.filter((u) => u.status === AccountStatus.ACTIVE);
    } else if (group.id === 'grp-engineering-core') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department?.code === 'DEPT-ENG' ||
          u.department?.name.toLowerCase().includes('engineering') ||
          u.position?.title.toLowerCase().includes('engineer') ||
          u.position?.title.toLowerCase().includes('architect'),
      );
    } else if (group.id === 'grp-it-infrastructure') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department?.code === 'DEPT-IT' ||
          u.department?.name.toLowerCase().includes('it') ||
          u.position?.title.toLowerCase().includes('administrator') ||
          u.position?.title.toLowerCase().includes('network'),
      );
    } else if (group.id === 'grp-security-sirt') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department?.code === 'DEPT-SEC' ||
          u.department?.name.toLowerCase().includes('security') ||
          u.position?.title.toLowerCase().includes('auditor') ||
          u.position?.title.toLowerCase().includes('security'),
      );
    } else if (group.id === 'grp-product-design') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department?.code === 'DEPT-DES' ||
          u.department?.name.toLowerCase().includes('product') ||
          u.department?.name.toLowerCase().includes('design') ||
          u.position?.title.toLowerCase().includes('design') ||
          u.position?.title.toLowerCase().includes('ux'),
      );
    } else if (group.id === 'grp-growth-marketing') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department?.code === 'DEPT-MKT' ||
          u.department?.code === 'DEPT-SALES' ||
          u.department?.name.toLowerCase().includes('marketing') ||
          u.department?.name.toLowerCase().includes('sales'),
      );
    } else if (group.id === 'grp-finance-procure') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.department?.code === 'DEPT-FIN' || u.department?.name.toLowerCase().includes('finance'),
      );
    } else if (group.id === 'grp-executive-steering') {
      eligibleUsers = allUsers.filter(
        (u) =>
          u.email === 'admin@uims.local' ||
          u.email === 'admin@uims.internal' ||
          (u.position?.title &&
            (u.position.title.includes('VP') ||
              u.position.title.includes('Director') ||
              u.position.title.includes('Head') ||
              u.position.title.includes('Counsel') ||
              u.position.title.includes('Controller'))),
      );
    }

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

    const memberCount = await prisma.directoryMembership.count({
      where: { groupId: group.id },
    });
    await prisma.directoryGroup.update({
      where: { id: group.id },
      data: { memberCount },
    });
  }

  const seededDirUsers: Record<string, import('@prisma/client').DirectoryUser> = {};
  for (const u of allUsers) {
    seededDirUsers[u.email] = u;
  }

  logger.log(
    `✅ Seeded ${allUsers.length} normalized directory users and ${directoryGroups.length} directory groups.`,
  );

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
