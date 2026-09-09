import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { directoryService } from './directory.service';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('directoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getStats fetches directory telemetry stats', async () => {
    const mockStats = {
      totalEmployees: 42,
      activeEmployees: 40,
      assignedWorkstations: 38,
      totalGroups: 8,
      totalOUs: 6,
      closedAccounts: 2,
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockStats } });

    const result = await directoryService.getStats();
    expect(api.get).toHaveBeenCalledWith('/directory/stats');
    expect(result).toEqual(mockStats);
  });

  it('getEmployees fetches paginated directory users with params', async () => {
    const mockResponse = {
      items: [{ id: 'emp-1', email: 'emp@uims.internal', firstName: 'John', lastName: 'Doe' }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    };
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockResponse } });

    const result = await directoryService.getEmployees({ search: 'John', department: 'IT' });
    expect(api.get).toHaveBeenCalledWith('/directory/users', {
      params: { search: 'John', department: 'IT' },
    });
    expect(result.items.length).toBe(1);
  });

  it('getEmployees handles plain array responses gracefully', async () => {
    const mockList = [
      { id: 'emp-1', email: 'emp@uims.internal', firstName: 'John', lastName: 'Doe' },
    ];
    vi.mocked(api.get).mockResolvedValueOnce({ data: mockList });

    const result = await directoryService.getEmployees();
    expect(result.total).toBe(1);
    expect(result.items).toEqual(mockList);
  });

  it('getEmployee fetches single employee record by id', async () => {
    const mockEmp = { id: 'emp-1', email: 'emp@uims.internal' };
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockEmp } });

    const result = await directoryService.getEmployee('emp-1');
    expect(api.get).toHaveBeenCalledWith('/directory/users/emp-1');
    expect(result).toEqual(mockEmp);
  });

  it('createEmployee posts new employee record without passwords', async () => {
    const payload = {
      email: 'new@uims.internal',
      firstName: 'Alice',
      lastName: 'Wong',
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { id: 'emp-2', ...payload } } });

    const result = await directoryService.createEmployee(payload);
    expect(api.post).toHaveBeenCalledWith('/directory/users', payload);
    expect(result.id).toBe('emp-2');
  });

  it('updateEmployee patches employee record', async () => {
    const payload = { department: 'Engineering' };
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { data: { id: 'emp-1', department: 'Engineering' } },
    });

    const result = await directoryService.updateEmployee('emp-1', payload);
    expect(api.patch).toHaveBeenCalledWith('/directory/users/emp-1', payload);
    expect(result.department).toBe('Engineering');
  });

  it('deleteEmployee deletes employee record', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });

    await directoryService.deleteEmployee('emp-1');
    expect(api.delete).toHaveBeenCalledWith('/directory/users/emp-1');
  });

  it('getGroups and createGroup operate on /directory/groups', async () => {
    const mockGroups = [{ id: 'grp-1', name: 'GR_Staff' }];
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockGroups } });
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: mockGroups[0] } });

    const list = await directoryService.getGroups();
    expect(api.get).toHaveBeenCalledWith('/directory/groups');
    expect(list).toEqual(mockGroups);

    const created = await directoryService.createGroup({ name: 'GR_Staff' });
    expect(api.post).toHaveBeenCalledWith('/directory/groups', { name: 'GR_Staff' });
    expect(created).toEqual(mockGroups[0]);
  });

  it('getOrganizationalUnits fetches OU topology', async () => {
    const mockOus = [{ id: 'ou-1', name: 'Production', dn: 'OU=Production,DC=uims,DC=internal' }];
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockOus } });

    const ous = await directoryService.getOrganizationalUnits();
    expect(api.get).toHaveBeenCalledWith('/directory/organizational-units');
    expect(ous).toEqual(mockOus);
  });

  it('syncDomain triggers active directory domain sync', async () => {
    const mockSyncResult = {
      domain: 'uims.internal',
      controller: 'DC01-PRIMARY',
      status: 'HEALTHY',
      latencyMs: 14,
      replicatedObjects: 85,
      activeIdentities: 120,
      lastSyncTimestamp: '2026-09-09T00:00:00Z',
    };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: mockSyncResult } });

    const result = await directoryService.syncDomain();
    expect(api.post).toHaveBeenCalledWith('/directory/sync-domain');
    expect(result.replicatedObjects).toBe(85);
  });

  it('exportEmployees fetches export dataset', async () => {
    const mockExport = [{ HEmploy: '63020037', HName: 'Phung Thi Nhu Y' }];
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: mockExport } });

    const result = await directoryService.exportEmployees();
    expect(api.get).toHaveBeenCalledWith('/directory/export');
    expect(result).toEqual(mockExport);
  });

  it('importEmployees posts batch user array', async () => {
    const items = [{ name: 'Test User', email: 'test@uims.internal' }];
    const mockImportRes = { total: 1, created: 1, updated: 0, skipped: 0, errors: [] };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { data: mockImportRes } });

    const result = await directoryService.importEmployees(items);
    expect(api.post).toHaveBeenCalledWith('/directory/import', { users: items });
    expect(result.created).toBe(1);
  });
});
