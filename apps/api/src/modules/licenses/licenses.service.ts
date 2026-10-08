import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AssignUserLicenseDto,
  BatchAssignLicensesToUserDto,
  BatchAssignLicensesToUserResultDto,
  BatchAssignUserLicenseDto,
  BatchAssignUserLicenseResultDto,
  CreateLicenseDto,
  LicenseQueryDto,
  LicenseStatsDto,
  UpdateLicenseDto,
} from '@uims/shared-types';
import {
  mapLicenseStatus,
  mapLicenseStatusToLabel,
  mapLicenseType,
  mapLicenseTypeToLabel,
} from '@uims/shared-utils';
import {
  decryptLicenseKey,
  encryptLicenseKey,
  maskLicenseKey,
} from '../../common/crypto/license-crypto';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type LicenseWithAssignments = Prisma.LicenseGetPayload<{
  include: { assignments: true };
}>;

@Injectable()
export class LicensesService {
  private readonly logger = new Logger(LicensesService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private notificationsService?: NotificationsService,
  ) {}

  async create(data: CreateLicenseDto) {
    const type = mapLicenseType(data.type as string);
    const status = mapLicenseStatus(data.status as string);

    const created = await this.prisma.license.create({
      data: {
        name: data.name,
        vendor: data.vendor || 'Generic',
        type,
        totalSeats: data.totalSeats ? Number(data.totalSeats) : 10,
        usedSeats: 0,
        costPerSeat: data.costPerSeat ? Number(data.costPerSeat) : 0,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        licenseKey: data.licenseKey ? encryptLicenseKey(data.licenseKey) : 'N/A',
        status,
        autoRenew: data.autoRenew ?? true,
        notes: data.notes || '',
      },
      include: { assignments: true },
    });

    return this.formatLicense(created);
  }

  async findAll(query?: LicenseQueryDto) {
    const where: Prisma.LicenseWhereInput = {};

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { vendor: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.vendor && query.vendor !== 'all') {
      where.vendor = { contains: query.vendor, mode: 'insensitive' };
    }

    if (query?.type && query.type !== 'all') {
      where.type = mapLicenseType(query.type);
    }

    if (query?.status && query.status !== 'all') {
      where.status = mapLicenseStatus(query.status);
    }

    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize || query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    const licenses = await this.prisma.license.findMany({
      where,
      include: { assignments: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: pageSize,
      skip,
    });

    return licenses.map((l) => this.formatLicense(l));
  }

  async findOne(id: string) {
    const license = await this.prisma.license.findUnique({
      where: { id },
      include: { assignments: true },
    });
    if (!license) {
      throw new NotFoundException(`License with ID ${id} not found`);
    }
    return this.formatLicense(license);
  }

  async update(id: string, data: UpdateLicenseDto) {
    const updateData: Prisma.LicenseUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.vendor !== undefined) updateData.vendor = data.vendor;
    if (data.totalSeats !== undefined) updateData.totalSeats = Number(data.totalSeats);
    if (data.costPerSeat !== undefined) updateData.costPerSeat = Number(data.costPerSeat);
    if (data.licenseKey !== undefined) {
      updateData.licenseKey = data.licenseKey ? encryptLicenseKey(data.licenseKey) : 'N/A';
    }
    if (data.autoRenew !== undefined) updateData.autoRenew = data.autoRenew;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);

    if (data.type) {
      updateData.type = mapLicenseType(data.type as string);
    }

    if (data.status) {
      updateData.status = mapLicenseStatus(data.status as string);
    }

    const updated = await this.prisma.license.update({
      where: { id },
      data: updateData,
      include: { assignments: true },
    });

    if (
      this.notificationsService &&
      data.status &&
      (data.status === 'EXPIRING_SOON' || data.status === 'EXPIRED')
    ) {
      try {
        await this.notificationsService.notifyAdmins({
          title: 'License Expiry Notice',
          message: `License "${updated.name}" status changed to ${updated.status}. Review active subscriptions.`,
          type: 'WARNING',
          link: '/licenses',
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to dispatch expiry notification for license "${updated.name}" (${updated.id})`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return this.formatLicense(updated);
  }

  async remove(id: string) {
    return this.prisma.license.delete({ where: { id } });
  }

  async assignUser(licenseId: string, payload: AssignUserLicenseDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const license = await tx.license.findUnique({
        where: { id: licenseId },
      });
      if (!license) {
        throw new NotFoundException(`License with ID "${licenseId}" not found`);
      }

      let user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        displayName: string | null;
        department?: { name: string } | null;
      } | null = null;

      if (payload.userId) {
        if (tx.directoryUser) {
          user = await tx.directoryUser.findUnique({
            where: { id: payload.userId },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              displayName: true,
              department: { select: { name: true } },
            },
          });
          if (!user) {
            throw new NotFoundException(`Directory user with ID "${payload.userId}" not found`);
          }
        }
      } else if (payload.email) {
        if (tx.directoryUser) {
          user = await tx.directoryUser.findUnique({
            where: { email: payload.email },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              displayName: true,
              department: { select: { name: true } },
            },
          });
        }
      }

      if (!user && !payload.email && !payload.name) {
        throw new BadRequestException(
          'Either userId or employee details (email, name) must be provided',
        );
      }

      if (user && tx.licenseAssignment.findFirst) {
        const existingAssignment = await tx.licenseAssignment.findFirst({
          where: {
            licenseId,
            userId: user.id,
            unassignedAt: null,
          },
        });
        if (existingAssignment) {
          throw new BadRequestException(
            `Directory user "${user.email}" is already actively assigned to license "${license.name}"`,
          );
        }
      }

      const currentActiveSeats = tx.licenseAssignment.count
        ? await tx.licenseAssignment.count({
            where: {
              licenseId,
              unassignedAt: null,
            },
          })
        : license.usedSeats || 0;

      const isUnlimited = license.type === 'OPEN_SOURCE' || license.type === 'OEM';
      if (!isUnlimited && currentActiveSeats >= license.totalSeats) {
        throw new BadRequestException(
          `License seat capacity exceeded: ${currentActiveSeats}/${license.totalSeats} seats currently in use for "${license.name}"`,
        );
      }

      const assignedName = user
        ? user.displayName || `${user.firstName} ${user.lastName}`.trim()
        : payload.name || 'Employee';
      const assignedEmail = user ? user.email : payload.email || 'employee@company.com';
      const department = user?.department?.name || payload.department || 'General';

      const newAssignment = await tx.licenseAssignment.create({
        data: {
          licenseId,
          userId: user?.id || null,
          assignedName,
          assignedEmail,
          department,
          assignedAt: new Date(),
          unassignedAt: null,
        },
      });

      const dynamicUsedSeats = tx.licenseAssignment.count
        ? await tx.licenseAssignment.count({
            where: {
              licenseId,
              unassignedAt: null,
            },
          })
        : (license.usedSeats || 0) + 1;

      const remainingSeats = Math.max(0, license.totalSeats - dynamicUsedSeats);
      const updatedLicense = await tx.license.update({
        where: { id: licenseId },
        data: {
          usedSeats: dynamicUsedSeats,
        },
        include: { assignments: true },
      });

      return {
        newAssignment,
        license: updatedLicense,
        userId: user?.id,
        remainingSeats,
        dynamicUsedSeats,
      };
    });

    if (this.notificationsService) {
      try {
        if (result.userId) {
          await this.notificationsService.notifyUser(result.userId, {
            title: 'License Assigned',
            message: `You have been assigned a seat for "${result.license.name}".`,
            type: 'INFO',
            link: '/licenses',
          });
        }
        const total = result.license.totalSeats;
        const used = result.license?.usedSeats ?? result.dynamicUsedSeats;
        const ratio = total > 0 ? used / total : 0;

        if (used >= total) {
          await this.notificationsService.notifyAdmins({
            title: 'License Capacity Reached',
            message: `License "${result.license.name}" has reached full capacity (${used}/${total} seats assigned).`,
            type: 'WARNING',
            link: '/licenses',
          });
        } else if (ratio >= 0.9) {
          await this.notificationsService.notifyAdmins({
            title: 'License Capacity Near Limit',
            message: `License "${result.license.name}" is near full capacity (${used}/${total} seats assigned, ${Math.round(ratio * 100)}%).`,
            type: 'WARNING',
            link: '/licenses',
          });
        }
      } catch (error: unknown) {
        this.logger.error(
          `Failed to dispatch license notification for "${result.license.name}" (${licenseId})`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return result.newAssignment;
  }

  async revokeUser(licenseId: string, assignmentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.licenseAssignment.findFirst({
        where: { id: assignmentId, licenseId },
      });
      if (!assignment) {
        throw new NotFoundException(
          `License assignment with ID "${assignmentId}" not found for license "${licenseId}"`,
        );
      }

      await tx.licenseAssignment.update({
        where: { id: assignmentId },
        data: { unassignedAt: new Date() },
      });

      const dynamicUsedSeats = await tx.licenseAssignment.count({
        where: {
          licenseId,
          unassignedAt: null,
        },
      });

      await tx.license.update({
        where: { id: licenseId },
        data: {
          usedSeats: dynamicUsedSeats,
        },
      });

      return {
        success: true,
        licenseId,
        assignmentId,
        usedSeats: dynamicUsedSeats,
      };
    });
  }

  async batchAssignUsers(
    licenseId: string,
    dto: BatchAssignUserLicenseDto,
  ): Promise<BatchAssignUserLicenseResultDto> {
    if (!dto.userIds || !Array.isArray(dto.userIds) || dto.userIds.length === 0) {
      return { count: 0, assignedUserIds: [], skippedUserIds: [] };
    }

    const uniqueUserIds = Array.from(
      new Set(
        dto.userIds
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    );

    if (uniqueUserIds.length === 0) {
      return { count: 0, assignedUserIds: [], skippedUserIds: [] };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const license = await tx.license.findUnique({
        where: { id: licenseId },
        include: { assignments: true },
      });
      if (!license) {
        throw new NotFoundException(`License with ID "${licenseId}" not found`);
      }

      const existingAssignments = await tx.licenseAssignment.findMany({
        where: {
          licenseId,
          userId: { in: uniqueUserIds },
          unassignedAt: null,
        },
        select: { userId: true },
        take: uniqueUserIds.length,
      });
      const alreadyAssignedUserIds = new Set(
        existingAssignments.map((a) => a.userId).filter((id): id is string => Boolean(id)),
      );

      const candidateUserIds = uniqueUserIds.filter((uid) => !alreadyAssignedUserIds.has(uid));
      const skippedUserIds = uniqueUserIds.filter((uid) => alreadyAssignedUserIds.has(uid));

      if (candidateUserIds.length === 0) {
        return {
          count: 0,
          assignedUserIds: [],
          skippedUserIds,
          license,
        };
      }

      const users = await tx.directoryUser.findMany({
        where: { id: { in: candidateUserIds } },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          department: { select: { name: true } },
        },
        take: candidateUserIds.length,
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      const isUnlimited = license.type === 'OPEN_SOURCE' || license.type === 'OEM';
      const currentActiveSeats = await tx.licenseAssignment.count({
        where: {
          licenseId,
          unassignedAt: null,
        },
      });
      const availableSeats = isUnlimited
        ? Infinity
        : Math.max(0, license.totalSeats - currentActiveSeats);

      if (!isUnlimited && availableSeats <= 0) {
        throw new BadRequestException(
          `License seat capacity exceeded: ${currentActiveSeats}/${license.totalSeats} seats currently in use for "${license.name}"`,
        );
      }

      const usersToAssign = isUnlimited
        ? candidateUserIds
        : candidateUserIds.slice(0, availableSeats);
      const capacitySkipped = candidateUserIds.slice(usersToAssign.length);
      skippedUserIds.push(...capacitySkipped);

      const now = new Date();
      const assignedUserIds: string[] = [];

      for (const uid of usersToAssign) {
        const u = userMap.get(uid);
        if (!u) {
          skippedUserIds.push(uid);
          continue;
        }

        const assignedName = u.displayName || `${u.firstName} ${u.lastName}`.trim();
        const assignedEmail = u.email;
        const department = u.department?.name || 'General';

        await tx.licenseAssignment.create({
          data: {
            licenseId,
            userId: u.id,
            assignedName,
            assignedEmail,
            department,
            assignedAt: now,
            unassignedAt: null,
          },
        });
        assignedUserIds.push(u.id);
      }

      const dynamicUsedSeats = await tx.licenseAssignment.count({
        where: {
          licenseId,
          unassignedAt: null,
        },
      });

      const updatedLicense = await tx.license.update({
        where: { id: licenseId },
        data: { usedSeats: dynamicUsedSeats },
        include: { assignments: true },
      });

      return {
        count: assignedUserIds.length,
        assignedUserIds,
        skippedUserIds,
        license: updatedLicense,
      };
    });

    if (this.notificationsService && result.assignedUserIds.length > 0) {
      for (const uid of result.assignedUserIds) {
        try {
          await this.notificationsService.notifyUser(uid, {
            title: 'License Assigned',
            message: `You have been assigned a seat for "${result.license.name}".`,
            type: 'INFO',
            link: '/licenses',
          });
        } catch (error: unknown) {
          this.logger.error(
            `Failed to dispatch license notification to user "${uid}" for "${result.license.name}"`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }

    return {
      count: result.count,
      assignedUserIds: result.assignedUserIds,
      skippedUserIds: result.skippedUserIds,
      license: this.formatLicense(result.license),
    };
  }

  async batchAssignLicensesToUser(
    dto: BatchAssignLicensesToUserDto,
  ): Promise<BatchAssignLicensesToUserResultDto> {
    if (!dto.licenseIds || !Array.isArray(dto.licenseIds) || dto.licenseIds.length === 0) {
      return { count: 0, assignedLicenseIds: [], skippedLicenseIds: [] };
    }

    const uniqueLicenseIds = Array.from(
      new Set(
        dto.licenseIds
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    );

    if (uniqueLicenseIds.length === 0) {
      return { count: 0, assignedLicenseIds: [], skippedLicenseIds: [] };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.directoryUser.findUnique({
        where: { id: dto.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          department: { select: { name: true } },
        },
      });
      if (!user) {
        throw new NotFoundException(`Directory user with ID "${dto.userId}" not found`);
      }

      const assignedName = user.displayName || `${user.firstName} ${user.lastName}`.trim();
      const assignedEmail = user.email;
      const department = user.department?.name || 'General';

      const assignedLicenseIds: string[] = [];
      const skippedLicenseIds: string[] = [];
      const now = new Date();

      for (const licId of uniqueLicenseIds) {
        const license = await tx.license.findUnique({ where: { id: licId } });
        if (!license) {
          skippedLicenseIds.push(licId);
          continue;
        }

        const existing = await tx.licenseAssignment.findFirst({
          where: {
            licenseId: licId,
            userId: user.id,
            unassignedAt: null,
          },
        });
        if (existing) {
          skippedLicenseIds.push(licId);
          continue;
        }

        const isUnlimited = license.type === 'OPEN_SOURCE' || license.type === 'OEM';
        const currentActive = await tx.licenseAssignment.count({
          where: { licenseId: licId, unassignedAt: null },
        });

        if (!isUnlimited && currentActive >= license.totalSeats) {
          skippedLicenseIds.push(licId);
          continue;
        }

        await tx.licenseAssignment.create({
          data: {
            licenseId: licId,
            userId: user.id,
            assignedName,
            assignedEmail,
            department,
            assignedAt: now,
            unassignedAt: null,
          },
        });

        const newUsed = currentActive + 1;
        await tx.license.update({
          where: { id: licId },
          data: { usedSeats: newUsed },
        });

        assignedLicenseIds.push(licId);
      }

      return {
        count: assignedLicenseIds.length,
        assignedLicenseIds,
        skippedLicenseIds,
        user,
      };
    });

    if (this.notificationsService && result.assignedLicenseIds.length > 0) {
      try {
        await this.notificationsService.notifyUser(dto.userId, {
          title: 'Software Licenses Assigned',
          message: `You have been assigned ${result.count} software license${result.count > 1 ? 's' : ''}.`,
          type: 'INFO',
          link: '/licenses',
        });
      } catch (error: unknown) {
        this.logger.error(
          `Failed to dispatch batch license notification to user "${dto.userId}"`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return {
      count: result.count,
      assignedLicenseIds: result.assignedLicenseIds,
      skippedLicenseIds: result.skippedLicenseIds,
    };
  }

  async getStats(): Promise<LicenseStatsDto> {
    let sqlSpend: number | null = null;
    try {
      if (typeof this.prisma.$queryRaw === 'function') {
        const rawResult = await this.prisma.$queryRaw<Array<{ totalSpend: number | null }>>`
          SELECT COALESCE(SUM("usedSeats" * "costPerSeat"), 0)::float AS "totalSpend"
          FROM "License"
        `;
        if (
          rawResult &&
          rawResult[0]?.totalSpend !== undefined &&
          rawResult[0]?.totalSpend !== null
        ) {
          sqlSpend = Number(rawResult[0].totalSpend);
        }
      }
    } catch (error: unknown) {
      this.logger.error(
        'SQL license spend aggregation failed, falling back',
        error instanceof Error ? error.stack : String(error),
      );
    }

    const [total, aggregateSeats, expiringCount, fallbackLicenses] = await Promise.all([
      this.prisma.license.count(),
      this.prisma.license.aggregate({
        _sum: { totalSeats: true, usedSeats: true },
      }),
      this.prisma.license.count({ where: { status: 'EXPIRING_SOON' } }),
      sqlSpend === null
        ? this.prisma.license.findMany({
            take: 100,
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            select: { usedSeats: true, costPerSeat: true },
          })
        : Promise.resolve<Array<{ usedSeats: number; costPerSeat: number }>>([]),
    ]);

    const totalSeats = aggregateSeats._sum.totalSeats || 0;
    const usedSeats = aggregateSeats._sum.usedSeats || 0;
    const totalSpend: number =
      sqlSpend !== null
        ? sqlSpend
        : fallbackLicenses.reduce<number>((sum, l) => sum + l.usedSeats * (l.costPerSeat || 0), 0);
    const overallUtilization = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;

    return {
      total,
      annualSpend: totalSpend,
      utilization: overallUtilization,
      expiringCount,
    };
  }

  private formatLicense(license: LicenseWithAssignments) {
    const typeLabel = mapLicenseTypeToLabel(license.type);
    const statusLabel = mapLicenseStatusToLabel(license.status);

    const activeAssignments = (license.assignments || []).filter((a) => !a.unassignedAt);
    const assignedUsers = activeAssignments.map((a) => ({
      id: a.id,
      userId: a.userId,
      name: a.assignedName || 'Employee',
      email: a.assignedEmail || 'employee@company.com',
      department: a.department || 'General',
      assignedDate: a.assignedAt ? a.assignedAt.toISOString().split('T')[0] : '',
    }));

    const remainingSeats = Math.max(0, license.totalSeats - license.usedSeats);
    const expDate = license.expiryDate ? license.expiryDate.toISOString().split('T')[0] : '';
    const rawKey = license.licenseKey || 'N/A';
    const decryptedKey = decryptLicenseKey(rawKey) || 'N/A';
    const maskedKey = maskLicenseKey(decryptedKey);

    return {
      id: license.id,
      name: license.name,
      vendor: license.vendor || 'Generic',
      publisher: license.vendor || 'Generic',
      category: 'Software',
      type: typeLabel,
      licenseType: typeLabel,
      totalSeats: license.totalSeats,
      usedSeats: license.usedSeats,
      remainingSeats,
      costPerSeat: license.costPerSeat || 0,
      expiryDate: expDate,
      expirationDate: expDate,
      licenseKey: decryptedKey,
      maskedKey,
      status: statusLabel,
      autoRenew: license.autoRenew,
      assignedUsers,
      notes: license.notes || '',
      createdAt: license.createdAt ? license.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: license.updatedAt ? license.updatedAt.toISOString() : new Date().toISOString(),
    };
  }
}
