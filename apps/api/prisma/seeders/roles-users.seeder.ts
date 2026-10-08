import type { PrismaClient } from '@prisma/client';
import { type SeederContext, getSeedCredentials, runDomainSeeder } from './seeder.utils';

export interface StaffProfile {
  email: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string;
  status?: string;
  source?: string;
  organizationCode?: string;
  departmentCode?: string;
  departmentName?: string;
  positionCode?: string;
  locationId?: string;
  locationName?: string;
  jobTitle?: string;
  adGroup?: string;
}

export async function seedRolesAndUsers(prisma: PrismaClient, ctx?: SeederContext) {
  return runDomainSeeder(
    'RolesUsersSeeder',
    '👤',
    'Roles and System Operator Accounts (AppUser)',
    async (logger) => {
      // 1. Password Hashes: Salted bcrypt (12 rounds) strictly adhering to AGENTS.md
      const { adminPasswordHash, defaultPasswordHash } = await getSeedCredentials();

      // 2. Standard Roles Catalog
      const rolesData = [
        'Admin|System & Infrastructure Administrator with full governance, operational management, and configuration privileges across Broadpeak.',
        'Manager|Operations and Department Lead with operational oversight, record updates, review, and reporting privileges for assigned units.',
        'User|Standard Enterprise User with baseline self-service directory profile access, assigned hardware, and license visibility.',
        'Viewer|Read-Only Observer & Auditor with inspection-only visibility across enterprise assets, licenses, inventory, directory, and reports.',
      ];

      const seededRoles: Record<string, import('@prisma/client').Role> = {};
      for (const row of rolesData) {
        const [name, description] = row.split('|');
        const role = await prisma.role.upsert({
          where: { name },
          update: { description },
          create: { name, description },
        });
        seededRoles[name] = role;
        if (ctx) {
          ctx.roles.set(name, role.id);
          ctx.roles.set(role.id, role.id);
        }
      }

      // 3. Permissions Catalog
      const subjects = [
        'Asset',
        'License',
        'User',
        'Group',
        'Role',
        'Organization',
        'Network',
        'Inventory',
        'Audit',
        'Report',
        'Setting',
      ] as const;
      const actions = ['create', 'read', 'update', 'delete', 'export', 'manage'] as const;

      const seededPermissionsMap = new Map<string, string>();
      for (const subject of subjects) {
        for (const action of actions) {
          const key = `${subject}:${action}`;
          const perm = await prisma.permission.upsert({
            where: { action_subject: { action, subject } },
            update: {},
            create: { action, subject },
          });
          seededPermissionsMap.set(key, perm.id);
        }
      }

      // 4. Role Permission Mapping with Least-Privilege
      const allKeys = Array.from(seededPermissionsMap.keys());
      const roleRules: Record<string, (k: string) => boolean> = {
        Admin: () => true,
        Manager: (k) => {
          const [subject, action] = k.split(':');
          if (action === 'delete') return false;
          if (['Asset', 'License', 'Inventory', 'Report'].includes(subject)) return true;
          if (['Organization', 'Network', 'Audit', 'Group'].includes(subject))
            return ['read', 'export'].includes(action);
          if (subject === 'User') return ['read', 'update', 'export'].includes(action);
          if (['Role', 'Setting'].includes(subject)) return action === 'read';
          return false;
        },
        User: (k) => {
          const [subject, action] = k.split(':');
          const allowed = [
            'Asset',
            'License',
            'Inventory',
            'User',
            'Group',
            'Organization',
            'Report',
          ];
          if (allowed.includes(subject) && action === 'read') return true;
          return (subject === 'User' || subject === 'Asset') && action === 'update';
        },
        Viewer: (k) => {
          const [subject, action] = k.split(':');
          const allowed = [
            'Asset',
            'License',
            'Inventory',
            'User',
            'Group',
            'Organization',
            'Network',
            'Audit',
            'Report',
          ];
          return allowed.includes(subject) && action === 'read';
        },
      };

      const rolePermRows: Array<{ roleId: string; permissionId: string }> = [];
      for (const [roleName, filterFn] of Object.entries(roleRules)) {
        const role = seededRoles[roleName];
        if (!role) continue;
        const assignedKeys = allKeys.filter(filterFn);

        for (const key of assignedKeys) {
          const permId = seededPermissionsMap.get(key);
          if (permId) rolePermRows.push({ roleId: role.id, permissionId: permId });
        }
      }
      await prisma.rolePermission.createMany({ data: rolePermRows, skipDuplicates: true });

      // 5. Broadpeak Core Staff Data (18 Operator Accounts)
      const staffRows = [
        'admin|admin@youngonevn.com|YON-001|Enterprise|Admin|Enterprise Admin (Youngone / Broadpeak)|Youngone Enterprise IT Administrator|Admin|BSH|DEPT-BSH-IT|POS-BSH-IT-ARCH|loc-bsh-d7|GR_Youngone_Executive|+84 (28) 3997-8001|OU=EnterpriseAdmin,OU=Broadpeak,DC=youngone,DC=internal|LOCAL',
        'manager|manager@youngonevn.com|YON-002|Operations|Manager|Operations Manager (Youngone)|Operations & Department Lead|Manager|BSH|DEPT-BSH-CORP|POS-BSH-CORP-DIR|loc-bsh-d7|GR_Youngone_Executive|+84 (28) 3997-8002|OU=Operations,OU=Broadpeak,DC=youngone,DC=internal|LOCAL',
        'user|user@youngonevn.com|YON-003|Standard|User|Standard User (Youngone)|Enterprise IT Specialist|User|BSL|DEPT-BSL-IT|POS-BSL-IT-SPEC|loc-bsl-st|GR_BSL_FactoryOperations|+84 (299) 387-9003|OU=Staff,OU=Broadpeak,DC=youngone,DC=internal|LOCAL',
        'viewer|viewer@youngonevn.com|YON-004|Compliance|Viewer|Compliance Viewer (Youngone)|Read-Only Auditor & Observer|Viewer|BSH|DEPT-BSH-FIN|POS-BSH-FIN-CTRL|loc-bsh-d7|GR_BSH_CorporateOffice|+84 (28) 3997-8004|OU=Audit,OU=Broadpeak,DC=youngone,DC=internal|LOCAL',
        'binh.tran|binh.tran@youngonevn.com|BSL-001|Binh|Tran Van|Tran Van Binh|Factory General Director|Manager|BSL|DEPT-BSL-MGMT|POS-BSL-GM|loc-bsl-st|GR_BSL_FactoryOperations|+84 (299) 387-9001|OU=Executive,OU=BSL,DC=youngone,DC=internal|LOCAL',
        'nam.pham|nam.pham@youngonevn.com|BSL-002|Nam|Pham Hoang|Pham Hoang Nam|Factory IT Manager|Admin|BSL|DEPT-BSL-IT|POS-BSL-IT-MGR|loc-bsl-st|GR_BSL_IT_Support|+84 (299) 387-9002|OU=IT,OU=BSL,DC=youngone,DC=internal|LOCAL',
        'son.huynh|son.huynh@youngonevn.com|BSL-003|Son|Huynh Thanh|Huynh Thanh Son|Industrial IT & Automation Specialist|User|BSL|DEPT-BSL-IT|POS-BSL-IT-SPEC|loc-bsl-st|GR_BSL_IT_Support|+84 (299) 387-9003|OU=IT,OU=BSL,DC=youngone,DC=internal|AZURE_AD',
        'thu.le|thu.le@youngonevn.com|BSL-004|Thu|Le Thi|Le Thi Thu|Garment Production Manager|Manager|BSL|DEPT-BSL-PROD|POS-BSL-PROD-MGR|loc-bsl-st|GR_BSL_FactoryOperations|+84 (299) 387-9004|OU=Production,OU=BSL,DC=youngone,DC=internal|AZURE_AD',
        'huy.nguyen|huy.nguyen@youngonevn.com|BSL-005|Huy|Nguyen Quoc|Nguyen Quoc Huy|Quality Assurance Lead|User|BSL|DEPT-BSL-QA|POS-BSL-QA-LEAD|loc-bsl-st|GR_BSL_FactoryOperations|+84 (299) 387-9005|OU=QA,OU=BSL,DC=youngone,DC=internal|AZURE_AD',
        'kim.vo|kim.vo@youngonevn.com|BSL-006|Kim|Vo Thi|Vo Thi Kim|Warehouse & Inventory Supervisor|User|BSL|DEPT-BSL-LOG|POS-BSL-WH-SUP|loc-bsl-st|GR_BSL_FactoryOperations|+84 (299) 387-9006|OU=Logistics,OU=BSL,DC=youngone,DC=internal|AZURE_AD',
        'chau.dang|chau.dang@youngonevn.com|BSL-007|Chau|Dang Minh|Dang Minh Chau|HR & Employee Relations Officer|User|BSL|DEPT-BSL-HR|POS-BSL-HR-EXEC|loc-bsl-st|GR_BSL_FactoryOperations|+84 (299) 387-9007|OU=HR,OU=BSL,DC=youngone,DC=internal|AZURE_AD',
        'tri.doan|tri.doan@youngonevn.com|BSH-001|Tri|Doan Minh|Doan Minh Tri|Managing Director|Manager|BSH|DEPT-BSH-EXEC|POS-BSH-MD|loc-bsh-d7|GR_Youngone_Executive|+84 (28) 3997-8010|OU=Executive,OU=BSH,DC=youngone,DC=internal|LOCAL',
        'phong.dang|phong.dang@youngonevn.com|BSH-002|Phong|Dang Thanh|Dang Thanh Phong|Enterprise IT Systems Architect|Admin|BSH|DEPT-BSH-IT|POS-BSH-IT-ARCH|loc-bsh-d7|GR_BSH_CorporateOffice|+84 (28) 3997-8011|OU=IT,OU=BSH,DC=youngone,DC=internal|LOCAL',
        'kien.le|kien.le@youngonevn.com|BSH-003|Kien|Le Van|Le Van Kien|Systems & Network Engineer|User|BSH|DEPT-BSH-IT|POS-BSH-IT-ENG|loc-bsh-d7|GR_BSH_CorporateOffice|+84 (28) 3997-8012|OU=IT,OU=BSH,DC=youngone,DC=internal|AZURE_AD',
        'lan.nguyen|lan.nguyen@youngonevn.com|BSH-004|Lan|Nguyen Thi|Nguyen Thi Lan|Senior Merchandising Manager|Manager|BSH|DEPT-BSH-MERCH|POS-BSH-MERCH-MGR|loc-bsh-d7|GR_BSH_Merchandising|+84 (28) 3997-8013|OU=Merchandising,OU=BSH,DC=youngone,DC=internal|AZURE_AD',
        'tuan.hoang|tuan.hoang@youngonevn.com|BSH-005|Tuan|Hoang Anh|Hoang Anh Tuan|Apparel Merchandiser|User|BSH|DEPT-BSH-MERCH|POS-BSH-MERCH-SPEC|loc-bsh-d3|GR_BSH_Merchandising|+84 (28) 3997-8014|OU=Merchandising,OU=BSH,DC=youngone,DC=internal|AZURE_AD',
        'ngoc.vu|ngoc.vu@youngonevn.com|BSH-006|Ngoc|Vu Bich|Vu Bich Ngoc|Chief Accountant & Controller|Viewer|BSH|DEPT-BSH-FIN|POS-BSH-FIN-CTRL|loc-bsh-d7|GR_BSH_CorporateOffice|+84 (28) 3997-8015|OU=Finance,OU=BSH,DC=youngone,DC=internal|LOCAL',
        'phuong.bui|phuong.bui@youngonevn.com|BSH-007|Phuong|Bui Mai|Bui Mai Phuong|Talent Acquisition & HR Manager|Manager|BSH|DEPT-BSH-HR|POS-BSH-HR-MGR|loc-bsh-d7|GR_BSH_CorporateOffice|+84 (28) 3997-8016|OU=HR,OU=BSH,DC=youngone,DC=internal|AZURE_AD',
      ];

      const seededUsers: Record<string, import('@prisma/client').AppUser> = {};
      const staffProfiles: Array<StaffProfile> = [];

      for (const row of staffRows) {
        const [
          username,
          email,
          employeeCode,
          firstName,
          lastName,
          displayName,
          jobTitle,
          roleName,
          orgCode,
          deptCode,
          posCode,
          locId,
          adGroup,
          phone,
          ouPath,
          source,
        ] = row.split('|');
        const role = seededRoles[roleName];
        if (!role) throw new Error(`Role ${roleName} not found for user ${email}`);
        const passwordHash = username === 'admin' ? adminPasswordHash : defaultPasswordHash;

        const userRecord = await prisma.appUser.upsert({
          where: { email },
          update: {
            username,
            firstName,
            lastName,
            displayName,
            roleId: role.id,
            status: 'ACTIVE',
            phone,
            passwordHash,
          },
          create: {
            username,
            email,
            firstName,
            lastName,
            displayName,
            roleId: role.id,
            status: 'ACTIVE',
            phone,
            passwordHash,
          },
        });

        seededUsers[email] = userRecord;
        if (ctx) {
          ctx.appUsers.set(email, userRecord.id);
          ctx.appUsers.set(userRecord.id, userRecord.id);
          ctx.appUsers.set(username, userRecord.id);
        }

        staffProfiles.push({
          email,
          employeeCode,
          firstName,
          lastName,
          displayName,
          phone,
          status: 'ACTIVE',
          source,
          organizationCode: orgCode,
          departmentCode: deptCode,
          positionCode: posCode,
          locationId: locId,
          jobTitle,
          adGroup,
        });
      }

      logger.log(
        `✅ Seeded ${rolesData.length} roles, ${seededPermissionsMap.size} permissions, and ${staffRows.length} Broadpeak operator accounts.`,
      );

      const adminUser = seededUsers['admin@youngonevn.com'];

      return {
        roles: {
          ...seededRoles,
          'Super Admin': seededRoles['Admin'],
          Employee: seededRoles['User'],
          Auditor: seededRoles['Viewer'],
        },
        users: {
          userAdminLocal: adminUser,
          userAdmin: adminUser,
          userManager: seededUsers['manager@youngonevn.com'],
          userUser: seededUsers['user@youngonevn.com'],
          userViewer: seededUsers['viewer@youngonevn.com'],
          ...seededUsers,
        },
        staffProfiles,
      };
    },
  );
}
