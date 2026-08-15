import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const rawPassword = createUserDto.password || 'Admin@2026';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const { password: _password, ...userData } = createUserDto;

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
        email,
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
    search?: string;
    role?: string;
    status?: string;
    department?: string;
  }) {
    const pageSize = Math.min(100, Math.max(1, Number(query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};

    if (query?.search) {
      const s = query.search.trim();
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query?.role && query.role !== 'all') {
      where.roleName = query.role;
    }

    if (query?.status && query.status !== 'all') {
      where.status = query.status as UserStatus;
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
          email: true,
          firstName: true,
          lastName: true,
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

    const items = users.map((u) => ({
      ...u,
      fullName: `${u.firstName} ${u.lastName}`.trim(),
      assignedAssetsCount: u._count?.assignedAssets || 0,
      assignedLicensesCount: u._count?.licenseAssignments || 0,
    }));

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
        email: true,
        firstName: true,
        lastName: true,
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

    return {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
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

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const data: Prisma.UserUpdateInput = { ...updateUserDto };
    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      delete (data as { password?: string }).password;
    }

    if (updateUserDto.roleId && !updateUserDto.roleName) {
      const role = await this.prisma.role.findUnique({ where: { id: updateUserDto.roleId } });
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
    return {
      ...safeUser,
      fullName: `${safeUser.firstName} ${safeUser.lastName}`.trim(),
    };
  }

  async resetPassword(id: string, newPassword: string) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
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
    const [totalUsers, activeUsers, adminUsers, suspendedUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: {
          roleName: { in: ['Super Admin', 'Admin'] },
        },
      }),
      this.prisma.user.count({ where: { status: 'SUSPENDED' } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      adminUsers,
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
}
