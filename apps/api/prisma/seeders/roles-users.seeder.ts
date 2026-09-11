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
  // 1. Password Hashes
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('Admin@2026', 10);

  // 2. Roles & Permissions
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {
      description:
        'Enterprise Super Administrator with unrestricted governance authority, emergency break-glass access, and full platform oversight.',
    },
    create: {
      name: 'Super Admin',
      description:
        'Enterprise Super Administrator with unrestricted governance authority, emergency break-glass access, and full platform oversight.',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {
      description:
        'Infrastructure and Operations Administrator with system-wide resource management and configuration rights.',
    },
    create: {
      name: 'Admin',
      description:
        'Infrastructure and Operations Administrator with system-wide resource management and configuration rights.',
    },
  });

  const techRole = await prisma.role.upsert({
    where: { name: 'Technician' },
    update: {
      description:
        'IT Operations and Field Technician Specialist with hardware fleet, inventory stockroom, and network endpoint maintenance privileges.',
    },
    create: {
      name: 'Technician',
      description:
        'IT Operations and Field Technician Specialist with hardware fleet, inventory stockroom, and network endpoint maintenance privileges.',
    },
  });

  const auditorRole = await prisma.role.upsert({
    where: { name: 'Auditor' },
    update: {
      description:
        'SOC2 Type II and ISO 27001 Compliance Auditor with read-only inspection and export authority across all governance trails.',
    },
    create: {
      name: 'Auditor',
      description:
        'SOC2 Type II and ISO 27001 Compliance Auditor with read-only inspection and export authority across all governance trails.',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {
      description:
        'Department Team Lead and Resource Approver with operational oversight and reporting privileges for assigned business units.',
    },
    create: {
      name: 'Manager',
      description:
        'Department Team Lead and Resource Approver with operational oversight and reporting privileges for assigned business units.',
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { name: 'Employee' },
    update: {
      description:
        'Standard Enterprise Employee with baseline self-service directory access and assigned hardware/software visibility.',
    },
    create: {
      name: 'Employee',
      description:
        'Standard Enterprise Employee with baseline self-service directory access and assigned hardware/software visibility.',
    },
  });

  // Seed Granular Enterprise RBAC System Permissions Catalog
  const ALL_PERMISSIONS_CATALOG = [
    // 1. Asset Management Fleet
    {
      subject: 'Asset',
      action: 'create',
      conditions: { approvalRequired: false, auditLevel: 'Standard' },
    },
    { subject: 'Asset', action: 'read', conditions: null },
    { subject: 'Asset', action: 'update', conditions: null },
    {
      subject: 'Asset',
      action: 'delete',
      conditions: { requiresDualAuthorization: true, auditLevel: 'High' },
    },
    { subject: 'Asset', action: 'export', conditions: { dataClassification: 'Internal' } },
    { subject: 'Asset', action: 'manage', conditions: { fullFleetControl: true } },

    // 2. SaaS & Software Licenses
    {
      subject: 'License',
      action: 'create',
      conditions: { procurementCheck: true, auditLevel: 'Standard' },
    },
    { subject: 'License', action: 'read', conditions: null },
    { subject: 'License', action: 'update', conditions: null },
    {
      subject: 'License',
      action: 'delete',
      conditions: { contractRevocationCheck: true, auditLevel: 'High' },
    },
    { subject: 'License', action: 'export', conditions: { dataClassification: 'Confidential' } },
    { subject: 'License', action: 'manage', conditions: { seatReallocation: true } },

    // 3. Enterprise Directory & Users
    {
      subject: 'User',
      action: 'create',
      conditions: { idmProvisioningWorkflow: true, auditLevel: 'High' },
    },
    { subject: 'User', action: 'read', conditions: null },
    { subject: 'User', action: 'update', conditions: null },
    {
      subject: 'User',
      action: 'delete',
      conditions: { deprovisionCheck: true, retainAuditHistory: true },
    },
    { subject: 'User', action: 'export', conditions: { piiComplianceMasking: true } },
    { subject: 'User', action: 'manage', conditions: { accountLockoutAuthority: true } },

    // 4. Active Directory Groups
    { subject: 'Group', action: 'create', conditions: { directoryGovernance: true } },
    { subject: 'Group', action: 'read', conditions: null },
    { subject: 'Group', action: 'update', conditions: null },
    {
      subject: 'Group',
      action: 'delete',
      conditions: { directoryGovernance: true, auditLevel: 'High' },
    },
    { subject: 'Group', action: 'export', conditions: { dataClassification: 'Internal' } },
    { subject: 'Group', action: 'manage', conditions: { membershipModification: true } },

    // 5. RBAC Roles & Security Grants
    {
      subject: 'Role',
      action: 'create',
      conditions: { governanceCommitteeApproval: true, auditLevel: 'Critical' },
    },
    { subject: 'Role', action: 'read', conditions: null },
    {
      subject: 'Role',
      action: 'update',
      conditions: { leastPrivilegePolicy: true, auditLevel: 'Critical' },
    },
    {
      subject: 'Role',
      action: 'delete',
      conditions: { emergencyBreakGlassOnly: true, auditLevel: 'Critical' },
    },
    { subject: 'Role', action: 'export', conditions: { dataClassification: 'Restricted' } },
    { subject: 'Role', action: 'manage', conditions: { rbacMatrixAuthority: true } },

    // 6. Enterprise Organizational Hierarchy
    { subject: 'Organization', action: 'create', conditions: { executiveSignoff: true } },
    { subject: 'Organization', action: 'read', conditions: null },
    { subject: 'Organization', action: 'update', conditions: null },
    { subject: 'Organization', action: 'delete', conditions: { hierarchicalIntegrityCheck: true } },
    { subject: 'Organization', action: 'export', conditions: { dataClassification: 'Internal' } },
    { subject: 'Organization', action: 'manage', conditions: { departmentReorgAuthority: true } },

    // 7. Network IPAM & Infrastructure
    { subject: 'Network', action: 'create', conditions: { ipamSubnetAllocation: true } },
    { subject: 'Network', action: 'read', conditions: null },
    { subject: 'Network', action: 'update', conditions: null },
    {
      subject: 'Network',
      action: 'delete',
      conditions: { gatewayReservationCheck: true, auditLevel: 'High' },
    },
    { subject: 'Network', action: 'export', conditions: { dataClassification: 'Confidential' } },
    { subject: 'Network', action: 'manage', conditions: { routingTopologyControl: true } },

    // 8. Stockroom & Spare Inventory
    { subject: 'Inventory', action: 'create', conditions: null },
    { subject: 'Inventory', action: 'read', conditions: null },
    { subject: 'Inventory', action: 'update', conditions: null },
    { subject: 'Inventory', action: 'delete', conditions: { writeOffThresholdApproval: true } },
    { subject: 'Inventory', action: 'export', conditions: { dataClassification: 'Internal' } },
    { subject: 'Inventory', action: 'manage', conditions: { stockAdjustmentAuthority: true } },

    // 9. Security & Compliance Audit Trails
    { subject: 'Audit', action: 'create', conditions: { appendOnlyImmutableLog: true } },
    { subject: 'Audit', action: 'read', conditions: { complianceOfficerAccess: true } },
    { subject: 'Audit', action: 'update', conditions: { forbiddenTamperProof: true } },
    {
      subject: 'Audit',
      action: 'delete',
      conditions: { retentionPolicyEnforced: true, auditLevel: 'Critical' },
    },
    {
      subject: 'Audit',
      action: 'export',
      conditions: { tamperEvidentSignature: true, dataClassification: 'Restricted' },
    },
    { subject: 'Audit', action: 'manage', conditions: { siemIntegrationAuthority: true } },

    // 10. Executive & Operational Reports
    { subject: 'Report', action: 'create', conditions: null },
    { subject: 'Report', action: 'read', conditions: null },
    { subject: 'Report', action: 'update', conditions: null },
    { subject: 'Report', action: 'delete', conditions: null },
    { subject: 'Report', action: 'export', conditions: { exportFormat: ['PDF', 'CSV', 'XLSX'] } },
    { subject: 'Report', action: 'manage', conditions: { scheduleAutomation: true } },

    // 11. System Configuration & Preferences
    { subject: 'Setting', action: 'create', conditions: { globalConfiguration: true } },
    { subject: 'Setting', action: 'read', conditions: null },
    { subject: 'Setting', action: 'update', conditions: { dualControlVerification: true } },
    {
      subject: 'Setting',
      action: 'delete',
      conditions: { emergencyOverride: true, auditLevel: 'Critical' },
    },
    { subject: 'Setting', action: 'export', conditions: { maskSecrets: true } },
    { subject: 'Setting', action: 'manage', conditions: { systemTelemetryAccess: true } },
  ];

  const seededPermissionsMap = new Map<string, string>();

  for (const perm of ALL_PERMISSIONS_CATALOG) {
    const existing = await prisma.permission.findFirst({
      where: { subject: perm.subject, action: perm.action },
    });
    if (existing) {
      await prisma.permission.update({
        where: { id: existing.id },
        data: { conditions: perm.conditions },
      });
      seededPermissionsMap.set(`${perm.subject}:${perm.action}`, existing.id);
    } else {
      const created = await prisma.permission.create({
        data: {
          subject: perm.subject,
          action: perm.action,
          conditions: perm.conditions,
        },
      });
      seededPermissionsMap.set(`${perm.subject}:${perm.action}`, created.id);
    }
  }

  // Link Permissions to Standard Roles reflecting Enterprise Least-Privilege Governance
  const rolePermissionAssignments: Record<string, Array<string>> = {
    'Super Admin': Array.from(seededPermissionsMap.keys()),
    Admin: [
      'Asset:create',
      'Asset:read',
      'Asset:update',
      'Asset:delete',
      'Asset:export',
      'Asset:manage',
      'License:create',
      'License:read',
      'License:update',
      'License:delete',
      'License:export',
      'License:manage',
      'User:create',
      'User:read',
      'User:update',
      'User:delete',
      'User:export',
      'User:manage',
      'Group:create',
      'Group:read',
      'Group:update',
      'Group:delete',
      'Group:export',
      'Group:manage',
      'Role:create',
      'Role:read',
      'Role:update',
      'Role:export',
      'Role:manage',
      'Organization:create',
      'Organization:read',
      'Organization:update',
      'Organization:delete',
      'Organization:export',
      'Organization:manage',
      'Network:create',
      'Network:read',
      'Network:update',
      'Network:delete',
      'Network:export',
      'Network:manage',
      'Inventory:create',
      'Inventory:read',
      'Inventory:update',
      'Inventory:delete',
      'Inventory:export',
      'Inventory:manage',
      'Audit:read',
      'Audit:export',
      'Report:create',
      'Report:read',
      'Report:update',
      'Report:delete',
      'Report:export',
      'Report:manage',
      'Setting:create',
      'Setting:read',
      'Setting:update',
      'Setting:delete',
      'Setting:export',
      'Setting:manage',
    ],
    Technician: [
      'Asset:create',
      'Asset:read',
      'Asset:update',
      'Asset:export',
      'Asset:manage',
      'Inventory:create',
      'Inventory:read',
      'Inventory:update',
      'Inventory:export',
      'Inventory:manage',
      'Network:create',
      'Network:read',
      'Network:update',
      'Network:export',
      'Network:manage',
      'License:read',
      'License:export',
      'User:read',
      'User:export',
      'Group:read',
      'Organization:read',
      'Report:read',
      'Report:export',
      'Setting:read',
    ],
    Auditor: [
      'Asset:read',
      'Asset:export',
      'License:read',
      'License:export',
      'User:read',
      'User:export',
      'Group:read',
      'Group:export',
      'Role:read',
      'Role:export',
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
      'Setting:export',
    ],
    Manager: [
      'Asset:read',
      'Asset:export',
      'License:read',
      'License:export',
      'User:read',
      'User:export',
      'Group:read',
      'Organization:read',
      'Inventory:read',
      'Inventory:export',
      'Audit:read',
      'Report:create',
      'Report:read',
      'Report:export',
      'Setting:read',
    ],
    Employee: ['Asset:read', 'License:read', 'User:read', 'Organization:read', 'Report:read'],
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
        try {
          await prisma.rolePermission.upsert({
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
          });
        } catch (error: unknown) {
          logger.error(
            `Failed to assign permission ${key} to role ${name}:`,
            error instanceof Error ? error.stack : error,
          );
          throw error;
        }
      }
    }
  }

  // 3. Core Enterprise Staff Data with Normalized Relational Mappings
  const coreStaffData = [
    {
      username: 'admin',
      email: 'admin@uims.local',
      employeeCode: 'SYS-001',
      firstName: 'System',
      lastName: 'Administrator',
      displayName: 'System Administrator',
      jobTitle: 'Super Administrator',
      roleId: superAdminRole.id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-IT',
      positionCode: 'POS-VP-IT',
      locationId: 'loc-ny-f4',
      adGroup: 'GR_HQ_ExecutiveLeadership',
      phone: '+1 (555) 100-2000',
      ouPath: 'OU=Administrators,OU=HQ,DC=uims,DC=internal',
      passwordHash: adminPasswordHash,
    },
    {
      username: 'alex.johnson',
      email: 'admin@uims.internal',
      employeeCode: 'EMP-1001',
      firstName: 'Alex',
      lastName: 'Johnson',
      displayName: 'Alex Johnson',
      jobTitle: 'VP of Information Technology',
      roleId: superAdminRole.id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-IT',
      positionCode: 'POS-VP-IT',
      locationId: 'loc-ny-f4',
      adGroup: 'GR_HQ_ExecutiveLeadership',
      phone: '+1 (555) 234-5678',
      ouPath: 'OU=Management,OU=HQ,DC=uims,DC=internal',
      passwordHash: adminPasswordHash,
    },
    {
      username: 'sarah.chen',
      email: 'sarah.chen@company.com',
      employeeCode: 'EMP-1002',
      firstName: 'Sarah',
      lastName: 'Chen',
      displayName: 'Sarah Chen',
      jobTitle: 'Senior Systems Administrator',
      roleId: techRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-IT',
      positionCode: 'POS-SYSADMIN',
      locationId: 'loc-sf-bay',
      adGroup: 'GR_HQ_ITInfrastructure',
      phone: '+1 (555) 345-6789',
      ouPath: 'OU=IT,OU=Infrastructure,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'michael.wong',
      email: 'michael.wong@company.com',
      employeeCode: 'EMP-1003',
      firstName: 'Michael',
      lastName: 'Wong',
      displayName: 'Michael Wong',
      jobTitle: 'Senior Network Architect',
      roleId: adminRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-IT-NET',
      positionCode: 'POS-NET-ARCH',
      locationId: 'loc-ny-f4',
      adGroup: 'GR_HQ_ITInfrastructure',
      phone: '+1 (555) 345-1122',
      ouPath: 'OU=IT,OU=Infrastructure,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'marcus.bell',
      email: 'compliance@uims.internal',
      employeeCode: 'EMP-1004',
      firstName: 'Marcus',
      lastName: 'Bell',
      displayName: 'Marcus Bell',
      jobTitle: 'Principal Security Compliance Auditor',
      roleId: auditorRole.id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'ACME-EMEA',
      departmentCode: 'DEPT-SEC',
      positionCode: 'POS-SEC-LEAD',
      locationId: 'loc-london',
      adGroup: 'GR_HQ_SecurityCompliance',
      phone: '+44 20 7946 0912',
      ouPath: 'OU=Security,OU=Compliance,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'david.kim',
      email: 'david.kim@company.com',
      employeeCode: 'EMP-1005',
      firstName: 'David',
      lastName: 'Kim',
      displayName: 'David Kim',
      jobTitle: 'Lead Cloud Architect',
      roleId: employeeRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-ENG',
      positionCode: 'POS-CLOUD-ARCH',
      locationId: 'loc-sf-bay',
      adGroup: 'GR_HQ_EngineeringCore',
      phone: '+1 (555) 567-8901',
      ouPath: 'OU=Engineering,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'sophia.patel',
      email: 'sophia.patel@company.com',
      employeeCode: 'EMP-1006',
      firstName: 'Sophia',
      lastName: 'Patel',
      displayName: 'Sophia Patel',
      jobTitle: 'Senior Staff Fullstack Engineer',
      roleId: employeeRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-ENG',
      positionCode: 'POS-SR-SWE',
      locationId: 'loc-sf-bay',
      adGroup: 'GR_HQ_EngineeringCore',
      phone: '+1 (555) 567-2233',
      ouPath: 'OU=Engineering,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'liam.nguyen',
      email: 'liam.nguyen@company.com',
      employeeCode: 'EMP-1007',
      firstName: 'Liam',
      lastName: 'Nguyen',
      displayName: 'Liam Nguyen',
      jobTitle: 'Lead DevOps & SRE Architect',
      roleId: employeeRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-ENG',
      positionCode: 'POS-SRE-LEAD',
      locationId: 'loc-sf-bay',
      adGroup: 'GR_HQ_EngineeringCore',
      phone: '+1 (555) 567-4455',
      ouPath: 'OU=Engineering,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'carlos.mendez',
      email: 'carlos.mendez@company.com',
      employeeCode: 'EMP-1008',
      firstName: 'Carlos',
      lastName: 'Mendez',
      displayName: 'Carlos Mendez',
      jobTitle: 'Senior Backend Platform Engineer',
      roleId: employeeRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-ENG',
      positionCode: 'POS-BACKEND-ENG',
      locationId: 'loc-ny-f4',
      adGroup: 'GR_HQ_EngineeringCore',
      phone: '+1 (555) 567-7788',
      ouPath: 'OU=Engineering,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'marcus.vance',
      email: 'marcus.vance@company.com',
      employeeCode: 'EMP-1009',
      firstName: 'Marcus',
      lastName: 'Vance',
      displayName: 'Marcus Vance',
      jobTitle: 'Principal Product Designer',
      roleId: employeeRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-DES',
      positionCode: 'POS-PRIN-DES',
      locationId: 'loc-ny-f4',
      adGroup: 'GR_HQ_ProductDesign',
      phone: '+1 (555) 456-7890',
      ouPath: 'OU=Design,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'chloe.martin',
      email: 'chloe.martin@company.com',
      employeeCode: 'EMP-1010',
      firstName: 'Chloe',
      lastName: 'Martin',
      displayName: 'Chloe Martin',
      jobTitle: 'Senior UX Researcher',
      roleId: employeeRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-DES',
      positionCode: 'POS-UX-RES',
      locationId: 'loc-london',
      adGroup: 'GR_HQ_ProductDesign',
      phone: '+44 20 7946 0881',
      ouPath: 'OU=Design,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'elena.rostova',
      email: 'elena.rostova@company.com',
      employeeCode: 'EMP-1011',
      firstName: 'Elena',
      lastName: 'Rostova',
      displayName: 'Elena Rostova',
      jobTitle: 'Director of Growth Marketing',
      roleId: managerRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-MKT',
      positionCode: 'POS-DIR-MKT',
      locationId: 'loc-london',
      adGroup: 'GR_HQ_GrowthMarketing',
      phone: '+1 (555) 678-9012',
      ouPath: 'OU=Marketing,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'robert.torres',
      email: 'robert.torres@company.com',
      employeeCode: 'EMP-1012',
      firstName: 'Robert',
      lastName: 'Torres',
      displayName: 'Robert Torres',
      jobTitle: 'IT Infrastructure Operations Manager',
      roleId: managerRole.id,
      status: 'ACTIVE' as const,
      source: 'LOCAL' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-IT',
      positionCode: 'POS-IT-OPS-MGR',
      locationId: 'loc-ny-f4',
      adGroup: 'GR_HQ_ITInfrastructure',
      phone: '+1 (555) 678-3344',
      ouPath: 'OU=IT,OU=Infrastructure,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'lisa.wang',
      email: 'lisa.wang@company.com',
      employeeCode: 'EMP-1013',
      firstName: 'Lisa',
      lastName: 'Wang',
      displayName: 'Lisa Wang',
      jobTitle: 'Financial Controller',
      roleId: managerRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-APAC',
      departmentCode: 'DEPT-FIN',
      positionCode: 'POS-FIN-CTRL',
      locationId: 'loc-singapore',
      adGroup: 'GR_HQ_FinanceProcurement',
      phone: '+65 6789 0123',
      ouPath: 'OU=Finance,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'rachel.adams',
      email: 'rachel.adams@company.com',
      employeeCode: 'EMP-1014',
      firstName: 'Rachel',
      lastName: 'Adams',
      displayName: 'Rachel Adams',
      jobTitle: 'Head of People Operations',
      roleId: employeeRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-HR',
      positionCode: 'POS-HR-HEAD',
      locationId: 'loc-ny-f5',
      adGroup: 'GR_HQ_ExecutiveLeadership',
      phone: '+1 (555) 890-1234',
      ouPath: 'OU=HumanResources,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'james.wilson',
      email: 'james.wilson@company.com',
      employeeCode: 'EMP-1015',
      firstName: 'James',
      lastName: 'Wilson',
      displayName: 'James Wilson',
      jobTitle: 'Senior Corporate Counsel',
      roleId: employeeRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-LEGAL',
      positionCode: 'POS-SR-COUNSEL',
      locationId: 'loc-ny-f5',
      adGroup: 'GR_HQ_ExecutiveLeadership',
      phone: '+1 (555) 901-2345',
      ouPath: 'OU=Legal,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'hannah.scott',
      email: 'hannah.scott@company.com',
      employeeCode: 'EMP-1016',
      firstName: 'Hannah',
      lastName: 'Scott',
      displayName: 'Hannah Scott',
      jobTitle: 'Strategic Account Executive',
      roleId: employeeRole.id,
      status: 'ACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-SALES',
      positionCode: 'POS-ACCT-EXEC',
      locationId: 'loc-ny-f4',
      adGroup: 'GR_HQ_GrowthMarketing',
      phone: '+1 (555) 901-6789',
      ouPath: 'OU=Sales,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'thomas.wright',
      email: 'thomas.wright@company.com',
      employeeCode: 'EMP-1017',
      firstName: 'Thomas',
      lastName: 'Wright',
      displayName: 'Thomas Wright',
      jobTitle: 'Junior QA Engineer (Contractor)',
      roleId: employeeRole.id,
      status: 'SUSPENDED' as const,
      source: 'LOCAL' as const,
      organizationCode: 'ACME-EMEA',
      departmentCode: 'DEPT-ENG',
      positionCode: 'POS-QA-ENG',
      locationId: 'loc-london',
      adGroup: 'GR_HQ_EngineeringCore',
      phone: '+1 (555) 789-0123',
      ouPath: 'OU=Engineering,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
    {
      username: 'jessica.taylor',
      email: 'jessica.taylor@company.com',
      employeeCode: 'EMP-1018',
      firstName: 'Jessica',
      lastName: 'Taylor',
      displayName: 'Jessica Taylor',
      jobTitle: 'Content Strategist (Leave of Absence)',
      roleId: employeeRole.id,
      status: 'INACTIVE' as const,
      source: 'AZURE_AD' as const,
      organizationCode: 'ACME-US',
      departmentCode: 'DEPT-MKT',
      positionCode: 'POS-CONTENT-STRAT',
      locationId: 'loc-london',
      adGroup: 'GR_HQ_GrowthMarketing',
      phone: '+44 20 7946 0999',
      ouPath: 'OU=Marketing,OU=HQ,DC=uims,DC=internal',
      passwordHash: defaultPasswordHash,
    },
  ];

  // 4. Seed AppUser operators (System Operators & Core Enterprise Staff)
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
      ...seededUsers,
    },
    staffProfiles,
  };
}
