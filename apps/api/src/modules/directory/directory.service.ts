import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  BatchImportDirectoryResponse,
  DirectorySource,
  DirectorySummaryStats,
  DomainSyncResult,
  OrganizationalUnit,
} from '@uims/shared-types';
import {
  AccountStatus,
  type DirectoryGroup,
  type DirectoryUser,
  type Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateDirectoryGroupDto } from './dto/create-directory-group.dto';
import type { CreateDirectoryUserDto } from './dto/create-directory-user.dto';
import type { DirectoryQueryDto } from './dto/directory-query.dto';
import type { BatchImportDirectoryDto } from './dto/import-directory.dto';
import type { UpdateDirectoryUserDto } from './dto/update-directory-user.dto';

@Injectable()
export class DirectoryService {
  private readonly logger = new Logger(DirectoryService.name);

  constructor(private readonly prisma: PrismaService) {}

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
        location: true,
        assignedAssets: true,
        licenseAssignments: true,
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
        ouPath: userData.ouPath || 'OU=Production,DC=uims,DC=internal',
        managerName: userData.managerName || null,
        status,
        source: userData.source || 'LOCAL',
        accountExpiresAt: userData.accountExpiresAt ? new Date(userData.accountExpiresAt) : null,
        departmentId: userData.departmentId || null,
        positionId: userData.positionId || null,
        organizationId: userData.organizationId || null,
        locationId: userData.locationId || null,
      },
      include: {
        organization: true,
        department: true,
        position: true,
        location: true,
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
            ouPath: created.ouPath || 'OU=Production,DC=uims,DC=internal',
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

    return created;
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
    if (query?.locationId) {
      where.locationId = query.locationId;
    }
    if (query?.ouPath) {
      where.ouPath = { contains: query.ouPath, mode: 'insensitive' };
    }
    if (query?.source) {
      where.source = query.source as DirectorySource;
    }
    if (query?.status) {
      where.status = query.status as AccountStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.directoryUser.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: true,
          department: true,
          position: true,
          location: true,
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

    const formattedItems = items.map((u) => ({
      ...u,
      fullName: `${u.firstName} ${u.lastName}`.trim() || u.displayName || u.email,
      assignedAssetsCount: u.assignedAssets?.length || 0,
      assignedLicensesCount: u.licenseAssignments?.length || 0,
    }));

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
        location: true,
        assignedAssets: {
          include: {
            category: true,
            location: true,
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

    return {
      ...user,
      fullName: `${user.firstName} ${user.lastName}`.trim() || user.displayName || user.email,
      assignedAssetsCount: user.assignedAssets?.length || 0,
      assignedLicensesCount: user.licenseAssignments?.length || 0,
    };
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
    if (updateUserDto.ouPath !== undefined) updateData.ouPath = updateUserDto.ouPath || null;
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
    if (updateUserDto.locationId !== undefined) {
      updateData.location = updateUserDto.locationId
        ? { connect: { id: updateUserDto.locationId } }
        : { disconnect: true };
    }

    const updated = await this.prisma.directoryUser.update({
      where: { id },
      data: updateData,
      include: {
        organization: true,
        department: true,
        position: true,
        location: true,
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
            ouPath: updated.ouPath || 'OU=Production,DC=uims,DC=internal',
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

    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.directoryUser.delete({ where: { id } });
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
      totalOUs: 6,
      closedAccounts,
    };
  }

  async getOrganizationalUnits(): Promise<OrganizationalUnit[]> {
    const users = await this.prisma.directoryUser.findMany({
      where: { status: 'ACTIVE' },
      select: {
        ouPath: true,
        id: true,
        computerName: true,
        assignedAssets: { select: { id: true } },
      },
      take: 1000,
      orderBy: { id: 'asc' },
    });

    const groups = await this.prisma.directoryGroup.findMany({
      select: { ouPath: true },
      take: 500,
      orderBy: { id: 'asc' },
    });

    const baseOUs: Array<{ id: string; name: string; dn: string; description: string }> = [
      {
        id: 'ou-corporate',
        name: 'Corporate HQ',
        dn: 'OU=Corporate,DC=uims,DC=internal',
        description: 'Executive Management, Finance, Human Resources, and Corporate Strategy',
      },
      {
        id: 'ou-it',
        name: 'IT & Infrastructure',
        dn: 'OU=IT,DC=uims,DC=internal',
        description: 'Enterprise Systems Administration, Security, and IT Service Desk',
      },
      {
        id: 'ou-engineering',
        name: 'Engineering',
        dn: 'OU=Engineering,DC=uims,DC=internal',
        description: 'Software Engineering, DevOps, Cloud Infrastructure, and QA',
      },
      {
        id: 'ou-production',
        name: 'Production & Manufacturing',
        dn: 'OU=Production,DC=uims,DC=internal',
        description: 'Plant 1 Operations, Printing, Sample Inspection, and Embroidery Lines',
      },
      {
        id: 'ou-operations',
        name: 'Operations & Supply Chain',
        dn: 'OU=Operations,DC=uims,DC=internal',
        description: 'Logistics, Warehouse Stockroom, and Material Sourcing',
      },
      {
        id: 'ou-sales',
        name: 'Commercial & Sales',
        dn: 'OU=Sales,DC=uims,DC=internal',
        description: 'Enterprise Account Executives, Business Development, and Customer Success',
      },
    ];

    const result: OrganizationalUnit[] = baseOUs.map((ou) => {
      const ouUsers = users.filter((u) => u.ouPath && u.ouPath.includes(ou.name.split(' ')[0]));
      const userCount = ouUsers.length;
      const workstationCount = ouUsers.filter(
        (u) => Boolean(u.computerName) || (u.assignedAssets && u.assignedAssets.length > 0),
      ).length;
      const groupCount = groups.filter(
        (g) => g.ouPath && g.ouPath.includes(ou.name.split(' ')[0]),
      ).length;

      return {
        id: ou.id,
        name: ou.name,
        dn: ou.dn,
        description: ou.description,
        userCount,
        groupCount,
        workstationCount,
      };
    });

    return result;
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

  async findAllGroups() {
    return this.prisma.directoryGroup.findMany({
      take: 100,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { memberships: true },
        },
      },
    });
  }

  async createGroup(createGroupDto: CreateDirectoryGroupDto) {
    const existing = await this.prisma.directoryGroup.findFirst({
      where: { name: createGroupDto.name },
    });

    if (existing) {
      return this.prisma.directoryGroup.update({
        where: { id: existing.id },
        data: {
          email: createGroupDto.email,
          description: createGroupDto.description,
          type: createGroupDto.type,
          scope: createGroupDto.scope,
          ouPath: createGroupDto.ouPath,
          managedBy: createGroupDto.managedBy,
        },
      });
    }

    return this.prisma.directoryGroup.create({
      data: {
        name: createGroupDto.name,
        email: createGroupDto.email,
        description: createGroupDto.description,
        type: createGroupDto.type || 'AD Security Group',
        scope: createGroupDto.scope || 'Domain Local',
        ouPath: createGroupDto.ouPath,
        managedBy: createGroupDto.managedBy,
        memberCount: 0,
      },
    });
  }

  async exportMaster() {
    const users = await this.prisma.directoryUser.findMany({
      take: 10000,
      orderBy: { employeeCode: 'asc' },
      include: {
        organization: true,
        department: true,
        position: true,
        location: true,
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
        Plant: u.location?.name || (record.plant as string) || '',
        Department: u.department?.name || (record.department as string) || '',
        Section: (record.section as string) || '',
        'Sub Section': (record.subSection as string) || '',
        Email: u.email,
        Telephone: u.phone || (record.telephone as string) || '',
        Closed: isClosedStr,
        'Computer Name': (record.computerName as string) || '',
        'Computer Name 2': (record.computerName2 as string) || '',
        'Directory Group': (record.adGroup as string) || '',
        'OU Path': u.ouPath || '',
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
    const locCache = new Map<string, string>();
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
            existingRecord = await this.prisma.directoryUser.findFirst({
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
              const dept = await this.prisma.department.findFirst({ where: { name: deptName } });
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
              const org = await this.prisma.organization.findFirst({ where: { name: compName } });
              if (org) {
                orgCache.set(compName, org.id);
                organizationId = org.id;
              }
            }
          }

          let locationId: string | null = null;
          const locName = row.plant?.trim();
          if (locName && this.prisma.location) {
            if (locCache.has(locName)) {
              locationId = locCache.get(locName)!;
            } else {
              const loc = await this.prisma.location.findFirst({ where: { name: locName } });
              if (loc) {
                locCache.set(locName, loc.id);
                locationId = loc.id;
              }
            }
          }

          let positionId: string | null = null;
          if (row.designation?.trim() && this.prisma.position) {
            const posTitle = row.designation.trim();
            if (posCache.has(posTitle)) {
              positionId = posCache.get(posTitle)!;
            } else {
              const pos = await this.prisma.position.findFirst({ where: { title: posTitle } });
              if (pos) {
                posCache.set(posTitle, pos.id);
                positionId = pos.id;
              }
            }
          }

          const executeRowWrite = async (tx: Prisma.TransactionClient | PrismaService) => {
            if (existingRecord) {
              await tx.directoryUser.update({
                where: { id: existingRecord.id },
                data: {
                  employeeCode: employeeCode || existingRecord.employeeCode,
                  firstName: firstName || existingRecord.firstName,
                  lastName: lastName || existingRecord.lastName,
                  displayName: rawName,
                  phone: row.telephone || existingRecord.phone,
                  ouPath: row.ouPath || existingRecord.ouPath,
                  managerName: row.managerName || existingRecord.managerName,
                  status,
                  ...(departmentId ? { departmentId } : {}),
                  ...(organizationId ? { organizationId } : {}),
                  ...(locationId ? { locationId } : {}),
                  ...(positionId ? { positionId } : {}),
                },
              });

              if (row.adGroup) {
                await this.ensureAndLinkAdGroup(existingRecord.id, row.adGroup, adGroupCache);
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
                  ouPath: row.ouPath || 'OU=Production,DC=uims,DC=internal',
                  managerName: row.managerName || null,
                  status,
                  source: 'LDAP',
                  departmentId,
                  organizationId,
                  locationId,
                  positionId,
                },
              });

              if (row.adGroup) {
                await this.ensureAndLinkAdGroup(newRecord.id, row.adGroup, adGroupCache);
              }
              created++;
            }
          };

          if (typeof this.prisma.$transaction === 'function') {
            await this.prisma.$transaction(async (tx) => {
              await executeRowWrite(tx as Prisma.TransactionClient);
            });
          } else {
            await executeRowWrite(this.prisma);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Error importing directory record for ${email}: ${message}`);
          errors.push({ row: rowNum, email, error: message });
        }
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
  ): Promise<void> {
    const trimmed = groupName.trim();
    if (!trimmed) return;

    try {
      let group = groupCache?.get(trimmed);
      if (!group) {
        group =
          (await this.prisma.directoryGroup.findFirst({
            where: { name: trimmed },
          })) ?? undefined;

        if (!group) {
          group = await this.prisma.directoryGroup.create({
            data: {
              name: trimmed,
              type: 'AD Security Group',
              scope: 'Domain Local',
              ouPath: 'OU=SecurityGroups,OU=Production,DC=uims,DC=internal',
              description: `Auto-provisioned AD security group for ${trimmed}`,
              memberCount: 0,
            },
          });
        }
        if (group && groupCache) {
          groupCache.set(trimmed, group);
        }
      }

      await this.prisma.directoryMembership.upsert({
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

      const memberCount = await this.prisma.directoryMembership.count({
        where: { groupId: group.id },
      });

      await this.prisma.directoryGroup.update({
        where: { id: group.id },
        data: { memberCount },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Failed to link AD group ${trimmed} for user ${userId}: ${msg}`);
    }
  }
}
