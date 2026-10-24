import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  AccessAssignmentStatus,
  AccessControlStatsDto,
  AccessDoorDto,
  AccessSubjectType,
  AccessValidityType,
  DocumentScanDetailDto,
  DoorAccessAssignmentDto,
  DoorAccessDocumentScanDto,
  DoorDetailDto,
  DoorDocumentType,
  DoorStatus,
  DoorUserAssignmentDto,
  DoorWithCountDto,
  GrantAccessResultDto,
  NonADUserDetailDto,
  NonADUserDto,
  NonADUserStatus,
  NonADUserWithCountDto,
  RevokeAccessResultDto,
  UnifiedUserRowDto,
  UserAccessDetailDto,
} from '@uims/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { AccessControlStorageService, UploadedFilePayload } from './access-control-storage.service';
import {
  AccessRequestTemplateParams,
  buildAccessRequestDocx,
  buildAccessRequestHtml,
  TemplateDoorItem,
  TemplateSubjectData,
} from './access-request-template.builder';
import {
  CreateDoorDto,
  CreateNonADUserDto,
  DocumentScanQueryDto,
  DoorQueryDto,
  GrantAccessDto,
  NonADUserQueryDto,
  RevokeAccessDto,
  TemplateQueryDto,
  UnifiedUserQueryDto,
  UpdateDoorDto,
  UpdateNonADUserDto,
  UploadDocumentDto,
} from './dto';

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: AccessControlStorageService,
  ) {}

  // ==========================================
  // 1. TELEMETRY & DASHBOARD METRICS
  // ==========================================

  async getAccessControlStats(): Promise<AccessControlStatsDto> {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalDoors,
      activeDoors,
      maintenanceDoors,
      totalNonADUsers,
      activeNonADUsers,
      totalActiveAssignments,
      directoryUserAssignments,
      nonADUserAssignments,
      expiringSoonAssignments,
      criticalDoorAssignments,
    ] = await Promise.all([
      this.prisma.accessDoor.count(),
      this.prisma.accessDoor.count({ where: { status: DoorStatus.ACTIVE } }),
      this.prisma.accessDoor.count({ where: { status: DoorStatus.MAINTENANCE } }),
      this.prisma.nonADUser.count(),
      this.prisma.nonADUser.count({ where: { status: NonADUserStatus.ACTIVE } }),
      this.prisma.doorAccessAssignment.count({
        where: { status: AccessAssignmentStatus.ACTIVE },
      }),
      this.prisma.doorAccessAssignment.count({
        where: {
          status: AccessAssignmentStatus.ACTIVE,
          subjectType: AccessSubjectType.DIRECTORY_USER,
        },
      }),
      this.prisma.doorAccessAssignment.count({
        where: {
          status: AccessAssignmentStatus.ACTIVE,
          subjectType: AccessSubjectType.NON_AD_USER,
        },
      }),
      this.prisma.doorAccessAssignment.count({
        where: {
          status: AccessAssignmentStatus.ACTIVE,
          accessType: AccessValidityType.TIME_BOUND,
          validTo: {
            gt: now,
            lte: in30Days,
          },
        },
      }),
      this.prisma.doorAccessAssignment.count({
        where: {
          status: AccessAssignmentStatus.ACTIVE,
          door: {
            securityLevel: 'CRITICAL',
          },
        },
      }),
    ]);

    return {
      totalDoors,
      activeDoors,
      maintenanceDoors,
      totalNonADUsers,
      activeNonADUsers,
      totalActiveAssignments,
      directoryUserAssignments,
      nonADUserAssignments,
      expiringSoonAssignments,
      criticalDoorAssignments,
    };
  }

  // ==========================================
  // 2. PHYSICAL DOOR INVENTORY (CRUD)
  // ==========================================

  async getDoors(query: DoorQueryDto): Promise<{
    items: DoorWithCountDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.AccessDoorWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.securityLevel) {
      where.securityLevel = query.securityLevel;
    }
    if (query.building?.trim()) {
      where.building = { contains: query.building.trim(), mode: 'insensitive' };
    }
    if (query.floor?.trim()) {
      where.floor = { contains: query.floor.trim(), mode: 'insensitive' };
    }
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { doorCode: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { building: { contains: s, mode: 'insensitive' } },
        { floor: { contains: s, mode: 'insensitive' } },
        { zone: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sort?.trim() || 'createdAt';
    const sortOrder: Prisma.SortOrder = query.order === 'desc' ? 'desc' : 'asc';

    const [total, doors] = await Promise.all([
      this.prisma.accessDoor.count({ where }),
      this.prisma.accessDoor.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ [sortField]: sortOrder }, { id: 'asc' }],
        include: {
          organization: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: {
              assignments: {
                where: { status: AccessAssignmentStatus.ACTIVE },
              },
            },
          },
        },
      }),
    ]);

    const items: DoorWithCountDto[] = doors.map((door) => ({
      id: door.id,
      doorCode: door.doorCode,
      name: door.name,
      description: door.description,
      building: door.building,
      floor: door.floor,
      zone: door.zone,
      location: door.location,
      organizationId: door.organizationId,
      securityLevel: door.securityLevel as DoorWithCountDto['securityLevel'],
      status: door.status as DoorWithCountDto['status'],
      controllerModel: door.controllerModel,
      controllerIp: door.controllerIp,
      readerType: door.readerType,
      readerId: door.readerId,
      installedAt: door.installedAt ? door.installedAt.toISOString() : null,
      metadata: (door.metadata as Record<string, unknown>) || null,
      notes: door.notes,
      createdAt: door.createdAt.toISOString(),
      updatedAt: door.updatedAt.toISOString(),
      activeUsersCount: door._count.assignments,
      organization: door.organization,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getDoorById(id: string): Promise<DoorDetailDto> {
    const door = await this.prisma.accessDoor.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: {
            assignments: {
              where: { status: AccessAssignmentStatus.ACTIVE },
            },
          },
        },
        assignments: {
          take: 20,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          include: {
            directoryUser: {
              select: {
                id: true,
                employeeCode: true,
                displayName: true,
                email: true,
                department: { select: { id: true, name: true } },
              },
            },
            nonADUser: true,
            grantDocument: true,
            revocationDocument: true,
          },
        },
      },
    });

    if (!door) {
      throw new NotFoundException(`Door with ID "${id}" was not found.`);
    }

    return {
      id: door.id,
      doorCode: door.doorCode,
      name: door.name,
      description: door.description,
      building: door.building,
      floor: door.floor,
      zone: door.zone,
      location: door.location,
      organizationId: door.organizationId,
      securityLevel: door.securityLevel as DoorDetailDto['securityLevel'],
      status: door.status as DoorDetailDto['status'],
      controllerModel: door.controllerModel,
      controllerIp: door.controllerIp,
      readerType: door.readerType,
      readerId: door.readerId,
      installedAt: door.installedAt ? door.installedAt.toISOString() : null,
      metadata: (door.metadata as Record<string, unknown>) || null,
      notes: door.notes,
      createdAt: door.createdAt.toISOString(),
      updatedAt: door.updatedAt.toISOString(),
      activeUsersCount: door._count.assignments,
      organization: door.organization,
      recentAssignments: door.assignments.map((a) => this.mapAssignmentToDto(a)),
    };
  }

  async getDoorUsers(
    doorId: string,
    query: {
      page?: number;
      pageSize?: number;
      status?: AccessAssignmentStatus;
      subjectType?: AccessSubjectType;
    },
  ): Promise<{
    items: DoorUserAssignmentDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    // Verify door existence
    const doorExists = await this.prisma.accessDoor.findUnique({
      where: { id: doorId },
      select: { id: true },
    });
    if (!doorExists) {
      throw new NotFoundException(`Door with ID "${doorId}" was not found.`);
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.DoorAccessAssignmentWhereInput = { doorId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.subjectType) {
      where.subjectType = query.subjectType;
    }

    const [total, assignments] = await Promise.all([
      this.prisma.doorAccessAssignment.count({ where }),
      this.prisma.doorAccessAssignment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: {
          directoryUser: {
            select: {
              id: true,
              employeeCode: true,
              displayName: true,
              firstName: true,
              lastName: true,
              organization: { select: { name: true } },
              department: { select: { name: true } },
            },
          },
          nonADUser: true,
        },
      }),
    ]);

    const items: DoorUserAssignmentDto[] = assignments.map((a) => {
      const isAD = a.subjectType === AccessSubjectType.DIRECTORY_USER;
      const subjectId = isAD ? a.directoryUserId || '' : a.nonADUserId || '';
      const fullName = isAD
        ? a.directoryUser?.displayName ||
          `${a.directoryUser?.firstName || ''} ${a.directoryUser?.lastName || ''}`.trim() ||
          'Unknown Employee'
        : a.nonADUser?.fullName || 'Unknown Contractor';

      const codeOrBadge = isAD
        ? a.directoryUser?.employeeCode || 'N/A'
        : a.nonADUser?.badgeNumber || 'N/A';

      const organizationOrCompany = isAD
        ? a.directoryUser?.organization?.name || 'Corporate'
        : a.nonADUser?.company || 'External';

      const department = isAD
        ? a.directoryUser?.department?.name || undefined
        : a.nonADUser?.userType || undefined;

      return {
        assignmentId: a.id,
        subjectType: a.subjectType as AccessSubjectType,
        subjectId,
        fullName,
        codeOrBadge,
        organizationOrCompany,
        department,
        accessType: a.accessType as AccessValidityType,
        validFrom: a.validFrom.toISOString(),
        validTo: a.validTo ? a.validTo.toISOString() : null,
        status: a.status as AccessAssignmentStatus,
        grantedAt: a.grantedAt.toISOString(),
        grantDocumentId: a.grantDocumentId,
        revokedAt: a.revokedAt ? a.revokedAt.toISOString() : null,
        revocationDocumentId: a.revocationDocumentId,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async createDoor(dto: CreateDoorDto): Promise<AccessDoorDto> {
    const existing = await this.prisma.accessDoor.findUnique({
      where: { doorCode: dto.doorCode.trim() },
    });
    if (existing) {
      throw new BadRequestException(
        `A door with code "${dto.doorCode.trim()}" already exists. Door codes must be unique.`,
      );
    }

    const door = await this.prisma.accessDoor.create({
      data: {
        doorCode: dto.doorCode.trim(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        building: dto.building.trim(),
        floor: dto.floor.trim(),
        zone: dto.zone?.trim(),
        location: dto.location?.trim(),
        organizationId: dto.organizationId || null,
        securityLevel: dto.securityLevel || 'STANDARD',
        status: dto.status || 'ACTIVE',
        controllerModel: dto.controllerModel?.trim(),
        controllerIp: dto.controllerIp?.trim(),
        readerType: dto.readerType?.trim(),
        readerId: dto.readerId?.trim(),
        installedAt: dto.installedAt ? new Date(dto.installedAt) : null,
        notes: dto.notes?.trim(),
        metadata: (dto.metadata as Prisma.InputJsonValue) || {},
      },
    });

    this.logger.log(`Created physical door ${door.doorCode} (${door.name})`);
    return this.mapDoorToDto(door);
  }

  async updateDoor(id: string, dto: UpdateDoorDto): Promise<AccessDoorDto> {
    const existing = await this.prisma.accessDoor.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Door with ID "${id}" was not found.`);
    }

    if (dto.doorCode && dto.doorCode.trim() !== existing.doorCode) {
      const duplicate = await this.prisma.accessDoor.findUnique({
        where: { doorCode: dto.doorCode.trim() },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `A door with code "${dto.doorCode.trim()}" already exists. Door codes must be unique.`,
        );
      }
    }

    const updated = await this.prisma.accessDoor.update({
      where: { id },
      data: {
        ...(dto.doorCode ? { doorCode: dto.doorCode.trim() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.building ? { building: dto.building.trim() } : {}),
        ...(dto.floor ? { floor: dto.floor.trim() } : {}),
        ...(dto.zone !== undefined ? { zone: dto.zone?.trim() || null } : {}),
        ...(dto.location !== undefined ? { location: dto.location?.trim() || null } : {}),
        ...(dto.organizationId !== undefined ? { organizationId: dto.organizationId || null } : {}),
        ...(dto.securityLevel ? { securityLevel: dto.securityLevel } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.controllerModel !== undefined
          ? { controllerModel: dto.controllerModel?.trim() || null }
          : {}),
        ...(dto.controllerIp !== undefined
          ? { controllerIp: dto.controllerIp?.trim() || null }
          : {}),
        ...(dto.readerType !== undefined ? { readerType: dto.readerType?.trim() || null } : {}),
        ...(dto.readerId !== undefined ? { readerId: dto.readerId?.trim() || null } : {}),
        ...(dto.installedAt !== undefined
          ? { installedAt: dto.installedAt ? new Date(dto.installedAt) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
      },
    });

    this.logger.log(`Updated physical door ${updated.doorCode}`);
    return this.mapDoorToDto(updated);
  }

  async deleteDoor(id: string): Promise<{ id: string; message: string }> {
    const existing = await this.prisma.accessDoor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: {
              where: { status: AccessAssignmentStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Door with ID "${id}" was not found.`);
    }

    if (existing._count.assignments > 0) {
      throw new BadRequestException(
        `Cannot delete door '${existing.doorCode}' with active access registrations. Please revoke all active access first.`,
      );
    }

    await this.prisma.accessDoor.delete({ where: { id } });
    this.logger.log(`Deleted door ${existing.doorCode} (${id})`);

    return {
      id,
      message: `Door '${existing.doorCode}' was successfully removed.`,
    };
  }

  // ==========================================
  // 3. NON-AD EXTERNAL PERSONNEL REGISTRY (CRUD)
  // ==========================================

  async getNonADUsers(query: NonADUserQueryDto): Promise<{
    items: NonADUserWithCountDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.NonADUserWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.company?.trim()) {
      where.company = { contains: query.company.trim(), mode: 'insensitive' };
    }
    if (query.userType?.trim()) {
      where.userType = { contains: query.userType.trim(), mode: 'insensitive' };
    }
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { badgeNumber: { contains: s, mode: 'insensitive' } },
        { identityNumber: { contains: s, mode: 'insensitive' } },
        { company: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sort?.trim() || 'createdAt';
    const sortOrder: Prisma.SortOrder = query.order === 'desc' ? 'desc' : 'asc';

    const [total, users] = await Promise.all([
      this.prisma.nonADUser.count({ where }),
      this.prisma.nonADUser.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ [sortField]: sortOrder }, { id: 'asc' }],
        include: {
          _count: {
            select: {
              assignments: {
                where: { status: AccessAssignmentStatus.ACTIVE },
              },
            },
          },
        },
      }),
    ]);

    const items: NonADUserWithCountDto[] = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      badgeNumber: u.badgeNumber,
      identityNumber: u.identityNumber,
      company: u.company,
      phone: u.phone,
      email: u.email,
      userType: u.userType,
      status: u.status as NonADUserStatus,
      validFrom: u.validFrom ? u.validFrom.toISOString() : null,
      validTo: u.validTo ? u.validTo.toISOString() : null,
      notes: u.notes,
      metadata: (u.metadata as Record<string, unknown>) || null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
      activeDoorsCount: u._count.assignments,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getNonADUserById(id: string): Promise<NonADUserDetailDto> {
    const user = await this.prisma.nonADUser.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: {
              where: { status: AccessAssignmentStatus.ACTIVE },
            },
          },
        },
        assignments: {
          take: 50,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          include: {
            door: true,
            grantDocument: true,
            revocationDocument: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`External user with ID "${id}" was not found.`);
    }

    return {
      id: user.id,
      fullName: user.fullName,
      badgeNumber: user.badgeNumber,
      identityNumber: user.identityNumber,
      company: user.company,
      phone: user.phone,
      email: user.email,
      userType: user.userType,
      status: user.status as NonADUserStatus,
      validFrom: user.validFrom ? user.validFrom.toISOString() : null,
      validTo: user.validTo ? user.validTo.toISOString() : null,
      notes: user.notes,
      metadata: (user.metadata as Record<string, unknown>) || null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      activeDoorsCount: user._count.assignments,
      assignments: user.assignments.map((a) => this.mapAssignmentToDto(a)),
    };
  }

  async createNonADUser(dto: CreateNonADUserDto): Promise<NonADUserDto> {
    const existingBadge = await this.prisma.nonADUser.findUnique({
      where: { badgeNumber: dto.badgeNumber.trim() },
    });
    if (existingBadge) {
      throw new BadRequestException(
        `External user badge "${dto.badgeNumber.trim()}" is already assigned to another individual.`,
      );
    }

    const user = await this.prisma.nonADUser.create({
      data: {
        fullName: dto.fullName.trim(),
        badgeNumber: dto.badgeNumber.trim(),
        identityNumber: dto.identityNumber.trim(),
        company: dto.company.trim(),
        phone: dto.phone?.trim(),
        email: dto.email?.trim(),
        userType: dto.userType?.trim() || 'CONTRACTOR',
        status: dto.status || NonADUserStatus.ACTIVE,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        notes: dto.notes?.trim(),
        metadata: (dto.metadata as Prisma.InputJsonValue) || {},
      },
    });

    this.logger.log(`Created external user ${user.fullName} (Badge: ${user.badgeNumber})`);
    return this.mapNonADUserToDto(user);
  }

  async updateNonADUser(id: string, dto: UpdateNonADUserDto): Promise<NonADUserDto> {
    const existing = await this.prisma.nonADUser.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`External user with ID "${id}" was not found.`);
    }

    if (dto.badgeNumber && dto.badgeNumber.trim() !== existing.badgeNumber) {
      const duplicate = await this.prisma.nonADUser.findUnique({
        where: { badgeNumber: dto.badgeNumber.trim() },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `External user badge "${dto.badgeNumber.trim()}" is already assigned to another individual.`,
        );
      }
    }

    const updated = await this.prisma.nonADUser.update({
      where: { id },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.badgeNumber ? { badgeNumber: dto.badgeNumber.trim() } : {}),
        ...(dto.identityNumber ? { identityNumber: dto.identityNumber.trim() } : {}),
        ...(dto.company ? { company: dto.company.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
        ...(dto.userType !== undefined ? { userType: dto.userType?.trim() || null } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.validFrom !== undefined
          ? { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }
          : {}),
        ...(dto.validTo !== undefined
          ? { validTo: dto.validTo ? new Date(dto.validTo) : null }
          : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.metadata !== undefined ? { metadata: dto.metadata as Prisma.InputJsonValue } : {}),
      },
    });

    this.logger.log(`Updated external user ${updated.fullName}`);
    return this.mapNonADUserToDto(updated);
  }

  async deleteNonADUser(id: string): Promise<{ id: string; message: string }> {
    const existing = await this.prisma.nonADUser.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignments: {
              where: { status: AccessAssignmentStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`External user with ID "${id}" was not found.`);
    }

    if (existing._count.assignments > 0) {
      throw new BadRequestException(
        `Cannot delete external user '${existing.fullName}' with active door access registrations. Please revoke all active access first.`,
      );
    }

    await this.prisma.nonADUser.delete({ where: { id } });
    this.logger.log(`Deleted external user ${existing.fullName} (${id})`);

    return {
      id,
      message: `External user '${existing.fullName}' was successfully deleted.`,
    };
  }

  // ==========================================
  // 4. UNIFIED USER ACCESS MATRIX & PROFILE
  // ==========================================

  async getUnifiedUsers(query: UnifiedUserQueryDto): Promise<{
    items: UnifiedUserRowDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const shouldQueryAD =
      !query.subjectType || query.subjectType === AccessSubjectType.DIRECTORY_USER;
    const shouldQueryNonAD =
      !query.subjectType || query.subjectType === AccessSubjectType.NON_AD_USER;

    const adWhere: Prisma.DirectoryUserWhereInput = {};
    const nonADWhere: Prisma.NonADUserWhereInput = {};

    if (query.search?.trim()) {
      const s = query.search.trim();
      adWhere.OR = [
        { displayName: { contains: s, mode: 'insensitive' } },
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { employeeCode: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
      nonADWhere.OR = [
        { fullName: { contains: s, mode: 'insensitive' } },
        { badgeNumber: { contains: s, mode: 'insensitive' } },
        { identityNumber: { contains: s, mode: 'insensitive' } },
        { company: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.doorId) {
      adWhere.doorAssignments = {
        some: { doorId: query.doorId, status: AccessAssignmentStatus.ACTIVE },
      };
      nonADWhere.assignments = {
        some: { doorId: query.doorId, status: AccessAssignmentStatus.ACTIVE },
      };
    }

    if (query.departmentId) {
      adWhere.departmentId = query.departmentId;
    }
    if (query.company?.trim()) {
      nonADWhere.company = { contains: query.company.trim(), mode: 'insensitive' };
    }

    // Single subject-type optimized queries
    if (query.subjectType === AccessSubjectType.DIRECTORY_USER) {
      const [total, users] = await Promise.all([
        this.prisma.directoryUser.count({ where: adWhere }),
        this.prisma.directoryUser.findMany({
          where: adWhere,
          skip,
          take: pageSize,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          include: {
            organization: { select: { name: true } },
            department: { select: { name: true } },
            doorAssignments: {
              select: { status: true },
            },
          },
        }),
      ]);

      const items: UnifiedUserRowDto[] = users.map((u) => {
        const activeCount = u.doorAssignments.filter((a) => a.status === 'ACTIVE').length;
        const totalCount = u.doorAssignments.length;
        const fullName =
          u.displayName || `${u.firstName} ${u.lastName}`.trim() || 'Unknown Employee';
        return {
          id: u.id,
          subjectType: AccessSubjectType.DIRECTORY_USER,
          fullName,
          codeOrBadge: u.employeeCode || 'N/A',
          organizationOrCompany: u.organization?.name || 'Corporate',
          departmentOrTitle: u.department?.name || null,
          email: u.email,
          phone: u.phone,
          status: u.status,
          activeDoorsCount: activeCount,
          totalDoorsCount: totalCount,
        };
      });

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }

    if (query.subjectType === AccessSubjectType.NON_AD_USER) {
      const [total, users] = await Promise.all([
        this.prisma.nonADUser.count({ where: nonADWhere }),
        this.prisma.nonADUser.findMany({
          where: nonADWhere,
          skip,
          take: pageSize,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          include: {
            assignments: {
              select: { status: true },
            },
          },
        }),
      ]);

      const items: UnifiedUserRowDto[] = users.map((u) => {
        const activeCount = u.assignments.filter((a) => a.status === 'ACTIVE').length;
        const totalCount = u.assignments.length;
        return {
          id: u.id,
          subjectType: AccessSubjectType.NON_AD_USER,
          fullName: u.fullName,
          codeOrBadge: u.badgeNumber,
          organizationOrCompany: u.company,
          departmentOrTitle: u.userType || null,
          email: u.email,
          phone: u.phone,
          status: u.status,
          activeDoorsCount: activeCount,
          totalDoorsCount: totalCount,
        };
      });

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }

    // Both subject types: fetch bounded sets, combine, and paginate
    const [adTotal, nonADTotal, adUsers, nonADUsers] = await Promise.all([
      shouldQueryAD ? this.prisma.directoryUser.count({ where: adWhere }) : 0,
      shouldQueryNonAD ? this.prisma.nonADUser.count({ where: nonADWhere }) : 0,
      shouldQueryAD
        ? this.prisma.directoryUser.findMany({
            where: adWhere,
            take: 100,
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            include: {
              organization: { select: { name: true } },
              department: { select: { name: true } },
              doorAssignments: { select: { status: true } },
            },
          })
        : [],
      shouldQueryNonAD
        ? this.prisma.nonADUser.findMany({
            where: nonADWhere,
            take: 100,
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            include: {
              assignments: { select: { status: true } },
            },
          })
        : [],
    ]);

    const unifiedRows: UnifiedUserRowDto[] = [
      ...adUsers.map((u) => ({
        id: u.id,
        subjectType: AccessSubjectType.DIRECTORY_USER,
        fullName: u.displayName || `${u.firstName} ${u.lastName}`.trim() || 'Unknown Employee',
        codeOrBadge: u.employeeCode || 'N/A',
        organizationOrCompany: u.organization?.name || 'Corporate',
        departmentOrTitle: u.department?.name || null,
        email: u.email,
        phone: u.phone,
        status: u.status,
        activeDoorsCount: u.doorAssignments.filter((a) => a.status === 'ACTIVE').length,
        totalDoorsCount: u.doorAssignments.length,
      })),
      ...nonADUsers.map((u) => ({
        id: u.id,
        subjectType: AccessSubjectType.NON_AD_USER,
        fullName: u.fullName,
        codeOrBadge: u.badgeNumber,
        organizationOrCompany: u.company,
        departmentOrTitle: u.userType || null,
        email: u.email,
        phone: u.phone,
        status: u.status,
        activeDoorsCount: u.assignments.filter((a) => a.status === 'ACTIVE').length,
        totalDoorsCount: u.assignments.length,
      })),
    ];

    const total = adTotal + nonADTotal;
    const items = unifiedRows.slice(skip, skip + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getUserAccessDetail(
    subjectTypeRaw: string,
    subjectId: string,
  ): Promise<UserAccessDetailDto> {
    const isAD =
      subjectTypeRaw.toUpperCase() === 'AD' ||
      subjectTypeRaw.toUpperCase() === AccessSubjectType.DIRECTORY_USER;

    const subjectType = isAD ? AccessSubjectType.DIRECTORY_USER : AccessSubjectType.NON_AD_USER;

    let fullName = '';
    let codeOrBadge = '';
    let organizationOrCompany = '';
    let departmentOrTitle: string | null = null;
    let email: string | null = null;
    let phone: string | null = null;
    let status = '';

    if (isAD) {
      const adUser = await this.prisma.directoryUser.findUnique({
        where: { id: subjectId },
        include: {
          organization: { select: { name: true } },
          department: { select: { name: true } },
        },
      });
      if (!adUser) {
        throw new NotFoundException(`Directory employee with ID "${subjectId}" was not found.`);
      }
      fullName =
        adUser.displayName || `${adUser.firstName} ${adUser.lastName}`.trim() || 'Unknown Employee';
      codeOrBadge = adUser.employeeCode || 'N/A';
      organizationOrCompany = adUser.organization?.name || 'Corporate';
      departmentOrTitle = adUser.department?.name || null;
      email = adUser.email;
      phone = adUser.phone;
      status = adUser.status;
    } else {
      const nonADUser = await this.prisma.nonADUser.findUnique({
        where: { id: subjectId },
      });
      if (!nonADUser) {
        throw new NotFoundException(`External user with ID "${subjectId}" was not found.`);
      }
      fullName = nonADUser.fullName;
      codeOrBadge = nonADUser.badgeNumber;
      organizationOrCompany = nonADUser.company;
      departmentOrTitle = nonADUser.userType || null;
      email = nonADUser.email;
      phone = nonADUser.phone;
      status = nonADUser.status;
    }

    const assignments = await this.prisma.doorAccessAssignment.findMany({
      where: isAD ? { directoryUserId: subjectId } : { nonADUserId: subjectId },
      take: 100,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      include: {
        door: true,
        grantDocument: true,
        revocationDocument: true,
      },
    });

    const activeAssignments: DoorAccessAssignmentDto[] = [];
    const revokedAssignments: DoorAccessAssignmentDto[] = [];
    const expiredAssignments: DoorAccessAssignmentDto[] = [];

    for (const a of assignments) {
      const dto = this.mapAssignmentToDto(a);
      if (a.status === AccessAssignmentStatus.ACTIVE) {
        activeAssignments.push(dto);
      } else if (a.status === AccessAssignmentStatus.REVOKED) {
        revokedAssignments.push(dto);
      } else {
        expiredAssignments.push(dto);
      }
    }

    return {
      subjectType,
      subjectId,
      fullName,
      codeOrBadge,
      organizationOrCompany,
      departmentOrTitle,
      email,
      phone,
      status,
      activeAssignments,
      revokedAssignments,
      expiredAssignments,
    };
  }

  // ==========================================
  // 5. ACCESS OPERATIONS (GRANT & REVOKE)
  // MANDATORY SCAN ATTACHMENT ENFORCED!
  // ==========================================

  async grantAccess(
    dto: GrantAccessDto,
    uploadedFile?: UploadedFilePayload,
    currentUserId?: string,
  ): Promise<GrantAccessResultDto> {
    // MANDATORY SCAN CHECK: Either a newly uploaded file or a pre-existing valid documentId must be present
    if (!uploadedFile && !dto.documentId) {
      throw new BadRequestException(
        'A signed approval scan document (PDF or image) is mandatory for granting physical door access.',
      );
    }

    // Time-bound access validations
    if (dto.accessType === AccessValidityType.TIME_BOUND) {
      if (!dto.validTo) {
        throw new BadRequestException(
          'A future expiration date (validTo) is required for time-bound access.',
        );
      }
      const validToTime = new Date(dto.validTo).getTime();
      if (isNaN(validToTime) || validToTime <= Date.now()) {
        throw new BadRequestException(
          'A future expiration date (validTo) is required for time-bound access.',
        );
      }
    }

    if (dto.validFrom && dto.validTo) {
      if (new Date(dto.validFrom) > new Date(dto.validTo)) {
        throw new BadRequestException('validFrom must precede validTo.');
      }
    }

    // Validate doors existence & status
    const doors = await this.prisma.accessDoor.findMany({
      where: { id: { in: dto.doorIds } },
    });
    if (doors.length !== dto.doorIds.length) {
      throw new NotFoundException('One or more specified target doors could not be found.');
    }
    for (const door of doors) {
      if (door.status === DoorStatus.INACTIVE) {
        throw new BadRequestException(
          `Cannot grant access to door '${door.doorCode}' because its status is INACTIVE.`,
        );
      }
    }

    // Validate subjects existence & status
    if (dto.subjectType === AccessSubjectType.DIRECTORY_USER) {
      const adUsers = await this.prisma.directoryUser.findMany({
        where: { id: { in: dto.subjectIds } },
      });
      if (adUsers.length !== dto.subjectIds.length) {
        throw new NotFoundException('One or more directory employees could not be found.');
      }
    } else {
      const nonADUsers = await this.prisma.nonADUser.findMany({
        where: { id: { in: dto.subjectIds } },
      });
      if (nonADUsers.length !== dto.subjectIds.length) {
        throw new NotFoundException('One or more external personnel records could not be found.');
      }
      for (const user of nonADUsers) {
        if (
          user.status === NonADUserStatus.BLACKLISTED ||
          user.status === NonADUserStatus.INACTIVE
        ) {
          throw new BadRequestException(
            `Cannot grant door access to external user '${user.fullName}' because account is ${user.status}.`,
          );
        }
      }
    }

    let newlyUploadedScanFile: string | null = null;
    let scanRecord: DoorAccessDocumentScanDto | null = null;

    try {
      // 1. Resolve or create approval scan document
      if (uploadedFile) {
        const stored = await this.storageService.saveScanFile(uploadedFile, 'GRANT');
        newlyUploadedScanFile = stored.fileName;

        const createdDoc = await this.prisma.doorAccessDocumentScan.create({
          data: {
            documentType: DoorDocumentType.GRANT,
            fileName: stored.fileName,
            originalName: stored.originalName,
            filePath: stored.filePath,
            fileUrl: stored.fileUrl,
            mimeType: stored.mimeType,
            fileSize: stored.fileSize,
            fileHash: stored.fileHash,
            approverName: dto.approverName.trim(),
            approverTitle: dto.approverTitle?.trim() || null,
            referenceNumber: dto.referenceNumber?.trim() || null,
            reason: dto.reason.trim(),
            notes: dto.notes?.trim() || null,
            uploadedById: currentUserId || null,
          },
        });
        scanRecord = this.mapDocumentToDto(createdDoc);
      } else if (dto.documentId) {
        const existingDoc = await this.prisma.doorAccessDocumentScan.findUnique({
          where: { id: dto.documentId },
        });
        if (!existingDoc) {
          throw new NotFoundException(
            `Specified approval document scan "${dto.documentId}" was not found.`,
          );
        }
        if (existingDoc.documentType !== DoorDocumentType.GRANT) {
          throw new BadRequestException(
            'The referenced document is not marked as an access GRANT approval scan.',
          );
        }
        scanRecord = this.mapDocumentToDto(existingDoc);
      }

      if (!scanRecord) {
        throw new BadRequestException(
          'A signed approval scan document (PDF or image) is mandatory for granting physical door access.',
        );
      }

      const validFromDate = dto.validFrom ? new Date(dto.validFrom) : new Date();
      const validToDate = dto.validTo ? new Date(dto.validTo) : null;
      const isAD = dto.subjectType === AccessSubjectType.DIRECTORY_USER;

      // 2. Perform atomic transaction across doors and users
      const assignmentResults = await this.prisma.$transaction(async (tx) => {
        const createdOrUpdated: Array<Record<string, unknown>> = [];

        for (const subjectId of dto.subjectIds) {
          for (const doorId of dto.doorIds) {
            const existingAssignment = await tx.doorAccessAssignment.findFirst({
              where: {
                doorId,
                subjectType: dto.subjectType,
                ...(isAD ? { directoryUserId: subjectId } : { nonADUserId: subjectId }),
              },
            });

            if (existingAssignment) {
              const updated = await tx.doorAccessAssignment.update({
                where: { id: existingAssignment.id },
                data: {
                  status: AccessAssignmentStatus.ACTIVE,
                  accessType: dto.accessType || AccessValidityType.PERMANENT,
                  validFrom: validFromDate,
                  validTo: validToDate,
                  grantReason: dto.reason.trim(),
                  grantedAt: new Date(),
                  grantedById: currentUserId || null,
                  grantDocumentId: scanRecord!.id,
                  notes: dto.notes?.trim() || existingAssignment.notes,
                },
                include: {
                  door: true,
                  directoryUser: {
                    select: {
                      id: true,
                      employeeCode: true,
                      displayName: true,
                      email: true,
                      department: { select: { id: true, name: true } },
                    },
                  },
                  nonADUser: true,
                  grantDocument: true,
                },
              });
              createdOrUpdated.push(updated);
            } else {
              const created = await tx.doorAccessAssignment.create({
                data: {
                  doorId,
                  subjectType: dto.subjectType,
                  directoryUserId: isAD ? subjectId : null,
                  nonADUserId: !isAD ? subjectId : null,
                  accessType: dto.accessType || AccessValidityType.PERMANENT,
                  validFrom: validFromDate,
                  validTo: validToDate,
                  status: AccessAssignmentStatus.ACTIVE,
                  grantReason: dto.reason.trim(),
                  grantedAt: new Date(),
                  grantedById: currentUserId || null,
                  grantDocumentId: scanRecord!.id,
                  notes: dto.notes?.trim() || null,
                },
                include: {
                  door: true,
                  directoryUser: {
                    select: {
                      id: true,
                      employeeCode: true,
                      displayName: true,
                      email: true,
                      department: { select: { id: true, name: true } },
                    },
                  },
                  nonADUser: true,
                  grantDocument: true,
                },
              });
              createdOrUpdated.push(created);
            }
          }
        }
        return createdOrUpdated;
      });

      this.logger.log(
        `Granted access to ${dto.doorIds.length} doors for ${dto.subjectIds.length} subjects (Batch Total: ${assignmentResults.length} records)`,
      );

      return {
        createdAssignmentsCount: assignmentResults.length,
        assignments: assignmentResults.map((a) => this.mapAssignmentToDto(a)),
        documentScan: scanRecord,
      };
    } catch (err: unknown) {
      if (newlyUploadedScanFile) {
        await this.storageService.deleteScanFile(newlyUploadedScanFile);
      }
      this.logger.error(
        'Failed to grant door access assignment',
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async revokeAccess(
    dto: RevokeAccessDto,
    uploadedFile?: UploadedFilePayload,
    currentUserId?: string,
  ): Promise<RevokeAccessResultDto> {
    // MANDATORY SCAN CHECK: Either an uploaded file or valid documentId is strictly required
    if (!uploadedFile && !dto.documentId) {
      throw new BadRequestException(
        'A signed revocation approval scan document (PDF or image) is mandatory for revoking physical door access.',
      );
    }

    // Validate assignment IDs exist
    const assignments = await this.prisma.doorAccessAssignment.findMany({
      where: { id: { in: dto.assignmentIds } },
    });
    if (assignments.length === 0) {
      throw new NotFoundException('No door access assignments found matching provided IDs.');
    }

    let newlyUploadedScanFile: string | null = null;
    let scanRecord: DoorAccessDocumentScanDto | null = null;

    try {
      if (uploadedFile) {
        const stored = await this.storageService.saveScanFile(uploadedFile, 'REVOCATION');
        newlyUploadedScanFile = stored.fileName;

        const createdDoc = await this.prisma.doorAccessDocumentScan.create({
          data: {
            documentType: DoorDocumentType.REVOCATION,
            fileName: stored.fileName,
            originalName: stored.originalName,
            filePath: stored.filePath,
            fileUrl: stored.fileUrl,
            mimeType: stored.mimeType,
            fileSize: stored.fileSize,
            fileHash: stored.fileHash,
            approverName: dto.approverName.trim(),
            approverTitle: dto.approverTitle?.trim() || null,
            referenceNumber: dto.referenceNumber?.trim() || null,
            reason: dto.reason.trim(),
            notes: dto.notes?.trim() || null,
            uploadedById: currentUserId || null,
          },
        });
        scanRecord = this.mapDocumentToDto(createdDoc);
      } else if (dto.documentId) {
        const existingDoc = await this.prisma.doorAccessDocumentScan.findUnique({
          where: { id: dto.documentId },
        });
        if (!existingDoc) {
          throw new NotFoundException(
            `Specified revocation document scan "${dto.documentId}" was not found.`,
          );
        }
        if (existingDoc.documentType !== DoorDocumentType.REVOCATION) {
          throw new BadRequestException(
            'The referenced document is not marked as an access REVOCATION approval scan.',
          );
        }
        scanRecord = this.mapDocumentToDto(existingDoc);
      }

      if (!scanRecord) {
        throw new BadRequestException(
          'A signed revocation approval scan document (PDF or image) is mandatory for revoking physical door access.',
        );
      }

      const revokedDate = new Date();

      // Atomic batch revocation in transaction
      const updatedAssignments = await this.prisma.$transaction(async (tx) => {
        const results: Array<Record<string, unknown>> = [];

        for (const assignment of assignments) {
          if (assignment.status === AccessAssignmentStatus.REVOKED) {
            // Idempotent: already revoked, skip mutating timestamps
            results.push(assignment);
            continue;
          }

          const updated = await tx.doorAccessAssignment.update({
            where: { id: assignment.id },
            data: {
              status: AccessAssignmentStatus.REVOKED,
              revokedAt: revokedDate,
              revokedById: currentUserId || null,
              revocationReason: dto.reason.trim(),
              revocationDocumentId: scanRecord!.id,
              notes: dto.notes?.trim()
                ? `${assignment.notes ? `${assignment.notes}\n` : ''}Revocation Note: ${dto.notes.trim()}`
                : assignment.notes,
            },
            include: {
              door: true,
              directoryUser: {
                select: {
                  id: true,
                  employeeCode: true,
                  displayName: true,
                  email: true,
                  department: { select: { id: true, name: true } },
                },
              },
              nonADUser: true,
              grantDocument: true,
              revocationDocument: true,
            },
          });
          results.push(updated);
        }

        return results;
      });

      this.logger.log(`Revoked access for ${updatedAssignments.length} assignment records.`);

      return {
        revokedAssignmentsCount: updatedAssignments.length,
        assignments: updatedAssignments.map((a) => this.mapAssignmentToDto(a)),
        documentScan: scanRecord,
      };
    } catch (err: unknown) {
      if (newlyUploadedScanFile) {
        await this.storageService.deleteScanFile(newlyUploadedScanFile);
      }
      this.logger.error(
        'Failed to revoke door access assignment',
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  // ==========================================
  // 6. DOCUMENT SCAN AUDIT MANAGEMENT
  // ==========================================

  async uploadDocument(
    dto: UploadDocumentDto,
    file: UploadedFilePayload,
    currentUserId?: string,
  ): Promise<DoorAccessDocumentScanDto> {
    const stored = await this.storageService.saveScanFile(file, dto.documentType);

    const doc = await this.prisma.doorAccessDocumentScan.create({
      data: {
        documentType: dto.documentType,
        fileName: stored.fileName,
        originalName: stored.originalName,
        filePath: stored.filePath,
        fileUrl: stored.fileUrl,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
        fileHash: stored.fileHash,
        approverName: dto.approverName.trim(),
        approverTitle: dto.approverTitle?.trim() || null,
        referenceNumber: dto.referenceNumber?.trim() || null,
        reason: dto.reason.trim(),
        notes: dto.notes?.trim() || null,
        uploadedById: currentUserId || null,
      },
    });

    this.logger.log(`Uploaded document scan: ${doc.fileName} (${doc.documentType})`);
    return this.mapDocumentToDto(doc);
  }

  async getDocuments(query: DocumentScanQueryDto): Promise<{
    items: DoorAccessDocumentScanDto[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.DoorAccessDocumentScanWhereInput = {};

    if (query.documentType) {
      where.documentType = query.documentType;
    }
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { fileName: { contains: s, mode: 'insensitive' } },
        { originalName: { contains: s, mode: 'insensitive' } },
        { approverName: { contains: s, mode: 'insensitive' } },
        { approverTitle: { contains: s, mode: 'insensitive' } },
        { referenceNumber: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sort?.trim() || 'createdAt';
    const sortOrder: Prisma.SortOrder = query.order === 'asc' ? 'asc' : 'desc';

    const [total, docs] = await Promise.all([
      this.prisma.doorAccessDocumentScan.count({ where }),
      this.prisma.doorAccessDocumentScan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ [sortField]: sortOrder }, { id: 'asc' }],
        include: {
          uploadedBy: {
            select: { id: true, username: true, displayName: true },
          },
        },
      }),
    ]);

    return {
      items: docs.map((d) => this.mapDocumentToDto(d)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getDocumentById(id: string): Promise<DocumentScanDetailDto> {
    const doc = await this.prisma.doorAccessDocumentScan.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, username: true, displayName: true },
        },
        grantAssignments: {
          take: 50,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          include: {
            door: true,
            directoryUser: {
              select: {
                id: true,
                employeeCode: true,
                displayName: true,
                email: true,
                department: { select: { id: true, name: true } },
              },
            },
            nonADUser: true,
          },
        },
        revocationAssignments: {
          take: 50,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          include: {
            door: true,
            directoryUser: {
              select: {
                id: true,
                employeeCode: true,
                displayName: true,
                email: true,
                department: { select: { id: true, name: true } },
              },
            },
            nonADUser: true,
          },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document scan record "${id}" was not found.`);
    }

    return {
      ...this.mapDocumentToDto(doc),
      grantAssignments: doc.grantAssignments.map((a) => this.mapAssignmentToDto(a)),
      revocationAssignments: doc.revocationAssignments.map((a) => this.mapAssignmentToDto(a)),
    };
  }

  // ==========================================
  // 7. TEMPLATE GENERATION (.DOCX & HTML)
  // ==========================================

  async generateDocxTemplate(query: TemplateQueryDto): Promise<Buffer> {
    const params = await this.buildTemplateParameters(query);
    return buildAccessRequestDocx(params);
  }

  async generateHtmlTemplate(query: TemplateQueryDto): Promise<string> {
    const params = await this.buildTemplateParameters(query);
    return buildAccessRequestHtml(params);
  }

  private async buildTemplateParameters(
    query: TemplateQueryDto,
  ): Promise<AccessRequestTemplateParams> {
    let subject: TemplateSubjectData | null = null;

    if (query.subjectId) {
      const isAD = !query.subjectType || query.subjectType === AccessSubjectType.DIRECTORY_USER;

      if (isAD) {
        const adUser = await this.prisma.directoryUser.findUnique({
          where: { id: query.subjectId },
          include: {
            organization: { select: { name: true } },
            department: { select: { name: true } },
          },
        });
        if (adUser) {
          subject = {
            id: adUser.id,
            fullName:
              adUser.displayName || `${adUser.firstName} ${adUser.lastName}`.trim() || 'Employee',
            codeOrBadge: adUser.employeeCode || 'N/A',
            subjectType: 'DIRECTORY_USER',
            companyOrOrg: adUser.organization?.name || 'Youngone Corporation',
            departmentOrTitle: adUser.department?.name,
            email: adUser.email,
            phone: adUser.phone || undefined,
          };
        }
      }

      if (!subject) {
        const nonADUser = await this.prisma.nonADUser.findUnique({
          where: { id: query.subjectId },
        });
        if (nonADUser) {
          subject = {
            id: nonADUser.id,
            fullName: nonADUser.fullName,
            codeOrBadge: nonADUser.badgeNumber,
            subjectType: 'NON_AD_USER',
            companyOrOrg: nonADUser.company,
            departmentOrTitle: nonADUser.userType || 'Contractor',
            email: nonADUser.email || undefined,
            phone: nonADUser.phone || undefined,
          };
        }
      }
    }

    let doors: TemplateDoorItem[] = [];
    if (query.doorIds && query.doorIds.length > 0) {
      const foundDoors = await this.prisma.accessDoor.findMany({
        where: { id: { in: query.doorIds } },
        take: 50,
        orderBy: [{ doorCode: 'asc' }, { id: 'asc' }],
      });
      doors = foundDoors.map((d) => ({
        id: d.id,
        doorCode: d.doorCode,
        name: d.name,
        building: d.building,
        floor: d.floor,
        zone: d.zone || undefined,
        securityLevel: d.securityLevel,
        accessType: query.accessType || 'PERMANENT',
        validFrom: query.validFrom,
        validTo: query.validTo,
      }));
    }

    const today = new Date().toISOString().split('T')[0];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const refId = `UIMS-DAR-${today.replace(/-/g, '')}-${randomSuffix}`;

    return {
      refId,
      currentDate: today,
      subject,
      doors,
      reason: query.reason,
      accessType: query.accessType || 'PERMANENT',
      validFrom: query.validFrom,
      validTo: query.validTo,
    };
  }

  // ==========================================
  // HELPER MAPPERS
  // ==========================================

  private mapDoorToDto(door: Record<string, unknown>): AccessDoorDto {
    return {
      id: String(door.id),
      doorCode: String(door.doorCode),
      name: String(door.name),
      description: door.description ? String(door.description) : null,
      building: String(door.building),
      floor: String(door.floor),
      zone: door.zone ? String(door.zone) : null,
      location: door.location ? String(door.location) : null,
      organizationId: door.organizationId ? String(door.organizationId) : null,
      securityLevel: door.securityLevel as AccessDoorDto['securityLevel'],
      status: door.status as AccessDoorDto['status'],
      controllerModel: door.controllerModel ? String(door.controllerModel) : null,
      controllerIp: door.controllerIp ? String(door.controllerIp) : null,
      readerType: door.readerType ? String(door.readerType) : null,
      readerId: door.readerId ? String(door.readerId) : null,
      installedAt: door.installedAt instanceof Date ? door.installedAt.toISOString() : null,
      metadata: (door.metadata as Record<string, unknown>) || null,
      notes: door.notes ? String(door.notes) : null,
      createdAt:
        door.createdAt instanceof Date ? door.createdAt.toISOString() : String(door.createdAt),
      updatedAt:
        door.updatedAt instanceof Date ? door.updatedAt.toISOString() : String(door.updatedAt),
    };
  }

  private mapNonADUserToDto(user: Record<string, unknown>): NonADUserDto {
    return {
      id: String(user.id),
      fullName: String(user.fullName),
      badgeNumber: String(user.badgeNumber),
      identityNumber: String(user.identityNumber),
      company: String(user.company),
      phone: user.phone ? String(user.phone) : null,
      email: user.email ? String(user.email) : null,
      userType: user.userType ? String(user.userType) : null,
      status: user.status as NonADUserStatus,
      validFrom: user.validFrom instanceof Date ? user.validFrom.toISOString() : null,
      validTo: user.validTo instanceof Date ? user.validTo.toISOString() : null,
      notes: user.notes ? String(user.notes) : null,
      metadata: (user.metadata as Record<string, unknown>) || null,
      createdAt:
        user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
      updatedAt:
        user.updatedAt instanceof Date ? user.updatedAt.toISOString() : String(user.updatedAt),
    };
  }

  private mapDocumentToDto(doc: Record<string, unknown>): DoorAccessDocumentScanDto {
    const uploadedBy = doc.uploadedBy as Record<string, unknown> | null | undefined;
    return {
      id: String(doc.id),
      documentType: doc.documentType as DoorDocumentType,
      fileName: String(doc.fileName),
      originalName: String(doc.originalName),
      filePath: String(doc.filePath),
      fileUrl: String(doc.fileUrl),
      mimeType: String(doc.mimeType),
      fileSize: Number(doc.fileSize),
      fileHash: doc.fileHash ? String(doc.fileHash) : null,
      approverName: String(doc.approverName),
      approverTitle: doc.approverTitle ? String(doc.approverTitle) : null,
      referenceNumber: doc.referenceNumber ? String(doc.referenceNumber) : null,
      reason: String(doc.reason),
      notes: doc.notes ? String(doc.notes) : null,
      uploadedById: doc.uploadedById ? String(doc.uploadedById) : null,
      uploadedBy: uploadedBy
        ? {
            id: String(uploadedBy.id),
            username: String(uploadedBy.username),
            displayName: uploadedBy.displayName ? String(uploadedBy.displayName) : null,
          }
        : null,
      createdAt:
        doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
      updatedAt:
        doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    };
  }

  private mapAssignmentToDto(a: Record<string, unknown>): DoorAccessAssignmentDto {
    const door = a.door as Record<string, unknown> | null | undefined;
    const directoryUser = a.directoryUser as Record<string, unknown> | null | undefined;
    const nonADUser = a.nonADUser as Record<string, unknown> | null | undefined;
    const grantDoc = a.grantDocument as Record<string, unknown> | null | undefined;
    const revokeDoc = a.revocationDocument as Record<string, unknown> | null | undefined;

    return {
      id: String(a.id),
      doorId: String(a.doorId),
      subjectType: a.subjectType as AccessSubjectType,
      directoryUserId: a.directoryUserId ? String(a.directoryUserId) : null,
      nonADUserId: a.nonADUserId ? String(a.nonADUserId) : null,
      accessType: a.accessType as AccessValidityType,
      validFrom: a.validFrom instanceof Date ? a.validFrom.toISOString() : String(a.validFrom),
      validTo: a.validTo instanceof Date ? a.validTo.toISOString() : null,
      status: a.status as AccessAssignmentStatus,
      grantReason: a.grantReason ? String(a.grantReason) : null,
      grantedAt: a.grantedAt instanceof Date ? a.grantedAt.toISOString() : String(a.grantedAt),
      grantedById: a.grantedById ? String(a.grantedById) : null,
      grantDocumentId: a.grantDocumentId ? String(a.grantDocumentId) : null,
      revokedAt: a.revokedAt instanceof Date ? a.revokedAt.toISOString() : null,
      revokedById: a.revokedById ? String(a.revokedById) : null,
      revocationReason: a.revocationReason ? String(a.revocationReason) : null,
      revocationDocumentId: a.revocationDocumentId ? String(a.revocationDocumentId) : null,
      notes: a.notes ? String(a.notes) : null,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
      updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : String(a.updatedAt),
      door: door ? this.mapDoorToDto(door) : undefined,
      directoryUser: directoryUser
        ? {
            id: String(directoryUser.id),
            employeeCode: directoryUser.employeeCode ? String(directoryUser.employeeCode) : null,
            displayName: directoryUser.displayName ? String(directoryUser.displayName) : null,
            email: String(directoryUser.email),
            department: directoryUser.department
              ? {
                  id: String((directoryUser.department as Record<string, unknown>).id),
                  name: String((directoryUser.department as Record<string, unknown>).name),
                }
              : null,
          }
        : null,
      nonADUser: nonADUser ? this.mapNonADUserToDto(nonADUser) : null,
      grantDocument: grantDoc ? this.mapDocumentToDto(grantDoc) : null,
      revocationDocument: revokeDoc ? this.mapDocumentToDto(revokeDoc) : null,
    };
  }
}
