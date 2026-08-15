import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DepartmentController,
  OrganizationController,
  PositionController,
} from './organization.controller';
import type { OrganizationService } from './organization.service';

describe('OrganizationController and Sub-controllers', () => {
  let orgController: OrganizationController;
  let deptController: DepartmentController;
  let posController: PositionController;
  let mockService: Partial<OrganizationService>;

  beforeEach(() => {
    mockService = {
      getStats: vi.fn().mockResolvedValue({ totalOrganizations: 2 }),
      getHierarchyTree: vi.fn().mockResolvedValue([]),
      findAllOrganizations: vi.fn().mockResolvedValue([]),
      findOrganization: vi.fn().mockResolvedValue({ id: 'org-1' }),
      createOrganization: vi.fn().mockResolvedValue({ id: 'org-1' }),
      updateOrganization: vi.fn().mockResolvedValue({ id: 'org-1' }),
      deleteOrganization: vi.fn().mockResolvedValue({ id: 'org-1' }),
      findAllDepartments: vi.fn().mockResolvedValue([]),
      findDepartment: vi.fn().mockResolvedValue({ id: 'dept-1' }),
      createDepartment: vi.fn().mockResolvedValue({ id: 'dept-1' }),
      updateDepartment: vi.fn().mockResolvedValue({ id: 'dept-1' }),
      deleteDepartment: vi.fn().mockResolvedValue({ id: 'dept-1' }),
      findAllPositions: vi.fn().mockResolvedValue([]),
      findPosition: vi.fn().mockResolvedValue({ id: 'pos-1' }),
      createPosition: vi.fn().mockResolvedValue({ id: 'pos-1' }),
      updatePosition: vi.fn().mockResolvedValue({ id: 'pos-1' }),
      deletePosition: vi.fn().mockResolvedValue({ id: 'pos-1' }),
      findAllLocations: vi.fn().mockResolvedValue([]),
    };

    orgController = new OrganizationController(mockService as OrganizationService);
    deptController = new DepartmentController(mockService as OrganizationService);
    posController = new PositionController(mockService as OrganizationService);
  });

  it('should delegate getStats to service', async () => {
    const res = await orgController.getStats();
    expect(res).toEqual({ totalOrganizations: 2 });
    expect(mockService.getStats).toHaveBeenCalled();
  });

  it('should delegate getTree to service', async () => {
    const res = await orgController.getTree();
    expect(res).toEqual([]);
    expect(mockService.getHierarchyTree).toHaveBeenCalled();
  });

  it('should delegate createDepartment to service', async () => {
    const dto = { name: 'IT Support', code: 'DEPT-IT-SUP' };
    const res = await deptController.create(dto);
    expect(res).toEqual({ id: 'dept-1' });
    expect(mockService.createDepartment).toHaveBeenCalledWith(dto);
  });

  it('should delegate createPosition to service', async () => {
    const dto = { title: 'Junior SysAdmin', code: 'POS-JR-SYS' };
    const res = await posController.create(dto);
    expect(res).toEqual({ id: 'pos-1' });
    expect(mockService.createPosition).toHaveBeenCalledWith(dto);
  });
});
