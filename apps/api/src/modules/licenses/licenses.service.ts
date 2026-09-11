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
        licenseKey: data.licenseKey || 'N/A',
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
        { licenseKey: { contains: query.search, mode: 'insensitive' } },
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
      orderBy: { createdAt: 'desc' },
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
    if (data.licenseKey !== undefined) updateData.licenseKey = data.licenseKey;
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

  async getStats(): Promise<LicenseStatsDto> {
    const [total, aggregateSeats, expiringCount, allLicenses] = await Promise.all([
      this.prisma.license.count(),
      this.prisma.license.aggregate({
        _sum: { totalSeats: true, usedSeats: true },
      }),
      this.prisma.license.count({ where: { status: 'EXPIRING_SOON' } }),
      this.prisma.license.findMany({
        take: 1000,
        orderBy: { createdAt: 'desc' },
        select: { usedSeats: true, costPerSeat: true },
      }),
    ]);

    const totalSeats = aggregateSeats._sum.totalSeats || 0;
    const usedSeats = aggregateSeats._sum.usedSeats || 0;
    const totalSpend = allLicenses.reduce((sum, l) => sum + l.usedSeats * (l.costPerSeat || 0), 0);
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

    return {
      id: license.id,
      name: license.name,
      vendor: license.vendor || 'Generic',
      type: typeLabel,
      totalSeats: license.totalSeats,
      usedSeats: license.usedSeats,
      remainingSeats,
      costPerSeat: license.costPerSeat || 0,
      expiryDate: license.expiryDate ? license.expiryDate.toISOString().split('T')[0] : '',
      licenseKey: license.licenseKey || 'N/A',
      status: statusLabel,
      autoRenew: license.autoRenew,
      assignedUsers,
      notes: license.notes || '',
    };
  }
}
