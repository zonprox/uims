import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private prisma: PrismaService) {}

  // 1. Stats
  async getStats() {
    const [totalOrganizations, totalDepartments, totalPositions, totalEmployees] =
      await Promise.all([
        this.prisma.organization.count(),
        this.prisma.department.count(),
        this.prisma.position.count(),
        this.prisma.directoryUser.count(),
      ]);

    return {
      totalOrganizations,
      totalDepartments,
      totalPositions,
      totalBranches: 0,
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
            users: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return orgs.map((o) => ({
      ...o,
      departmentsCount: o._count.departments,
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
        users: {
          take: 20,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
          },
        },
        _count: {
          select: {
            departments: true,
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
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('Organization cannot be its own parent');
    }
    await this.findOrganization(id);

    if (dto.parentId !== undefined && dto.parentId !== null) {
      let currentParentId: string | null = dto.parentId;
      const visited = new Set<string>();

      while (currentParentId) {
        if (currentParentId === id) {
          throw new BadRequestException(
            'Cannot set parent to a descendant organization (cycle detected)',
          );
        }
        if (visited.has(currentParentId)) {
          break;
        }
        visited.add(currentParentId);

        const parentOrg: { parentId: string | null } | null =
          await this.prisma.organization.findUnique({
            where: { id: currentParentId },
            select: { parentId: true },
          });

        currentParentId = parentOrg?.parentId ?? null;
      }
    }

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
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
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
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
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

  // 5. Interactive Org Tree Hierarchy
  async getHierarchyTree(): Promise<OrgNode[]> {
    const orgs = await this.prisma.organization.findMany({
      take: 50,
      include: {
        departments: {
          include: {
            positions: {
              orderBy: [{ title: 'asc' }, { id: 'asc' }],
            },
            _count: { select: { users: true } },
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
        },
        _count: { select: { users: true } },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    interface OrgNodeItem {
      id: string;
      parentId: string | null;
      node: OrgNode;
      childOrgs: OrgNode[];
    }
    const orgMap = new Map<string, OrgNodeItem>();

    for (const org of orgs) {
      // 1. Multi-tier Recursive Department Hierarchy
      // Build a map of all department nodes for this organization
      interface DeptNodeItem {
        node: OrgNode;
        parentId: string | null;
      }
      const deptMap = new Map<string, DeptNodeItem>();

      for (const dept of org.departments) {
        const posNodes: OrgNode[] = (dept.positions || []).map((p) => ({
          key: `pos-${p.id}`,
          title: `${p.title} (${p.level || 'Mid'})`,
          code: p.code,
          type: 'position',
          description: p.description,
        }));

        deptMap.set(dept.id, {
          parentId: dept.parentId,
          node: {
            key: `dept-${dept.id}`,
            title: dept.name,
            code: dept.code,
            type: dept.parentId ? 'sub-department' : 'department',
            manager: dept.managerName,
            count: dept._count?.users ?? 0,
            description: dept.description,
            children: [...posNodes],
          },
        });
      }

      // Assemble recursive department tree
      const rootDeptNodes: OrgNode[] = [];
      for (const [, item] of deptMap.entries()) {
        if (item.parentId && deptMap.has(item.parentId)) {
          const parentItem = deptMap.get(item.parentId)!;
          // Place sub-departments before individual positions
          const existingPosNodes = (parentItem.node.children || []).filter(
            (c) => c.type === 'position',
          );
          const existingSubDeptNodes = (parentItem.node.children || []).filter(
            (c) => c.type !== 'position',
          );
          parentItem.node.children = [...existingSubDeptNodes, item.node, ...existingPosNodes];
        } else {
          rootDeptNodes.push(item.node);
        }
      }

      const orgNode: OrgNode = {
        key: `org-${org.id}`,
        title: org.name,
        code: org.code,
        type: 'organization',
        count: org._count.users,
        description: org.address || org.website || 'Organization Entity',
        children: [...rootDeptNodes],
      };

      orgMap.set(org.id, {
        id: org.id,
        parentId: org.parentId ?? null,
        node: orgNode,
        childOrgs: [],
      });
    }

    // 3. Multi-tier Recursive Organization Hierarchy
    const rootOrgNodes: OrgNode[] = [];
    for (const [, item] of orgMap.entries()) {
      if (item.parentId && orgMap.has(item.parentId) && item.parentId !== item.id) {
        // Defensive cycle detection
        let isCyclic = false;
        let curr: string | null = item.parentId;
        const visited = new Set<string>([item.id]);
        while (curr && orgMap.has(curr)) {
          if (visited.has(curr)) {
            isCyclic = true;
            break;
          }
          visited.add(curr);
          curr = orgMap.get(curr)!.parentId;
        }

        if (!isCyclic) {
          orgMap.get(item.parentId)!.childOrgs.push(item.node);
        } else {
          rootOrgNodes.push(item.node);
        }
      } else {
        rootOrgNodes.push(item.node);
      }
    }

    // Attach child organizations to each parent node
    for (const [, item] of orgMap.entries()) {
      if (item.childOrgs.length > 0) {
        item.node.children = [...item.childOrgs, ...(item.node.children || [])];
      }
    }

    return rootOrgNodes;
  }
}
