import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { OrgNode } from '@uims/shared-types';
import { PrismaService } from '../../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdatePositionDto } from './dto/update-position.dto';

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  // 1. Stats
  async getStats() {
    const [totalOrganizations, totalDepartments, totalPositions, totalBranches, totalEmployees] =
      await Promise.all([
        this.prisma.organization.count(),
        this.prisma.department.count(),
        this.prisma.position.count(),
        this.prisma.location.count(),
        this.prisma.user.count(),
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

  // 5. Locations / Branches
  async findAllLocations() {
    return this.prisma.location.findMany({
      include: {
        organization: { select: { id: true, name: true, code: true } },
        _count: { select: { assets: true, users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // 6. Interactive Org Tree Hierarchy
  async getHierarchyTree(): Promise<OrgNode[]> {
    const orgs = await this.prisma.organization.findMany({
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
        description: org.address || org.website || 'Enterprise Entity',
        children: [
          ...(locationNodes.length > 0
            ? [
                {
                  key: `branch-group-${org.id}`,
                  title: `Regional Facilities & Offices (${locationNodes.length})`,
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
