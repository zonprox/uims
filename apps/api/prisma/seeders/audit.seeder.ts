import type { PrismaClient } from '@prisma/client';

export async function seedAudit(prisma: PrismaClient) {
  const auditLogs = [
    {
      userName: 'Alex Johnson',
      userEmail: 'admin@uims.internal',
      action: 'PROVISION',
      severity: 'Info',
      entity: 'Asset AST-1001',
      entityType: 'Asset',
      ipAddress: '192.168.1.15 (NY HQ)',
      status: 'Success',
      details: 'Provisioned new Apple MacBook Pro 16" M3 Max to Marcus Vance (Principal Design).',
      diffPayload: {
        requestId: 'req_88a91b2c',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) UIMS-Client/2.4',
        after: {
          tag: 'AST-1001',
          model: 'MacBook Pro 16 M3 Max',
          assignedTo: 'Marcus Vance',
          price: 3499,
        },
      },
    },
    {
      userName: 'Sarah Chen',
      userEmail: 'sarah.chen@company.com',
      action: 'UPDATE',
      severity: 'Info',
      entity: 'License Adobe CC',
      entityType: 'License',
      ipAddress: '192.168.10.12 (SF HQ)',
      status: 'Success',
      details: 'Allocated 1 Adobe Creative Cloud seat to Chloe Martin (London Design Studio).',
      diffPayload: {
        requestId: 'req_99c81a1d',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        before: { usedSeats: 27 },
        after: { usedSeats: 28, assignedUser: 'Chloe Martin' },
      },
    },
    {
      userName: 'Security Threat Defense',
      userEmail: 'threat-engine@uims.internal',
      action: 'LOGIN_FAILED',
      severity: 'Critical',
      entity: 'Auth Gateway SAML',
      entityType: 'Security',
      ipAddress: '89.248.163.2 (St. Petersburg, RU)',
      status: 'Blocked',
      details:
        'Invalid SAML assertion signature and brute force attempt. Origin IP blocked by firewall rate-limiter.',
      diffPayload: {
        requestId: 'sec_block_4482',
        userAgent: 'python-requests/2.31.0',
        before: { geoCountry: 'RU', riskScore: 98 },
        after: { actionTaken: 'GEO_IP_DROP_RULE_ENGAGED' },
      },
    },
    {
      userName: 'Alex Johnson',
      userEmail: 'admin@uims.internal',
      action: 'PERMISSION_GRANT',
      severity: 'Warning',
      entity: 'Role Super Admin',
      entityType: 'User',
      ipAddress: '192.168.1.15 (NY HQ)',
      status: 'Success',
      details:
        'Granted temporary Super Admin elevated privileges to Sarah Chen for weekend data center migration.',
      diffPayload: {
        requestId: 'req_elevation_331',
        userAgent: 'UIMS-AdminConsole/2.4.0',
        before: { role: 'IT Specialist' },
        after: { role: 'Super Admin', expiresAt: '2026-08-18 00:00 UTC' },
      },
    },
    {
      userName: 'System Daemon Engine',
      userEmail: 'daemon@uims.internal',
      action: 'SNAPSHOT_VERIFY',
      severity: 'Info',
      entity: 'PostgreSQL Daily Snapshot',
      entityType: 'Storage',
      ipAddress: '127.0.0.1 (Localhost)',
      status: 'Success',
      details:
        'Automated nightly database snapshot sha256 checksum verified and mirrored to Synology SAN NAS.',
    },
    {
      userName: 'Michael Wong',
      userEmail: 'michael.wong@company.com',
      action: 'CONFIG_CHANGE',
      severity: 'Warning',
      entity: 'FortiGate 200F Firewall',
      entityType: 'Network',
      ipAddress: '192.168.1.15 (NY HQ)',
      status: 'Success',
      details: 'Updated IPSec VPN Phase 2 cryptographic proposals to AES-256-GCM / SHA-384.',
    },
    {
      userName: 'Sarah Chen',
      userEmail: 'sarah.chen@company.com',
      action: 'MFA_RESET',
      severity: 'Info',
      entity: 'User Thomas Wright',
      entityType: 'User',
      ipAddress: '192.168.10.12 (SF HQ)',
      status: 'Success',
      details: 'Revoked lost Microsoft Authenticator seed and generated new QR registration token.',
    },
    {
      userName: 'Alex Johnson',
      userEmail: 'admin@uims.internal',
      action: 'INVENTORY_REORDER',
      severity: 'Info',
      entity: 'SKU ACC-MSE-MX3S-GRY',
      entityType: 'Inventory',
      ipAddress: '192.168.1.15 (NY HQ)',
      status: 'Success',
      details: 'Generated purchase requisition PO-9921 for 20 units of Logitech MX Master 3S mice.',
    },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: log,
    });
  }
}
