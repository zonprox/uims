import { describe, expect, it } from 'vitest';
import {
  bulkNotificationActionSchema,
  createNotificationSchema,
  markNotificationReadSchema,
  notificationQuerySchema,
} from './notification.validator';

describe('Notification Validators', () => {
  describe('createNotificationSchema', () => {
    it('should validate valid notification creation data', () => {
      const valid = {
        userId: 'user-123',
        title: 'Hardware Upgrade Scheduled',
        message: 'Your workstation memory upgrade is scheduled for Friday.',
        type: 'INFO',
        category: 'tasks',
        link: '/assets/ws-100',
        isRead: false,
      };
      const result = createNotificationSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty userId or empty title', () => {
      const invalid = {
        userId: '',
        title: '',
        message: 'Valid message content',
      };
      const result = createNotificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('notificationQuerySchema', () => {
    it('should parse and coerce query parameters correctly', () => {
      const query = {
        page: '2',
        limit: '25',
        category: 'alerts',
        isRead: 'false',
        search: 'critical',
      };
      const result = notificationQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
        expect(result.data.category).toBe('alerts');
        expect(result.data.isRead).toBe(false);
        expect(result.data.search).toBe('critical');
      }
    });

    it('should accept boolean and string read status', () => {
      const q1 = notificationQuerySchema.safeParse({ isRead: true });
      expect(q1.success).toBe(true);
      if (q1.success) expect(q1.data.isRead).toBe(true);

      const q2 = notificationQuerySchema.safeParse({ read: 'true' });
      expect(q2.success).toBe(true);
      if (q2.success) expect(q2.data.read).toBe(true);
    });
  });

  describe('markNotificationReadSchema', () => {
    it('should default isRead to true', () => {
      const result = markNotificationReadSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isRead).toBe(true);
      }
    });
  });

  describe('bulkNotificationActionSchema', () => {
    it('should validate non-empty array of IDs', () => {
      const result = bulkNotificationActionSchema.safeParse({
        ids: ['id-1', 'id-2'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty IDs array', () => {
      const result = bulkNotificationActionSchema.safeParse({
        ids: [],
      });
      expect(result.success).toBe(false);
    });
  });
});
