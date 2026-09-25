import * as crypto from 'node:crypto';
import { ConflictException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma, UserStatus } from '@prisma/client';
import type { AppUserSummaryStats, CreateAppUserDto, UpdateAppUserDto } from '@uims/shared-types';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UserQueryDto } from './dto/user-query.dto';

export function generateSecureRandomPassword(length = 20): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*()_+-=';
  const allChars = uppercase + lowercase + digits + symbols;

  const bytes = crypto.randomBytes(length);
  const result: string[] = [
    uppercase[bytes[0] % uppercase.length],
    lowercase[bytes[1] % lowercase.length],
    digits[bytes[2] % digits.length],
    symbols[bytes[3] % symbols.length],
  ];
  for (let i = 4; i < length; i++) {
    result.push(allChars[bytes[i] % allChars.length]);
  }
  const shuffleBytes = crypto.randomBytes(length);
  for (let i = length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join('');
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async findByIdentifier(identifier: string) {
    const clean = identifier.trim().toLowerCase();
    return this.prisma.appUser.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: 'insensitive' } },
          { username: { equals: clean, mode: 'insensitive' } },
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

  async create(userData: CreateUserDto | CreateAppUserDto) {
    const existing = await this.prisma.appUser.findFirst({
      where: {
        OR: [
          { email: userData.email },
          ...(userData.username ? [{ username: userData.username }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('A user with this email or username already exists.');
    }

    let roleId = userData.roleId;
    const roleName = (userData as { roleName?: string }).roleName;

    if (!roleId && roleName) {
      const foundRole = await this.prisma.role.findFirst({ where: { name: roleName } });
      if (foundRole) {
        roleId = foundRole.id;
      }
    }

    const username = userData.username || userData.email.split('@')[0];
    const hasExplicitPassword = Boolean(userData.password);
    const plainPassword = userData.password || generateSecureRandomPassword(20);
    const passwordHash = await bcrypt.hash(plainPassword, 12);
    const mustChangePassword =
      userData.mustChangePassword !== undefined
        ? userData.mustChangePassword
        : !hasExplicitPassword;

    const isClosed =
      (userData as { isClosed?: boolean }).isClosed === true || userData.status === 'SUSPENDED';

    const status: UserStatus = isClosed ? 'SUSPENDED' : userData.status || 'ACTIVE';

    const created = await this.prisma.appUser.create({
      data: {
        email: userData.email,
        username,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName:
          userData.displayName ||
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
          username,
        phone: userData.phone || null,
        avatar: userData.avatar || null,
        isLocked: Boolean(userData.isLocked),
        mustChangePassword,
        status,
        roleId,
        passwordHash,
      },
      include: {
        role: true,
      },
    });

    const { passwordHash: _hash, ...safeUser } = created;
    return safeUser;
  }

  async findAll(query?: UserQueryDto) {
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const where: Prisma.AppUserWhereInput = {};

    if (query?.search) {
      const search = query.search.trim();
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query?.roleId) {
      where.roleId = query.roleId;
    } else if (query?.role) {
      where.role = { name: { equals: query.role, mode: 'insensitive' } };
    }

    if (query?.status) {
      where.status = query.status as UserStatus;
    }

    if (query?.isLocked !== undefined) {
      where.isLocked = query.isLocked;
    }

    const [items, total] = await Promise.all([
      this.prisma.appUser.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          role: true,
        },
      }),
      this.prisma.appUser.count({ where }),
    ]);

    const formattedItems = items.map((u) => {
      const { passwordHash: _hash, ...safe } = u;
      return {
        ...safe,
        fullName: `${u.firstName} ${u.lastName}`.trim() || u.displayName || u.username,
      };
    });

    return {
      items: formattedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.appUser.findUnique({
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
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { passwordHash: _hash, ...safe } = user;
    return {
      ...safe,
      fullName: `${user.firstName} ${user.lastName}`.trim() || user.displayName || user.username,
      assignedAssets: [],
      licenseAssignments: [],
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto | UpdateAppUserDto) {
    await this.findOne(id);

    const updateData: {
      email?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      avatar?: string | null;
      phone?: string | null;
      roleId?: string | null;
      status?: UserStatus;
      isLocked?: boolean;
      passwordHash?: string;
    } = {};

    if (updateUserDto.email !== undefined) updateData.email = updateUserDto.email;
    if (updateUserDto.username !== undefined) updateData.username = updateUserDto.username;
    if (updateUserDto.firstName !== undefined) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.displayName !== undefined) updateData.displayName = updateUserDto.displayName;
    if (updateUserDto.avatar !== undefined) updateData.avatar = updateUserDto.avatar || null;
    if (updateUserDto.phone !== undefined) updateData.phone = updateUserDto.phone || null;
    if (updateUserDto.status !== undefined) updateData.status = updateUserDto.status;
    if (updateUserDto.isLocked !== undefined) updateData.isLocked = Boolean(updateUserDto.isLocked);

    if (updateUserDto.roleId !== undefined) {
      updateData.roleId = updateUserDto.roleId;
    } else if ((updateUserDto as { roleName?: string }).roleName !== undefined) {
      const rName = (updateUserDto as { roleName?: string }).roleName;
      if (rName) {
        const found = await this.prisma.role.findFirst({ where: { name: rName } });
        if (found) updateData.roleId = found.id;
      }
    }

    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 12);
    }

    const updated = await this.prisma.appUser.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
      },
    });

    const { passwordHash: _hash, ...safe } = updated;
    return safe;
  }

  async toggleStatus(id: string, status: UserStatus) {
    await this.findOne(id);
    const updated = await this.prisma.appUser.update({
      where: { id },
      data: {
        status,
        isLocked: status === 'SUSPENDED',
      },
      include: {
        role: true,
      },
    });

    const { passwordHash: _hash, ...safe } = updated;
    return safe;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.appUser.delete({ where: { id } });
  }

  async getStats(): Promise<AppUserSummaryStats> {
    const [totalUsers, activeUsers, adminUsers, suspendedUsers, lockedUsers] = await Promise.all([
      this.prisma.appUser.count(),
      this.prisma.appUser.count({ where: { status: 'ACTIVE' } }),
      this.prisma.appUser.count({
        where: {
          role: { name: { in: ['Admin', 'Super Admin'] } },
        },
      }),
      this.prisma.appUser.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.appUser.count({ where: { isLocked: true } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      suspendedUsers,
      recentActiveCount: activeUsers,
      lockedUsers,
    };
  }
}
