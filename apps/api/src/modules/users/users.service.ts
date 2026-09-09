import * as crypto from 'node:crypto';
import { ConflictException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import type { UserStatus } from '@prisma/client';
import type { CreateAppUserDto, UpdateAppUserDto, UserSummaryStats } from '@uims/shared-types';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { DirectoryService } from '../directory/directory.service';
import type { CreateDirectoryGroupDto } from '../directory/dto/create-directory-group.dto';
import type { BatchImportDirectoryDto } from '../directory/dto/import-directory.dto';
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
    @Optional() private directoryService?: DirectoryService,
  ) {
    if (!this.directoryService && this.prisma) {
      this.directoryService = new DirectoryService(this.prisma);
    }
  }

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
    const hasExplicitPassword = Boolean(userData.password);
    const plainPassword = userData.password || generateSecureRandomPassword(20);
    const passwordHash = await bcrypt.hash(plainPassword, 10);
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
        roleName: roleName || 'Employee',
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

    const where: {
      OR?: Array<{
        displayName?: { contains: string; mode: 'insensitive' };
        firstName?: { contains: string; mode: 'insensitive' };
        lastName?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
        username?: { contains: string; mode: 'insensitive' };
      }>;
      roleName?: { equals: string; mode: 'insensitive' };
      status?: UserStatus;
      isLocked?: boolean;
    } = {};

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

    if (query?.role) {
      where.roleName = { equals: query.role, mode: 'insensitive' };
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
        orderBy: { createdAt: 'desc' },
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
      roleName?: string | null;
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
      if (updateUserDto.roleId) {
        const found = await this.prisma.role.findUnique({ where: { id: updateUserDto.roleId } });
        if (found) updateData.roleName = found.name;
      }
    } else if (updateUserDto.roleName !== undefined) {
      updateData.roleName = updateUserDto.roleName;
      const found = await this.prisma.role.findFirst({ where: { name: updateUserDto.roleName } });
      if (found) updateData.roleId = found.id;
    }

    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
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

  async getStats(): Promise<UserSummaryStats> {
    const [totalUsers, activeUsers, adminUsers, suspendedUsers, lockedUsers] = await Promise.all([
      this.prisma.appUser.count(),
      this.prisma.appUser.count({ where: { status: 'ACTIVE' } }),
      this.prisma.appUser.count({
        where: {
          OR: [{ roleName: { in: ['Admin', 'Super Admin'] } }],
        },
      }),
      this.prisma.appUser.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.appUser.count({ where: { isLocked: true } }),
    ]);

    let custodiansCount = 0;
    let totalGroups = 0;
    let totalWorkstations = 0;

    try {
      if (this.directoryService) {
        const dirStats = await this.directoryService.getStats();
        totalGroups = dirStats.totalGroups;
        custodiansCount = dirStats.totalEmployees;
        totalWorkstations = dirStats.assignedWorkstations;
      } else {
        const directoryUserDelegate = (
          this.prisma as unknown as { directoryUser?: { count: () => Promise<number> } }
        ).directoryUser;
        const directoryGroupDelegate = (
          this.prisma as unknown as { directoryGroup?: { count: () => Promise<number> } }
        ).directoryGroup;
        const assetDelegate = (
          this.prisma as unknown as { asset?: { count: () => Promise<number> } }
        ).asset;

        if (assetDelegate) {
          custodiansCount = await assetDelegate.count().catch(() => 0);
        } else if (directoryUserDelegate) {
          custodiansCount = await directoryUserDelegate.count().catch(() => 0);
        }

        if (directoryGroupDelegate) {
          totalGroups = await directoryGroupDelegate.count().catch(() => 0);
        }

        if (directoryUserDelegate) {
          totalWorkstations = await (
            this.prisma as unknown as {
              directoryUser: {
                count: (args: { where: { computerName: { not: null } } }) => Promise<number>;
              };
            }
          ).directoryUser
            .count({ where: { computerName: { not: null } } })
            .catch(() => 0);
        }
      }
    } catch (error: unknown) {
      this.logger.warn(
        'Failed to query directory stats during user getStats aggregation',
        error instanceof Error ? error.message : String(error),
      );
    }

    return {
      totalUsers,
      activeUsers,
      adminUsers,
      custodiansCount,
      suspendedUsers,
      recentActiveCount: activeUsers,
      totalGroups,
      totalWorkstations,
      lockedCount: lockedUsers,
      lockedUsers,
      totalOUs: 6,
    };
  }

  async getRoles() {
    const cacheKey = 'cache:roles:permissions';
    if (this.redis) {
      try {
        const cached = await this.redis.get<unknown[]>(cacheKey);
        if (cached) return cached;
      } catch (error: unknown) {
        this.logger.warn(
          'Redis cache read failed for roles',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    const result = roles.map((r) => ({
      ...r,
      permissions: r.permissions.map((p) => ({
        id: p.permission.id,
        action: p.permission.action,
        subject: p.permission.subject,
        conditions: p.permission.conditions,
      })),
    }));

    if (this.redis) {
      try {
        await this.redis.set(cacheKey, result, 300);
      } catch (error: unknown) {
        this.logger.warn(
          'Redis cache write failed for roles',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return result;
  }

  // Delegated Directory Methods (for backward compatibility during transition)
  async getOrganizationalUnits() {
    if (this.directoryService) {
      return this.directoryService.getOrganizationalUnits();
    }
    return [];
  }

  async syncDomain() {
    if (this.directoryService) {
      return this.directoryService.syncDomain();
    }
    return {
      domain: 'uims.internal',
      controller: 'DC01-PRIMARY.corp.uims.internal',
      status: 'SYNCHRONIZED',
      latencyMs: 14,
      replicatedObjects: 0,
      activeIdentities: 0,
      lastSyncTimestamp: new Date().toISOString(),
    };
  }

  async findAllGroups() {
    if (this.directoryService) {
      return this.directoryService.findAllGroups();
    }
    return this.prisma.directoryGroup.findMany({ take: 100 });
  }

  async createGroup(dto: CreateDirectoryGroupDto) {
    if (this.directoryService) {
      return this.directoryService.createGroup(dto);
    }
    return this.prisma.directoryGroup.create({
      data: {
        name: dto.name,
        email: dto.email,
        description: dto.description,
      },
    });
  }

  async exportMaster() {
    if (this.directoryService) {
      return this.directoryService.exportMaster();
    }
    return [];
  }

  async importBatch(dto: BatchImportDirectoryDto) {
    if (this.directoryService) {
      return this.directoryService.importBatch(dto);
    }
    return { total: 0, created: 0, updated: 0, skipped: 0, errors: [] };
  }
}
