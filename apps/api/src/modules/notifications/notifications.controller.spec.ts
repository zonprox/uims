import { describe, expect, it, vi, beforeEach } from 'vitest';
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
    it('should delegate to service.findAll with user id', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll({ user: { id: 'u1', role: 'Admin' } });
      expect(mockService.findAll).toHaveBeenCalledWith('u1');
    });

    it('should pass undefined user id for Super Admin', async () => {
      mockService.findAll.mockResolvedValue([]);
      await controller.findAll({ user: { id: 'u1', role: 'Super Admin' } });
      expect(mockService.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockService.getUnreadCount.mockResolvedValue(4);
      const res = await controller.getUnreadCount({ user: { id: 'u1' } });
      expect(res).toEqual({ count: 4 });
      expect(mockService.getUnreadCount).toHaveBeenCalledWith('u1');
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
});
