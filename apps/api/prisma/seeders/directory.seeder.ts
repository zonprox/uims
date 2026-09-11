import { Logger } from '@nestjs/common';
import { AccountStatus, DirectorySource, type PrismaClient } from '@prisma/client';
import { enterpriseAdMasterData } from './ad-directory-data';
import type { StaffProfile } from './roles-users.seeder';

const logger = new Logger('DirectorySeeder');

export async function seedDirectory(prisma: PrismaClient, staffProfiles?: Array<StaffProfile>) {
  logger.log('👥 Seeding Normalized Corporate Directory for Broadpeak (BSL & BSH)...');

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
    if (loc.code) locMap.set(loc.code, loc.id);
    locMap.set(loc.id, loc.id);
    locMap.set(loc.name.toLowerCase(), loc.id);
  }

  const defaultBslOrgId = orgMap.get('BSL') || organizations[0]?.id;
  const defaultBshOrgId = orgMap.get('BSH') || organizations[1]?.id || defaultBslOrgId;
  const defaultBslLocId = locMap.get('loc-bsl-st') || locMap.get('BSL-ST') || locations[0]?.id;
  const defaultBshLocId = locMap.get('loc-bsh-d7') || locMap.get('HCM-D7') || defaultBslLocId;

  // 2. Directory Groups Catalog
  const directoryGroups = [
    {
      id: 'grp-all-broadpeak',
      name: 'All Broadpeak Workforce',
      email: 'all-workforce@broadpeak.youngone.com',
      type: 'Distribution',
      scope: 'Universal',
      ouPath: 'OU=Distribution,OU=Groups,OU=Broadpeak,DC=youngone,DC=internal',
      managedBy: 'Doan Minh Tri',
      description:
        'Enterprise-wide distribution list across BSL (Soc Trang) and BSH (Ho Chi Minh).',
    },
    {
      id: 'grp-youngone-exec',
      name: 'GR_Youngone_Executive',
      email: 'gr-executive@broadpeak.youngone.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=Executive,OU=Broadpeak,DC=youngone,DC=internal',
      managedBy: 'Doan Minh Tri',
      description: 'Executive Leadership Security Group.',
    },
    {
      id: 'grp-bsl-factory',
      name: 'GR_BSL_FactoryOperations',
      email: 'gr-bsl-factory@broadpeak.youngone.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=BSL,OU=Broadpeak,DC=youngone,DC=internal',
      managedBy: 'Tran Van Binh',
      description: 'BSL Soc Trang Factory Operations Security Group.',
    },
    {
      id: 'grp-bsl-it',
      name: 'GR_BSL_IT_Support',
      email: 'gr-bsl-it@broadpeak.youngone.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=BSL,OU=Broadpeak,DC=youngone,DC=internal',
      managedBy: 'Pham Hoang Nam',
      description: 'BSL Factory IT & Industrial Automation Security Group.',
    },
    {
      id: 'grp-bsh-corp',
      name: 'GR_BSH_CorporateOffice',
      email: 'gr-bsh-corp@broadpeak.youngone.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=BSH,OU=Broadpeak,DC=youngone,DC=internal',
      managedBy: 'Dang Thanh Phong',
      description: 'BSH Ho Chi Minh Corporate Office Security Group.',
    },
    {
      id: 'grp-bsh-merch',
      name: 'GR_BSH_Merchandising',
      email: 'gr-bsh-merch@broadpeak.youngone.com',
      type: 'AD Security Group',
      scope: 'Global Security',
      ouPath: 'OU=SecurityGroups,OU=BSH,OU=Broadpeak,DC=youngone,DC=internal',
      managedBy: 'Nguyen Thi Lan',
      description: 'BSH Merchandising & Apparel Sourcing Security Group.',
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
      create: { ...dg, memberCount: 0 },
    });
  }

  const seededUsersMap = new Map<string, import('@prisma/client').DirectoryUser>();
  const userGroupLinks: Array<{ userEmail: string; groupName: string }> = [];

  // 3. Seed Corporate Staff Profiles (from roles-users.seeder)
  if (staffProfiles && staffProfiles.length > 0) {
    for (const s of staffProfiles) {
      const status = s.status === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.DISABLED;
      const isBSL = s.organizationCode === 'BSL' || (s.locationId && s.locationId.includes('bsl'));
      const organizationId =
        (s.organizationCode ? orgMap.get(s.organizationCode) : null) ||
        (isBSL ? defaultBslOrgId : defaultBshOrgId);
      const departmentId = (s.departmentCode ? deptMap.get(s.departmentCode) : null) || null;
      const positionId =
        (s.positionCode ? posMap.get(s.positionCode) : null) ||
        (s.jobTitle ? posMap.get(s.jobTitle.toLowerCase()) : null) ||
        null;
      const locationId =
        (s.locationId ? locMap.get(s.locationId) : null) ||
        (s.locationName ? locMap.get(s.locationName.toLowerCase()) : null) ||
        (isBSL ? defaultBslLocId : defaultBshLocId);

      const user = await prisma.directoryUser.upsert({
        where: { email: s.email },
        update: {
          employeeCode: s.employeeCode || null,
          firstName: s.firstName,
          lastName: s.lastName,
          displayName: s.displayName,
          status,
          source: s.source === 'LOCAL' ? DirectorySource.LOCAL : DirectorySource.AZURE_AD,
          phone: s.phone || null,
          ouPath: s.ouPath || null,
          organizationId,
          departmentId,
          positionId,
          locationId,
        },
        create: {
          employeeCode: s.employeeCode || null,
          firstName: s.firstName,
          lastName: s.lastName,
          displayName: s.displayName,
          email: s.email,
          status,
          source: s.source === 'LOCAL' ? DirectorySource.LOCAL : DirectorySource.AZURE_AD,
          phone: s.phone || null,
          ouPath: s.ouPath || null,
          organizationId,
          departmentId,
          positionId,
          locationId,
        },
      });

      seededUsersMap.set(s.email, user);
      if (s.adGroup) {
        userGroupLinks.push({ userEmail: s.email, groupName: s.adGroup });
      }
      userGroupLinks.push({ userEmail: s.email, groupName: 'All Broadpeak Workforce' });
    }
  }

  // 4. Seed Directory Records from Active Directory Data
  for (const r of enterpriseAdMasterData) {
    const isBSL = r.company.includes('BSL') || r.employeeCode.startsWith('BSL');
    const organizationId = isBSL ? defaultBslOrgId : defaultBshOrgId;
    const locationId = isBSL ? defaultBslLocId : defaultBshLocId;
    const departmentId = deptMap.get(r.department.toLowerCase()) || null;
    const positionId = posMap.get(r.jobTitle.toLowerCase()) || null;

    const parts = r.displayName.split(' ');
    const firstName = parts[parts.length - 1] || r.displayName;
    const lastName = parts.slice(0, -1).join(' ') || 'Broadpeak';

    const user = await prisma.directoryUser.upsert({
      where: { email: r.email },
      update: {
        employeeCode: r.employeeCode,
        firstName,
        lastName,
        displayName: r.displayName,
        status: r.status === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.DISABLED,
        source: DirectorySource.ACTIVE_DIRECTORY,
        phone: r.telephone,
        organizationId,
        departmentId,
        positionId,
        locationId,
      },
      create: {
        employeeCode: r.employeeCode,
        firstName,
        lastName,
        displayName: r.displayName,
        email: r.email,
        status: r.status === 'ACTIVE' ? AccountStatus.ACTIVE : AccountStatus.DISABLED,
        source: DirectorySource.ACTIVE_DIRECTORY,
        phone: r.telephone,
        organizationId,
        departmentId,
        positionId,
        locationId,
      },
    });

    seededUsersMap.set(r.email, user);
    if (r.adGroup) {
      userGroupLinks.push({ userEmail: r.email, groupName: r.adGroup });
    }
    userGroupLinks.push({ userEmail: r.email, groupName: 'All Broadpeak Workforce' });
  }

  // 5. Link Users to Groups and update member counts
  const allGroups = await prisma.directoryGroup.findMany();
  const groupByName = new Map<string, string>();
  for (const g of allGroups) {
    groupByName.set(g.name, g.id);
  }

  for (const link of userGroupLinks) {
    const groupId = groupByName.get(link.groupName);
    const user = seededUsersMap.get(link.userEmail);
    if (!groupId || !user) continue;

    try {
      await prisma.directoryMembership.upsert({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          groupId,
        },
      });
    } catch (err: unknown) {
      logger.debug(`Skipped duplicate membership: ${String(err)}`);
    }
  }

  // Update member count on each group
  for (const g of allGroups) {
    const count = await prisma.directoryMembership.count({
      where: { groupId: g.id },
    });
    await prisma.directoryGroup.update({
      where: { id: g.id },
      data: { memberCount: count },
    });
  }

  logger.log(
    `✅ Seeded ${seededUsersMap.size} Directory Users and ${allGroups.length} Groups across BSL & BSH.`,
  );

  const firstUser = Array.from(seededUsersMap.values())[0]!;
  const bslUser =
    Array.from(seededUsersMap.values()).find((u) => u.employeeCode?.startsWith('BSL')) || firstUser;
  const bshUser =
    Array.from(seededUsersMap.values()).find((u) => u.employeeCode?.startsWith('BSH')) || firstUser;

  return {
    users: {
      userAdminLocal: seededUsersMap.get('admin@uims.local') || firstUser,
      userAlex: seededUsersMap.get('admin@uims.internal') || firstUser,
      userSarah: seededUsersMap.get('nam.pham@broadpeak.youngone.com') || bslUser,
      userMichael: seededUsersMap.get('phong.dang@broadpeak.youngone.com') || bshUser,
      userMarcusBell: seededUsersMap.get('ngoc.vu@broadpeak.youngone.com') || bshUser,
      userDavidKim: seededUsersMap.get('kien.le@broadpeak.youngone.com') || bshUser,
      userSophiaPatel: seededUsersMap.get('lan.nguyen@broadpeak.youngone.com') || bshUser,
      userLiamNguyen: seededUsersMap.get('son.huynh@broadpeak.youngone.com') || bslUser,
      userCarlosMendez: seededUsersMap.get('thu.le@broadpeak.youngone.com') || bslUser,
      userMarcusVance: seededUsersMap.get('tuan.hoang@broadpeak.youngone.com') || bshUser,
      userChloeMartin: seededUsersMap.get('phuong.bui@broadpeak.youngone.com') || bshUser,
      userElena: seededUsersMap.get('huy.nguyen@broadpeak.youngone.com') || bslUser,
      userRobertTorres: seededUsersMap.get('kim.vo@broadpeak.youngone.com') || bslUser,
      userLisaWang: seededUsersMap.get('chau.dang@broadpeak.youngone.com') || bslUser,
      userRachelAdams: seededUsersMap.get('binh.tran@broadpeak.youngone.com') || bslUser,
      userJamesWilson: bslUser,
      userHannahScott: bshUser,
      userThomas: bslUser,
      userJessica: bshUser,
      ...Object.fromEntries(seededUsersMap.entries()),
    },
    groups: directoryGroups,
  };
}
