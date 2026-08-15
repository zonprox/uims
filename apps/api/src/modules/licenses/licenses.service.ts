import { Injectable, NotFoundException } from '@nestjs/common';
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

type LicenseWithAssignments = Prisma.LicenseGetPayload<{
  include: { assignments: true };
}>;

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

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

    return this.formatLicense(updated);
  }

  async remove(id: string) {
    return this.prisma.license.delete({ where: { id } });
  }

  async assignUser(licenseId: string, payload: AssignUserLicenseDto) {
    return this.prisma.$transaction(async (tx) => {
      const license = await tx.license.findUnique({
        where: { id: licenseId },
        include: { assignments: true },
      });
      if (!license) throw new NotFoundException('License not found');

      const newAssignment = await tx.licenseAssignment.create({
        data: {
          licenseId,
          assignedName: payload.name,
          assignedEmail: payload.email,
          department: payload.department || 'Engineering',
        },
      });

      await tx.license.update({
        where: { id: licenseId },
        data: { usedSeats: { increment: 1 } },
      });

      return newAssignment;
    });
  }

  async revokeUser(licenseId: string, assignmentId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.licenseAssignment.delete({
        where: { id: assignmentId },
      });

      const license = await tx.license.findUnique({ where: { id: licenseId } });
      if (license && license.usedSeats > 0) {
        await tx.license.update({
          where: { id: licenseId },
          data: { usedSeats: { decrement: 1 } },
        });
      }

      return { success: true };
    });
  }

  async getStats(): Promise<LicenseStatsDto> {
    const [total, aggregateSeats, expiringCount, allLicenses] = await Promise.all([
      this.prisma.license.count(),
      this.prisma.license.aggregate({
        _sum: { totalSeats: true, usedSeats: true },
      }),
      this.prisma.license.count({ where: { status: 'EXPIRING_SOON' } }),
      this.prisma.license.findMany({ select: { usedSeats: true, costPerSeat: true } }),
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

    const assignedUsers = (license.assignments || []).map((a) => ({
      id: a.id,
      name: a.assignedName || 'Employee',
      email: a.assignedEmail || 'employee@company.com',
      department: a.department || 'General',
      assignedDate: a.assignedAt ? a.assignedAt.toISOString().split('T')[0] : '',
    }));

    return {
      id: license.id,
      name: license.name,
      vendor: license.vendor || 'Generic',
      type: typeLabel,
      totalSeats: license.totalSeats,
      usedSeats: license.usedSeats,
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
