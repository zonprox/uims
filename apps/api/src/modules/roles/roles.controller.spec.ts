import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

describe('RolesController', () => {
  let controller: RolesController;
  let service: RolesService;

  const mockService = {
    findAll: vi.fn(),
    getStats: vi.fn(),
    getCatalog: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    clone: vi.fn(),
    syncPermissions: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    service = mockService as unknown as RolesService;
    controller = new RolesController(service);
    vi.clearAllMocks();
  });

  it('should call findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    await controller.findAll();
    expect(mockService.findAll).toHaveBeenCalled();
  });

  it('should call getStats', async () => {
    mockService.getStats.mockResolvedValue({ totalRoles: 6 });
    const res = await controller.getStats();
    expect(res.totalRoles).toBe(6);
  });

  it('should call getCatalog', async () => {
    mockService.getCatalog.mockResolvedValue([]);
    await controller.getCatalog();
    expect(mockService.getCatalog).toHaveBeenCalled();
  });

  it('should call create', async () => {
    const dto = { name: 'New Role' };
    mockService.create.mockResolvedValue({ id: '1', ...dto });
    const res = await controller.create(dto);
    expect(res.id).toBe('1');
  });
});
