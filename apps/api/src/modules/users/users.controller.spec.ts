import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockService = {
    getStats: vi.fn(),
    getOrganizationalUnits: vi.fn(),
    syncDomain: vi.fn(),
    getRoles: vi.fn(),
    findAllGroups: vi.fn(),
    createGroup: vi.fn(),
    exportMaster: vi.fn(),
    importBatch: vi.fn(),
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

  it('should get stats summary alias', async () => {
    mockService.getStats.mockResolvedValue({ totalUsers: 10 });
    const res = await controller.getStatsSummary();
    expect(res.totalUsers).toBe(10);
  });

  it('should get organizational units', async () => {
    mockService.getOrganizationalUnits.mockResolvedValue([{ id: 'ou-1', name: 'Production' }]);
    const res = await controller.getOrganizationalUnits();
    expect(res).toHaveLength(1);
  });

  it('should trigger domain sync', async () => {
    mockService.syncDomain.mockResolvedValue({ status: 'SYNCHRONIZED', replicatedObjects: 50 });
    const res = await controller.syncDomain();
    expect(res.status).toBe('SYNCHRONIZED');
  });

  it('should get roles list', async () => {
    mockService.getRoles.mockResolvedValue([{ id: 'r1', name: 'Employee' }]);
    const res = await controller.getRoles();
    expect(res).toHaveLength(1);
  });

  it('should get groups', async () => {
    mockService.findAllGroups.mockResolvedValue([{ id: 'g1', name: 'GR_Printing' }]);
    const res = await controller.getGroups();
    expect(res).toHaveLength(1);
  });

  it('should create group', async () => {
    const dto = { name: 'GR_Sample', email: 'sample@youngonevn.com' };
    mockService.createGroup.mockResolvedValue({ id: 'g2', ...dto });
    const res = await controller.createGroup(dto);
    expect(res.id).toBe('g2');
  });

  it('should export master dataset', async () => {
    mockService.exportMaster.mockResolvedValue([
      { 'Employee Code': '63020037', 'Full Name': 'Test User' },
    ]);
    const res = await controller.exportMaster();
    expect(res).toHaveLength(1);
  });

  it('should import batch', async () => {
    const dto = { users: [{ email: 'test@example.com', name: 'Test' }] };
    mockService.importBatch.mockResolvedValue({
      total: 1,
      created: 1,
      updated: 0,
      skipped: 0,
      errors: [],
    });
    const res = await controller.importBatch(
      dto as unknown as import('./dto/import-users.dto').BatchImportUsersDto,
    );
    expect(res.created).toBe(1);
  });

  it('should create user', async () => {
    const dto = {
      email: 'new@example.com',
      username: 'newuser',
      adInitialPassword: 'Ad#Test1234!',
    };
    mockService.create.mockResolvedValue({ id: 'u1', ...dto });
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
