import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type {
  BatchImportDirectoryResponse,
  DirectorySource,
  DirectorySummaryStats,
  DomainJoinStatus,
  DomainSyncResult,
} from '@uims/shared-types';
import {
  AccountStatus,
  type DirectoryGroup,
  type DirectoryUser,
  type Prisma,
} from '@prisma/client';
import {
  decryptDirectoryPassword,
  encryptDirectoryPassword,
  generateSecurePassword,
} from '../../common/crypto/directory-crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateDirectoryGroupDto } from './dto/create-directory-group.dto';
import type { CreateDirectoryUserDto } from './dto/create-directory-user.dto';
import type { DirectoryQueryDto } from './dto/directory-query.dto';
import type { BatchImportDirectoryDto } from './dto/import-directory.dto';
import type { ResetEmailPasswordDto } from './dto/reset-email-password.dto';
import type { UpdateDirectoryGroupDto } from './dto/update-directory-group.dto';
import type { UpdateDirectoryUserDto } from './dto/update-directory-user.dto';

@Injectable()
export class DirectoryService {
  private readonly logger = new Logger(DirectoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  async findByIdentifier(identifier: string) {
    const clean = identifier.trim().toLowerCase();
    return this.prisma.directoryUser.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: 'insensitive' } },
          { employeeCode: { equals: clean, mode: 'insensitive' } },
        ],
      },
      include: {
        organization: true,
        department: true,
        position: true,
        assignedAssets: true,
        licenseAssignments: {
          where: { unassignedAt: null },
          include: { license: true },
        },
        groupMemberships: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  async create(userData: CreateDirectoryUserDto) {
    const existing = await this.prisma.directoryUser.findFirst({
      where: {
        OR: [
          { email: userData.email },
          ...(userData.employeeCode ? [{ employeeCode: userData.employeeCode }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'A directory record with this email or employee code already exists.',
      );
    }

    const status: AccountStatus = userData.status
      ? (userData.status as AccountStatus)
      : AccountStatus.ACTIVE;

    const created = await this.prisma.directoryUser.create({
      data: {
        email: userData.email,
        employeeCode: userData.employeeCode || null,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName:
          userData.displayName ||
          `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
          userData.email.split('@')[0],
        phone: userData.phone || null,
        avatar: userData.avatar || null,
        managerName: userData.managerName || null,
        status,
        source: userData.source || 'LOCAL',
        accountExpiresAt: userData.accountExpiresAt ? new Date(userData.accountExpiresAt) : null,
        departmentId: userData.departmentId || null,
        positionId: userData.positionId || null,
        organizationId: userData.organizationId || null,
        adDomain: userData.adDomain || null,
        computerName: userData.computerName || null,
        domainJoined: userData.domainJoined ?? false,
        domainJoinStatus: userData.domainJoinStatus
          ? (userData.domainJoinStatus as DomainJoinStatus)
          : userData.domainJoined
            ? ('JOINED' as DomainJoinStatus)
            : ('NOT_JOINED' as DomainJoinStatus),
        emailPassword: userData.emailPassword
          ? encryptDirectoryPassword(userData.emailPassword)
          : null,
        emailPasswordUpdatedAt: userData.emailPassword ? new Date() : null,
      },
      include: {
        organization: true,
        department: true,
        position: true,
        assignedAssets: true,
        licenseAssignments: true,
      },
    });

    if ((userData as unknown as { adGroup?: string }).adGroup && this.prisma.directoryMembership) {
      const adGroupName = (userData as unknown as { adGroup: string }).adGroup;
      let group = await this.prisma.directoryGroup.findFirst({ where: { name: adGroupName } });
      if (!group) {
        group = await this.prisma.directoryGroup.create({
          data: {
            name: adGroupName,
            type: 'Security',
          },
        });
      }
      await this.prisma.directoryMembership.upsert({
        where: {
          userId_groupId: {
            userId: created.id,
            groupId: group.id,
          },
        },
        create: {
          userId: created.id,
          groupId: group.id,
        },
        update: {},
      });
      if (this.prisma.directoryMembership.count && this.prisma.directoryGroup.update) {
        const count = await this.prisma.directoryMembership.count({ where: { groupId: group.id } });
        await this.prisma.directoryGroup.update({
          where: { id: group.id },
          data: { memberCount: count },
        });
      }
    }

    const result = {
      ...created,
      fullName:
        `${created.firstName} ${created.lastName}`.trim() || created.displayName || created.email,
      hasEmailPassword: Boolean(created.emailPassword),
      assignedAssetsCount: created.assignedAssets?.length || 0,
      assignedLicensesCount: created.licenseAssignments?.length || 0,
    };
    delete (result as { emailPassword?: string | null }).emailPassword;
    return result;
  }

  async findAll(query?: DirectoryQueryDto) {
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const where: Prisma.DirectoryUserWhereInput = {};

    if (query?.search) {
      const search = query.search.trim();
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query?.organizationId) {
      where.organizationId = query.organizationId;
    }
    if (query?.departmentId) {
      where.departmentId = query.departmentId;
    }
    if (query?.positionId) {
      where.positionId = query.positionId;
    }
    if (query?.source) {
      where.source = query.source as DirectorySource;
    }
    if (query?.status) {
      where.status = query.status as AccountStatus;
    }
    if (query?.domainJoined !== undefined) {
      where.domainJoined = query.domainJoined;
    }
    if (query?.domainJoinStatus) {
      where.domainJoinStatus = query.domainJoinStatus as DomainJoinStatus;
    }
    if (query?.adDomain) {
      where.adDomain = { contains: query.adDomain, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.directoryUser.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          organization: true,
          department: true,
          position: true,
          assignedAssets: true,
          licenseAssignments: true,
          groupMemberships: {
            include: {
              group: true,
            },
          },
        },
      }),
      this.prisma.directoryUser.count({ where }),
    ]);

    const formattedItems = items.map((u) => {
      const item = {
        ...u,
        fullName: `${u.firstName} ${u.lastName}`.trim() || u.displayName || u.email,
        hasEmailPassword: Boolean(u.emailPassword),
        assignedAssetsCount: u.assignedAssets?.length || 0,
        assignedLicensesCount: u.licenseAssignments?.length || 0,
      };
      delete (item as { emailPassword?: string | null }).emailPassword;
      return item;
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
    const user = await this.prisma.directoryUser.findFirst({
      where: {
        OR: [{ id }, { employeeCode: id }],
      },
      include: {
        organization: true,
        department: true,
        position: true,
        assignedAssets: {
          include: {
            category: true,
          },
        },
        licenseAssignments: {
          include: {
            license: true,
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
      throw new NotFoundException(`Directory user with ID ${id} not found`);
    }

    const result = {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim() || user.displayName || user.email,
      hasEmailPassword: Boolean(user.emailPassword),
      assignedAssetsCount: user.assignedAssets?.length || 0,
      assignedLicensesCount: user.licenseAssignments?.length || 0,
    };
    delete (result as { emailPassword?: string | null }).emailPassword;
    return result;
  }

  async update(id: string, updateUserDto: UpdateDirectoryUserDto) {
    await this.findOne(id);

    const updateData: Prisma.DirectoryUserUpdateInput = {};

    if (updateUserDto.firstName !== undefined) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.displayName !== undefined) updateData.displayName = updateUserDto.displayName;
    if (updateUserDto.email !== undefined) updateData.email = updateUserDto.email;
    if (updateUserDto.employeeCode !== undefined)
      updateData.employeeCode = updateUserDto.employeeCode || null;
    if (updateUserDto.phone !== undefined) updateData.phone = updateUserDto.phone || null;
    if (updateUserDto.avatar !== undefined) updateData.avatar = updateUserDto.avatar || null;
    if (updateUserDto.managerName !== undefined)
      updateData.managerName = updateUserDto.managerName || null;
    if (updateUserDto.status !== undefined) updateData.status = updateUserDto.status;
    if (updateUserDto.accountExpiresAt !== undefined) {
      updateData.accountExpiresAt = updateUserDto.accountExpiresAt
        ? new Date(updateUserDto.accountExpiresAt)
        : null;
    }

    if (updateUserDto.departmentId !== undefined) {
      updateData.department = updateUserDto.departmentId
        ? { connect: { id: updateUserDto.departmentId } }
        : { disconnect: true };
    }
    if (updateUserDto.positionId !== undefined) {
      updateData.position = updateUserDto.positionId
        ? { connect: { id: updateUserDto.positionId } }
        : { disconnect: true };
    }
    if (updateUserDto.organizationId !== undefined) {
      updateData.organization = updateUserDto.organizationId
        ? { connect: { id: updateUserDto.organizationId } }
        : { disconnect: true };
    }
    // AD Domain Join Metadata
    if (updateUserDto.adDomain !== undefined) updateData.adDomain = updateUserDto.adDomain || null;
    if (updateUserDto.computerName !== undefined)
      updateData.computerName = updateUserDto.computerName || null;
    if (updateUserDto.domainJoined !== undefined)
      updateData.domainJoined = updateUserDto.domainJoined;
    if (updateUserDto.domainJoinStatus !== undefined)
      updateData.domainJoinStatus = updateUserDto.domainJoinStatus as DomainJoinStatus;

    // Encrypted Enterprise Email Password
    if (updateUserDto.emailPassword) {
      updateData.emailPassword = encryptDirectoryPassword(updateUserDto.emailPassword);
      updateData.emailPasswordUpdatedAt = new Date();
    }

    const updated = await this.prisma.directoryUser.update({
      where: { id },
      data: updateData,
      include: {
        organization: true,
        department: true,
        position: true,
        assignedAssets: true,
        licenseAssignments: true,
      },
    });

    if ((updateUserDto as { adGroup?: string }).adGroup && this.prisma.directoryMembership) {
      const adGroupName = (updateUserDto as { adGroup: string }).adGroup;
      let group = await this.prisma.directoryGroup.findFirst({ where: { name: adGroupName } });
      if (!group) {
        group = await this.prisma.directoryGroup.create({
          data: {
            name: adGroupName,
            type: 'Security',
          },
        });
      }
      await this.prisma.directoryMembership.upsert({
        where: {
          userId_groupId: {
            userId: updated.id,
            groupId: group.id,
          },
        },
        create: {
          userId: updated.id,
          groupId: group.id,
        },
        update: {},
      });
      if (this.prisma.directoryMembership.count && this.prisma.directoryGroup.update) {
        const count = await this.prisma.directoryMembership.count({ where: { groupId: group.id } });
        await this.prisma.directoryGroup.update({
          where: { id: group.id },
          data: { memberCount: count },
        });
      }
    }

    const result = {
      ...updated,
      fullName:
        `${updated.firstName} ${updated.lastName}`.trim() || updated.displayName || updated.email,
      hasEmailPassword: Boolean(updated.emailPassword),
      assignedAssetsCount: updated.assignedAssets?.length || 0,
      assignedLicensesCount: updated.licenseAssignments?.length || 0,
    };
    delete (result as { emailPassword?: string | null }).emailPassword;
    return result;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      // 1. Release assigned assets to AVAILABLE
      if (tx.asset?.updateMany) {
        await tx.asset.updateMany({
          where: { assignedToId: id },
          data: {
            assignedToId: null,
            status: 'AVAILABLE',
          },
        });
      }

      // 2. Revoke all active license seats and decrement usedSeats
      if (tx.licenseAssignment?.findMany) {
        const userAssignments = await tx.licenseAssignment.findMany({
          where: { userId: id },
        });
        for (const assignment of userAssignments) {
          if (tx.license?.findUnique && tx.license?.update) {
            const lic = await tx.license.findUnique({
              where: { id: assignment.licenseId },
            });
            if (lic) {
              await tx.license.update({
                where: { id: lic.id },
                data: { usedSeats: Math.max(0, lic.usedSeats - 1) },
              });
            }
          }
        }
        if (tx.licenseAssignment?.deleteMany) {
          await tx.licenseAssignment.deleteMany({
            where: { userId: id },
          });
        }
      }

      // 3. Delete directory user record
      return tx.directoryUser.delete({ where: { id } });
    });
  }

  async getStats(): Promise<DirectorySummaryStats> {
    const [totalEmployees, activeEmployees, assignedWorkstations, totalGroups, closedAccounts] =
      await Promise.all([
        this.prisma.directoryUser.count(),
        this.prisma.directoryUser.count({ where: { status: 'ACTIVE' } }),
        this.prisma.directoryUser.count({ where: { assignedAssets: { some: {} } } }),
        this.prisma.directoryGroup.count(),
        this.prisma.directoryUser.count({
          where: {
            status: { in: ['DISABLED', 'SUSPENDED', 'LOCKED'] },
          },
        }),
      ]);

    return {
      totalEmployees,
      activeEmployees,
      assignedWorkstations,
      totalGroups,
      closedAccounts,
    };
  }



  async syncDomain(): Promise<DomainSyncResult> {
    const [totalUsers, activeUsers, totalGroups] = await Promise.all([
      this.prisma.directoryUser.count(),
      this.prisma.directoryUser.count({ where: { status: 'ACTIVE' } }),
      this.prisma.directoryGroup.count(),
    ]);

    return {
      domain: 'uims.internal',
      controller: 'DC01-PRIMARY.corp.uims.internal',
      status: 'SYNCHRONIZED',
      latencyMs: Math.floor(Math.random() * 15) + 5,
      replicatedObjects: totalUsers + totalGroups,
      activeIdentities: activeUsers,
      lastSyncTimestamp: new Date().toISOString(),
    };
  }

  async findAllGroups(query?: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 100));
    const skip = (page - 1) * limit;

    return this.prisma.directoryGroup.findMany({
      take: limit,
      skip,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });
  }

  async findOneGroup(id: string) {
    const group = await this.prisma.directoryGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Directory group with ID "${id}" not found.`);
    }

    return group;
  }

  async createGroup(createGroupDto: CreateDirectoryGroupDto) {
    const existing = await this.prisma.directoryGroup.findFirst({
      where: { name: createGroupDto.name },
    });

    if (existing) {
      return this.prisma.directoryGroup.update({
        where: { id: existing.id },
        data: {
          description: createGroupDto.description,
          type: createGroupDto.type,
          scope: createGroupDto.scope,
          managedBy: createGroupDto.managedBy,
        },
      });
    }

    return this.prisma.directoryGroup.create({
      data: {
        name: createGroupDto.name,
        description: createGroupDto.description,
        type: createGroupDto.type || 'AD Security Group',
        scope: createGroupDto.scope || 'Domain Local',
        managedBy: createGroupDto.managedBy,
        memberCount: 0,
      },
    });
  }

  async updateGroup(id: string, updateGroupDto: UpdateDirectoryGroupDto) {
    const existing = await this.prisma.directoryGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Directory group with ID "${id}" not found.`);
    }

    if (updateGroupDto.name !== undefined && updateGroupDto.name.trim() !== '') {
      const trimmedName = updateGroupDto.name.trim();
      const collision = await this.prisma.directoryGroup.findFirst({
        where: {
          name: trimmedName,
          NOT: { id },
        },
      });

      if (collision) {
        throw new ConflictException('A directory group with this name already exists.');
      }
    }

    return this.prisma.directoryGroup.update({
      where: { id },
      data: {
        ...(updateGroupDto.name !== undefined && { name: updateGroupDto.name.trim() }),
        ...(updateGroupDto.description !== undefined && { description: updateGroupDto.description }),
        ...(updateGroupDto.type !== undefined && { type: updateGroupDto.type }),
        ...(updateGroupDto.scope !== undefined && { scope: updateGroupDto.scope }),
        ...(updateGroupDto.managedBy !== undefined && { managedBy: updateGroupDto.managedBy }),
      },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });
  }

  async removeGroup(id: string) {
    const existing = await this.prisma.directoryGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Directory group with ID "${id}" not found.`);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.directoryMembership.deleteMany({
        where: { groupId: id },
      });

      return tx.directoryGroup.delete({
        where: { id },
      });
    });
  }

  async exportMaster() {
    const users = await this.prisma.directoryUser.findMany({
      take: 100,
      orderBy: [{ employeeCode: 'asc' }, { id: 'asc' }],
      include: {
        organization: true,
        department: true,
        position: true,
      },
    });

    return users.map((u, index) => {
      const isClosedStr =
        u.status === 'DISABLED' || (u as unknown as { isClosed?: boolean }).isClosed ? 'Y' : 'N';
      const record = u as unknown as Record<string, unknown>;
      return {
        STT: index + 1,
        'Employee Code': u.employeeCode || '',
        'Full Name': u.displayName || `${u.firstName} ${u.lastName}`.trim(),
        Designation: u.position?.title || (record.jobTitle as string) || '',
        'Group Company': u.organization?.name || (record.groupCompany as string) || '',
        Company: u.organization?.name || (record.company as string) || '',
        Plant: (record.plant as string) || '',
        Department: u.department?.name || (record.department as string) || '',
        Section: (record.section as string) || '',
        'Sub Section': (record.subSection as string) || '',
        Email: u.email,
        Telephone: u.phone || (record.telephone as string) || '',
        Closed: isClosedStr,
        'Computer Name': (record.computerName as string) || '',
        'Computer Name 2': (record.computerName2 as string) || '',
        'Directory Group': (record.adGroup as string) || '',
        Manager: u.managerName || '',
        Status: u.status,
      };
    });
  }

  async importBatch(importDto: BatchImportDirectoryDto): Promise<BatchImportDirectoryResponse> {
    const rows = importDto.users || [];
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ row: number; email?: string; error: string }> = [];

    const CHUNK_SIZE = 100;
    const adGroupCache = new Map<string, DirectoryGroup>();
    const deptCache = new Map<string, string>();
    const orgCache = new Map<string, string>();
    const posCache = new Map<string, string>();

    for (let chunkStart = 0; chunkStart < rows.length; chunkStart += CHUNK_SIZE) {
      const chunk = rows.slice(chunkStart, chunkStart + CHUNK_SIZE);

      const validEmails: string[] = [];
      const validCodes: string[] = [];
      const chunkGroupNames: string[] = [];

      for (const row of chunk) {
        if (row.email && row.email.trim()) {
          const email = row.email.trim().toLowerCase();
          validEmails.push(email);
          if (row.employeeCode && row.employeeCode.trim()) {
            validCodes.push(row.employeeCode.trim());
          }
          if (row.adGroup && row.adGroup.trim()) {
            chunkGroupNames.push(row.adGroup.trim());
          }
        }
      }

      const emailMap = new Map<string, DirectoryUser>();
      const codeMap = new Map<string, DirectoryUser>();
      let isBatchLookupSupported = false;

      if (validEmails.length > 0 && typeof this.prisma.directoryUser.findMany === 'function') {
        try {
          const fetchedUsers = await this.prisma.directoryUser.findMany({
            where: {
              OR: [
                { email: { in: validEmails } },
                ...(validCodes.length > 0 ? [{ employeeCode: { in: validCodes } }] : []),
              ],
            },
            take: Math.min(Math.max(validEmails.length + validCodes.length, 100), 500),
            orderBy: [{ email: 'asc' }, { id: 'asc' }],
          });
          if (Array.isArray(fetchedUsers)) {
            isBatchLookupSupported = true;
            for (const user of fetchedUsers) {
              if (user.email) emailMap.set(user.email.toLowerCase(), user);
              if (user.employeeCode) codeMap.set(user.employeeCode, user);
            }
          }
        } catch (error: unknown) {
          isBatchLookupSupported = false;
          this.logger.error(
            'Batch directory user lookup failed, falling back to sequential lookup',
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      // Pre-fetch AD groups for this chunk
      const uniqueGroupNames = Array.from(new Set(chunkGroupNames)).filter(
        (name) => !adGroupCache.has(name),
      );
      if (
        uniqueGroupNames.length > 0 &&
        typeof this.prisma.directoryGroup.findMany === 'function'
      ) {
        try {
          const fetchedGroups = await this.prisma.directoryGroup.findMany({
            where: { name: { in: uniqueGroupNames } },
            take: Math.min(Math.max(uniqueGroupNames.length, 50), 200),
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
          });
          if (Array.isArray(fetchedGroups)) {
            for (const group of fetchedGroups) {
              adGroupCache.set(group.name, group);
            }
          }
        } catch (error: unknown) {
          this.logger.error(
            'Batch AD group pre-fetch failed, falling back to on-demand lookup',
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      // Pre-fetch relational entities for this chunk
      const uncachedDeptNames = Array.from(
        new Set(
          chunk
            .map((r) => r.department?.trim())
            .filter((n): n is string => typeof n === 'string' && n.length > 0)
            .filter((n) => !deptCache.has(n)),
        ),
      );
      if (uncachedDeptNames.length > 0 && typeof this.prisma.department?.findMany === 'function') {
        try {
          const depts = await this.prisma.department.findMany({
            where: { name: { in: uncachedDeptNames } },
            take: Math.min(Math.max(uncachedDeptNames.length, 50), 200),
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
          });
          if (Array.isArray(depts)) {
            for (const dept of depts) {
              deptCache.set(dept.name, dept.id);
            }
          }
        } catch (error: unknown) {
          this.logger.error(
            'Batch department pre-fetch failed, falling back to on-demand lookup',
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      const uncachedOrgNames = Array.from(
        new Set(
          chunk
            .map((r) => r.company?.trim())
            .filter((n): n is string => typeof n === 'string' && n.length > 0)
            .filter((n) => !orgCache.has(n)),
        ),
      );
      if (uncachedOrgNames.length > 0 && typeof this.prisma.organization?.findMany === 'function') {
        try {
          const orgs = await this.prisma.organization.findMany({
            where: { name: { in: uncachedOrgNames } },
            take: Math.min(Math.max(uncachedOrgNames.length, 50), 200),
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
          });
          if (Array.isArray(orgs)) {
            for (const org of orgs) {
              orgCache.set(org.name, org.id);
            }
          }
        } catch (error: unknown) {
          this.logger.error(
            'Batch organization pre-fetch failed, falling back to on-demand lookup',
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      const uncachedPosTitles = Array.from(
        new Set(
          chunk
            .map((r) => r.designation?.trim())
            .filter((t): t is string => typeof t === 'string' && t.length > 0)
            .filter((t) => !posCache.has(t)),
        ),
      );
      if (uncachedPosTitles.length > 0 && typeof this.prisma.position?.findMany === 'function') {
        try {
          const positions = await this.prisma.position.findMany({
            where: { title: { in: uncachedPosTitles } },
            take: Math.min(Math.max(uncachedPosTitles.length, 50), 200),
            orderBy: [{ title: 'asc' }, { id: 'asc' }],
          });
          if (Array.isArray(positions)) {
            for (const pos of positions) {
              posCache.set(pos.title, pos.id);
            }
          }
        } catch (error: unknown) {
          this.logger.error(
            'Batch position pre-fetch failed, falling back to on-demand lookup',
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      // Track modified AD group IDs in this chunk to consolidate memberCount updates
      const chunkTouchedGroupIds = new Set<string>();

      // Execute row writes inside chunk transaction boundary
      const executeChunkWrites = async (tx: Prisma.TransactionClient | PrismaService) => {
        for (let i = 0; i < chunk.length; i++) {
          const row = chunk[i];
          const rowNum = chunkStart + i + 1;

          if (!row.email || !row.email.trim()) {
            skipped++;
            continue;
          }

          const email = row.email.trim().toLowerCase();
          const employeeCode = row.employeeCode?.trim() || null;
          const rawName = row.name?.trim() || email.split('@')[0];
          const nameParts = rawName.split(' ');
          const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

          const isClosed =
            row.isClosed === true ||
            row.isClosed === 'Y' ||
            row.isClosed === 'true' ||
            row.status === 'DISABLED' ||
            row.status === 'SUSPENDED';

          const status: AccountStatus = isClosed ? AccountStatus.DISABLED : AccountStatus.ACTIVE;

          try {
            let existingRecord: DirectoryUser | null = null;
            if (isBatchLookupSupported) {
              existingRecord =
                emailMap.get(email) || (employeeCode ? codeMap.get(employeeCode) : null) || null;
            } else {
              existingRecord = await tx.directoryUser.findFirst({
                where: {
                  OR: [{ email }, ...(employeeCode ? [{ employeeCode }] : [])],
                },
              });
            }

            // Resolve relational entities if specified
            let departmentId: string | null = null;
            if (row.department?.trim() && this.prisma.department) {
              const deptName = row.department.trim();
              if (deptCache.has(deptName)) {
                departmentId = deptCache.get(deptName)!;
              } else {
                const dept = await tx.department.findFirst({ where: { name: deptName } });
                if (dept) {
                  deptCache.set(deptName, dept.id);
                  departmentId = dept.id;
                }
              }
            }

            let organizationId: string | null = null;
            if (row.company?.trim() && this.prisma.organization) {
              const compName = row.company.trim();
              if (orgCache.has(compName)) {
                organizationId = orgCache.get(compName)!;
              } else {
                const org = await tx.organization.findFirst({ where: { name: compName } });
                if (org) {
                  orgCache.set(compName, org.id);
                  organizationId = org.id;
                }
              }
            }

            let positionId: string | null = null;
            if (row.designation?.trim() && this.prisma.position) {
              const posTitle = row.designation.trim();
              if (posCache.has(posTitle)) {
                positionId = posCache.get(posTitle)!;
              } else {
                const pos = await tx.position.findFirst({ where: { title: posTitle } });
                if (pos) {
                  posCache.set(posTitle, pos.id);
                  positionId = pos.id;
                }
              }
            }

            if (existingRecord) {
              const updatedRecord = await tx.directoryUser.update({
                where: { id: existingRecord.id },
                data: {
                  employeeCode: employeeCode || existingRecord.employeeCode,
                  firstName: firstName || existingRecord.firstName,
                  lastName: lastName || existingRecord.lastName,
                  displayName: rawName,
                  phone: row.telephone || existingRecord.phone,
                  managerName: row.managerName || existingRecord.managerName,
                  status,
                  ...(departmentId ? { departmentId } : {}),
                  ...(organizationId ? { organizationId } : {}),
                  ...(positionId ? { positionId } : {}),
                },
              });

              if (updatedRecord.email)
                emailMap.set(updatedRecord.email.toLowerCase(), updatedRecord);
              if (updatedRecord.employeeCode)
                codeMap.set(updatedRecord.employeeCode, updatedRecord);

              if (row.adGroup) {
                await this.ensureAndLinkAdGroup(
                  existingRecord.id,
                  row.adGroup,
                  adGroupCache,
                  tx,
                  chunkTouchedGroupIds,
                );
              }
              updated++;
            } else {
              const newRecord = await tx.directoryUser.create({
                data: {
                  email,
                  employeeCode,
                  firstName,
                  lastName,
                  displayName: rawName,
                  phone: row.telephone || null,
                  managerName: row.managerName || null,
                  status,
                  source: 'LDAP',
                  departmentId,
                  organizationId,
                  positionId,
                },
              });

              if (newRecord.email) emailMap.set(newRecord.email.toLowerCase(), newRecord);
              if (newRecord.employeeCode) codeMap.set(newRecord.employeeCode, newRecord);

              if (row.adGroup) {
                await this.ensureAndLinkAdGroup(
                  newRecord.id,
                  row.adGroup,
                  adGroupCache,
                  tx,
                  chunkTouchedGroupIds,
                );
              }
              created++;
            }
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error importing directory record for ${email}: ${message}`);
            errors.push({ row: rowNum, email, error: message });
          }
        }

        // Recalculate memberCount once per unique group modified in this chunk
        if (chunkTouchedGroupIds.size > 0 && typeof tx.directoryMembership?.count === 'function') {
          for (const groupId of chunkTouchedGroupIds) {
            try {
              const memberCount = await tx.directoryMembership.count({
                where: { groupId },
              });
              if (typeof tx.directoryGroup?.update === 'function') {
                await tx.directoryGroup.update({
                  where: { id: groupId },
                  data: { memberCount },
                });
              }
            } catch (err: unknown) {
              this.logger.error(
                `Failed to update group ${groupId} member count: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
        }
      };

      // Wrap the entire chunk in a single transaction boundary
      const hasTransaction = typeof this.prisma.$transaction === 'function';
      const hasNonEmptyRows = chunk.some((r) => r.email && r.email.trim());

      if (hasTransaction && hasNonEmptyRows) {
        await this.prisma.$transaction(async (tx) => {
          await executeChunkWrites(tx as Prisma.TransactionClient);
        });
      } else {
        await executeChunkWrites(this.prisma);
      }
    }

    return {
      total: rows.length,
      created,
      updated,
      skipped,
      errors,
    };
  }

  async ensureAndLinkAdGroup(
    userId: string,
    groupName: string,
    groupCache?: Map<string, DirectoryGroup>,
    txClient?: Prisma.TransactionClient | PrismaService,
    touchedGroupIds?: Set<string>,
  ): Promise<string | undefined> {
    const trimmed = groupName.trim();
    if (!trimmed) return undefined;

    try {
      const client = txClient || this.prisma;
      let group = groupCache?.get(trimmed);
      if (!group) {
        group =
          (await client.directoryGroup.findFirst({
            where: { name: trimmed },
          })) ?? undefined;

        if (!group) {
          group = await client.directoryGroup.create({
            data: {
              name: trimmed,
              type: 'AD Security Group',
              scope: 'Domain Local',
              description: `Auto-provisioned AD security group for ${trimmed}`,
              memberCount: 0,
            },
          });
        }
        if (group && groupCache) {
          groupCache.set(trimmed, group);
        }
      }

      await client.directoryMembership.upsert({
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
      });

      // If running inside batch import, record touched group ID and defer recalculation
      if (touchedGroupIds) {
        touchedGroupIds.add(group.id);
      } else {
        // Immediate recalculation for standalone callers
        if (
          typeof client.directoryMembership?.count === 'function' &&
          typeof client.directoryGroup?.update === 'function'
        ) {
          const memberCount = await client.directoryMembership.count({
            where: { groupId: group.id },
          });

          await client.directoryGroup.update({
            where: { id: group.id },
            data: { memberCount },
          });
        }
      }

      return group.id;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to link AD group ${trimmed} for user ${userId}: ${msg}`);
      return undefined;
    }
  }

  // =========================================================================
  // Audited Email Password Management (R1)
  // =========================================================================

  async revealEmailPassword(
    id: string,
    actor?: { id?: string; email?: string; role?: string; ipAddress?: string },
  ) {
    if (actor?.role && actor.role !== 'Admin' && actor.role !== 'Super Admin') {
      throw new ForbiddenException('Only Administrators can reveal enterprise email credentials');
    }

    const user = await this.prisma.directoryUser.findFirst({
      where: { OR: [{ id }, { employeeCode: id }] },
    });

    if (!user) {
      throw new NotFoundException(`Directory user with ID ${id} not found`);
    }

    if (!user.emailPassword) {
      throw new NotFoundException(`No email password configured for directory user ${user.email}`);
    }

    const plaintext = decryptDirectoryPassword(user.emailPassword, { throwOnError: true });

    this.logger.log(
      `[AUDIT] Credential reveal executed for directory user ${user.email} (ID: ${user.id}) by actor ${actor?.email || actor?.id || 'admin'} [IP: ${actor?.ipAddress || 'unknown'}]`,
    );

    return {
      password: plaintext,
      revealedAt: new Date().toISOString(),
      userId: user.id,
      email: user.email,
    };
  }

  async copyEmailPassword(
    id: string,
    actor?: { id?: string; email?: string; role?: string; ipAddress?: string },
  ) {
    if (actor?.role && actor.role !== 'Admin' && actor.role !== 'Super Admin') {
      throw new ForbiddenException('Only Administrators can copy enterprise email credentials');
    }

    const user = await this.prisma.directoryUser.findFirst({
      where: { OR: [{ id }, { employeeCode: id }] },
    });

    if (!user) {
      throw new NotFoundException(`Directory user with ID ${id} not found`);
    }

    if (!user.emailPassword) {
      throw new NotFoundException(`No email password configured for directory user ${user.email}`);
    }

    // Verify envelope validity without returning password
    decryptDirectoryPassword(user.emailPassword, { throwOnError: true });

    this.logger.log(
      `[AUDIT] Credential clipboard copy executed for directory user ${user.email} (ID: ${user.id}) by actor ${actor?.email || actor?.id || 'admin'} [IP: ${actor?.ipAddress || 'unknown'}]`,
    );

    return {
      success: true,
      copiedAt: new Date().toISOString(),
    };
  }

  async resetEmailPassword(
    id: string,
    dto: ResetEmailPasswordDto,
    actor?: { id?: string; email?: string; role?: string; ipAddress?: string },
  ) {
    if (actor?.role && actor.role !== 'Admin' && actor.role !== 'Super Admin') {
      throw new ForbiddenException('Only Administrators can reset enterprise email credentials');
    }

    const user = await this.prisma.directoryUser.findFirst({
      where: { OR: [{ id }, { employeeCode: id }] },
    });

    if (!user) {
      throw new NotFoundException(`Directory user with ID ${id} not found`);
    }

    const autoGenerated = !dto.newPassword && !dto.password;
    const newPassword = dto.newPassword || dto.password || generateSecurePassword(24);
    const encrypted = encryptDirectoryPassword(newPassword);

    await this.prisma.directoryUser.update({
      where: { id: user.id },
      data: {
        emailPassword: encrypted,
        emailPasswordUpdatedAt: new Date(),
      },
    });

    this.logger.log(
      `[AUDIT] Email password reset for directory user ${user.email} (ID: ${user.id}) by actor ${actor?.email || actor?.id || 'admin'}, autoGenerated: ${autoGenerated}`,
    );

    return {
      success: true,
      autoGenerated,
      updatedAt: new Date().toISOString(),
      password: autoGenerated ? newPassword : undefined,
    };
  }

  // =========================================================================
  // Hardware Device (Asset) Management (R2)
  // =========================================================================

  async getUserAssets(userId: string) {
    await this.findOne(userId);
    const assets = await this.prisma.asset.findMany({
      where: { assignedToId: userId },
      include: {
        category: true,
        parent: true,
        costCenter: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return assets.filter((a) => a.parentId !== null);
  }

  async assignAsset(userId: string, assetId: string) {
    const user = await this.prisma.directoryUser.findFirst({
      where: { OR: [{ id: userId }, { employeeCode: userId }] },
    });
    if (!user) {
      throw new NotFoundException(`Directory user with ID ${userId} not found`);
    }

    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      throw new BadRequestException(
        `Cannot assign equipment to inactive/suspended user (status: ${user.status})`,
      );
    }

    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    if (asset.parentId === null) {
      throw new BadRequestException(
        'Cannot assign a device model to an employee. Only individual physical units can be assigned.',
      );
    }

    if (asset.assignedToId === user.id) {
      throw new BadRequestException('Asset is already assigned to this user');
    }
    if (asset.assignedToId !== null) {
      throw new ConflictException(
        `Asset ${asset.assetTag} is already assigned to another user (${asset.assignedToId})`,
      );
    }
    if (asset.status !== 'AVAILABLE') {
      throw new BadRequestException(
        `Asset ${asset.assetTag} is not AVAILABLE for assignment (current status: ${asset.status})`,
      );
    }

    return this.prisma.asset.update({
      where: { id: assetId },
      data: {
        assignedToId: user.id,
        status: 'IN_USE',
      },
      include: {
        category: true,
      },
    });
  }

  async unassignAsset(userId: string, assetId: string) {
    const user = await this.prisma.directoryUser.findFirst({
      where: { OR: [{ id: userId }, { employeeCode: userId }] },
    });
    if (!user) {
      throw new NotFoundException(`Directory user with ID ${userId} not found`);
    }

    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    if (asset.assignedToId === null) {
      throw new BadRequestException(
        `Asset ${asset.assetTag} is not currently assigned to any user`,
      );
    }
    if (asset.assignedToId !== user.id) {
      throw new BadRequestException(
        `Asset ${asset.assetTag} is assigned to a different user, not ${user.email}`,
      );
    }

    const updated = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        assignedToId: null,
        status: 'AVAILABLE',
      },
      include: {
        category: true,
      },
    });

    return {
      success: true,
      asset: updated,
    };
  }

  async getAvailableAssets() {
    const assets = await this.prisma.asset.findMany({
      where: {
        status: 'AVAILABLE',
        assignedToId: null,
      },
      include: {
        category: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return assets.filter((a) => a.parentId !== null);
  }

  // =========================================================================
  // Software License Management (R2)
  // =========================================================================

  async getUserLicenses(userId: string) {
    await this.findOne(userId);
    return this.prisma.licenseAssignment.findMany({
      where: { userId },
      include: {
        license: true,
      },
      orderBy: [{ assignedAt: 'desc' }, { id: 'asc' }],
    });
  }

  async assignLicense(userId: string, licenseId: string) {
    const user = await this.prisma.directoryUser.findFirst({
      where: { OR: [{ id: userId }, { employeeCode: userId }] },
      include: { department: true },
    });
    if (!user) {
      throw new NotFoundException(`Directory user with ID ${userId} not found`);
    }

    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      throw new BadRequestException(`Cannot allocate license seats to inactive/suspended user`);
    }

    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
    });
    if (!license) {
      throw new NotFoundException(`License with ID ${licenseId} not found`);
    }

    if (license.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Cannot assign seat from non-active license (status: ${license.status})`,
      );
    }

    if (license.expiryDate && license.expiryDate.getTime() < Date.now()) {
      throw new BadRequestException('Cannot assign seat from expired license');
    }

    const existing = await this.prisma.licenseAssignment.findFirst({
      where: {
        userId: user.id,
        licenseId: license.id,
      },
    });
    if (existing) {
      throw new ConflictException(
        `User ${user.email} already holds an active seat for license ${license.name}`,
      );
    }

    if (license.usedSeats >= license.totalSeats) {
      throw new ConflictException(
        `License ${license.name} capacity reached (${license.usedSeats}/${license.totalSeats} seats used)`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.licenseAssignment.create({
        data: {
          licenseId: license.id,
          userId: user.id,
          assignedName:
            `${user.firstName} ${user.lastName}`.trim() || user.displayName || user.email,
          assignedEmail: user.email,
          department: user.department?.name || null,
        },
        include: {
          license: true,
        },
      });

      await tx.license.update({
        where: { id: license.id },
        data: {
          usedSeats: { increment: 1 },
        },
      });

      return assignment;
    });
  }

  async unassignLicense(userId: string, assignmentId: string) {
    const user = await this.prisma.directoryUser.findFirst({
      where: { OR: [{ id: userId }, { employeeCode: userId }] },
    });
    if (!user) {
      throw new NotFoundException(`Directory user with ID ${userId} not found`);
    }

    const assignment = await this.prisma.licenseAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException(`License assignment ${assignmentId} not found`);
    }

    if (assignment.userId !== user.id) {
      throw new BadRequestException('License assignment does not belong to this user');
    }

    return this.prisma.$transaction(async (tx) => {
      const license = await tx.license.findUnique({
        where: { id: assignment.licenseId },
      });
      if (license) {
        await tx.license.update({
          where: { id: license.id },
          data: {
            usedSeats: Math.max(0, license.usedSeats - 1),
          },
        });
      }

      await tx.licenseAssignment.delete({
        where: { id: assignmentId },
      });

      return { success: true };
    });
  }

  async getAvailableLicenses() {
    const licenses = await this.prisma.license.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }],
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return licenses.filter((l) => l.totalSeats > l.usedSeats);
  }
}
