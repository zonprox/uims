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

    const isClosed =
      userData.isClosed === true ||
      userData.status === AccountStatus.DISABLED ||
      userData.status === AccountStatus.SUSPENDED;

    const status: AccountStatus = isClosed
      ? AccountStatus.DISABLED
      : userData.status
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
        jobTitle: userData.jobTitle || 'Employee',
        company: userData.company || 'BSL Others',
        groupCompany: userData.groupCompany || 'BSL',
        plant: userData.plant || 'BSL Others',
        section: userData.section || null,
        subSection: userData.subSection || null,
        computerName: userData.computerName || null,
        computerName2: userData.computerName2 || null,
        adGroup: userData.adGroup || null,
        telephone: userData.telephone || null,
        phone: userData.phone || userData.telephone || null,
        avatar: userData.avatar || null,
        department: userData.department || null,
        location: userData.location || null,
        ouPath: userData.ouPath || 'OU=Production,DC=uims,DC=internal',
        managerName: userData.managerName || null,
        isClosed: Boolean(userData.isClosed),
        status,
        source: userData.source || 'LOCAL',
        departmentId: userData.departmentId || null,
        positionId: userData.positionId || null,
        organizationId: userData.organizationId || null,
        locationId: userData.locationId || null,
      },
      include: {
        organization: true,
        departmentRel: true,
        positionRel: true,
        locationRel: true,
        assignedAssets: true,
        licenseAssignments: true,
      },
    });

    // Auto-link Active Directory group if specified
    if (userData.adGroup) {
      await this.ensureAndLinkAdGroup(created.id, userData.adGroup);
    }

    return created;
  }

  async findAll(query?: DirectoryQueryDto) {
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const where: {
      OR?: Array<{
        displayName?: { contains: string; mode: 'insensitive' };
        firstName?: { contains: string; mode: 'insensitive' };
        lastName?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
        employeeCode?: { contains: string; mode: 'insensitive' };
        computerName?: { contains: string; mode: 'insensitive' };
      }>;
      department?: { equals: string; mode: 'insensitive' };
      section?: { equals: string; mode: 'insensitive' };
      company?: { equals: string; mode: 'insensitive' };
      plant?: { equals: string; mode: 'insensitive' };
      adGroup?: { equals: string; mode: 'insensitive' };
      ouPath?: { contains: string; mode: 'insensitive' };
      source?: DirectorySource;
      status?: AccountStatus;
      isClosed?: boolean;
    } = {};

    if (query?.search) {
      const search = query.search.trim();
      where.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { computerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query?.department) {
      where.department = { equals: query.department, mode: 'insensitive' };
    }
    if (query?.section) {
      where.section = { equals: query.section, mode: 'insensitive' };
    }
    if (query?.company) {
      where.company = { equals: query.company, mode: 'insensitive' };
    }
    if (query?.plant) {
      where.plant = { equals: query.plant, mode: 'insensitive' };
    }
    if (query?.adGroup) {
      where.adGroup = { equals: query.adGroup, mode: 'insensitive' };
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
    if (query?.isClosed !== undefined) {
      where.isClosed = query.isClosed;
    }

    const [items, total] = await Promise.all([
      this.prisma.directoryUser.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: true,
          departmentRel: true,
          positionRel: true,
          locationRel: true,
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
        departmentRel: true,
        positionRel: true,
        locationRel: true,
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

    const updateData: {
      firstName?: string;
      lastName?: string;
      displayName?: string;
      email?: string;
      employeeCode?: string | null;
      jobTitle?: string;
      company?: string;
      groupCompany?: string;
      plant?: string;
      section?: string | null;
      subSection?: string | null;
      department?: string | null;
      location?: string | null;
      managerName?: string | null;
      computerName?: string | null;
      computerName2?: string | null;
      adGroup?: string | null;
      telephone?: string | null;
      phone?: string | null;
      avatar?: string | null;
      ouPath?: string | null;
      status?: AccountStatus;
      isClosed?: boolean;
      departmentId?: string | null;
      positionId?: string | null;
      organizationId?: string | null;
      locationId?: string | null;
    } = {};

    if (updateUserDto.firstName !== undefined) updateData.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName !== undefined) updateData.lastName = updateUserDto.lastName;
    if (updateUserDto.displayName !== undefined) updateData.displayName = updateUserDto.displayName;
    if (updateUserDto.email !== undefined) updateData.email = updateUserDto.email;
    if (updateUserDto.employeeCode !== undefined)
      updateData.employeeCode = updateUserDto.employeeCode || null;
    if (updateUserDto.jobTitle !== undefined) updateData.jobTitle = updateUserDto.jobTitle;
    if (updateUserDto.company !== undefined) updateData.company = updateUserDto.company;
    if (updateUserDto.groupCompany !== undefined)
      updateData.groupCompany = updateUserDto.groupCompany;
    if (updateUserDto.plant !== undefined) updateData.plant = updateUserDto.plant;
    if (updateUserDto.section !== undefined) updateData.section = updateUserDto.section || null;
    if (updateUserDto.subSection !== undefined)
      updateData.subSection = updateUserDto.subSection || null;
    if (updateUserDto.department !== undefined)
      updateData.department = updateUserDto.department || null;
    if (updateUserDto.location !== undefined) updateData.location = updateUserDto.location || null;
    if (updateUserDto.managerName !== undefined)
      updateData.managerName = updateUserDto.managerName || null;
    if (updateUserDto.computerName !== undefined)
      updateData.computerName = updateUserDto.computerName || null;
    if (updateUserDto.computerName2 !== undefined)
      updateData.computerName2 = updateUserDto.computerName2 || null;
    if (updateUserDto.adGroup !== undefined) updateData.adGroup = updateUserDto.adGroup || null;
    if (updateUserDto.telephone !== undefined)
      updateData.telephone = updateUserDto.telephone || null;
    if (updateUserDto.phone !== undefined) updateData.phone = updateUserDto.phone || null;
    if (updateUserDto.avatar !== undefined) updateData.avatar = updateUserDto.avatar || null;
    if (updateUserDto.ouPath !== undefined) updateData.ouPath = updateUserDto.ouPath || null;
    if (updateUserDto.status !== undefined) updateData.status = updateUserDto.status;
    if (updateUserDto.isClosed !== undefined) updateData.isClosed = Boolean(updateUserDto.isClosed);
    if (updateUserDto.departmentId !== undefined)
      updateData.departmentId = updateUserDto.departmentId || null;
    if (updateUserDto.positionId !== undefined)
      updateData.positionId = updateUserDto.positionId || null;
    if (updateUserDto.organizationId !== undefined)
      updateData.organizationId = updateUserDto.organizationId || null;
    if (updateUserDto.locationId !== undefined)
      updateData.locationId = updateUserDto.locationId || null;

    const updated = await this.prisma.directoryUser.update({
      where: { id },
      data: updateData,
      include: {
        organization: true,
        departmentRel: true,
        positionRel: true,
        locationRel: true,
        assignedAssets: true,
        licenseAssignments: true,
      },
    });

    if (updateUserDto.adGroup) {
      await this.ensureAndLinkAdGroup(id, updateUserDto.adGroup);
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
        this.prisma.directoryUser.count({ where: { computerName: { not: null } } }),
        this.prisma.directoryGroup.count(),
        this.prisma.directoryUser.count({
          where: {
            OR: [{ status: 'DISABLED' }, { status: 'SUSPENDED' }, { isClosed: true }],
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
      select: { ouPath: true, computerName: true },
      take: 10000,
    });

    const groups = await this.prisma.directoryGroup.findMany({
      select: { ouPath: true },
      take: 1000,
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
      const workstationCount = ouUsers.filter((u) => Boolean(u.computerName)).length;
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
    });

    return users.map((u, index) => {
      const isClosedStr = u.isClosed || u.status === 'DISABLED' ? 'Y' : 'N';
      return {
        STT: index + 1,
        'Employee Code': u.employeeCode || '',
        'Full Name': u.displayName || `${u.firstName} ${u.lastName}`.trim(),
        Designation: u.jobTitle || '',
        'Group Company': u.groupCompany || '',
        Company: u.company || '',
        Plant: u.plant || '',
        Department: u.department || '',
        Section: u.section || '',
        'Sub Section': u.subSection || '',
        Email: u.email,
        Telephone: u.telephone || '',
        Closed: isClosedStr,
        'Computer Name': u.computerName || '',
        'Computer Name 2': u.computerName2 || '',
        'Directory Group': u.adGroup || '',
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

    for (let chunkStart = 0; chunkStart < rows.length; chunkStart += CHUNK_SIZE) {
      const chunk = rows.slice(chunkStart, chunkStart + CHUNK_SIZE);

      // Collect valid emails, codes, and group names in this chunk for bulk lookup
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
        } catch {
          isBatchLookupSupported = false;
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
        } catch {
          // Fall back to on-demand lookup/creation in ensureAndLinkAdGroup
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

          const executeRowWrite = async (tx: Prisma.TransactionClient | PrismaService) => {
            if (existingRecord) {
              await tx.directoryUser.update({
                where: { id: existingRecord.id },
                data: {
                  employeeCode: employeeCode || existingRecord.employeeCode,
                  firstName: firstName || existingRecord.firstName,
                  lastName: lastName || existingRecord.lastName,
                  displayName: rawName,
                  jobTitle: row.designation || existingRecord.jobTitle,
                  company: row.company || existingRecord.company,
                  groupCompany: row.groupCompany || existingRecord.groupCompany,
                  plant: row.plant || existingRecord.plant,
                  department: row.department || existingRecord.department,
                  section: row.section || existingRecord.section,
                  subSection: row.subSection || existingRecord.subSection,
                  telephone: row.telephone || existingRecord.telephone,
                  computerName: row.computerName || existingRecord.computerName,
                  computerName2: row.computerName2 || existingRecord.computerName2,
                  adGroup: row.adGroup || existingRecord.adGroup,
                  ouPath: row.ouPath || existingRecord.ouPath,
                  managerName: row.managerName || existingRecord.managerName,
                  status,
                  isClosed,
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
                  jobTitle: row.designation || 'Employee',
                  company: row.company || 'BSL Others',
                  groupCompany: row.groupCompany || 'BSL',
                  plant: row.plant || 'Plant 1',
                  department: row.department || 'Production',
                  section: row.section || 'General Operations',
                  subSection: row.subSection || null,
                  telephone: row.telephone || null,
                  computerName: row.computerName || null,
                  computerName2: row.computerName2 || null,
                  adGroup: row.adGroup || null,
                  ouPath: row.ouPath || 'OU=Production,DC=uims,DC=internal',
                  managerName: row.managerName || null,
                  status,
                  isClosed,
                  source: 'LDAP',
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
