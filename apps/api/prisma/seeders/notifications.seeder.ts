import type { PrismaClient } from '@prisma/client';

interface SeedUsersResult {
  roles?: Record<string, { id: string }>;
  users: Record<string, { id: string }>;
}

export async function seedNotifications(prisma: PrismaClient, users: SeedUsersResult) {
  const { users: u } = users;

  const defaultUser = Object.values(u)[0];
  const userAdmin = u['admin@uims.internal'] || u.userAlex || defaultUser;
  const userNam = u['nam.pham@broadpeak.youngone.com'] || u.userSarah || defaultUser;
  const userTri = u['tri.doan@broadpeak.youngone.com'] || u.userMarcusVance || defaultUser;
  const userPhong = u['phong.dang@broadpeak.youngone.com'] || u.userMichael || defaultUser;

  const notificationsData = [
    {
      userId: userAdmin.id,
      title: 'SAP S/4HANA ERP License Audit',
      message:
        'SAP S/4HANA ERP Enterprise User subscription is fully utilized (60 of 60 seats allocated).',
      type: 'WARNING' as const,
      isRead: false,
      link: '/licenses',
    },
    {
      userId: userNam.id,
      title: 'BSL Fabric Warehouse Barcode Labels Low Stock',
      message:
        'Zebra Thermal Transfer Labels (100mm x 150mm) reached threshold (Threshold: 30 rolls).',
      type: 'ALERT' as const,
      isRead: false,
      link: '/inventory',
    },
    {
      userId: userPhong.id,
      title: 'BSH Corporate Subnet Capacity Alert',
      message: 'Subnet 10.233.100.0/23 (HCM Office 7) reached 82% IP address allocation capacity.',
      type: 'WARNING' as const,
      isRead: false,
      link: '/network',
    },
    {
      userId: userAdmin.id,
      title: 'PostgreSQL Automated Snapshot Verified',
      message: 'Database backup snapshot verified and stored in encrypted SeaweedFS storage vault.',
      type: 'INFO' as const,
      isRead: true,
      link: '/settings',
    },
    {
      userId: userTri.id,
      title: 'New Executive Asset Registered',
      message: 'MacBook Pro 16" M3 Pro (AST-1001) registered and ready for executive deployment.',
      type: 'INFO' as const,
      isRead: true,
      link: '/assets',
    },
  ];

  for (const n of notificationsData) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: n.userId,
        title: n.title,
      },
    });

    if (existing) {
      await prisma.notification.update({
        where: { id: existing.id },
        data: n,
      });
    } else {
      await prisma.notification.create({
        data: n,
      });
    }
  }
}
