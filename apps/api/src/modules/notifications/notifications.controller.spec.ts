import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationsController } from './notifications.controller';
import type { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockService = {
      findAll: vi.fn(),
      getUnreadCount: vi.fn(),
      create: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      remove: vi.fn(),
      clearAll: vi.fn(),
    };

    controller = new NotificationsController(mockService as unknown as NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll with user id and query filters', async () => {
      const mockResult = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        unreadCount: 0,
      };
      mockService.findAll.mockResolvedValue(mockResult);

      const query = { page: 1, limit: 10, category: 'alerts' as const };
      const res = await controller.findAll({ user: { id: 'u1', role: 'Admin' } }, query);

      expect(res).toEqual(mockResult);
      expect(mockService.findAll).toHaveBeenCalledWith('u1', query);
    });

    it('should pass undefined user id for Super Admin', async () => {
      mockService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        unreadCount: 0,
      });
      const query = { search: 'asset' };
      await controller.findAll({ user: { id: 'u1', role: 'Super Admin' } }, query);
      expect(mockService.findAll).toHaveBeenCalledWith(undefined, query);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockService.getUnreadCount.mockResolvedValue(4);
      const res = await controller.getUnreadCount({ user: { id: 'u1' } });
      expect(res).toEqual({ count: 4 });
      expect(mockService.getUnreadCount).toHaveBeenCalledWith('u1');
    });

    it('should pass undefined user id for Super Admin', async () => {
      mockService.getUnreadCount.mockResolvedValue(0);
      const res = await controller.getUnreadCount({ user: { id: 'u1', role: 'Super Admin' } });
      expect(res).toEqual({ count: 0 });
      expect(mockService.getUnreadCount).toHaveBeenCalledWith(undefined);
    });
  });

  describe('create', () => {
    it('should delegate create to service', async () => {
      const payload = {
        userId: 'u1',
        title: 'New Notice',
        message: 'Notice description',
      };
      const createdItem = {
        id: 'n1',
        userId: 'u1',
        title: 'New Notice',
        description: 'Notice description',
        type: 'info' as const,
        category: 'general' as const,
        read: false,
        time: 'Just now',
        createdAt: new Date().toISOString(),
      };
      mockService.create.mockResolvedValue(createdItem);

      const res = await controller.create(payload);
      expect(res).toEqual(createdItem);
      expect(mockService.create).toHaveBeenCalledWith(payload);
    });
  });

  describe('markAsRead', () => {
    it('should delegate markAsRead to service', async () => {
      mockService.markAsRead.mockResolvedValue({ id: 'n1', read: true });
      const res = await controller.markAsRead('n1');
      expect(res.read).toBe(true);
      expect(mockService.markAsRead).toHaveBeenCalledWith('n1');
    });
  });

  describe('markAllAsRead', () => {
    it('should delegate markAllAsRead to service', async () => {
      mockService.markAllAsRead.mockResolvedValue({ count: 2, success: true });
      const res = await controller.markAllAsRead({ user: { id: 'u1' } });
      expect(res.count).toBe(2);
      expect(mockService.markAllAsRead).toHaveBeenCalledWith('u1');
    });
  });

  describe('remove', () => {
    it('should delegate remove to service', async () => {
      mockService.remove.mockResolvedValue({ success: true });
      const res = await controller.remove('n1');
      expect(res).toEqual({ success: true });
      expect(mockService.remove).toHaveBeenCalledWith('n1');
    });
  });

  describe('clearAll', () => {
    it('should delegate clearAll to service', async () => {
      mockService.clearAll.mockResolvedValue({ count: 5, success: true });
      const res = await controller.clearAll({ user: { id: 'u1' } });
      expect(res.count).toBe(5);
      expect(mockService.clearAll).toHaveBeenCalledWith('u1');
    });
  });
});
