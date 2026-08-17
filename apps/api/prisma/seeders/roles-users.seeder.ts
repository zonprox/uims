import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedRolesAndUsers(prisma: PrismaClient) {
  // 1. Password Hashes
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@2026', 10);

  // 2. Roles & Permissions
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: 'Super Administrator with unrestricted enterprise access and audit authority',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'System and Infrastructure Administrator' },
  });

  const techRole = await prisma.role.upsert({
    where: { name: 'Technician' },
    update: {},
    create: { name: 'Technician', description: 'IT Helpdesk & Field Technician Specialist' },
  });

  const auditorRole = await prisma.role.upsert({
    where: { name: 'Auditor' },
    update: {},
    create: { name: 'Auditor', description: 'SOC2 Type II & ISO 27001 Compliance Auditor' },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: { name: 'Manager', description: 'Department Team Lead & Resource Approver' },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'Employee' },
    update: {},
    create: { name: 'Employee', description: 'Standard Enterprise Employee' },
  });

  // Seed Granular System Permissions
  const ALL_PERMISSIONS_CATALOG = [
    // Asset Management
    { subject: 'Asset', action: 'create' },
    { subject: 'Asset', action: 'read' },
    { subject: 'Asset', action: 'update' },
    { subject: 'Asset', action: 'delete' },
    { subject: 'Asset', action: 'export' },
    { subject: 'Asset', action: 'manage' },

    // SaaS & Software Licenses
    { subject: 'License', action: 'create' },
    { subject: 'License', action: 'read' },
    { subject: 'License', action: 'update' },
    { subject: 'License', action: 'delete' },
    { subject: 'License', action: 'export' },
    { subject: 'License', action: 'manage' },

    // Directory & Users
    { subject: 'User', action: 'create' },
    { subject: 'User', action: 'read' },
    { subject: 'User', action: 'update' },
    { subject: 'User', action: 'delete' },
    { subject: 'User', action: 'export' },
    { subject: 'User', action: 'manage' },

    // Active Directory Groups
    { subject: 'Group', action: 'create' },
    { subject: 'Group', action: 'read' },
    { subject: 'Group', action: 'update' },
    { subject: 'Group', action: 'delete' },
    { subject: 'Group', action: 'manage' },

    // RBAC Roles & Permissions
    { subject: 'Role', action: 'create' },
    { subject: 'Role', action: 'read' },
    { subject: 'Role', action: 'update' },
    { subject: 'Role', action: 'delete' },
    { subject: 'Role', action: 'manage' },

    // Enterprise Organization Structure
    { subject: 'Organization', action: 'create' },
    { subject: 'Organization', action: 'read' },
    { subject: 'Organization', action: 'update' },
    { subject: 'Organization', action: 'delete' },
    { subject: 'Organization', action: 'export' },
    { subject: 'Organization', action: 'manage' },

    // Network IPAM & Infrastructure
    { subject: 'Network', action: 'create' },
    { subject: 'Network', action: 'read' },
    { subject: 'Network', action: 'update' },
    { subject: 'Network', action: 'delete' },
    { subject: 'Network', action: 'export' },
    { subject: 'Network', action: 'manage' },

    // Spare Stockroom & Inventory
    { subject: 'Inventory', action: 'create' },
    { subject: 'Inventory', action: 'read' },
    { subject: 'Inventory', action: 'update' },
    { subject: 'Inventory', action: 'delete' },
    { subject: 'Inventory', action: 'export' },
    { subject: 'Inventory', action: 'manage' },

    // Security & Compliance Audit
    { subject: 'Audit', action: 'read' },
    { subject: 'Audit', action: 'export' },

    // Executive Reports
    { subject: 'Report', action: 'create' },
    { subject: 'Report', action: 'read' },
    { subject: 'Report', action: 'export' },
    { subject: 'Report', action: 'manage' },

    // System Settings & Preferences
    { subject: 'Setting', action: 'read' },
    { subject: 'Setting', action: 'update' },
    { subject: 'Setting', action: 'manage' },
  ];

  const seededPermissionsMap = new Map<string, string>();

  for (const perm of ALL_PERMISSIONS_CATALOG) {
    const existing = await prisma.permission.findFirst({
      where: { subject: perm.subject, action: perm.action },
    });
    if (existing) {
      seededPermissionsMap.set(`${perm.subject}:${perm.action}`, existing.id);
    } else {
      const created = await prisma.permission.create({
        data: {
          subject: perm.subject,
          action: perm.action,
        },
      });
      seededPermissionsMap.set(`${perm.subject}:${perm.action}`, created.id);
    }
  }

  // Link Permissions to Standard Roles
  const rolePermissionAssignments: Record<string, string[]> = {
    'Super Admin': Array.from(seededPermissionsMap.keys()), // All permissions
    Admin: Array.from(seededPermissionsMap.keys()), // All permissions
    Technician: [
      'Asset:create',
      'Asset:read',
      'Asset:update',
      'Asset:manage',
      'Inventory:create',
      'Inventory:read',
      'Inventory:update',
      'Inventory:manage',
      'Network:create',
      'Network:read',
      'Network:update',
      'Network:manage',
      'License:read',
      'User:read',
      'Organization:read',
      'Report:read',
    ],
    Auditor: [
      'Asset:read',
      'Asset:export',
      'License:read',
      'License:export',
      'User:read',
      'User:export',
      'Group:read',
      'Organization:read',
      'Organization:export',
      'Network:read',
      'Network:export',
      'Inventory:read',
      'Inventory:export',
      'Audit:read',
      'Audit:export',
      'Report:read',
      'Report:export',
      'Setting:read',
    ],
    Manager: [
      'Asset:read',
      'License:read',
      'User:read',
      'Organization:read',
      'Inventory:read',
      'Report:create',
      'Report:read',
      'Report:export',
    ],
    Employee: ['Asset:read', 'License:read', 'User:read', 'Organization:read'],
  };

  const roleEntities = [
    { name: 'Super Admin', role: superAdminRole },
    { name: 'Admin', role: adminRole },
    { name: 'Technician', role: techRole },
    { name: 'Auditor', role: auditorRole },
    { name: 'Manager', role: managerRole },
    { name: 'Employee', role: employeeRole },
  ];

  for (const { name, role } of roleEntities) {
    const targetPermKeys = rolePermissionAssignments[name] || [];
    for (const key of targetPermKeys) {
      const permId = seededPermissionsMap.get(key);
      if (permId) {
        await prisma.rolePermission
          .upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permId,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permId,
            },
          })
          .catch(() => {});
      }
    }
  }

  // 3. System & Active Directory Users
  const usersData = [
    {
      username: 'admin',
      email: 'admin@uims.local',
      firstName: 'System',
      lastName: 'Administrator',
      displayName: 'System Administrator',
      jobTitle: 'Super Administrator',
      roleId: superAdminRole.id,
      roleName: 'Super Admin',
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      department: 'IT & Infrastructure',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 100-2000',
      passwordHash: adminPasswordHash,
      adInitialPassword: 'Admin@2026',
    },
    {
      username: 'alex.johnson',
      email: 'admin@uims.internal',
      firstName: 'Alex',
      lastName: 'Johnson',
      displayName: 'Alex Johnson',
      jobTitle: 'VP of Information Technology',
      roleId: superAdminRole.id,
      roleName: 'Super Admin',
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      department: 'IT & Infrastructure',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 234-5678',
      passwordHash: adminPasswordHash,
      adInitialPassword: 'Admin@2026',
    },
    {
      username: 'sarah.chen',
      email: 'sarah.chen@company.com',
      firstName: 'Sarah',
      lastName: 'Chen',
      displayName: 'Sarah Chen',
      jobTitle: 'Senior Systems Administrator',
      roleId: techRole.id,
      roleName: 'IT Specialist',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'IT & Infrastructure',
      location: 'SF HQ - Tech Bay',
      phone: '+1 (555) 345-6789',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#SarahChen2026!',
    },
    {
      username: 'michael.wong',
      email: 'michael.wong@company.com',
      firstName: 'Michael',
      lastName: 'Wong',
      displayName: 'Michael Wong',
      jobTitle: 'Senior Network Architect',
      roleId: adminRole.id,
      roleName: 'Network Architect',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'IT & Infrastructure',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 345-1122',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#MichaelWong2026!',
    },
    {
      username: 'marcus.bell',
      email: 'compliance@uims.internal',
      firstName: 'Marcus',
      lastName: 'Bell',
      displayName: 'Marcus Bell',
      jobTitle: 'Principal Security Compliance Auditor',
      roleId: auditorRole.id,
      roleName: 'Lead Auditor',
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      department: 'Security & Compliance',
      location: 'London Hub',
      phone: '+44 20 7946 0912',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#MarcusBell2026!',
    },
    {
      username: 'david.kim',
      email: 'david.kim@company.com',
      firstName: 'David',
      lastName: 'Kim',
      displayName: 'David Kim',
      jobTitle: 'Lead Cloud Architect',
      roleId: employeeRole.id,
      roleName: 'Developer',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Engineering',
      location: 'Remote - US East',
      phone: '+1 (555) 567-8901',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#DavidKim2026!',
    },
    {
      username: 'sophia.patel',
      email: 'sophia.patel@company.com',
      firstName: 'Sophia',
      lastName: 'Patel',
      displayName: 'Sophia Patel',
      jobTitle: 'Senior Staff Fullstack Engineer',
      roleId: employeeRole.id,
      roleName: 'Developer',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Engineering',
      location: 'SF HQ - Tech Bay',
      phone: '+1 (555) 567-2233',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#SophiaPatel2026!',
    },
    {
      username: 'liam.nguyen',
      email: 'liam.nguyen@company.com',
      firstName: 'Liam',
      lastName: 'Nguyen',
      displayName: 'Liam Nguyen',
      jobTitle: 'Lead DevOps & SRE Architect',
      roleId: employeeRole.id,
      roleName: 'Developer',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Engineering',
      location: 'Remote - US West',
      phone: '+1 (555) 567-4455',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#LiamNguyen2026!',
    },
    {
      username: 'carlos.mendez',
      email: 'carlos.mendez@company.com',
      firstName: 'Carlos',
      lastName: 'Mendez',
      displayName: 'Carlos Mendez',
      jobTitle: 'Senior Backend Platform Engineer',
      roleId: employeeRole.id,
      roleName: 'Developer',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Engineering',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 567-7788',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#CarlosMendez2026!',
    },
    {
      username: 'marcus.vance',
      email: 'marcus.vance@company.com',
      firstName: 'Marcus',
      lastName: 'Vance',
      displayName: 'Marcus Vance',
      jobTitle: 'Principal Product Designer',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Product & Design',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 456-7890',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#MarcusVance2026!',
    },
    {
      username: 'chloe.martin',
      email: 'chloe.martin@company.com',
      firstName: 'Chloe',
      lastName: 'Martin',
      displayName: 'Chloe Martin',
      jobTitle: 'Senior UX Researcher',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Product & Design',
      location: 'London Hub',
      phone: '+44 20 7946 0881',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#ChloeMartin2026!',
    },
    {
      username: 'elena.rostova',
      email: 'elena.rostova@company.com',
      firstName: 'Elena',
      lastName: 'Rostova',
      displayName: 'Elena Rostova',
      jobTitle: 'Director of Growth Marketing',
      roleId: managerRole.id,
      roleName: 'Manager',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Marketing',
      location: 'London Hub',
      phone: '+1 (555) 678-9012',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#ElenaRostova2026!',
    },
    {
      username: 'robert.torres',
      email: 'robert.torres@company.com',
      firstName: 'Robert',
      lastName: 'Torres',
      displayName: 'Robert Torres',
      jobTitle: 'IT Infrastructure Operations Manager',
      roleId: managerRole.id,
      roleName: 'Manager',
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      department: 'IT & Infrastructure',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 678-3344',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#RobertTorres2026!',
    },
    {
      username: 'lisa.wang',
      email: 'lisa.wang@company.com',
      firstName: 'Lisa',
      lastName: 'Wang',
      displayName: 'Lisa Wang',
      jobTitle: 'Financial Controller',
      roleId: managerRole.id,
      roleName: 'Manager',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Finance',
      location: 'Singapore Hub',
      phone: '+65 6789 0123',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#LisaWang2026!',
    },
    {
      username: 'rachel.adams',
      email: 'rachel.adams@company.com',
      firstName: 'Rachel',
      lastName: 'Adams',
      displayName: 'Rachel Adams',
      jobTitle: 'Head of People Operations',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Human Resources',
      location: 'NY HQ - Floor 5',
      phone: '+1 (555) 890-1234',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#RachelAdams2026!',
    },
    {
      username: 'james.wilson',
      email: 'james.wilson@company.com',
      firstName: 'James',
      lastName: 'Wilson',
      displayName: 'James Wilson',
      jobTitle: 'Senior Corporate Counsel',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Legal & Governance',
      location: 'NY HQ - Floor 5',
      phone: '+1 (555) 901-2345',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#JamesWilson2026!',
    },
    {
      username: 'hannah.scott',
      email: 'hannah.scott@company.com',
      firstName: 'Hannah',
      lastName: 'Scott',
      displayName: 'Hannah Scott',
      jobTitle: 'Strategic Account Executive',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Sales',
      location: 'Remote - US Central',
      phone: '+1 (555) 901-6789',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#HannahScott2026!',
    },
    {
      username: 'thomas.wright',
      email: 'thomas.wright@company.com',
      firstName: 'Thomas',
      lastName: 'Wright',
      displayName: 'Thomas Wright',
      jobTitle: 'Junior QA Engineer (Contractor)',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'SUSPENDED' as const,
      source: 'LOCAL' as const,
      department: 'Engineering',
      location: 'Remote - EMEA',
      phone: '+1 (555) 789-0123',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#ThomasWright2026!',
    },
    {
      username: 'jessica.taylor',
      email: 'jessica.taylor@company.com',
      firstName: 'Jessica',
      lastName: 'Taylor',
      displayName: 'Jessica Taylor',
      jobTitle: 'Content Strategist (Leave of Absence)',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'INACTIVE' as const,
      source: 'AZURE_AD' as const,
      department: 'Marketing',
      location: 'London Hub',
      phone: '+44 20 7946 0999',
      passwordHash: defaultPasswordHash,
      adInitialPassword: 'Ad#JessicaTaylor2026!',
    },
  ];

  const seededUsers: Record<string, import('@prisma/client').User> = {};

  for (const u of usersData) {
    const userRecord = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: u.displayName,
        jobTitle: u.jobTitle,
        roleId: u.roleId,
        roleName: u.roleName,
        status: u.status,
        source: u.source,
        department: u.department,
        location: u.location,
        phone: u.phone,
        passwordHash: u.passwordHash,
        adInitialPassword: u.adInitialPassword,
      },
      create: u,
    });
    seededUsers[u.email] = userRecord;
  }

  return {
    roles: { superAdminRole, adminRole, techRole, auditorRole, managerRole, employeeRole },
    users: {
      userAdminLocal: seededUsers['admin@uims.local'],
      userAlex: seededUsers['admin@uims.internal'],
      userSarah: seededUsers['sarah.chen@company.com'],
      userMichael: seededUsers['michael.wong@company.com'],
      userMarcusBell: seededUsers['compliance@uims.internal'],
      userDavidKim: seededUsers['david.kim@company.com'],
      userSophiaPatel: seededUsers['sophia.patel@company.com'],
      userLiamNguyen: seededUsers['liam.nguyen@company.com'],
      userCarlosMendez: seededUsers['carlos.mendez@company.com'],
      userMarcusVance: seededUsers['marcus.vance@company.com'],
      userChloeMartin: seededUsers['chloe.martin@company.com'],
      userElena: seededUsers['elena.rostova@company.com'],
      userRobertTorres: seededUsers['robert.torres@company.com'],
      userLisaWang: seededUsers['lisa.wang@company.com'],
      userRachelAdams: seededUsers['rachel.adams@company.com'],
      userJamesWilson: seededUsers['james.wilson@company.com'],
      userHannahScott: seededUsers['hannah.scott@company.com'],
      userThomas: seededUsers['thomas.wright@company.com'],
      userJessica: seededUsers['jessica.taylor@company.com'],
    },
  };
}
