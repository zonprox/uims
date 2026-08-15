import { Injectable, NotFoundException } from '@nestjs/common';
import type { DirectoryUser, Prisma } from '@prisma/client';
import type {
  CreateDirectoryGroupDto,
  CreateDirectoryUserDto,
  DirectoryStatsDto,
  DirectoryUserQueryDto,
  UpdateDirectoryUserDto,
} from '@uims/shared-types';
import { mapDirectoryAccountStatus, mapDirectoryAccountStatusToLabel } from '@uims/shared-utils';
import { PrismaService } from '../../database/prisma.service';

export interface FormattedDirectoryUser {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  role: string;
  status: string;
  phone: string;
  location: string;
  assignedAssetsCount: number;
  assignedLicensesCount: number;
  lastLogin: string;
}

function buildDirectoryWhere(query?: DirectoryUserQueryDto): Prisma.DirectoryUserWhereInput {
  const where: Prisma.DirectoryUserWhereInput = {};

  if (query?.search) {
    where.OR = [
      { displayName: { contains: query.search, mode: 'insensitive' } },
      { email: { contains: query.search, mode: 'insensitive' } },
      { jobTitle: { contains: query.search, mode: 'insensitive' } },
      { username: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  if (query?.department && query.department !== 'all') {
    where.department = query.department;
  }

  if (query?.status && query.status !== 'all') {
    where.accountStatus = mapDirectoryAccountStatus(query.status);
  }

  return where;
}

function buildCountsMaps(
  assets: Array<{ assignedTo: { email: string } | null }>,
  licenseAssignments: Array<{ assignedEmail: string | null }>,
) {
  const assetCountMap = new Map<string, number>();
  for (const a of assets) {
    const email = a.assignedTo?.email;
    if (email) {
      assetCountMap.set(email, (assetCountMap.get(email) || 0) + 1);
    }
  }

  const licenseCountMap = new Map<string, number>();
  for (const la of licenseAssignments) {
    const email = la.assignedEmail;
    if (email) {
      licenseCountMap.set(email, (licenseCountMap.get(email) || 0) + 1);
    }
  }

  return { assetCountMap, licenseCountMap };
}

@Injectable()
export class DirectoryService {
  constructor(private prisma: PrismaService) {}

  private formatUserRecord(
    u: DirectoryUser,
    assetCount: number,
    licenseCount: number,
  ): FormattedDirectoryUser {
    const status = mapDirectoryAccountStatusToLabel(u.accountStatus);
    const lastLogin = u.lastLoginAt ? u.lastLoginAt.toISOString().split('T')[0] : 'Recently';

    return {
      id: u.id,
      name: u.displayName || u.username,
      email: u.email,
      jobTitle: u.jobTitle || 'Team Member',
      department: u.department || 'General',
      role: u.role || 'Employee',
      status,
      phone: u.phone || '',
      location: u.location || 'HQ',
      assignedAssetsCount: assetCount,
      assignedLicensesCount: licenseCount,
      lastLogin,
    };
  }

  async findAllUsers(query?: DirectoryUserQueryDto): Promise<Array<FormattedDirectoryUser>> {
    const where = buildDirectoryWhere(query);

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const dirUsers = await this.prisma.directoryUser.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: pageSize,
      skip,
    });

    if (dirUsers.length === 0) {
      return [];
    }

    const userEmails = dirUsers.map((u) => u.email);

    const [assets, licenseAssignments] = await Promise.all([
      this.prisma.asset.findMany({
        where: { assignedTo: { email: { in: userEmails } } },
        select: { assignedTo: { select: { email: true } } },
      }),
      this.prisma.licenseAssignment.findMany({
        where: { assignedEmail: { in: userEmails } },
        select: { assignedEmail: true },
      }),
    ]);

    const { assetCountMap, licenseCountMap } = buildCountsMaps(assets, licenseAssignments);

    return dirUsers.map((u) => {
      const assetCount = assetCountMap.get(u.email) || 0;
      const licenseCount = licenseCountMap.get(u.email) || 0;
      return this.formatUserRecord(u, assetCount, licenseCount);
    });
  }

  async findUser(id: string) {
    const user = await this.prisma.directoryUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Directory user not found');
    return user;
  }

  async createUser(data: CreateDirectoryUserDto) {
    const accountStatus = mapDirectoryAccountStatus(data.status as string);
    const username = data.email ? data.email.split('@')[0] : `user-${Date.now()}`;

    return this.prisma.directoryUser.create({
      data: {
        username,
        email: data.email,
        displayName: data.displayName || data.name || username,
        jobTitle: data.jobTitle || 'Employee',
        department: data.department || 'Engineering',
        role: data.role || 'Employee',
        accountStatus,
        twoFactorEnabled: false,
        phone: data.phone || '',
        location: data.location || 'HQ',
      },
    });
  }

  async updateUser(id: string, data: UpdateDirectoryUserDto) {
    const updateData: Prisma.DirectoryUserUpdateInput = {};
    if (data.name !== undefined || data.displayName !== undefined) {
      updateData.displayName = data.displayName || data.name;
    }
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.location !== undefined) updateData.location = data.location;

    if (data.status) {
      updateData.accountStatus = mapDirectoryAccountStatus(data.status as string);
    }

    return this.prisma.directoryUser.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteUser(id: string) {
    return this.prisma.directoryUser.delete({ where: { id } });
  }

  async findAllGroups() {
    return this.prisma.directoryGroup.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createGroup(data: CreateDirectoryGroupDto) {
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
      },
    });
  }

  async getStats(): Promise<DirectoryStatsDto> {
    const [total, active, suspended, assignedAssetsCount] = await Promise.all([
      this.prisma.directoryUser.count(),
      this.prisma.directoryUser.count({ where: { accountStatus: 'ACTIVE' } }),
      this.prisma.directoryUser.count({ where: { accountStatus: 'SUSPENDED' } }),
      this.prisma.asset.count({ where: { assignedToId: { not: null } } }),
    ]);

    const custodianRate = total > 0 ? Math.round((assignedAssetsCount / total) * 100) : 0;

    return {
      totalUsers: total,
      activeUsers: active,
      custodiansCount: assignedAssetsCount,
      twoFactorRate: custodianRate, // maintained for backward-compatibility with DTO
      suspendedAccounts: suspended,
    };
  }
}
