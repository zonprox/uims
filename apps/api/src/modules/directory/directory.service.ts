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
  username: string;
  email: string;
  jobTitle: string;
  department: string;
  role: string;
  status: string;
  source: string;
  phone: string;
  location: string;
  twoFactorEnabled: boolean;

  // Credentials (AD & Mail initial passwords)
  adInitialPassword?: string | null;
  mailInitialPassword?: string | null;

  // Domain Controller Mailbox Configuration
  hasMailbox: boolean;
  mailboxType: string;
  quotaUsed: number;
  quotaTotal: number;
  mailStatus: string;
  forwardingAddress?: string | null;
  autoReplyEnabled: boolean;
  aliases: string[];

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

  if (query?.mailboxType && query.mailboxType !== 'all') {
    where.mailboxType = query.mailboxType;
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
    const cleanUsername = u.username ? u.username.replace(/[^a-zA-Z0-9]/g, '') : 'User';

    return {
      id: u.id,
      name: u.displayName || u.username,
      username: u.username,
      email: u.email,
      jobTitle: u.jobTitle || 'Team Member',
      department: u.department || 'General',
      role: u.role || 'Employee',
      status,
      source: u.source,
      phone: u.phone || '',
      location: u.location || 'HQ',
      twoFactorEnabled: u.twoFactorEnabled ?? false,

      // Default or custom initial passwords
      adInitialPassword: u.adInitialPassword || `AD#${cleanUsername}2026!`,
      mailInitialPassword: u.mailInitialPassword || `Mail#${cleanUsername}2026@`,

      // Mailbox settings
      hasMailbox: u.hasMailbox ?? true,
      mailboxType: u.mailboxType || 'User',
      quotaUsed: u.quotaUsed ?? 0,
      quotaTotal: u.quotaTotal ?? 50,
      mailStatus: u.mailStatus || 'Active',
      forwardingAddress: u.forwardingAddress || null,
      autoReplyEnabled: u.autoReplyEnabled ?? false,
      aliases: (Array.isArray(u.aliases) ? u.aliases : []) as string[],

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
    const accountStatus = mapDirectoryAccountStatus((data.status || data.accountStatus) as string);
    const username =
      data.username || (data.email ? data.email.split('@')[0] : `user-${Date.now()}`);
    const cleanName = username.replace(/[^a-zA-Z0-9]/g, '');
    const adInitialPassword = data.adInitialPassword || `Ad#${cleanName}2026!`;
    const mailInitialPassword = data.mailInitialPassword || `Mail#${cleanName}2026@`;

    return this.prisma.directoryUser.create({
      data: {
        username,
        email: data.email,
        displayName: data.displayName || data.name || username,
        jobTitle: data.jobTitle || 'Employee',
        department: data.department || 'Engineering',
        role: data.role || 'Employee',
        accountStatus,
        twoFactorEnabled: data.twoFactorEnabled ?? false,
        phone: data.phone || '',
        location: data.location || 'HQ',
        adInitialPassword,
        mailInitialPassword,
        hasMailbox: data.hasMailbox ?? true,
        mailboxType: data.mailboxType || 'User',
        quotaUsed: data.quotaUsed ?? 0,
        quotaTotal: data.quotaTotal ? Number(data.quotaTotal) : 50,
        mailStatus: data.mailStatus || 'Active',
        forwardingAddress: data.forwardingAddress || null,
        autoReplyEnabled: data.autoReplyEnabled ?? false,
        aliases: data.aliases || [],
      },
    });
  }

  async updateUser(id: string, data: UpdateDirectoryUserDto) {
    const updateData: Prisma.DirectoryUserUpdateInput = {};
    if (data.name !== undefined || data.displayName !== undefined) {
      updateData.displayName = data.displayName || data.name;
    }
    if (data.username !== undefined) updateData.username = data.username;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.jobTitle !== undefined) updateData.jobTitle = data.jobTitle;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.twoFactorEnabled !== undefined) updateData.twoFactorEnabled = data.twoFactorEnabled;

    if (data.adInitialPassword !== undefined) updateData.adInitialPassword = data.adInitialPassword;
    if (data.mailInitialPassword !== undefined)
      updateData.mailInitialPassword = data.mailInitialPassword;

    if (data.hasMailbox !== undefined) updateData.hasMailbox = data.hasMailbox;
    if (data.mailboxType !== undefined) updateData.mailboxType = data.mailboxType;
    if (data.quotaTotal !== undefined) updateData.quotaTotal = Number(data.quotaTotal);
    if (data.quotaUsed !== undefined) updateData.quotaUsed = Number(data.quotaUsed);
    if (data.mailStatus !== undefined) updateData.mailStatus = data.mailStatus;
    if (data.forwardingAddress !== undefined) updateData.forwardingAddress = data.forwardingAddress;
    if (data.autoReplyEnabled !== undefined) updateData.autoReplyEnabled = data.autoReplyEnabled;
    if (data.aliases !== undefined) updateData.aliases = data.aliases;

    if (data.status || data.accountStatus) {
      updateData.accountStatus = mapDirectoryAccountStatus(
        (data.status || data.accountStatus) as string,
      );
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
    const [total, active, suspended, assignedAssetsCount, mailboxStats] = await Promise.all([
      this.prisma.directoryUser.count(),
      this.prisma.directoryUser.count({ where: { accountStatus: 'ACTIVE' } }),
      this.prisma.directoryUser.count({ where: { accountStatus: 'SUSPENDED' } }),
      this.prisma.asset.count({ where: { assignedToId: { not: null } } }),
      this.prisma.directoryUser.aggregate({
        _sum: {
          quotaUsed: true,
          quotaTotal: true,
        },
        where: { hasMailbox: true },
      }),
    ]);

    const custodianRate = total > 0 ? Math.round((assignedAssetsCount / total) * 100) : 0;
    const totalMailboxes = await this.prisma.directoryUser.count({ where: { hasMailbox: true } });

    return {
      totalUsers: total,
      activeUsers: active,
      custodiansCount: assignedAssetsCount,
      twoFactorRate: custodianRate,
      suspendedAccounts: suspended,
      totalMailboxes,
      usedStorageGb: Number((mailboxStats._sum.quotaUsed ?? 0).toFixed(1)),
      totalStorageQuotaGb: Number((mailboxStats._sum.quotaTotal ?? 0).toFixed(1)),
    };
  }
}
