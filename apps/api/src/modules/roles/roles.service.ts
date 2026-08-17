import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { CloneRoleDto } from './dto/clone-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { SyncPermissionsDto } from './dto/sync-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

const SYSTEM_ROLES = new Set([
  'SUPER ADMIN',
  'ADMIN',
  'TECHNICIAN',
  'AUDITOR',
  'MANAGER',
  'EMPLOYEE',
]);

const SUBJECT_METADATA: Record<
  string,
  { displayName: string; description: string; category: string }
> = {
  Asset: {
    displayName: 'Hardware Fleet',
    description: 'Manage physical laptops, servers, workstations, and peripherals',
    category: 'Core Assets',
  },
  License: {
    displayName: 'SaaS & Licenses',
    description: 'Track software contracts, seat allocations, and vendor compliance',
    category: 'Core Assets',
  },
  Inventory: {
    displayName: 'Spare Stockroom',
    description: 'Stockroom replenishment, threshold alerts, and parts transactions',
    category: 'Core Assets',
  },
  User: {
    displayName: 'Domain Users',
    description: 'Enterprise directory users, credentials, and account statuses',
    category: 'Access & Identity',
  },
  Group: {
    displayName: 'Security Groups',
    description: 'Distribution lists and Active Directory security groups',
    category: 'Access & Identity',
  },
  Role: {
    displayName: 'RBAC Roles',
    description: 'Role-based access permissions, privilege policies, and assignments',
    category: 'Access & Identity',
  },
  Organization: {
    displayName: 'Enterprise Org',
    description: 'Organization structure, corporate entities, departments, and positions',
    category: 'Governance & Org',
  },
  Network: {
    displayName: 'Network IPAM',
    description: 'VLANs, IPv4/IPv6 subnets, gateway allocations, and MAC tracking',
    category: 'Infrastructure',
  },
  Audit: {
    displayName: 'Security Audit',
    description: 'Tamper-evident SOC2/ISO audit log trail and export',
    category: 'Governance & Org',
  },
  Report: {
    displayName: 'Executive Reports',
    description: 'Automated valuation, asset lifecycle, and inventory schedules',
    category: 'Analytics',
  },
  Setting: {
    displayName: 'System Settings',
    description: 'Global security policy, active sessions, and environment preferences',
    category: 'Governance & Org',
  },
};

@Injectable()
export class RolesService {
  private readonly CACHE_KEY = 'uims:cache:roles:all';

  constructor(
    private prisma: PrismaService,
    @Optional() private redis?: RedisService,
  ) {}

  private async invalidateCache() {
    if (this.redis) {
      await this.redis.del(this.CACHE_KEY).catch(() => {});
    }
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => {
      const isSystem = SYSTEM_ROLES.has(r.name.trim().toUpperCase());
      const permissions = r.permissions.map((rp) => rp.permission);
      return {
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem,
        userCount: r._count.users,
        permissionCount: r._count.permissions,
        permissions,
      };
    });
  }

  async getStats() {
    const [roles, totalPermissions, totalUsers, superAdminsCount] = await Promise.all([
      this.prisma.role.findMany({
        select: {
          name: true,
          _count: { select: { users: true } },
        },
      }),
      this.prisma.permission.count(),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          role: { name: { in: ['Super Admin', 'SuperAdmin'] } },
        },
      }),
    ]);

    const totalRoles = roles.length;
    const systemRolesCount = roles.filter((r) =>
      SYSTEM_ROLES.has(r.name.trim().toUpperCase()),
    ).length;
    const customRolesCount = totalRoles - systemRolesCount;

    const assignedUsers = roles.reduce((acc, curr) => acc + curr._count.users, 0);
    const assignedUsersCoverage =
      totalUsers > 0 ? Math.round((assignedUsers / totalUsers) * 100) : 100;

    return {
      totalRoles,
      systemRolesCount,
      customRolesCount,
      totalPermissionsCount: totalPermissions,
      superAdminsCount,
      assignedUsersCoverage,
    };
  }

  async getCatalog() {
    const allPermissions = await this.prisma.permission.findMany({
      orderBy: [{ subject: 'asc' }, { action: 'asc' }],
    });

    const grouped: Record<
      string,
      {
        subject: string;
        displayName: string;
        description: string;
        category: string;
        actions: Array<{ id: string; action: string; name: string; description: string }>;
      }
    > = {};

    for (const perm of allPermissions) {
      const subj = perm.subject;
      if (!grouped[subj]) {
        const meta = SUBJECT_METADATA[subj] || {
          displayName: subj,
          description: `Manage ${subj} resources`,
          category: 'Other',
        };
        grouped[subj] = {
          subject: subj,
          displayName: meta.displayName,
          description: meta.description,
          category: meta.category,
          actions: [],
        };
      }

      const actionName = perm.action.charAt(0).toUpperCase() + perm.action.slice(1);
      grouped[subj].actions.push({
        id: perm.id,
        action: perm.action,
        name: actionName,
        description: `${actionName} authority on ${subj}`,
      });
    }

    return Object.values(grouped);
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
            department: true,
            jobTitle: true,
            status: true,
          },
          take: 50,
        },
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const isSystem = SYSTEM_ROLES.has(role.name.trim().toUpperCase());
    const permissions = role.permissions.map((rp) => rp.permission);
    const effectivePermissions = permissions.map((p) => `${p.subject}:${p.action}`);

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem,
      userCount: role._count.users,
      permissionCount: role._count.permissions,
      permissions,
      effectivePermissions,
      users: role.users.map((u) => ({
        ...u,
        name: u.displayName || `${u.firstName} ${u.lastName}`.trim(),
      })),
    };
  }

  async create(dto: CreateRoleDto) {
    const cleanName = dto.name.trim();
    const existing = await this.prisma.role.findFirst({
      where: { name: { equals: cleanName, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException(`Role with name "${cleanName}" already exists`);
    }

    const role = await this.prisma.role.create({
      data: {
        name: cleanName,
        description: dto.description?.trim() || null,
      },
    });

    if (dto.permissionIds && dto.permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    await this.invalidateCache();
    return this.findOne(role.id);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const isSystem = SYSTEM_ROLES.has(existing.name.trim().toUpperCase());

    if (isSystem && dto.name && dto.name.trim() !== existing.name) {
      throw new BadRequestException(`System protected role "${existing.name}" cannot be renamed`);
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const cleanName = dto.name.trim();
      const duplicate = await this.prisma.role.findFirst({
        where: {
          name: { equals: cleanName, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`Role with name "${cleanName}" already exists`);
      }
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: isSystem ? existing.name : dto.name?.trim() || existing.name,
        description: dto.description !== undefined ? dto.description.trim() : existing.description,
      },
    });

    if (dto.permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (dto.permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: dto.permissionIds.map((permissionId) => ({
            roleId: id,
            permissionId,
          })),
          skipDuplicates: true,
        });
      }
    }

    await this.invalidateCache();
    return this.findOne(id);
  }

  async clone(id: string, dto: CloneRoleDto) {
    const sourceRole = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!sourceRole) {
      throw new NotFoundException(`Source role with ID ${id} not found`);
    }

    const targetName = dto.targetRoleName.trim();
    const existing = await this.prisma.role.findFirst({
      where: { name: { equals: targetName, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException(`Role with name "${targetName}" already exists`);
    }

    const newRole = await this.prisma.role.create({
      data: {
        name: targetName,
        description:
          dto.description?.trim() ||
          `Cloned from ${sourceRole.name} on ${new Date().toISOString().split('T')[0]}`,
      },
    });

    if (sourceRole.permissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: sourceRole.permissions.map((rp) => ({
          roleId: newRole.id,
          permissionId: rp.permissionId,
        })),
        skipDuplicates: true,
      });
    }

    await this.invalidateCache();
    return this.findOne(newRole.id);
  }

  async syncPermissions(id: string, dto: SyncPermissionsDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });

    if (dto.permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    await this.invalidateCache();
    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const isSystem = SYSTEM_ROLES.has(role.name.trim().toUpperCase());
    if (isSystem) {
      throw new BadRequestException(`System protected role "${role.name}" cannot be deleted`);
    }

    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}" because it is currently assigned to ${role._count.users} user(s). Please reassign them first.`,
      );
    }

    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    await this.invalidateCache();

    return {
      success: true,
      message: `Role "${role.name}" successfully deleted.`,
    };
  }
}
