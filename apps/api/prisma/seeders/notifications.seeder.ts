import type { PrismaClient } from '@prisma/client';

interface SeedUsersResult {
  roles: Record<string, { id: string }>;
  users: Record<string, { id: string }>;
}

export async function seedNotifications(prisma: PrismaClient, users: SeedUsersResult) {
  const { users: u } = users;

  const notificationsData = [
    {
      userId: u.userAlex.id,
      title: 'Adobe Creative Cloud Renewal Notice',
      message:
        'Adobe Creative Cloud subscription (28 seats in use) expires on Sep 15. Renew contract.',
      type: 'WARNING' as const,
      isRead: false,
      link: '/licenses',
    },
    {
      userId: u.userAlex.id,
      title: 'Belkin Ethernet Adapters Stock Depleted',
      message:
        'Belkin USB-C to 2.5Gbps Gigabit Ethernet Adapter is completely at 0 units (Threshold: 5).',
      type: 'ALERT' as const,
      isRead: false,
      link: '/inventory',
    },
    {
      userId: u.userSarah.id,
      title: 'High IP Allocation Threshold Reached',
      message: 'Subnet 192.168.10.0/24 (Production Workstations) is at 88% IP capacity.',
      type: 'WARNING' as const,
      isRead: false,
      link: '/network',
    },
    {
      userId: u.userAlex.id,
      title: 'Automated Daily Snapshot Verified',
      message:
        'PostgreSQL database snapshot sha256 checksum matched and encrypted in SeaweedFS vault.',
      type: 'INFO' as const,
      isRead: true,
      link: '/settings',
    },
    {
      userId: u.userMarcusVance.id,
      title: 'New Hardware Asset Provisioned',
      message: 'MacBook Pro 16" M3 Max (AST-1001) is registered and ready for deployment.',
      type: 'INFO' as const,
      isRead: true,
      link: '/assets',
    },
    {
      userId: u.userAlex.id,
      title: 'SAML Authentication Anomaly Blocked',
      message:
        'Unauthorized login brute force from IP 89.248.163.2 automatically dropped by firewall.',
      type: 'ALERT' as const,
      isRead: false,
      link: '/audit',
    },
  ];

  for (const n of notificationsData) {
    await prisma.notification.create({
      data: n,
    });
  }
}
