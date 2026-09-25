import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockService = {
    getStats: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    toggleStatus: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    service = mockService as unknown as UsersService;
    controller = new UsersController(service);
    vi.clearAllMocks();
  });

  it('should get stats', async () => {
    mockService.getStats.mockResolvedValue({ totalUsers: 10, activeUsers: 8 });
    const res = await controller.getStats();
    expect(res.totalUsers).toBe(10);
    expect(mockService.getStats).toHaveBeenCalled();
  });

  it('should confirm deprecated delegation endpoints are removed from controller', () => {
    const c = controller as unknown as Record<string, unknown>;
    expect(c.getStatsSummary).toBeUndefined();
    expect(c.getOrganizationalUnits).toBeUndefined();
    expect(c.syncDomain).toBeUndefined();
    expect(c.getRoles).toBeUndefined();
    expect(c.getGroups).toBeUndefined();
    expect(c.createGroup).toBeUndefined();
    expect(c.exportMaster).toBeUndefined();
    expect(c.importBatch).toBeUndefined();
    expect(c.resetPassword).toBeUndefined();
  });

  it('should create user', async () => {
    const dto = {
      email: 'new@example.com',
      username: 'newuser',
    };
    mockService.create.mockResolvedValue({ id: 'u1', ...dto, mustChangePassword: true });
    const res = await controller.create(
      dto as unknown as import('./dto/create-user.dto').CreateUserDto,
    );
    expect(res.id).toBe('u1');
  });

  it('should find all users', async () => {
    mockService.findAll.mockResolvedValue({ items: [], total: 0 });
    const res = await controller.findAll({ search: 'john' });
    expect(res.total).toBe(0);
  });

  it('should find one user', async () => {
    mockService.findOne.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
    const res = await controller.findOne('u1');
    expect(res.email).toBe('user@example.com');
  });

  it('should update user', async () => {
    const dto = { displayName: 'Updated Name' };
    mockService.update.mockResolvedValue({ id: 'u1', displayName: 'Updated Name' });
    const res = await controller.update('u1', dto);
    expect(res.displayName).toBe('Updated Name');
  });

  it('should toggle status', async () => {
    mockService.toggleStatus.mockResolvedValue({ id: 'u1', status: 'SUSPENDED' });
    const res = await controller.toggleStatus('u1', {
      status: 'SUSPENDED' as import('@prisma/client').UserStatus,
    });
    expect(res.status).toBe('SUSPENDED');
  });

  it('should remove user', async () => {
    mockService.remove.mockResolvedValue({ id: 'u1' });
    const res = await controller.remove('u1');
    expect(res.id).toBe('u1');
  });

  it('should verify resetPassword is not present on controller', () => {
    expect((controller as unknown as Record<string, unknown>).resetPassword).toBeUndefined();
  });
});
