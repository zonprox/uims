import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';
import type { CreateGroupDto } from './dto/create-group.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { BatchImportUsersDto } from './dto/import-users.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis?: RedisService,
  ) {}

  async findByIdentifier(identifier: string) {
    const clean = identifier.trim().toLowerCase();
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: 'insensitive' } },
          { username: { equals: clean, mode: 'insensitive' } },
          { employeeCode: { equals: clean, mode: 'insensitive' } },
        ],
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async create(userData: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: userData.email },
          ...(userData.username ? [{ username: userData.username }] : []),
          ...(userData.employeeCode ? [{ employeeCode: userData.employeeCode }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'User with this email, username, or employee ID already exists in domain',
      );
    }

    let roleId = userData.roleId;
    let roleName = userData.roleName;

    if (!roleId && roleName) {
      const foundRole = await this.prisma.role.findFirst({ where: { name: roleName } });
      if (foundRole) {
        roleId = foundRole.id;
        roleName = foundRole.name;
      }
    } else if (roleId && !roleName) {
      const foundRole = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (foundRole) roleName = foundRole.name;
    }

    const username = userData.username || userData.email.split('@')[0];
    const adInitialPassword = userData.adInitialPassword || `Ad#${username}2026!`;
    const plainPassword = userData.password || adInitialPassword;
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const isClosed =
      userData.isClosed === true ||
      userData.status === 'SUSPENDED' ||
      userData.status === ('CLOSED' as unknown as UserStatus);

    const status: UserStatus = isClosed ? 'SUSPENDED' : userData.status || 'ACTIVE';

    const created = await this.prisma.user.create({
      data: {
        email: userData.email,
        username,
        employeeCode: userData.employeeCode || null,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName:
          userData.displayName ||
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
          username,
        jobTitle: userData.jobTitle || 'Employee',
        company: userData.company || 'BSL Others',
        groupCompany: userData.groupCompany || 'BSL',
        plant: userData.plant || 'BSL Others',
        section: userData.section || null,
        subSection: userData.subSection || null,
        computerName: userData.computerName || null,
        computerName2: userData.computerName2 || null,
        adGroup: userData.adGroup || null,
        ouPath: userData.ouPath || 'OU=Corporate,DC=uims,DC=internal',
        managerName: userData.managerName || null,
        isLocked: Boolean(userData.isLocked),
        telephone: userData.telephone || null,
        isClosed: Boolean(userData.isClosed),
        status,
        source: userData.source || 'LOCAL',
        adInitialPassword,
        roleId,
        roleName: roleName || 'Employee',
        passwordHash,
      },
      include: {
        role: true,
        organization: true,
        departmentRel: true,
        positionRel: true,
        locationRel: true,
      },
    });

    // Auto-link AD Group if provided
    if (userData.adGroup) {
      await this.ensureAndLinkAdGroup(created.id, userData.adGroup);
    }

    const { passwordHash: _hash, ...safeUser } = created;
    return safeUser;
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    status?: string;
    department?: string;
    section?: string;
    company?: string;
    plant?: string;
    adGroup?: string;
    ouPath?: string;
    source?: string;
  }) {
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};

    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { displayName: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { employeeCode: { contains: s, mode: 'insensitive' } },
        { computerName: { contains: s, mode: 'insensitive' } },
        { computerName2: { contains: s, mode: 'insensitive' } },
        { adGroup: { contains: s, mode: 'insensitive' } },
        { section: { contains: s, mode: 'insensitive' } },
        { subSection: { contains: s, mode: 'insensitive' } },
        { company: { contains: s, mode: 'insensitive' } },
        { plant: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { telephone: { contains: s, mode: 'insensitive' } },
        { jobTitle: { contains: s, mode: 'insensitive' } },
        { managerName: { contains: s, mode: 'insensitive' } },
        { ouPath: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query?.role && query.role !== 'all') {
      where.roleName = query.role;
    }

    if (query?.status && query.status !== 'all') {
      where.status = query.status.toUpperCase() as UserStatus;
    }

    if (query?.source && query.source !== 'all') {
      where.source = query.source as import('@prisma/client').DirectorySource;
    }

    if (query?.ouPath && query.ouPath !== 'all') {
      where.ouPath = { contains: query.ouPath, mode: 'insensitive' };
    }

    if (query?.department && query.department !== 'all') {
      where.OR = [
        ...(where.OR || []),
        { department: { contains: query.department, mode: 'insensitive' } },
        { departmentRel: { name: { contains: query.department, mode: 'insensitive' } } },
      ];
    }

    if (query?.section && query.section !== 'all') {
      where.section = { contains: query.section, mode: 'insensitive' };
    }

    if (query?.company && query.company !== 'all') {
      where.OR = [
        ...(where.OR || []),
        { company: { contains: query.company, mode: 'insensitive' } },
        { groupCompany: { contains: query.company, mode: 'insensitive' } },
      ];
    }

    if (query?.plant && query.plant !== 'all') {
      where.plant = { contains: query.plant, mode: 'insensitive' };
    }

    if (query?.adGroup && query.adGroup !== 'all') {
      where.adGroup = { contains: query.adGroup, mode: 'insensitive' };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          displayName: true,
          jobTitle: true,
          company: true,
          groupCompany: true,
          plant: true,
          section: true,
          subSection: true,
          computerName: true,
          computerName2: true,
          adGroup: true,
          ouPath: true,
          managerName: true,
          isLocked: true,
          accountExpiresAt: true,
          telephone: true,
          isClosed: true,
          source: true,
          adInitialPassword: true,
          roleId: true,
          roleName: true,
          role: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          status: true,
          avatar: true,
          phone: true,
          department: true,
          location: true,
          organizationId: true,
          departmentId: true,
          positionId: true,
          locationId: true,
          organization: {
            select: { id: true, name: true, code: true },
          },
          departmentRel: {
            select: { id: true, name: true, code: true },
          },
          positionRel: {
            select: { id: true, title: true, code: true, level: true },
          },
          locationRel: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              assignedAssets: true,
              licenseAssignments: true,
              auditLogs: true,
            },
          },
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        take: pageSize,
        skip,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((u) => {
      const fullName = u.displayName || `${u.firstName} ${u.lastName}`.trim();
      return {
        ...u,
        name: fullName,
        fullName,
        assignedAssetsCount: u._count?.assignedAssets || 0,
        assignedLicensesCount: u._count?.licenseAssignments || 0,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        organization: true,
        departmentRel: true,
        positionRel: true,
        locationRel: true,
        assignedAssets: {
          take: 10,
          select: {
            id: true,
            name: true,
            assetTag: true,
            model: true,
            status: true,
          },
        },
        licenseAssignments: {
          take: 10,
          include: {
            license: {
              select: {
                id: true,
                name: true,
                vendor: true,
              },
            },
          },
        },
        groupMemberships: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found in directory`);
    }

    const { passwordHash: _hash, ...safeUser } = user;
    const fullName = safeUser.displayName || `${safeUser.firstName} ${safeUser.lastName}`.trim();
    return {
      ...safeUser,
      fullName,
      assignedAssetsCount: safeUser.assignedAssets?.length || 0,
      assignedLicensesCount: safeUser.licenseAssignments?.length || 0,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const updateData: Prisma.UserUpdateInput = {};

    if (updateUserDto.displayName !== undefined) updateData.displayName = updateUserDto.displayName;
    if (updateUserDto.firstName !== undefined) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.employeeCode !== undefined)
      updateData.employeeCode = updateUserDto.employeeCode;
    if (updateUserDto.jobTitle !== undefined) updateData.jobTitle = updateUserDto.jobTitle;
    if (updateUserDto.company !== undefined) updateData.company = updateUserDto.company;
    if (updateUserDto.groupCompany !== undefined)
      updateData.groupCompany = updateUserDto.groupCompany;
    if (updateUserDto.plant !== undefined) updateData.plant = updateUserDto.plant;
    if (updateUserDto.section !== undefined) updateData.section = updateUserDto.section;
    if (updateUserDto.subSection !== undefined) updateData.subSection = updateUserDto.subSection;
    if (updateUserDto.computerName !== undefined)
      updateData.computerName = updateUserDto.computerName;
    if (updateUserDto.computerName2 !== undefined)
      updateData.computerName2 = updateUserDto.computerName2;
    if (updateUserDto.adGroup !== undefined) updateData.adGroup = updateUserDto.adGroup;
    if (updateUserDto.ouPath !== undefined) updateData.ouPath = updateUserDto.ouPath;
    if (updateUserDto.managerName !== undefined) updateData.managerName = updateUserDto.managerName;
    if (updateUserDto.isLocked !== undefined) updateData.isLocked = updateUserDto.isLocked;
    if (updateUserDto.telephone !== undefined) updateData.telephone = updateUserDto.telephone;
    if (updateUserDto.department !== undefined) updateData.department = updateUserDto.department;
    if (updateUserDto.location !== undefined) updateData.location = updateUserDto.location;
    if (updateUserDto.phone !== undefined) updateData.phone = updateUserDto.phone;
    if (updateUserDto.avatar !== undefined) updateData.avatar = updateUserDto.avatar;
    if (updateUserDto.source !== undefined) updateData.source = updateUserDto.source;
    if (updateUserDto.adInitialPassword !== undefined)
      updateData.adInitialPassword = updateUserDto.adInitialPassword;

    if (updateUserDto.isClosed !== undefined) {
      updateData.isClosed = updateUserDto.isClosed;
      if (updateUserDto.isClosed) updateData.status = 'SUSPENDED';
    }

    if (updateUserDto.status !== undefined) {
      updateData.status = updateUserDto.status;
      if (updateUserDto.status === 'SUSPENDED') updateData.isClosed = true;
      else if (updateUserDto.status === 'ACTIVE') updateData.isClosed = false;
    }

    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    if (updateUserDto.roleName) {
      const foundRole = await this.prisma.role.findFirst({
        where: { name: updateUserDto.roleName },
      });
      if (foundRole) {
        updateData.role = { connect: { id: foundRole.id } };
        updateData.roleName = foundRole.name;
      }
    } else if (updateUserDto.roleId) {
      const foundRole = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });
      if (foundRole) {
        updateData.role = { connect: { id: foundRole.id } };
        updateData.roleName = foundRole.name;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
      },
    });

    if (updateUserDto.adGroup) {
      await this.ensureAndLinkAdGroup(id, updateUserDto.adGroup);
    }

    const { passwordHash: _hash, ...safeUser } = updated;
    return safeUser;
  }

  async resetPassword(id: string, newPassword?: string) {
    const user = await this.findOne(id);
    const pass = newPassword || `Ad#${user.username}2026!`;
    const passwordHash = await bcrypt.hash(pass, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        adInitialPassword: pass,
      },
    });

    return {
      success: true,
      message: `Password reset successfully for ${user.email}`,
      adInitialPassword: pass,
    };
  }

  async toggleStatus(id: string, status: UserStatus) {
    const isClosed = status === 'SUSPENDED' || (status as unknown) === 'CLOSED';
    return this.prisma.user.update({
      where: { id },
      data: {
        status,
        isClosed,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      suspendedUsers,
      custodiansCount,
      totalGroups,
      totalWorkstations,
      lockedCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: {
          roleName: { in: ['Super Admin', 'Admin'] },
        },
      }),
      this.prisma.user.count({ where: { OR: [{ status: 'SUSPENDED' }, { isClosed: true }] } }),
      this.prisma.asset.count({ where: { assignedToId: { not: null } } }),
      this.prisma.directoryGroup?.count ? this.prisma.directoryGroup.count() : Promise.resolve(0),
      this.prisma.user.count({ where: { computerName: { not: null } } }),
      this.prisma.user.count({ where: { isLocked: true } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      custodiansCount,
      suspendedUsers,
      recentActiveCount: activeUsers,
      totalGroups: totalGroups || 0,
      totalWorkstations: totalWorkstations || custodiansCount,
      lockedCount: lockedCount || 0,
      totalOUs: 6,
    };
  }

  async getOrganizationalUnits() {
    const users = await this.prisma.user.findMany({
      select: {
        department: true,
        section: true,
        company: true,
        plant: true,
        computerName: true,
        adGroup: true,
      },
    });

    const groups = await this.prisma.directoryGroup.findMany({
      select: { name: true, scope: true, memberCount: true },
    });

    const ouMap = new Map<
      string,
      {
        name: string;
        dn: string;
        description: string;
        userCount: number;
        groupCount: number;
        workstationCount: number;
      }
    >();

    const defaultOUs = [
      {
        name: 'Executive & Legal Counsel',
        dn: 'OU=Executive,DC=uims,DC=internal',
        description: 'Corporate Leadership, Governance & General Legal Counsel',
      },
      {
        name: 'IT Infrastructure & Operations',
        dn: 'OU=IT-Infrastructure,DC=uims,DC=internal',
        description: 'Domain Controllers, Network IPAM, Security Architecture & Helpdesk',
      },
      {
        name: 'Engineering & Product Design',
        dn: 'OU=Engineering,DC=uims,DC=internal',
        description: 'Software Engineering, DevOps, Cloud Architecture & UX Research',
      },
      {
        name: 'Production & Manufacturing (BSL Others)',
        dn: 'OU=Production-BSLOthers,DC=uims,DC=internal',
        description: 'Sample Development, Screen Printing, Logo Embroidery & QA',
      },
      {
        name: 'Production & Manufacturing (BSL-1)',
        dn: 'OU=Production-BSL1,DC=uims,DC=internal',
        description: 'Plant 1 Automated Cutting, Staging & Production Office',
      },
      {
        name: 'Corporate Services & People Operations',
        dn: 'OU=Corporate-Services,DC=uims,DC=internal',
        description: 'Human Resources, Finance, Growth Marketing & Compliance',
      },
    ];

    defaultOUs.forEach((ou) => {
      ouMap.set(ou.dn, {
        name: ou.name,
        dn: ou.dn,
        description: ou.description,
        userCount: 0,
        groupCount: 0,
        workstationCount: 0,
      });
    });

    for (const u of users) {
      let targetDn = 'OU=Corporate-Services,DC=uims,DC=internal';
      if (u.department === 'IT & Infrastructure') {
        targetDn = 'OU=IT-Infrastructure,DC=uims,DC=internal';
      } else if (u.department === 'Engineering' || u.department === 'Product & Design') {
        targetDn = 'OU=Engineering,DC=uims,DC=internal';
      } else if (u.company?.includes('BSL-1') || u.plant?.includes('BSL-1')) {
        targetDn = 'OU=Production-BSL1,DC=uims,DC=internal';
      } else if (u.department === 'Production') {
        targetDn = 'OU=Production-BSLOthers,DC=uims,DC=internal';
      } else if (u.department === 'Legal & Governance' || u.department === 'Executive') {
        targetDn = 'OU=Executive,DC=uims,DC=internal';
      }

      const entry = ouMap.get(targetDn) || ouMap.get('OU=Corporate-Services,DC=uims,DC=internal');
      if (entry) {
        entry.userCount++;
        if (u.computerName) entry.workstationCount++;
      }
    }

    for (const g of groups) {
      if (g.name.includes('BSL1')) {
        const entry = ouMap.get('OU=Production-BSL1,DC=uims,DC=internal');
        if (entry) entry.groupCount++;
      } else if (
        g.name.includes('BSLOTH') ||
        g.name.includes('Printing') ||
        g.name.includes('Sample') ||
        g.name.includes('Embroidery')
      ) {
        const entry = ouMap.get('OU=Production-BSLOthers,DC=uims,DC=internal');
        if (entry) entry.groupCount++;
      } else {
        const entry = ouMap.get('OU=IT-Infrastructure,DC=uims,DC=internal');
        if (entry) entry.groupCount++;
      }
    }

    return Array.from(ouMap.values()).map((ou, idx) => ({
      id: `ou-${idx + 1}`,
      ...ou,
    }));
  }

  async syncDomain() {
    const [totalUsers, totalGroups, activeUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.directoryGroup.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
    ]);

    return {
      domain: 'uims.internal',
      controller: 'DC01-PRIMARY.corp.uims.internal',
      status: 'SYNCHRONIZED',
      latencyMs: 14,
      replicatedObjects: totalUsers + totalGroups,
      activeIdentities: activeUsers,
      lastSyncTimestamp: new Date().toISOString(),
    };
  }

  async getRoles() {
    const cacheKey = 'uims:cache:roles:all';
    if (this.redis) {
      const cached = await this.redis.get<Array<unknown>>(cacheKey);
      if (cached) return cached;
    }

    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (this.redis) {
      await this.redis.set(cacheKey, roles, 3600); // 1 hour cache
    }

    return roles;
  }

  async findAllGroups() {
    return this.prisma.directoryGroup.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async createGroup(data: CreateGroupDto) {
    return this.prisma.directoryGroup.create({
      data: {
        name: data.name,
        email:
          data.address ||
          data.email ||
          `${data.name.toLowerCase().replace(/\s+/g, '-')}@company.com`,
        memberCount: data.memberCount ? Number(data.memberCount) : 5,
        scope: data.scope || 'Internal Only',
        managedBy: data.managedBy || 'IT Admin',
        description: data.description,
      },
    });
  }

  async importBatch(dto: BatchImportUsersDto) {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; email?: string; error: string }> = [];

    const defaultRole = await this.prisma.role.findFirst({ where: { name: 'Employee' } });

    for (let i = 0; i < dto.users.length; i++) {
      const row = dto.users[i];
      try {
        if (!row.email) {
          skipped++;
          continue;
        }

        const email = row.email.trim().toLowerCase();
        const rawUsername = email.split('@')[0] || `user-${Date.now()}`;
        const cleanUsername = rawUsername.replace(/[^a-zA-Z0-9._-]/g, '');

        const nameParts = (row.name || cleanUsername).trim().split(' ');
        const firstName =
          nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] || 'User';
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const displayName = (row.name || `${firstName} ${lastName}`).trim();

        const adPass = row.initialPassword || `Ad#${cleanUsername}2026!`;
        const passwordHash = await bcrypt.hash(adPass, 10);

        const isClosed =
          row.isClosed === true ||
          row.isClosed === 'Y' ||
          row.isClosed === 'y' ||
          row.status === 'SUSPENDED' ||
          row.status === 'CLOSED';

        const status: UserStatus = isClosed ? 'SUSPENDED' : 'ACTIVE';
        const employeeCode = row.employeeCode ? String(row.employeeCode).trim() : null;

        const existingUser = await this.prisma.user.findFirst({
          where: {
            OR: [{ email }, ...(employeeCode ? [{ employeeCode }] : [])],
          },
        });

        if (existingUser) {
          const updatedUser = await this.prisma.user.update({
            where: { id: existingUser.id },
            data: {
              employeeCode: employeeCode || existingUser.employeeCode,
              displayName,
              jobTitle: row.designation || existingUser.jobTitle,
              company: row.company || existingUser.company,
              groupCompany: row.groupCompany || existingUser.groupCompany,
              plant: row.plant || existingUser.plant,
              department: row.department || existingUser.department,
              section: row.section || existingUser.section,
              subSection: row.subSection || existingUser.subSection,
              computerName: row.computerName || existingUser.computerName,
              computerName2: row.computerName2 || existingUser.computerName2,
              adGroup: row.adGroup || existingUser.adGroup,
              ouPath: row.ouPath || existingUser.ouPath || 'OU=Production,DC=uims,DC=internal',
              managerName: row.managerName || existingUser.managerName,
              telephone: row.telephone || existingUser.telephone,
              adInitialPassword: row.initialPassword || existingUser.adInitialPassword,
              isClosed,
              status,
            },
          });
          if (row.adGroup) {
            await this.ensureAndLinkAdGroup(updatedUser.id, row.adGroup);
          }
          updated++;
        } else {
          // Check username collision
          let finalUsername = cleanUsername;
          const userWithSameUsername = await this.prisma.user.findUnique({
            where: { username: finalUsername },
          });
          if (userWithSameUsername) {
            finalUsername = `${cleanUsername}-${Math.floor(1000 + Math.random() * 9000)}`;
          }

          const newUser = await this.prisma.user.create({
            data: {
              username: finalUsername,
              email,
              employeeCode,
              firstName,
              lastName,
              displayName,
              jobTitle: row.designation || 'Employee',
              company: row.company || 'BSL Others',
              groupCompany: row.groupCompany || 'BSL',
              plant: row.plant || 'BSL Others',
              department: row.department || 'Production',
              section: row.section || null,
              subSection: row.subSection || null,
              computerName: row.computerName || null,
              computerName2: row.computerName2 || null,
              adGroup: row.adGroup || null,
              ouPath: row.ouPath || 'OU=Production,DC=uims,DC=internal',
              managerName: row.managerName || null,
              telephone: row.telephone || null,
              adInitialPassword: adPass,
              passwordHash,
              isClosed,
              status,
              roleId: defaultRole?.id || null,
              roleName: 'Employee',
              source: 'LOCAL',
            },
          });

          if (row.adGroup) {
            await this.ensureAndLinkAdGroup(newUser.id, row.adGroup);
          }
          created++;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown import error';
        errors.push({ row: i + 1, email: row.email, error: errorMsg });
      }
    }

    return {
      total: dto.users.length,
      created,
      updated,
      skipped,
      errors,
    };
  }

  async exportMaster() {
    const users = await this.prisma.user.findMany({
      orderBy: { employeeCode: 'asc' },
      select: {
        id: true,
        employeeCode: true,
        displayName: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        jobTitle: true,
        groupCompany: true,
        company: true,
        plant: true,
        department: true,
        section: true,
        subSection: true,
        telephone: true,
        phone: true,
        ouPath: true,
        managerName: true,
        isClosed: true,
        computerName: true,
        computerName2: true,
        adInitialPassword: true,
        adGroup: true,
        status: true,
        roleName: true,
      },
    });

    return users.map((u, index) => {
      const name = u.displayName || `${u.firstName} ${u.lastName}`.trim();
      return {
        STT: index + 1,
        HEmploy: u.employeeCode || '',
        HName: name,
        HDesignation: u.jobTitle || 'Employee',
        HGroupCompany: u.groupCompany || 'BSL',
        Hcomp: u.company || 'BSL Others',
        'Người Ngồi ở Xưởng': u.plant ? 'Yes' : 'No',
        Xưởng: u.plant || 'BSL Others',
        HDepartment: u.department || 'Production',
        HSection: u.section || '',
        HSubSection: u.subSection || '',
        HEmail: u.email,
        HTelephone: u.telephone || u.phone || '',
        HIsclose: u.isClosed ? 'Y' : 'N',
        'Computer Name': u.computerName || '',
        'Computer Name 2': u.computerName2 || '',
        'Initial Pass': u.adInitialPassword || '',
        'GR_GROUP USER': u.adGroup || '',
        'OU Path': u.ouPath || 'OU=Production,DC=uims,DC=internal',
        State: u.status,
      };
    });
  }

  private async ensureAndLinkAdGroup(userId: string, groupName: string) {
    try {
      const cleanName = groupName.trim();
      if (!cleanName) return;

      let group = await this.prisma.directoryGroup.findFirst({
        where: { name: cleanName },
      });

      if (!group) {
        const email = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')}@company.com`;
        group = await this.prisma.directoryGroup.create({
          data: {
            name: cleanName,
            email,
            scope: 'Security Group',
            description: `Synchronized Active Directory Security Group for ${cleanName}`,
            managedBy: 'Active Directory Domain Controller',
            memberCount: 1,
          },
        });
      } else {
        await this.prisma.directoryGroup.update({
          where: { id: group.id },
          data: { memberCount: { increment: 1 } },
        });
      }

      await this.prisma.directoryMembership
        .upsert({
          where: {
            userId_groupId: {
              userId,
              groupId: group.id,
            },
          },
          update: {},
          create: {
            userId,
            groupId: group.id,
          },
        })
        .catch(() => {});
    } catch (e) {
      console.error('Failed to link AD group:', e);
    }
  }
}
