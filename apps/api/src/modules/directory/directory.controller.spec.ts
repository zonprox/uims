import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';

describe('DirectoryController', () => {
  let controller: DirectoryController;
  let mockDirectoryService: {
    getStats: ReturnType<typeof vi.fn>;
    getOrganizationalUnits: ReturnType<typeof vi.fn>;
    syncDomain: ReturnType<typeof vi.fn>;
    findAllGroups: ReturnType<typeof vi.fn>;
    createGroup: ReturnType<typeof vi.fn>;
    exportMaster: ReturnType<typeof vi.fn>;
    importBatch: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDirectoryService = {
      getStats: vi.fn().mockResolvedValue({ totalEmployees: 100 }),
      getOrganizationalUnits: vi.fn().mockResolvedValue([]),
      syncDomain: vi.fn().mockResolvedValue({ status: 'SYNCHRONIZED' }),
      findAllGroups: vi.fn().mockResolvedValue([]),
      createGroup: vi.fn().mockResolvedValue({ id: 'grp-1' }),
      exportMaster: vi.fn().mockResolvedValue([]),
      importBatch: vi.fn().mockResolvedValue({ total: 1, created: 1 }),
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'dir-1' }),
      findOne: vi.fn().mockResolvedValue({ id: 'dir-1' }),
      update: vi.fn().mockResolvedValue({ id: 'dir-1' }),
      remove: vi.fn().mockResolvedValue({ id: 'dir-1' }),
    };

    controller = new DirectoryController(mockDirectoryService as unknown as DirectoryService);
  });

  it('should delegate getStats to directoryService', async () => {
    const result = await controller.getStats();
    expect(result).toEqual({ totalEmployees: 100 });
    expect(mockDirectoryService.getStats).toHaveBeenCalled();
  });

  it('should delegate getOrganizationalUnits to directoryService', async () => {
    const result = await controller.getOrganizationalUnits();
    expect(result).toEqual([]);
    expect(mockDirectoryService.getOrganizationalUnits).toHaveBeenCalled();
  });

  it('should delegate syncDomain to directoryService', async () => {
    const result = await controller.syncDomain();
    expect(result).toEqual({ status: 'SYNCHRONIZED' });
    expect(mockDirectoryService.syncDomain).toHaveBeenCalled();
  });

  it('should delegate findAllGroups to directoryService', async () => {
    const result = await controller.findAllGroups();
    expect(result).toEqual([]);
    expect(mockDirectoryService.findAllGroups).toHaveBeenCalled();
  });

  it('should delegate createGroup to directoryService', async () => {
    const dto = { name: 'SEC-Eng' };
    const result = await controller.createGroup(dto);
    expect(result).toEqual({ id: 'grp-1' });
    expect(mockDirectoryService.createGroup).toHaveBeenCalledWith(dto);
  });

  it('should delegate exportMaster to directoryService', async () => {
    const result = await controller.exportMaster();
    expect(result).toEqual([]);
    expect(mockDirectoryService.exportMaster).toHaveBeenCalled();
  });

  it('should delegate importBatch to directoryService', async () => {
    const dto = { users: [{ email: 'emp@company.com' }] };
    const result = await controller.importBatch(dto);
    expect(result).toEqual({ total: 1, created: 1 });
    expect(mockDirectoryService.importBatch).toHaveBeenCalledWith(dto);
  });

  it('should delegate findAll to directoryService', async () => {
    const query = { page: 1, pageSize: 20, search: 'test' };
    const result = await controller.findAll(query);
    expect(result).toEqual({ items: [], total: 0 });
    expect(mockDirectoryService.findAll).toHaveBeenCalledWith(query);
  });

  it('should delegate create to directoryService', async () => {
    const dto = { email: 'test@company.com' };
    const result = await controller.create(dto);
    expect(result).toEqual({ id: 'dir-1' });
    expect(mockDirectoryService.create).toHaveBeenCalledWith(dto);
  });

  it('should delegate findOne to directoryService', async () => {
    const result = await controller.findOne('dir-1');
    expect(result).toEqual({ id: 'dir-1' });
    expect(mockDirectoryService.findOne).toHaveBeenCalledWith('dir-1');
  });

  it('should delegate update to directoryService', async () => {
    const dto = { firstName: 'Updated' };
    const result = await controller.update('dir-1', dto);
    expect(result).toEqual({ id: 'dir-1' });
    expect(mockDirectoryService.update).toHaveBeenCalledWith('dir-1', dto);
  });

  it('should delegate remove to directoryService', async () => {
    const result = await controller.remove('dir-1');
    expect(result).toEqual({ id: 'dir-1' });
    expect(mockDirectoryService.remove).toHaveBeenCalledWith('dir-1');
  });
});
