import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectoryController } from './directory.controller';
import type { DirectoryService } from './directory.service';
import type { CreateDirectoryGroupDto } from './dto/create-directory-group.dto';
import type { CreateDirectoryUserDto } from './dto/create-directory-user.dto';
import type { UpdateDirectoryUserDto } from './dto/update-directory-user.dto';

describe('DirectoryController', () => {
  let controller: DirectoryController;
  let mockDirectoryService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockDirectoryService = {
      findAllUsers: vi.fn(),
      findAllGroups: vi.fn(),
      findAllEmails: vi.fn(),
      getStats: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
      createGroup: vi.fn(),
    };

    controller = new DirectoryController(mockDirectoryService as unknown as DirectoryService);
  });

  it('should call findAllUsers with query params', async () => {
    const mockUsers = [{ id: 'u1', username: 'sarah.chen', email: 'sarah@company.com' }];
    mockDirectoryService.findAllUsers.mockResolvedValue(mockUsers);

    const result = await controller.findAllUsers({ search: 'sarah' });

    expect(mockDirectoryService.findAllUsers).toHaveBeenCalledWith({ search: 'sarah' });
    expect(result).toBe(mockUsers);
  });

  it('should call createUser with CreateDirectoryUserDto', async () => {
    const dto: CreateDirectoryUserDto = {
      username: 'david.kim',
      email: 'david.kim@company.com',
      name: 'David Kim',
      department: 'Engineering',
      jobTitle: 'Lead Cloud Architect',
      status: 'Active',
    };
    const created = { id: 'u2', ...dto };
    mockDirectoryService.createUser.mockResolvedValue(created);

    const result = await controller.createUser(dto);

    expect(mockDirectoryService.createUser).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('should call updateUser with id and UpdateDirectoryUserDto', async () => {
    const dto: UpdateDirectoryUserDto = {
      jobTitle: 'Principal Cloud Architect',
    };
    const updated = { id: 'u1', jobTitle: 'Principal Cloud Architect' };
    mockDirectoryService.updateUser.mockResolvedValue(updated);

    const result = await controller.updateUser('u1', dto);

    expect(mockDirectoryService.updateUser).toHaveBeenCalledWith('u1', dto);
    expect(result).toBe(updated);
  });

  it('should call deleteUser with id', async () => {
    mockDirectoryService.deleteUser.mockResolvedValue({ success: true, id: 'u1' });

    const result = await controller.deleteUser('u1');

    expect(mockDirectoryService.deleteUser).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ success: true, id: 'u1' });
  });

  it('should call createGroup with CreateDirectoryGroupDto', async () => {
    const dto: CreateDirectoryGroupDto = {
      name: 'DevOps & SRE',
      email: 'devops-sre@company.com',
      description: 'DevOps engineering team',
    };
    const created = { id: 'grp-1', ...dto };
    mockDirectoryService.createGroup.mockResolvedValue(created);

    const result = await controller.createGroup(dto);

    expect(mockDirectoryService.createGroup).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('should return directory stats', async () => {
    const stats = {
      totalEmployees: 148,
      activeSecurityGroups: 8,
      twoFactorComplianceRate: '94.6%',
      provisionedMailboxes: 14,
    };
    mockDirectoryService.getStats.mockResolvedValue(stats);

    const result = await controller.getStats();

    expect(mockDirectoryService.getStats).toHaveBeenCalled();
    expect(result).toBe(stats);
  });
});
