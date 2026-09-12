import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

const logger = new Logger('AuditSeeder');

export async function seedAudit(prisma: PrismaClient) {
  // Fetch related records to establish relational integrity
  const [users, assets, licenses, inventory] = await Promise.all([
    prisma.appUser.findMany(),
    prisma.asset.findMany(),
    prisma.license.findMany(),
    prisma.inventoryItem.findMany(),
  ]);

  const userMap = new Map<string, string>();
  for (const u of users) {
    userMap.set(u.email, u.id);
  }

  const assetMap = new Map<string, string>();
  for (const a of assets) {
    assetMap.set(a.assetTag, a.id);
  }

  const licenseMap = new Map<string, string>();
  for (const l of licenses) {
    licenseMap.set(l.name, l.id);
    licenseMap.set(l.id, l.id);
  }

  const invMap = new Map<string, string>();
  for (const i of inventory) {
    invMap.set(i.sku, i.id);
  }

  const baseDate = new Date('2026-08-20T10:00:00Z');

  const auditEvents = [
    {
      id: 'aud-001',
      userId: userMap.get('admin@uims.internal'),
      userEmail: 'admin@uims.internal',
      userName: 'Enterprise Admin',
      action: 'USER_PROVISION',
      severity: 'Info',
      status: 'Success',
      entity: 'Pham Hoang Nam',
      entityType: 'User',
      entityId: userMap.get('nam.pham@broadpeak.youngone.com') || 'usr-nam-pham',
      ipAddress: '10.232.100.15',
      userAgent: 'UIMS-AdminConsole/2.4.0 (macOS; arm64)',
      statusCode: 201,
      durationMs: 42.5,
      timestamp: new Date(baseDate.getTime() - 86400000 * 5),
      details:
        'Provisioned Active Directory user account for Pham Hoang Nam (BSL Factory IT Manager).',
    },
    {
      id: 'aud-002',
      userId: userMap.get('nam.pham@broadpeak.youngone.com'),
      userEmail: 'nam.pham@broadpeak.youngone.com',
      userName: 'Pham Hoang Nam',
      action: 'USER_PASSWORD_RESET',
      severity: 'Warning',
      status: 'Success',
      entity: 'Le Thi Thu',
      entityType: 'User',
      entityId: userMap.get('thu.le@broadpeak.youngone.com') || 'usr-thu-le',
      ipAddress: '10.232.100.22',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
      statusCode: 200,
      durationMs: 78.1,
      timestamp: new Date(baseDate.getTime() - 86400000 * 4),
      details:
        'Self-service password reset token generated for Le Thi Thu via secure corporate SMS/email channel.',
    },
    {
      id: 'aud-003',
      userId: userMap.get('phong.dang@broadpeak.youngone.com'),
      userEmail: 'phong.dang@broadpeak.youngone.com',
      userName: 'Dang Thanh Phong',
      action: 'ASSET_ASSIGN',
      severity: 'Info',
      status: 'Success',
      entity: 'AST-1001 (MacBook Pro 16" M3)',
      entityType: 'Asset',
      entityId: assetMap.get('AST-1001') || 'ast-1001',
      ipAddress: '10.233.100.18',
      userAgent: 'UIMS-Web/2.4.0 (Edge/128.0; Windows 11)',
      statusCode: 200,
      durationMs: 112.4,
      timestamp: new Date(baseDate.getTime() - 86400000 * 3),
      details:
        'Assigned primary executive laptop AST-1001 to Managing Director Doan Minh Tri at BSH Ho Chi Minh.',
    },
    {
      id: 'aud-004',
      userId: userMap.get('nam.pham@broadpeak.youngone.com'),
      userEmail: 'nam.pham@broadpeak.youngone.com',
      userName: 'Pham Hoang Nam',
      action: 'LICENSE_GRANT',
      severity: 'Info',
      status: 'Success',
      entity: 'Lectra Modaris Expert CAD',
      entityType: 'License',
      entityId: licenseMap.get('lic-lectra') || 'lic-lectra',
      ipAddress: '10.232.100.22',
      userAgent: 'UIMS-Web/2.4.0 (Edge/128.0)',
      statusCode: 200,
      durationMs: 95.0,
      timestamp: new Date(baseDate.getTime() - 86400000 * 2),
      details: 'Allocated 1 dedicated CAD license seat for BSL Garment Cutting Bay workstation.',
    },
    {
      id: 'aud-005',
      userId: userMap.get('admin@uims.internal'),
      userEmail: 'admin@uims.internal',
      userName: 'Enterprise Admin',
      action: 'INVENTORY_RESTOCK',
      severity: 'Info',
      status: 'Success',
      entity: 'LBL-ZBR-100X150',
      entityType: 'Inventory',
      entityId: invMap.get('LBL-ZBR-100X150') || 'inv-lbl',
      ipAddress: '10.233.100.10',
      userAgent: 'UIMS-AdminConsole/2.4.0 (macOS)',
      statusCode: 200,
      durationMs: 64.0,
      timestamp: new Date(baseDate.getTime() - 86400000 * 1),
      details:
        'Received batch restock of 120 rolls of Zebra thermal transfer barcode labels at BSL Soc Trang Warehouse.',
    },
    {
      id: 'aud-006',
      userId: userMap.get('nam.pham@broadpeak.youngone.com'),
      userEmail: 'nam.pham@broadpeak.youngone.com',
      userName: 'Pham Hoang Nam',
      action: 'INVENTORY_RESTOCK',
      severity: 'Info',
      status: 'Success',
      entity: 'CBL-CAT6-UTP-3M',
      entityType: 'Inventory',
      entityId: invMap.get('CBL-CAT6-UTP-3M') || 'inv-cbl-cat6',
      ipAddress: '10.232.100.22',
      userAgent: 'UIMS-AdminConsole/2.4.0 (Windows)',
      statusCode: 200,
      durationMs: 55.0,
      timestamp: new Date(baseDate.getTime() - 43200000),
      details:
        'Restocked 75 units of Cat6 UTP 3m blue patch cables for BSL shop floor network switches.',
    },
  ];

  for (const ev of auditEvents) {
    await prisma.auditLog.upsert({
      where: { id: ev.id },
      update: {},
      create: ev,
    });
  }

  logger.log(`✅ Seeded ${auditEvents.length} structured audit log entries.`);
}
