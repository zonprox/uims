import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { assetsService } from './assets.service';
import { auditService } from './audit.service';
import { dashboardService } from './dashboard.service';
import { healthService } from './health.service';
import { inventoryService } from './inventory.service';
import { licensesService } from './licenses.service';
import { networkService } from './network.service';
import { organizationService } from './organization.service';
import { notificationsService } from './notifications.service';
import { reportsService } from './reports.service';
import { settingsService } from './settings.service';
import { usersService } from './users.service';

vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Frontend Service Clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assetsService', () => {
    it('should query assets with search and pagination params', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: { data: [{ id: 'a1', name: 'Laptop' }], meta: { total: 1 } },
      });

      const res = await assetsService.getAssets({ search: 'Laptop' });
      expect(api.get).toHaveBeenCalledWith('/assets', {
        params: { search: 'Laptop' },
      });
      expect(res).toHaveLength(1);
    });

    it('should create asset record', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'a1', tag: 'AST-001' } } });
      const asset = await assetsService.createAsset({ name: 'MacBook Pro' });
      expect(api.post).toHaveBeenCalledWith('/assets', { name: 'MacBook Pro' });
      expect(asset.id).toBe('a1');
    });
  });

  describe('licensesService', () => {
    it('should assign user to license', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'asgn-1' } } });
      const res = await licensesService.assignUser('lic-1', {
        name: 'Alex',
        email: 'alex@uims.internal',
      });
      expect(api.post).toHaveBeenCalledWith('/licenses/lic-1/assign', {
        name: 'Alex',
        email: 'alex@uims.internal',
      });
      expect(res.id).toBe('asgn-1');
    });
  });

  describe('networkService', () => {
    it('should ping IP address and fetch DNS records', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { data: { ip: '1.1.1.1', reachable: true, latencyMs: 12 } },
      });
      vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

      const ping = await networkService.pingIp('1.1.1.1');
      await networkService.getDnsRecords();

      expect(api.post).toHaveBeenCalledWith('/network/ping', { ip: '1.1.1.1' });
      expect(api.get).toHaveBeenCalledWith('/network/dns');
      expect(ping.reachable).toBe(true);
    });
  });

  describe('inventoryService', () => {
    it('should restock item with quantity', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'inv-1', quantity: 30 } } });
      const item = await inventoryService.restockItem('inv-1', 10);
      expect(api.post).toHaveBeenCalledWith('/inventory/inv-1/restock', { quantity: 10 });
      expect(item.quantity).toBe(30);
    });
  });

  describe('dashboardService', () => {
    it('should fetch dashboard overview', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: { data: { kpi: { managedAssets: { total: 42 } } } },
      });

      const overview = await dashboardService.getOverview('This Month');
      expect(api.get).toHaveBeenCalledWith('/dashboard/overview', {
        params: { period: 'This Month' },
      });
      expect(overview.kpi.managedAssets.total).toBe(42);
    });
  });

  describe('auditService', () => {
    it('should fetch audit events and trigger csv export', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
      vi.mocked(api.get).mockResolvedValueOnce({ data: 'ID,Timestamp,User\n1,2026,Admin' });

      await auditService.getLogs();
      const csv = await auditService.exportCsv();

      expect(api.get).toHaveBeenCalledWith('/audit', { params: undefined });
      expect(api.get).toHaveBeenCalledWith('/audit/export', { responseType: 'text' });
      expect(csv).toContain('ID,Timestamp');
    });
  });

  describe('healthService', () => {
    it('should query live system health and compute latency', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          data: {
            status: 'ok',
            uptime: 3600,
            uptimeFormatted: '1h 0m 0s',
            uptimePercent: '99.99%',
            latencyMs: 2,
            database: { status: 'connected', latencyMs: 1 },
            system: {
              nodeVersion: 'v20.0.0',
              platform: 'linux',
              memoryHeapUsedMb: 30,
              memoryHeapTotalMb: 60,
              memoryRssMb: 80,
            },
          },
        },
      });

      const res = await healthService.checkHealth();
      expect(api.get).toHaveBeenCalledWith('/health');
      expect(res.status).toBe('ok');
      expect(res.database.status).toBe('connected');
    });
  });

  describe('reportsService', () => {
    it('should fetch report suites and schedule report', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [{ id: 'rep-1' }] } });
      vi.mocked(api.post).mockResolvedValueOnce({ data: { data: { id: 'rep-2' } } });

      const suites = await reportsService.getReportSuites();
      const scheduled = await reportsService.scheduleReport({
        reportType: 'audit',
        frequency: 'weekly',
        recipients: 'admin@company.com',
      });

      expect(api.get).toHaveBeenCalledWith('/reports');
      expect(api.post).toHaveBeenCalledWith('/reports/schedule', {
        reportType: 'audit',
        frequency: 'weekly',
        recipients: 'admin@company.com',
      });
      expect(suites).toHaveLength(1);
      expect(scheduled.id).toBe('rep-2');
    });
  });

  describe('organizationService', () => {
    it('should fetch organization hierarchy tree and stats', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { data: { totalOrganizations: 3, totalDepartments: 7 } },
      });
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { data: [{ key: 'org-1', title: 'Acme Corp' }] },
      });

      const stats = await organizationService.getStats();
      const tree = await organizationService.getTree();

      expect(api.get).toHaveBeenCalledWith('/organizations/stats');
      expect(api.get).toHaveBeenCalledWith('/organizations/tree');
      expect(stats.totalOrganizations).toBe(3);
      expect(tree).toHaveLength(1);
    });

    it('should create department', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { data: { id: 'dept-1', name: 'Engineering', code: 'ENG' } },
      });

      const dept = await organizationService.createDepartment({
        name: 'Engineering',
        code: 'ENG',
      });

      expect(api.post).toHaveBeenCalledWith('/departments', {
        name: 'Engineering',
        code: 'ENG',
      });
      expect(dept.id).toBe('dept-1');
    });
  });

  describe('usersService', () => {
    it('should fetch users list and stats', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { data: { totalUsers: 10, activeUsers: 8 } },
      });
      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          data: {
            items: [{ id: 'u1', email: 'admin@uims.local' }],
            total: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
          },
        },
      });

      const stats = await usersService.getStats();
      const users = await usersService.getUsers({ search: 'admin' });

      expect(api.get).toHaveBeenCalledWith('/users/stats');
      expect(api.get).toHaveBeenCalledWith('/users', { params: { search: 'admin' } });
      expect(stats.totalUsers).toBe(10);
      expect(users.items).toHaveLength(1);
    });

    it('should fetch directory groups', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({
        data: { data: [{ id: 'grp-1', name: 'DevOps Core' }] },
      });

      const groups = await usersService.getGroups();
      expect(api.get).toHaveBeenCalledWith('/users/groups');
      expect(groups).toHaveLength(1);
    });

    it('should reset user password', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({
        data: { data: { success: true, message: 'Password reset successfully' } },
      });

      const res = await usersService.resetPassword('u1', 'NewPassword123');
      expect(api.post).toHaveBeenCalledWith('/users/u1/reset-password', {
        password: 'NewPassword123',
      });
      expect(res.success).toBe(true);
    });
  });

  describe('settingsService', () => {
    it('should get and update settings', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { data: { companyName: 'Corp' } } });
      vi.mocked(api.patch).mockResolvedValueOnce({ data: { data: { companyName: 'Corp2' } } });

      const settings = await settingsService.getAllSettings();
      const updated = await settingsService.updateSetting('general', { companyName: 'Corp2' });

      expect(api.get).toHaveBeenCalledWith('/settings');
      expect(api.patch).toHaveBeenCalledWith('/settings/general', { companyName: 'Corp2' });
      expect(settings.companyName).toBe('Corp');
      expect(updated.companyName).toBe('Corp2');
    });
  });

  describe('notificationsService', () => {
    it('should fetch notifications and unread count', async () => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [{ id: 'n1', title: 'Hello' }] } });
      vi.mocked(api.get).mockResolvedValueOnce({ data: { count: 3 } });

      const list = await notificationsService.getNotifications();
      const count = await notificationsService.getUnreadCount();

      expect(api.get).toHaveBeenCalledWith('/notifications');
      expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(list).toHaveLength(1);
      expect(count).toBe(3);
    });

    it('should broadcast announcement and mark as read', async () => {
      vi.mocked(api.post).mockResolvedValueOnce({ data: { count: 5, success: true } });
      vi.mocked(api.patch).mockResolvedValueOnce({ data: { data: { id: 'n1', read: true } } });

      const broadcast = await notificationsService.broadcastAnnouncement({
        title: 'Maintenance',
        message: 'Tonight at 2am',
      });
      const read = await notificationsService.markAsRead('n1');

      expect(api.post).toHaveBeenCalledWith('/notifications/broadcast', {
        title: 'Maintenance',
        message: 'Tonight at 2am',
      });
      expect(api.patch).toHaveBeenCalledWith('/notifications/n1/read');
      expect(broadcast.count).toBe(5);
      expect(read.read).toBe(true);
    });
  });
});
