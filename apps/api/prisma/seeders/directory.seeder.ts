import {
  AccountStatus,
  DirectorySource,
  DomainJoinStatus,
  type PrismaClient,
} from '@prisma/client';
import {
  encryptDirectoryPassword,
  generateSecurePassword,
} from '../../src/common/crypto/directory-crypto';
import { enterpriseAdMasterData } from './ad-directory-data';
import type { StaffProfile } from './roles-users.seeder';
import {
  type SeederContext,
  buildLookupMap,
  inTransactionChunks,
  runDomainSeeder,
} from './seeder.utils';

export async function seedDirectory(
  prisma: PrismaClient,
  staffProfiles?: Array<StaffProfile>,
  ctx?: SeederContext,
) {
  return runDomainSeeder(
    'DirectorySeeder',
    '👥',
    'Normalized Corporate Directory for Broadpeak (BSL & BSH)',
    async (logger) => {
      let orgMap = ctx?.organizations;
      let deptMap = ctx?.departments;
      let posMap = ctx?.positions;

      if (
        !orgMap ||
        orgMap.size === 0 ||
        !deptMap ||
        deptMap.size === 0 ||
        !posMap ||
        posMap.size === 0
      ) {
        const [organizations, departments, positions] = await Promise.all([
          prisma.organization.findMany({ take: 50, select: { id: true, code: true, name: true } }),
          prisma.department.findMany({ take: 200, select: { id: true, code: true, name: true } }),
          prisma.position.findMany({ take: 100, select: { id: true, code: true, title: true } }),
        ]);

        orgMap = buildLookupMap(organizations, [(o) => o.code, (o) => o.name]);
        deptMap = buildLookupMap(departments, [(d) => d.code, (d) => d.name]);
        posMap = buildLookupMap(positions, [(p) => p.code, (p) => p.title]);
      }

      const defaultBslOrgId = orgMap.get('BSL') || 'org-bsl';
      const defaultBshOrgId = orgMap.get('BSH') || 'org-bsh';

      // 1. Directory Groups Catalog
      const groupRows = [
        'grp-all-broadpeak|All Broadpeak Workforce|all-workforce@youngonevn.com|Distribution|Universal|OU=Distribution,OU=Groups,OU=Broadpeak,DC=youngone,DC=internal|Doan Minh Tri|Enterprise-wide distribution list across BSL (Soc Trang) and BSH (Ho Chi Minh).',
        'grp-youngone-exec|GR_Youngone_Executive|gr-executive@youngonevn.com|AD Security Group|Global Security|OU=SecurityGroups,OU=Executive,OU=Broadpeak,DC=youngone,DC=internal|Doan Minh Tri|Executive Leadership Security Group.',
        'grp-bsl-factory|GR_BSL_FactoryOperations|gr-bsl-factory@youngonevn.com|AD Security Group|Global Security|OU=SecurityGroups,OU=BSL,OU=Broadpeak,DC=youngone,DC=internal|Tran Van Binh|BSL Soc Trang Factory Operations Security Group.',
        'grp-bsl-it|GR_BSL_IT_Support|gr-bsl-it@youngonevn.com|AD Security Group|Global Security|OU=SecurityGroups,OU=BSL,OU=Broadpeak,DC=youngone,DC=internal|Pham Hoang Nam|BSL Factory IT & Industrial Automation Security Group.',
        'grp-bsh-corp|GR_BSH_CorporateOffice|gr-bsh-corp@youngonevn.com|AD Security Group|Global Security|OU=SecurityGroups,OU=BSH,OU=Broadpeak,DC=youngone,DC=internal|Dang Thanh Phong|BSH Ho Chi Minh Corporate Office Security Group.',
        'grp-bsh-merch|GR_BSH_Merchandising|gr-bsh-merch@youngonevn.com|AD Security Group|Global Security|OU=SecurityGroups,OU=BSH,OU=Broadpeak,DC=youngone,DC=internal|Nguyen Thi Lan|BSH Merchandising & Apparel Sourcing Security Group.',
      ];

      for (const row of groupRows) {
        const [id, name, email, type, scope, ouPath, managedBy, description] = row.split('|');
        await prisma.directoryGroup.upsert({
          where: { id },
          update: { name, email, description, type, scope, ouPath, managedBy },
          create: { id, name, email, description, type, scope, ouPath, managedBy, memberCount: 0 },
        });
      }

      // 2. Unify Candidates
      interface Candidate {
        email: string;
        employeeCode?: string;
        firstName: string;
        lastName: string;
        displayName: string;
        phone?: string;
        status: AccountStatus;
        source: DirectorySource;
        isBSL: boolean;
        orgKey?: string;
        deptKey?: string;
        posKey?: string;
        locKey?: string;
        adGroup?: string;
        computerName?: string;
        adDomain?: string;
        domainJoined: boolean;
        domainJoinStatus: DomainJoinStatus;
        accountExpiresAt?: Date | null;
        seedEmailPassword?: boolean;
        seedAdInitialPassword?: boolean;
      }
      const candidates: Candidate[] = [];

      if (staffProfiles) {
        for (const s of staffProfiles) {
          const isBSL =
            s.organizationCode === 'BSL' || (s.locationId ? s.locationId.includes('bsl') : false);
          let accountStatus: AccountStatus = AccountStatus.ACTIVE;
          if (s.status === 'SUSPENDED') accountStatus = AccountStatus.SUSPENDED;
          else if (s.status === 'DISABLED') accountStatus = AccountStatus.DISABLED;
          else if (s.status === 'LOCKED') accountStatus = AccountStatus.LOCKED;
          else if (s.status === 'INACTIVE') accountStatus = AccountStatus.ACTIVE;

          const joinStatus =
            (s.domainJoinStatus as DomainJoinStatus) ||
            (s.status === 'INACTIVE' ? DomainJoinStatus.PENDING : DomainJoinStatus.JOINED);

          candidates.push({
            email: s.email,
            employeeCode: s.employeeCode,
            firstName: s.firstName,
            lastName: s.lastName,
            displayName: s.displayName,
            phone: s.phone,
            status: accountStatus,
            source: s.source === 'LOCAL' ? DirectorySource.LOCAL : DirectorySource.AZURE_AD,
            isBSL,
            orgKey: s.organizationCode,
            deptKey: s.departmentCode || s.departmentName,
            posKey: s.positionCode || s.jobTitle,
            locKey: s.locationId || s.locationName,
            adGroup: s.adGroup,
            computerName: s.computerName,
            adDomain: s.adDomain || 'youngone.internal',
            domainJoined: s.domainJoined ?? joinStatus === DomainJoinStatus.JOINED,
            domainJoinStatus: joinStatus,
            accountExpiresAt: s.accountExpiresAt || null,
            seedEmailPassword: s.seedEmailPassword ?? true,
            seedAdInitialPassword: s.seedAdInitialPassword ?? true,
          });
        }
      }

      for (const r of enterpriseAdMasterData) {
        const isBSL = r.company.includes('BSL') || r.employeeCode.startsWith('BSL');
        const parts = r.displayName.split(' ');
        let accountStatus: AccountStatus = AccountStatus.ACTIVE;
        if (r.status === 'DISABLED') accountStatus = AccountStatus.DISABLED;
        else if (r.status === 'LOCKED') accountStatus = AccountStatus.LOCKED;
        else if (r.status === 'SUSPENDED') accountStatus = AccountStatus.SUSPENDED;

        const joinStatus = (r.domainJoinStatus as DomainJoinStatus) || DomainJoinStatus.JOINED;

        candidates.push({
          email: r.email,
          employeeCode: r.employeeCode,
          firstName: parts[parts.length - 1] || r.displayName,
          lastName: parts.slice(0, -1).join(' ') || 'Broadpeak',
          displayName: r.displayName,
          phone: r.telephone,
          status: accountStatus,
          source: DirectorySource.AZURE_AD,
          isBSL,
          orgKey: isBSL ? 'BSL' : 'BSH',
          deptKey: r.departmentCode || r.department,
          posKey: r.positionCode || r.jobTitle,
          locKey: r.locationCode,
          adGroup: r.adGroup,
          computerName: r.computerName,
          adDomain: 'youngone.internal',
          domainJoined: joinStatus === DomainJoinStatus.JOINED,
          domainJoinStatus: joinStatus,
          accountExpiresAt: r.accountExpiresAt || null,
          seedEmailPassword: accountStatus === AccountStatus.ACTIVE,
          seedAdInitialPassword: accountStatus === AccountStatus.ACTIVE,
        });
      }

      // 3. Upsert Users in deterministic transaction chunks of 50
      const seededUsersMap = new Map<string, import('@prisma/client').DirectoryUser>();
      const userGroupLinks: Array<{ userEmail: string; groupName: string }> = [];

      const userResults = await inTransactionChunks(prisma, candidates, 50, async (tx, c) => {
        const organizationId =
          (c.orgKey ? orgMap.get(c.orgKey) : null) || (c.isBSL ? defaultBslOrgId : defaultBshOrgId);
        const departmentId =
          (c.deptKey ? deptMap.get(c.deptKey) : null) ||
          (c.isBSL
            ? deptMap.get('DEPT-BSL-MGMT') || deptMap.get('DEPT-BSL-OPS')
            : deptMap.get('DEPT-BSH-EXEC') || deptMap.get('DEPT-BSH-CORP'));
        const positionId =
          (c.posKey ? posMap.get(c.posKey) : null) ||
          (c.isBSL
            ? posMap.get('POS-BSL-GM') || posMap.get('POS-BSL-ADMIN-LEAD')
            : posMap.get('POS-BSH-MD') || posMap.get('POS-BSH-IT-ENG'));

        const emailPassword = c.seedEmailPassword
          ? encryptDirectoryPassword(generateSecurePassword(16))
          : null;
        const emailPasswordUpdatedAt = emailPassword ? new Date() : null;

        const adInitialPassword = c.seedAdInitialPassword
          ? encryptDirectoryPassword(generateSecurePassword(16))
          : null;
        const adInitialPasswordUpdatedAt = adInitialPassword ? new Date() : null;

        return tx.directoryUser.upsert({
          where: { email: c.email },
          update: {
            employeeCode: c.employeeCode || null,
            firstName: c.firstName,
            lastName: c.lastName,
            displayName: c.displayName,
            status: c.status,
            source: c.source,
            phone: c.phone || null,
            organizationId: organizationId || null,
            departmentId: departmentId || null,
            positionId: positionId || null,
            computerName: c.computerName || null,
            adDomain: c.adDomain || 'youngone.internal',
            domainJoined: c.domainJoined,
            domainJoinStatus: c.domainJoinStatus,
            accountExpiresAt: c.accountExpiresAt || null,
            ...(emailPassword ? { emailPassword, emailPasswordUpdatedAt } : {}),
            ...(adInitialPassword ? { adInitialPassword, adInitialPasswordUpdatedAt } : {}),
          },
          create: {
            employeeCode: c.employeeCode || null,
            firstName: c.firstName,
            lastName: c.lastName,
            displayName: c.displayName,
            email: c.email,
            status: c.status,
            source: c.source,
            phone: c.phone || null,
            organizationId: organizationId || null,
            departmentId: departmentId || null,
            positionId: positionId || null,
            computerName: c.computerName || null,
            adDomain: c.adDomain || 'youngone.internal',
            domainJoined: c.domainJoined,
            domainJoinStatus: c.domainJoinStatus,
            accountExpiresAt: c.accountExpiresAt || null,
            emailPassword,
            emailPasswordUpdatedAt,
            adInitialPassword,
            adInitialPasswordUpdatedAt,
          },
        });
      });

      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const user = userResults[i];
        seededUsersMap.set(c.email, user);
        if (ctx) {
          ctx.directoryUsers.set(c.email, user.id);
          ctx.directoryUsers.set(user.id, user.id);
        }
        if (c.adGroup) userGroupLinks.push({ userEmail: c.email, groupName: c.adGroup });
        userGroupLinks.push({ userEmail: c.email, groupName: 'All Broadpeak Workforce' });
      }

      // 4. Link Memberships and Update Counts
      const allGroups = await prisma.directoryGroup.findMany({ take: 50 });
      const groupByName = new Map(allGroups.map((g) => [g.name, g.id]));

      const membershipData = userGroupLinks
        .map(({ userEmail, groupName }) => {
          const groupId = groupByName.get(groupName);
          const user = seededUsersMap.get(userEmail);
          return groupId && user ? { userId: user.id, groupId } : null;
        })
        .filter((m): m is { userId: string; groupId: string } => m !== null);

      await prisma.directoryMembership.createMany({
        data: membershipData,
        skipDuplicates: true,
      });

      await prisma.$transaction(async (tx) => {
        for (const g of allGroups) {
          const count = await tx.directoryMembership.count({ where: { groupId: g.id } });
          await tx.directoryGroup.update({ where: { id: g.id }, data: { memberCount: count } });
        }
      });

      logger.log(
        `✅ Seeded ${seededUsersMap.size} Directory Users and ${allGroups.length} Groups across BSL & BSH.`,
      );

      const firstUser = Array.from(seededUsersMap.values())[0]!;

      return {
        users: {
          userAdminLocal: seededUsersMap.get('admin@youngonevn.com') || firstUser,
          userAdmin: seededUsersMap.get('admin@youngonevn.com') || firstUser,
          userManager: seededUsersMap.get('manager@youngonevn.com') || firstUser,
          userUser: seededUsersMap.get('user@youngonevn.com') || firstUser,
          userViewer: seededUsersMap.get('viewer@youngonevn.com') || firstUser,
          ...Object.fromEntries(seededUsersMap.entries()),
        },
        groups: groupRows.map((row) => {
          const [id, name, email, type, scope, ouPath, managedBy, description] = row.split('|');
          return { id, name, email, type, scope, ouPath, managedBy, description };
        }),
      };
    },
  );
}
