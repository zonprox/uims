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

  // 3. System Login Users
  const userAdminLocal = await prisma.user.upsert({
    where: { email: 'admin@uims.local' },
    update: {
      passwordHash: adminPasswordHash,
      roleId: superAdminRole.id,
      roleName: 'Super Admin',
      firstName: 'System',
      lastName: 'Administrator',
      status: 'ACTIVE',
      department: 'IT & Infrastructure',
    },
    create: {
      email: 'admin@uims.local',
      firstName: 'System',
      lastName: 'Administrator',
      roleId: superAdminRole.id,
      roleName: 'Super Admin',
      status: 'ACTIVE',
      department: 'IT & Infrastructure',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 100-2000',
      passwordHash: adminPasswordHash,
    },
  });

  const userAlex = await prisma.user.upsert({
    where: { email: 'admin@uims.internal' },
    update: {
      passwordHash: defaultPasswordHash,
      roleId: superAdminRole.id,
      roleName: 'Super Admin',
      firstName: 'Alex',
      lastName: 'Johnson',
      status: 'ACTIVE',
      department: 'IT & Infrastructure',
    },
    create: {
      email: 'admin@uims.internal',
      firstName: 'Alex',
      lastName: 'Johnson',
      roleId: superAdminRole.id,
      roleName: 'Super Admin',
      status: 'ACTIVE',
      department: 'IT & Infrastructure',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 234-5678',
      passwordHash: defaultPasswordHash,
    },
  });

  const userSarah = await prisma.user.upsert({
    where: { email: 'sarah.chen@company.com' },
    update: {
      passwordHash: defaultPasswordHash,
      roleId: techRole.id,
      roleName: 'IT Specialist',
    },
    create: {
      email: 'sarah.chen@company.com',
      firstName: 'Sarah',
      lastName: 'Chen',
      roleId: techRole.id,
      roleName: 'IT Specialist',
      status: 'ACTIVE',
      department: 'IT & Infrastructure',
      location: 'SF HQ - Tech Bay',
      phone: '+1 (555) 345-6789',
      passwordHash: defaultPasswordHash,
    },
  });

  const userMichael = await prisma.user.upsert({
    where: { email: 'michael.wong@company.com' },
    update: {
      passwordHash: defaultPasswordHash,
      roleId: adminRole.id,
      roleName: 'Network Architect',
    },
    create: {
      email: 'michael.wong@company.com',
      firstName: 'Michael',
      lastName: 'Wong',
      roleId: adminRole.id,
      roleName: 'Network Architect',
      status: 'ACTIVE',
      department: 'IT & Infrastructure',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 345-1122',
      passwordHash: defaultPasswordHash,
    },
  });

  const userMarcusBell = await prisma.user.upsert({
    where: { email: 'compliance@uims.internal' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'compliance@uims.internal',
      firstName: 'Marcus',
      lastName: 'Bell',
      roleId: auditorRole.id,
      roleName: 'Lead Auditor',
      status: 'ACTIVE',
      department: 'Security & Compliance',
      location: 'London Hub',
      phone: '+44 20 7946 0912',
      passwordHash: defaultPasswordHash,
    },
  });

  const userDavidKim = await prisma.user.upsert({
    where: { email: 'david.kim@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'david.kim@company.com',
      firstName: 'David',
      lastName: 'Kim',
      roleId: employeeRole.id,
      roleName: 'Developer',
      status: 'ACTIVE',
      department: 'Engineering',
      location: 'Remote - US East',
      phone: '+1 (555) 567-8901',
      passwordHash: defaultPasswordHash,
    },
  });

  const userSophiaPatel = await prisma.user.upsert({
    where: { email: 'sophia.patel@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'sophia.patel@company.com',
      firstName: 'Sophia',
      lastName: 'Patel',
      roleId: employeeRole.id,
      roleName: 'Developer',
      status: 'ACTIVE',
      department: 'Engineering',
      location: 'SF HQ - Tech Bay',
      phone: '+1 (555) 567-2233',
      passwordHash: defaultPasswordHash,
    },
  });

  const userLiamNguyen = await prisma.user.upsert({
    where: { email: 'liam.nguyen@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'liam.nguyen@company.com',
      firstName: 'Liam',
      lastName: 'Nguyen',
      roleId: employeeRole.id,
      roleName: 'Developer',
      status: 'ACTIVE',
      department: 'Engineering',
      location: 'Remote - US West',
      phone: '+1 (555) 567-4455',
      passwordHash: defaultPasswordHash,
    },
  });

  const userCarlosMendez = await prisma.user.upsert({
    where: { email: 'carlos.mendez@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'carlos.mendez@company.com',
      firstName: 'Carlos',
      lastName: 'Mendez',
      roleId: employeeRole.id,
      roleName: 'Developer',
      status: 'ACTIVE',
      department: 'Engineering',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 567-7788',
      passwordHash: defaultPasswordHash,
    },
  });

  const userMarcusVance = await prisma.user.upsert({
    where: { email: 'marcus.vance@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'marcus.vance@company.com',
      firstName: 'Marcus',
      lastName: 'Vance',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE',
      department: 'Product & Design',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 456-7890',
      passwordHash: defaultPasswordHash,
    },
  });

  const userChloeMartin = await prisma.user.upsert({
    where: { email: 'chloe.martin@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'chloe.martin@company.com',
      firstName: 'Chloe',
      lastName: 'Martin',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE',
      department: 'Product & Design',
      location: 'London Hub',
      phone: '+44 20 7946 0881',
      passwordHash: defaultPasswordHash,
    },
  });

  const userElena = await prisma.user.upsert({
    where: { email: 'elena.rostova@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'elena.rostova@company.com',
      firstName: 'Elena',
      lastName: 'Rostova',
      roleId: managerRole.id,
      roleName: 'Manager',
      status: 'ACTIVE',
      department: 'Marketing',
      location: 'London Hub',
      phone: '+1 (555) 678-9012',
      passwordHash: defaultPasswordHash,
    },
  });

  const userRobertTorres = await prisma.user.upsert({
    where: { email: 'robert.torres@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'robert.torres@company.com',
      firstName: 'Robert',
      lastName: 'Torres',
      roleId: managerRole.id,
      roleName: 'Manager',
      status: 'ACTIVE',
      department: 'IT & Infrastructure',
      location: 'NY HQ - Floor 4',
      phone: '+1 (555) 678-3344',
      passwordHash: defaultPasswordHash,
    },
  });

  const userLisaWang = await prisma.user.upsert({
    where: { email: 'lisa.wang@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'lisa.wang@company.com',
      firstName: 'Lisa',
      lastName: 'Wang',
      roleId: managerRole.id,
      roleName: 'Manager',
      status: 'ACTIVE',
      department: 'Finance',
      location: 'Singapore Hub',
      phone: '+65 6789 0123',
      passwordHash: defaultPasswordHash,
    },
  });

  const userRachelAdams = await prisma.user.upsert({
    where: { email: 'rachel.adams@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'rachel.adams@company.com',
      firstName: 'Rachel',
      lastName: 'Adams',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE',
      department: 'Human Resources',
      location: 'NY HQ - Floor 5',
      phone: '+1 (555) 890-1234',
      passwordHash: defaultPasswordHash,
    },
  });

  const userJamesWilson = await prisma.user.upsert({
    where: { email: 'james.wilson@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'james.wilson@company.com',
      firstName: 'James',
      lastName: 'Wilson',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE',
      department: 'Legal & Governance',
      location: 'NY HQ - Floor 5',
      phone: '+1 (555) 901-2345',
      passwordHash: defaultPasswordHash,
    },
  });

  const userHannahScott = await prisma.user.upsert({
    where: { email: 'hannah.scott@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'hannah.scott@company.com',
      firstName: 'Hannah',
      lastName: 'Scott',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'ACTIVE',
      department: 'Sales',
      location: 'Remote - US Central',
      phone: '+1 (555) 901-6789',
      passwordHash: defaultPasswordHash,
    },
  });

  const userThomas = await prisma.user.upsert({
    where: { email: 'thomas.wright@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'thomas.wright@company.com',
      firstName: 'Thomas',
      lastName: 'Wright',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'SUSPENDED',
      department: 'Engineering',
      location: 'Remote - EMEA',
      phone: '+1 (555) 789-0123',
      passwordHash: defaultPasswordHash,
    },
  });

  const userJessica = await prisma.user.upsert({
    where: { email: 'jessica.taylor@company.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'jessica.taylor@company.com',
      firstName: 'Jessica',
      lastName: 'Taylor',
      roleId: employeeRole.id,
      roleName: 'Employee',
      status: 'INACTIVE',
      department: 'Marketing',
      location: 'London Hub',
      phone: '+44 20 7946 0999',
      passwordHash: defaultPasswordHash,
    },
  });

  return {
    roles: { superAdminRole, adminRole, techRole, auditorRole, managerRole, employeeRole },
    users: {
      userAdminLocal,
      userAlex,
      userSarah,
      userMichael,
      userMarcusBell,
      userDavidKim,
      userSophiaPatel,
      userLiamNguyen,
      userCarlosMendez,
      userMarcusVance,
      userChloeMartin,
      userElena,
      userRobertTorres,
      userLisaWang,
      userRachelAdams,
      userJamesWilson,
      userHannahScott,
      userThomas,
      userJessica,
    },
  };
}
