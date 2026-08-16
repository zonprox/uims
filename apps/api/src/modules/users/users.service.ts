import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();
    const username = (createUserDto.username || email.split('@')[0] || `user-${Date.now()}`)
      .trim()
      .toLowerCase();

    const existingByEmail = await this.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    const existingByUsername = await this.findByUsername(username);
    if (existingByUsername) {
      throw new ConflictException('User with this AD username already exists');
    }

    const rawPassword = createUserDto.password || 'Admin@2026';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const { password: _password, ...userData } = createUserDto;

    const firstName = userData.firstName || username;
    const lastName = userData.lastName || '';
    const displayName = userData.displayName || `${firstName} ${lastName}`.trim();
    const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '');
    const adInitialPassword = userData.adInitialPassword || `Ad#${cleanUsername}2026!`;

    // Resolve roleName if roleId provided or vice versa
    let roleId = userData.roleId;
    let roleName = userData.roleName;

    if (roleId && !roleName) {
      const role = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (role) roleName = role.name;
    } else if (roleName && !roleId) {
      const role = await this.prisma.role.findUnique({ where: { name: roleName } });
      if (role) roleId = role.id;
    }

    const created = await this.prisma.user.create({
      data: {
        ...userData,
        username,
        email,
        firstName,
        lastName,
        displayName,
        jobTitle: userData.jobTitle || 'Employee',
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
        { phone: { contains: s, mode: 'insensitive' } },
        { jobTitle: { contains: s, mode: 'insensitive' } },
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

    if (query?.department && query.department !== 'all') {
      where.OR = [
        ...(where.OR || []),
        { department: { contains: query.department, mode: 'insensitive' } },
        { departmentRel: { name: { contains: query.department, mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          jobTitle: true,
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
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        jobTitle: true,
        source: true,
        adInitialPassword: true,
        roleId: true,
        roleName: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
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
            status: true,
            model: true,
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
                status: true,
              },
            },
          },
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
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const fullName = user.displayName || `${user.firstName} ${user.lastName}`.trim();
    return {
      ...user,
      name: fullName,
      fullName,
      assignedAssetsCount: user._count?.assignedAssets || 0,
      assignedLicensesCount: user._count?.licenseAssignments || 0,
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        role: true,
      },
    });
  }

  async findByIdentifier(identifier: string) {
    const clean = identifier.trim().toLowerCase();
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: clean }, { username: clean }],
      },
      include: {
        role: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const data: Prisma.UserUpdateInput = { ...updateUserDto };
    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      delete (data as { password?: string }).password;
    }

    if (updateUserDto.roleId && !updateUserDto.roleName) {
      const role = await this.prisma.role.findUnique({
        where: { id: updateUserDto.roleId },
      });
      if (role) data.roleName = role.name;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
        organization: true,
        departmentRel: true,
        positionRel: true,
      },
    });

    const { passwordHash: _hash, ...safeUser } = updated;
    const fullName = safeUser.displayName || `${safeUser.firstName} ${safeUser.lastName}`.trim();
    return {
      ...safeUser,
      name: fullName,
      fullName,
    };
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, adInitialPassword: null },
    });
    return { success: true, message: 'Password reset successfully' };
  }

  async toggleStatus(id: string, status: UserStatus) {
    await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, status: true },
    });
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ where: { id } });
  }

  async getStats() {
    const [totalUsers, activeUsers, adminUsers, suspendedUsers, custodiansCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({
          where: {
            roleName: { in: ['Super Admin', 'Admin'] },
          },
        }),
        this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
        this.prisma.asset.count({ where: { assignedToId: { not: null } } }),
      ]);

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      custodiansCount,
      suspendedUsers,
      recentActiveCount: activeUsers,
    };
  }

  async getRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
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
}
