import { NotificationType } from '@uims/shared-types';
import { z } from 'zod';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
  category: z.enum(['alerts', 'tasks', 'general', 'all']).optional(),
  type: z.string().optional(),
  isRead: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => val === true || val === 'true')
    .optional(),
  read: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((val) => val === true || val === 'true')
    .optional(),
  search: z.string().max(200).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const createNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message cannot exceed 2000 characters'),
  type: z
    .nativeEnum(NotificationType)
    .or(z.enum(['INFO', 'WARNING', 'ALERT', 'SUCCESS', 'ERROR', 'SYSTEM']))
    .optional(),
  category: z.enum(['alerts', 'tasks', 'general']).optional(),
  link: z.string().max(500).optional().nullable(),
  isRead: z.boolean().optional().default(false),
});

export const markNotificationReadSchema = z.object({
  isRead: z.boolean().optional().default(true),
});

export const bulkNotificationActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'At least one ID is required'),
});

export type NotificationQuerySchema = z.infer<typeof notificationQuerySchema>;
export type CreateNotificationSchema = z.infer<typeof createNotificationSchema>;
export type MarkNotificationReadSchema = z.infer<typeof markNotificationReadSchema>;
export type BulkNotificationActionSchema = z.infer<typeof bulkNotificationActionSchema>;
