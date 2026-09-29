import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { runDomainSeeder, type SeederContext } from './seeder.utils';

interface SeedUsersResult {
  users?: Record<string, { id: string }>;
}

export interface NotificationDef {
  id: string;
  email: string;
  title: string;
  message: string;
  type: 'WARNING' | 'ALERT' | 'INFO';
  isRead: boolean;
  link: string;
}

export const notificationsData: NotificationDef[] = [
  {
    id: 'notif-001',
    email: 'admin@youngonevn.com',
    title: 'SAP S/4HANA ERP License Audit',
    message:
      'SAP S/4HANA ERP Enterprise User subscription is fully utilized (60 of 60 seats allocated).',
    type: 'WARNING',
    isRead: false,
    link: '/licenses',
  },
  {
    id: 'notif-002',
    email: 'nam.pham@youngonevn.com',
    title: 'BSL Fabric Warehouse Barcode Labels Low Stock',
    message:
      'Zebra Thermal Transfer Labels (100mm x 150mm) reached threshold (Threshold: 30 rolls).',
    type: 'ALERT',
    isRead: false,
    link: '/inventory',
  },
  {
    id: 'notif-003',
    email: 'phong.dang@youngonevn.com',
    title: 'BSH Corporate Subnet Capacity Alert',
    message: 'Subnet 10.233.100.0/23 (HCM Office 7) reached 82% IP address allocation capacity.',
    type: 'WARNING',
    isRead: false,
    link: '/network',
  },
  {
    id: 'notif-004',
    email: 'admin@youngonevn.com',
    title: 'PostgreSQL Automated Snapshot Verified',
    message: 'Database backup snapshot verified and stored in encrypted SeaweedFS storage vault.',
    type: 'INFO',
    isRead: true,
    link: '/settings',
  },
  {
    id: 'notif-005',
    email: 'tri.doan@youngonevn.com',
    title: 'New Executive Asset Registered',
    message: 'MacBook Pro 16" M3 Pro (AST-1001) registered and ready for executive deployment.',
    type: 'INFO',
    isRead: true,
    link: '/assets',
  },
];

export async function seedNotifications(
  prisma: PrismaClient,
  users?: SeedUsersResult,
  ctx?: SeederContext,
) {
  const logger = new Logger('NotificationsSeeder');
  return runDomainSeeder(
    'NotificationsSeeder',
    '🔔',
    'System Notifications & Announcements',
    async (domainLogger) => {
      for (const n of notificationsData) {
        const userId =
          ctx?.appUsers.get(n.email) ||
          users?.users?.[n.email]?.id ||
          (await prisma.appUser.findUnique({ where: { email: n.email }, select: { id: true } }))
            ?.id;

        if (!userId) {
          logger.warn(`Could not resolve user for notification ${n.id} (${n.email})`);
          continue;
        }

        const notifData = {
          userId,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: n.isRead,
          link: n.link,
        };

        await prisma.notification.upsert({
          where: { id: n.id },
          update: notifData,
          create: { id: n.id, ...notifData },
        });
      }

      domainLogger.log(`Seeded ${notificationsData.length} system notifications.`);
    },
  );
}
