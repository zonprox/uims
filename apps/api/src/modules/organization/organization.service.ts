import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateLocationDto,
  LocationQueryDto,
  LocationTreeNode,
  OrgNode,
  UpdateLocationDto,
} from '@uims/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { resolveDescendantLocationIds } from './location-tree.util';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private prisma: PrismaService) {}

  // 1. Stats
  async getStats() {
    const [totalOrganizations, totalDepartments, totalPositions, totalBranches, totalEmployees] =
      await Promise.all([
        this.prisma.organization.count(),
        this.prisma.department.count(),
        this.prisma.position.count(),
        this.prisma.location.count(),
        this.prisma.directoryUser.count(),
      ]);

    return {
      totalOrganizations,
      totalDepartments,
      totalPositions,
      totalBranches,
      totalEmployees,
    };
  }

  // 2. Organizations
  async findAllOrganizations() {
    const orgs = await this.prisma.organization.findMany({
      take: 100,
      include: {
        _count: {
          select: {
            departments: true,
            locations: true,
            users: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return orgs.map((o) => ({
      ...o,
      departmentsCount: o._count.departments,
      locationsCount: o._count.locations,
      usersCount: o._count.users,
    }));
  }

  async findOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        departments: {
          include: {
            positions: true,
            _count: { select: { users: true } },
          },
        },
        locations: true,
        users: {
          take: 20,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roleName: true,
            department: true,
          },
        },
        _count: {
          select: {
            departments: true,
            locations: true,
            users: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return {
      ...org,
      departmentsCount: org._count.departments,
      locationsCount: org._count.locations,
      usersCount: org._count.users,
    };
  }

  async createOrganization(dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Organization with code "${dto.code}" already exists`);
    }

    return this.prisma.organization.create({
      data: dto,
    });
  }

  async updateOrganization(id: string, dto: UpdateOrganizationDto) {
    await this.findOrganization(id);
    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async deleteOrganization(id: string) {
    await this.findOrganization(id);
    return this.prisma.organization.delete({
      where: { id },
    });
  }

  // 3. Departments
  async findAllDepartments() {
    const depts = await this.prisma.department.findMany({
      take: 100,
      include: {
        organization: { select: { id: true, name: true, code: true } },
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true } },
        positions: true,
        _count: { select: { users: true, positions: true } },
      },
      orderBy: { name: 'asc' },
    });

    return depts.map((d) => ({
      ...d,
      memberCount: d._count.users,
      positionsCount: d._count.positions,
    }));
  }

  async findDepartment(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        organization: true,
        parent: true,
        children: true,
        positions: true,
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roleName: true,
            status: true,
          },
        },
        _count: { select: { users: true, positions: true } },
      },
    });

    if (!dept) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    return {
      ...dept,
      memberCount: dept._count.users,
      positionsCount: dept._count.positions,
    };
  }

  async createDepartment(dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Department with code "${dto.code}" already exists`);
    }

    return this.prisma.department.create({
      data: dto,
      include: {
        organization: true,
        parent: true,
      },
    });
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    await this.findDepartment(id);
    return this.prisma.department.update({
      where: { id },
      data: dto,
      include: {
        organization: true,
        parent: true,
      },
    });
  }

  async deleteDepartment(id: string) {
    await this.findDepartment(id);
    return this.prisma.department.delete({
      where: { id },
    });
  }

  // 4. Positions
  async findAllPositions() {
    const positions = await this.prisma.position.findMany({
      take: 100,
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { users: true } },
      },
      orderBy: { title: 'asc' },
    });

    return positions.map((p) => ({
      ...p,
      headcount: p._count.users,
    }));
  }

  async findPosition(id: string) {
    const position = await this.prisma.position.findUnique({
      where: { id },
      include: {
        department: true,
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            roleName: true,
          },
        },
        _count: { select: { users: true } },
      },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${id} not found`);
    }

    return {
      ...position,
      headcount: position._count.users,
    };
  }

  async createPosition(dto: CreatePositionDto) {
    const existing = await this.prisma.position.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Position with code "${dto.code}" already exists`);
    }

    return this.prisma.position.create({
      data: dto,
      include: { department: true },
    });
  }

  async updatePosition(id: string, dto: UpdatePositionDto) {
    await this.findPosition(id);
    return this.prisma.position.update({
      where: { id },
      data: dto,
      include: { department: true },
    });
  }

  async deletePosition(id: string) {
    await this.findPosition(id);
    return this.prisma.position.delete({
      where: { id },
    });
  }

  // 5. Locations / Branches & Spatial Hierarchy
  async getLocationTree(organizationId?: string): Promise<LocationTreeNode[]> {
    const locations = await this.prisma.location.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: {
        organization: { select: { id: true, name: true, code: true } },
        _count: { select: { assets: true, inventoryItems: true, users: true, children: true } },
      },
      orderBy: [{ name: 'asc' }],
    });

    const nodeMap = new Map<string, LocationTreeNode>();
    for (const loc of locations) {
      nodeMap.set(loc.id, {
        id: loc.id,
        key: loc.id,
        value: loc.id,
        title: loc.name,
        label: loc.name,
        name: loc.name,
        code: loc.code,
        type: loc.type,
        parentId: loc.parentId,
        organizationId: loc.organizationId,
        organization: loc.organization,
        fullPath: loc.fullPath || loc.name,
        description: loc.description,
        _count: {
          assets: loc._count?.assets ?? 0,
          inventoryItems: loc._count?.inventoryItems ?? 0,
          users: loc._count?.users ?? 0,
          children: loc._count?.children ?? 0,
        },
        children: [],
      });
    }

    // Compute human-readable fullPath for all nodes with cycle protection
    const getPath = (id: string, visited = new Set<string>()): string => {
      if (visited.has(id)) return '';
      visited.add(id);
      const node = nodeMap.get(id);
      if (!node) return '';
      if (!node.parentId || !nodeMap.has(node.parentId)) return node.name;
      const parentPath = getPath(node.parentId, visited);
      return parentPath ? `${parentPath} > ${node.name}` : node.name;
    };

    for (const node of nodeMap.values()) {
      node.fullPath = getPath(node.id);
    }

    // Cycle detection helper: check if target is a descendant of possible ancestor
    const isDescendantOf = (childId: string, potentialAncestorId: string): boolean => {
      let current = nodeMap.get(childId)?.parentId;
      const visited = new Set<string>([childId]);
      while (current) {
        if (current === potentialAncestorId) return true;
        if (visited.has(current)) break;
        visited.add(current);
        current = nodeMap.get(current)?.parentId;
      }
      return false;
    };

    const roots: LocationTreeNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        if (!isDescendantOf(node.parentId, node.id)) {
          nodeMap.get(node.parentId)!.children!.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getDescendantLocationIds(locationId: string): Promise<string[]> {
    return resolveDescendantLocationIds(this.prisma, locationId);
  }

  async computeFullPath(locationId: string): Promise<string> {
    const allLocations = await this.prisma.location.findMany({
      select: { id: true, name: true, parentId: true },
    });
    const locMap = new Map<string, { id: string; name: string; parentId: string | null }>();
    for (const l of allLocations) {
      locMap.set(l.id, l);
    }

    const target = locMap.get(locationId);
    if (!target) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    const parts: string[] = [];
    let curr: { id: string; name: string; parentId: string | null } | undefined = target;
    const visited = new Set<string>();

    while (curr) {
      if (visited.has(curr.id)) break;
      visited.add(curr.id);
      parts.unshift(curr.name);
      curr = curr.parentId ? locMap.get(curr.parentId) : undefined;
    }

    const fullPath = parts.join(' > ');
    await this.prisma.location.update({
      where: { id: locationId },
      data: { fullPath },
    });

    return fullPath;
  }

  async findAllLocations(query?: LocationQueryDto) {
    const where: Prisma.LocationWhereInput = {};
    if (query?.organizationId) {
      where.organizationId = query.organizationId;
    }
    if (query?.type) {
      where.type = query.type;
    }
    if (query?.parentId !== undefined) {
      where.parentId = query.parentId === 'null' || query.parentId === '' ? null : query.parentId;
    }
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
        { fullPath: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.location.findMany({
      where,
      take: 200,
      include: {
        organization: { select: { id: true, name: true, code: true } },
        parent: { select: { id: true, name: true, code: true, type: true } },
        _count: { select: { assets: true, inventoryItems: true, users: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findLocation(id: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, code: true } },
        parent: true,
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { assets: true, inventoryItems: true, users: true, children: true } },
          },
        },
        _count: { select: { assets: true, inventoryItems: true, users: true, children: true } },
      },
    });
    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }
    return location;
  }

  async createLocation(dto: CreateLocationDto) {
    let fullPath: string | undefined = undefined;
    if (dto.parentId) {
      const parent = await this.prisma.location.findUnique({
        where: { id: dto.parentId },
        select: { id: true, name: true, fullPath: true },
      });
      if (!parent) {
        throw new NotFoundException(`Parent location with ID ${dto.parentId} not found`);
      }
      const parentPath = parent.fullPath || parent.name;
      fullPath = `${parentPath} > ${dto.name}`;
    } else {
      fullPath = dto.name;
    }

    return this.prisma.location.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        type: dto.type,
        parentId: dto.parentId,
        organizationId: dto.organizationId,
        building: dto.building,
        floor: dto.floor,
        room: dto.room,
        address: dto.address,
        status: dto.status || 'ACTIVE',
        fullPath,
      },
      include: {
        organization: { select: { id: true, name: true, code: true } },
        parent: true,
      },
    });
  }

  async updateLocation(id: string, dto: UpdateLocationDto) {
    await this.findLocation(id);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Location cannot be its own parent');
      }
      const descendants = await this.getDescendantLocationIds(id);
      if (descendants.includes(dto.parentId)) {
        throw new BadRequestException(
          'Cannot set parent to a descendant location (cycle detected)',
        );
      }
    }

    const updated = await this.prisma.location.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        type: dto.type,
        parentId: dto.parentId,
        organizationId: dto.organizationId,
        building: dto.building,
        floor: dto.floor,
        room: dto.room,
        address: dto.address,
        status: dto.status,
      },
      include: {
        organization: { select: { id: true, name: true, code: true } },
        parent: true,
      },
    });

    if (dto.name !== undefined || dto.parentId !== undefined) {
      try {
        await this.computeFullPath(id);
        const descendants = await this.getDescendantLocationIds(id);
        for (const descId of descendants) {
          if (descId !== id) {
            await this.computeFullPath(descId);
          }
        }
      } catch (error: unknown) {
        this.logger.warn(
          `Failed to recompute fullPath for location ${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return updated;
  }

  async deleteLocation(id: string) {
    await this.findLocation(id);
    await this.prisma.location.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });
    return this.prisma.location.delete({
      where: { id },
    });
  }

  // 6. Interactive Org Tree Hierarchy
  async getHierarchyTree(): Promise<OrgNode[]> {
    const orgs = await this.prisma.organization.findMany({
      take: 50,
      include: {
        locations: true,
        departments: {
          where: { parentId: null },
          include: {
            children: {
              include: {
                positions: true,
                _count: { select: { users: true } },
              },
            },
            positions: true,
            _count: { select: { users: true } },
          },
        },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    const tree: OrgNode[] = orgs.map((org) => {
      // Locations node
      const locationNodes: OrgNode[] = org.locations.map((loc) => ({
        key: `loc-${loc.id}`,
        title: `${loc.name} (${loc.type || 'Branch'})`,
        code: loc.code || loc.name,
        type: 'branch',
        description: `${loc.building || ''} - ${loc.address || ''}`.trim(),
      }));

      // Department hierarchy
      const deptNodes: OrgNode[] = org.departments.map((dept) => {
        const subDeptNodes: OrgNode[] = dept.children.map((sub) => ({
          key: `dept-${sub.id}`,
          title: sub.name,
          code: sub.code,
          type: 'sub-department',
          manager: sub.managerName,
          count: sub._count.users,
          description: sub.description,
          children: sub.positions.map((p) => ({
            key: `pos-${p.id}`,
            title: `${p.title} (${p.level || 'Mid'})`,
            code: p.code,
            type: 'position',
            description: p.description,
          })),
        }));

        const posNodes: OrgNode[] = dept.positions.map((p) => ({
          key: `pos-${p.id}`,
          title: `${p.title} (${p.level || 'Mid'})`,
          code: p.code,
          type: 'position',
          description: p.description,
        }));

        return {
          key: `dept-${dept.id}`,
          title: dept.name,
          code: dept.code,
          type: 'department',
          manager: dept.managerName,
          count: dept._count.users,
          description: dept.description,
          children: [...subDeptNodes, ...posNodes],
        };
      });

      return {
        key: `org-${org.id}`,
        title: org.name,
        code: org.code,
        type: 'organization',
        count: org._count.users,
        description: org.address || org.website || 'Organization Entity',
        children: [
          ...(locationNodes.length > 0
            ? [
                {
                  key: `branch-group-${org.id}`,
                  title: `Facilities & Offices (${locationNodes.length})`,
                  code: 'BRANCHES',
                  type: 'branch' as const,
                  children: locationNodes,
                },
              ]
            : []),
          ...deptNodes,
        ],
      };
    });

    return tree;
  }
}
