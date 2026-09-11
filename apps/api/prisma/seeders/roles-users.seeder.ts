import * as crypto from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const logger = new Logger('RolesUsersSeeder');

export interface StaffProfile {
  email: string;
  employeeCode?: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string;
  ouPath?: string;
  status?: string;
  source?: string;
  organizationCode?: string;
  departmentCode?: string;
  positionCode?: string;
  locationId?: string;
  locationName?: string;
  jobTitle?: string;
  adGroup?: string;
}

export async function seedRolesAndUsers(prisma: PrismaClient) {
  // 1. Password Hashes: Salted bcrypt (12 rounds) strictly adhering to AGENTS.md
  const adminPassword =
    process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex');
  const demoPassword = process.env.INITIAL_DEMO_PASSWORD || crypto.randomBytes(16).toString('hex');

  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const defaultPasswordHash = await bcrypt.hash(demoPassword, 12);

  // 2. Standard Roles Catalog - Exactly 4 Clean RBAC Roles: Admin, Manager, User, Viewer (Chỉ xem)
  const rolesData = [
    {
      name: 'Admin',
      description:
        'System & Infrastructure Administrator with full governance, operational management, and configuration privileges across Broadpeak.',
    },
    {
      name: 'Manager',
      description:
        'Operations and Department Lead with operational oversight, record updates, review, and reporting privileges for assigned units.',
    },
    {
      name: 'User',
      description:
        'Standard Enterprise User with baseline self-service directory profile access, assigned hardware, and license visibility.',
    },
    {
      name: 'Viewer',
      description:
        'Read-Only Observer & Auditor with inspection-only visibility across enterprise assets, licenses, inventory, directory, and reports.',
    },
  ];

  const seededRoles: Record<string, import('@prisma/client').Role> = {};
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    seededRoles[r.name] = role;
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
      const existing = await prisma.permission.findFirst({
        where: { subject, action },
      });
      if (existing) {
        seededPermissionsMap.set(key, existing.id);
      } else {
        const created = await prisma.permission.create({
          data: { subject, action, conditions: null },
        });
        seededPermissionsMap.set(key, created.id);
      }
    }
  }

  // 4. Role Permission Mapping with Least-Privilege
  const allKeys = Array.from(seededPermissionsMap.keys());
  const roleRules: Record<string, (k: string) => boolean> = {
    // 1. Admin: Full unrestricted authority across all 66 permissions
    Admin: () => true,

    // 2. Manager: Operational management authority
    // - Full operational management on Assets, Licenses, Inventory, Reports (excluding destructive delete)
    // - Directory & Identity: read, update, export Users; read, export Groups
    // - Governance & Infrastructure: read, export Organization, Network, Audit
    // - System inspection: read Role and Setting
    Manager: (k) => {
      const [subject, action] = k.split(':');
      if (action === 'delete') return false;
      if (['Asset', 'License', 'Inventory', 'Report'].includes(subject)) {
        return true;
      }
      if (['Organization', 'Network', 'Audit', 'Group'].includes(subject)) {
        return ['read', 'export'].includes(action);
      }
      if (subject === 'User') {
        return ['read', 'update', 'export'].includes(action);
      }
      if (['Role', 'Setting'].includes(subject)) {
        return action === 'read';
      }
      return false;
    },

    // 3. User: Standard self-service visibility and interactive access
    User: (k) => {
      const allowedSubjects = [
        'Asset',
        'License',
        'Inventory',
        'User',
        'Group',
        'Organization',
        'Report',
      ];
      const [subject, action] = k.split(':');
      if (allowedSubjects.includes(subject) && action === 'read') return true;
      if ((subject === 'User' || subject === 'Asset') && action === 'update') return true;
      return false;
    },

    // 4. Viewer (Chỉ xem): Pure read-only inspection visibility across enterprise resources
    Viewer: (k) => {
      const allowedSubjects = [
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
      const [subject, action] = k.split(':');
      return allowedSubjects.includes(subject) && action === 'read';
    },
  };

  for (const [roleName, filterFn] of Object.entries(roleRules)) {
    const role = seededRoles[roleName];
    if (!role) continue;
    const assignedKeys = allKeys.filter(filterFn);

    for (const key of assignedKeys) {
      const permId = seededPermissionsMap.get(key);
      if (!permId) continue;
      try {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
          update: {},
          create: { roleId: role.id, permissionId: permId },
        });
      } catch (err: unknown) {
        logger.debug(`Skipped duplicate permission ${key} on role ${roleName}: ${String(err)}`);
      }
    }
  }

  // 5. Broadpeak Core Staff Data (BSL Soc Trang & BSH Ho Chi Minh)
  const coreStaffData = [
    {
      username: 'admin',
      email: 'admin@uims.internal',
      employeeCode: 'YON-001',
      firstName: 'Enterprise',
      lastName: 'Admin',
      displayName: 'Enterprise Admin (Youngone / Broadpeak)',
      jobTitle: 'Youngone Enterprise IT Administrator',
      roleId: seededRoles['Admin'].id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'BSH',
      departmentCode: 'DEPT-BSH-IT',
      positionCode: 'POS-BSH-IT-ARCH',
      locationId: 'loc-bsh-d7',
      adGroup: 'GR_Youngone_Executive',
      phone: '+84 (28) 3997-8001',
      ouPath: 'OU=EnterpriseAdmin,OU=Broadpeak,DC=youngone,DC=internal',
      passwordHash: adminPasswordHash,
    },
    {
      username: 'admin.local',
      email: 'admin@uims.local',
      employeeCode: 'YON-002',
      firstName: 'System',
      lastName: 'Root',
      displayName: 'System Root Operator',
      jobTitle: 'Local Platform Superuser',
      roleId: seededRoles['Admin'].id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'BSH',
      departmentCode: 'DEPT-BSH-IT',
      positionCode: 'POS-BSH-IT-ARCH',
      locationId: 'loc-bsh-d7',
      adGroup: 'GR_Youngone_Executive',
      phone: '+84 (28) 3997-8002',
      ouPath: 'OU=LocalAdmin,OU=Broadpeak,DC=youngone,DC=internal',
      passwordHash: adminPasswordHash,
    },
    // BSL (Soc Trang) Core Staff
    {
      username: 'binh.tran',
      email: 'binh.tran@broadpeak.youngone.com',
      employeeCode: 'BSL-001',
      firstName: 'Binh',
      lastName: 'Tran Van',
      displayName: 'Tran Van Binh',
      jobTitle: 'Factory General Director',
      roleId: seededRoles['Manager'].id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'BSL',
      departmentCode: 'DEPT-BSL-MGMT',
      positionCode: 'POS-BSL-GM',
      locationId: 'loc-bsl-st',
      adGroup: 'GR_BSL_FactoryOperations',
      phone: '+84 (299) 387-9001',
      ouPath: 'OU=Executive,OU=BSL,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'nam.pham',
      email: 'nam.pham@broadpeak.youngone.com',
      employeeCode: 'BSL-002',
      firstName: 'Nam',
      lastName: 'Pham Hoang',
      displayName: 'Pham Hoang Nam',
      jobTitle: 'Factory IT Manager',
      roleId: seededRoles['Admin'].id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'BSL',
      departmentCode: 'DEPT-BSL-IT',
      positionCode: 'POS-BSL-IT-MGR',
      locationId: 'loc-bsl-st',
      adGroup: 'GR_BSL_IT_Support',
      phone: '+84 (299) 387-9002',
      ouPath: 'OU=IT,OU=BSL,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'son.huynh',
      email: 'son.huynh@broadpeak.youngone.com',
      employeeCode: 'BSL-003',
      firstName: 'Son',
      lastName: 'Huynh Thanh',
      displayName: 'Huynh Thanh Son',
      jobTitle: 'Industrial IT & Automation Specialist',
      roleId: seededRoles['User'].id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'BSL',
      departmentCode: 'DEPT-BSL-IT',
      positionCode: 'POS-BSL-IT-SPEC',
      locationId: 'loc-bsl-st',
      adGroup: 'GR_BSL_IT_Support',
      phone: '+84 (299) 387-9003',
      ouPath: 'OU=IT,OU=BSL,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'thu.le',
      email: 'thu.le@broadpeak.youngone.com',
      employeeCode: 'BSL-004',
      firstName: 'Thu',
      lastName: 'Le Thi',
      displayName: 'Le Thi Thu',
      jobTitle: 'Garment Production Manager',
      roleId: seededRoles['Manager'].id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'BSL',
      departmentCode: 'DEPT-BSL-PROD',
      positionCode: 'POS-BSL-PROD-MGR',
      locationId: 'loc-bsl-st',
      adGroup: 'GR_BSL_FactoryOperations',
      phone: '+84 (299) 387-9004',
      ouPath: 'OU=Production,OU=BSL,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'huy.nguyen',
      email: 'huy.nguyen@broadpeak.youngone.com',
      employeeCode: 'BSL-005',
      firstName: 'Huy',
      lastName: 'Nguyen Quoc',
      displayName: 'Nguyen Quoc Huy',
      jobTitle: 'Quality Assurance Lead',
      roleId: seededRoles['User'].id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'BSL',
      departmentCode: 'DEPT-BSL-QA',
      positionCode: 'POS-BSL-QA-LEAD',
      locationId: 'loc-bsl-st',
      adGroup: 'GR_BSL_FactoryOperations',
      phone: '+84 (299) 387-9005',
      ouPath: 'OU=QA,OU=BSL,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'kim.vo',
      email: 'kim.vo@broadpeak.youngone.com',
      employeeCode: 'BSL-006',
      firstName: 'Kim',
      lastName: 'Vo Thi',
      displayName: 'Vo Thi Kim',
      jobTitle: 'Warehouse & Inventory Supervisor',
      roleId: seededRoles['User'].id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'BSL',
      departmentCode: 'DEPT-BSL-LOG',
      positionCode: 'POS-BSL-WH-SUP',
      locationId: 'loc-bsl-st',
      adGroup: 'GR_BSL_FactoryOperations',
      phone: '+84 (299) 387-9006',
      ouPath: 'OU=Logistics,OU=BSL,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'chau.dang',
      email: 'chau.dang@broadpeak.youngone.com',
      employeeCode: 'BSL-007',
      firstName: 'Chau',
      lastName: 'Dang Minh',
      displayName: 'Dang Minh Chau',
      jobTitle: 'HR & Employee Relations Officer',
      roleId: seededRoles['User'].id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'BSL',
      departmentCode: 'DEPT-BSL-HR',
      positionCode: 'POS-BSL-HR-EXEC',
      locationId: 'loc-bsl-st',
      adGroup: 'GR_BSL_FactoryOperations',
      phone: '+84 (299) 387-9007',
      ouPath: 'OU=HR,OU=BSL,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },

    // BSH (Ho Chi Minh) Core Staff
    {
      username: 'tri.doan',
      email: 'tri.doan@broadpeak.youngone.com',
      employeeCode: 'BSH-001',
      firstName: 'Tri',
      lastName: 'Doan Minh',
      displayName: 'Doan Minh Tri',
      jobTitle: 'Managing Director',
      roleId: seededRoles['Manager'].id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'BSH',
      departmentCode: 'DEPT-BSH-EXEC',
      positionCode: 'POS-BSH-MD',
      locationId: 'loc-bsh-d7',
      adGroup: 'GR_Youngone_Executive',
      phone: '+84 (28) 3997-8010',
      ouPath: 'OU=Executive,OU=BSH,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'phong.dang',
      email: 'phong.dang@broadpeak.youngone.com',
      employeeCode: 'BSH-002',
      firstName: 'Phong',
      lastName: 'Dang Thanh',
      displayName: 'Dang Thanh Phong',
      jobTitle: 'Enterprise IT Systems Architect',
      roleId: seededRoles['Admin'].id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'BSH',
      departmentCode: 'DEPT-BSH-IT',
      positionCode: 'POS-BSH-IT-ARCH',
      locationId: 'loc-bsh-d7',
      adGroup: 'GR_BSH_CorporateOffice',
      phone: '+84 (28) 3997-8011',
      ouPath: 'OU=IT,OU=BSH,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'kien.le',
      email: 'kien.le@broadpeak.youngone.com',
      employeeCode: 'BSH-003',
      firstName: 'Kien',
      lastName: 'Le Van',
      displayName: 'Le Van Kien',
      jobTitle: 'Systems & Network Engineer',
      roleId: seededRoles['User'].id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'BSH',
      departmentCode: 'DEPT-BSH-IT',
      positionCode: 'POS-BSH-IT-ENG',
      locationId: 'loc-bsh-d7',
      adGroup: 'GR_BSH_CorporateOffice',
      phone: '+84 (28) 3997-8012',
      ouPath: 'OU=IT,OU=BSH,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'lan.nguyen',
      email: 'lan.nguyen@broadpeak.youngone.com',
      employeeCode: 'BSH-004',
      firstName: 'Lan',
      lastName: 'Nguyen Thi',
      displayName: 'Nguyen Thi Lan',
      jobTitle: 'Senior Merchandising Manager',
      roleId: seededRoles['Manager'].id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'BSH',
      departmentCode: 'DEPT-BSH-MERCH',
      positionCode: 'POS-BSH-MERCH-MGR',
      locationId: 'loc-bsh-d7',
      adGroup: 'GR_BSH_Merchandising',
      phone: '+84 (28) 3997-8013',
      ouPath: 'OU=Merchandising,OU=BSH,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'tuan.hoang',
      email: 'tuan.hoang@broadpeak.youngone.com',
      employeeCode: 'BSH-005',
      firstName: 'Tuan',
      lastName: 'Hoang Anh',
      displayName: 'Hoang Anh Tuan',
      jobTitle: 'Apparel Merchandiser',
      roleId: seededRoles['User'].id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'BSH',
      departmentCode: 'DEPT-BSH-MERCH',
      positionCode: 'POS-BSH-MERCH-SPEC',
      locationId: 'loc-bsh-d3',
      adGroup: 'GR_BSH_Merchandising',
      phone: '+84 (28) 3997-8014',
      ouPath: 'OU=Merchandising,OU=BSH,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'ngoc.vu',
      email: 'ngoc.vu@broadpeak.youngone.com',
      employeeCode: 'BSH-006',
      firstName: 'Ngoc',
      lastName: 'Vu Bich',
      displayName: 'Vu Bich Ngoc',
      jobTitle: 'Chief Accountant & Controller',
      roleId: seededRoles['Viewer'].id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'BSH',
      departmentCode: 'DEPT-BSH-FIN',
      positionCode: 'POS-BSH-FIN-CTRL',
      locationId: 'loc-bsh-d7',
      adGroup: 'GR_BSH_CorporateOffice',
      phone: '+84 (28) 3997-8015',
      ouPath: 'OU=Finance,OU=BSH,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'phuong.bui',
      email: 'phuong.bui@broadpeak.youngone.com',
      employeeCode: 'BSH-007',
      firstName: 'Phuong',
      lastName: 'Bui Mai',
      displayName: 'Bui Mai Phuong',
      jobTitle: 'Talent Acquisition & HR Manager',
      roleId: seededRoles['Manager'].id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'BSH',
      departmentCode: 'DEPT-BSH-HR',
      positionCode: 'POS-BSH-HR-MGR',
      locationId: 'loc-bsh-d7',
      adGroup: 'GR_BSH_CorporateOffice',
      phone: '+84 (28) 3997-8016',
      ouPath: 'OU=HR,OU=BSH,DC=youngone,DC=internal',
      passwordHash: defaultPasswordHash,
    },
  ];

  const seededUsers: Record<string, import('@prisma/client').AppUser> = {};
  for (const u of coreStaffData) {
    const userRecord = await prisma.appUser.upsert({
      where: { email: u.email },
      update: {
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: u.displayName,
        roleId: u.roleId,
        status: u.status,
        phone: u.phone,
        passwordHash: u.passwordHash,
      },
      create: {
        username: u.username,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: u.displayName,
        roleId: u.roleId,
        status: u.status,
        phone: u.phone,
        passwordHash: u.passwordHash,
      },
    });
    seededUsers[u.email] = userRecord;
  }

  const staffProfiles: Array<StaffProfile> = coreStaffData.map((u) => ({
    email: u.email,
    employeeCode: u.employeeCode,
    firstName: u.firstName,
    lastName: u.lastName,
    displayName: u.displayName,
    phone: u.phone,
    ouPath: u.ouPath,
    status: u.status,
    source: u.source,
    organizationCode: u.organizationCode,
    departmentCode: u.departmentCode,
    positionCode: u.positionCode,
    locationId: u.locationId,
    jobTitle: u.jobTitle,
    adGroup: u.adGroup,
  }));

  logger.log(
    `✅ Seeded ${rolesData.length} roles, ${seededPermissionsMap.size} permissions, and ${coreStaffData.length} Broadpeak operator accounts.`,
  );

  const adminUser = seededUsers['admin@uims.internal'];
  const bslAdmin = seededUsers['nam.pham@broadpeak.youngone.com'];
  const bshAdmin = seededUsers['phong.dang@broadpeak.youngone.com'];
  const defaultUser = seededUsers['binh.tran@broadpeak.youngone.com'] || adminUser;

  return {
    roles: {
      ...seededRoles,
      'Super Admin': seededRoles['Admin'],
      Employee: seededRoles['User'],
      Auditor: seededRoles['Viewer'],
    },
    users: {
      userAdminLocal: seededUsers['admin@uims.local'],
      userAlex: adminUser,
      userSarah: bslAdmin,
      userMichael: bshAdmin,
      userMarcusBell: seededUsers['ngoc.vu@broadpeak.youngone.com'] || adminUser,
      userDavidKim: seededUsers['kien.le@broadpeak.youngone.com'] || defaultUser,
      userSophiaPatel: seededUsers['lan.nguyen@broadpeak.youngone.com'] || defaultUser,
      userLiamNguyen: seededUsers['son.huynh@broadpeak.youngone.com'] || defaultUser,
      userCarlosMendez: seededUsers['thu.le@broadpeak.youngone.com'] || defaultUser,
      userMarcusVance: seededUsers['tuan.hoang@broadpeak.youngone.com'] || defaultUser,
      userChloeMartin: seededUsers['phuong.bui@broadpeak.youngone.com'] || defaultUser,
      userElena: seededUsers['huy.nguyen@broadpeak.youngone.com'] || defaultUser,
      userRobertTorres: seededUsers['kim.vo@broadpeak.youngone.com'] || defaultUser,
      userLisaWang: seededUsers['chau.dang@broadpeak.youngone.com'] || defaultUser,
      userRachelAdams: defaultUser,
      userJamesWilson: defaultUser,
      userHannahScott: defaultUser,
      userThomas: defaultUser,
      userJessica: defaultUser,
      ...seededUsers,
    },
    staffProfiles,
  };
}
