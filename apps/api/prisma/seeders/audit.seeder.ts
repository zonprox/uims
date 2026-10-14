import * as crypto from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import {
  inTransactionChunks,
  runDomainSeeder,
  type SeederContext,
  upsertById,
} from './seeder.utils';

export function computeSeedAuditHash(signingKey: string, payload: Record<string, unknown>): string {
  return crypto.createHmac('sha256', signingKey).update(JSON.stringify(payload)).digest('hex');
}

export interface AuditSeedItem {
  id: string;
  userEmail: string;
  userName: string;
  action: string;
  severity: string;
  status: string;
  entity: string;
  entityType: string;
  entityKey: string;
  ipAddress: string;
  userAgent: string;
  statusCode: number;
  durationMs: number;
  msAgo: number;
  details: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  diffPayload: Record<string, unknown> | null;
}

export const auditSeedItems: AuditSeedItem[] = [
  {
    id: 'aud-001',
    userEmail: 'admin@youngonevn.com',
    userName: 'Enterprise Admin',
    action: 'USER_PROVISION',
    severity: 'Info',
    status: 'Success',
    entity: 'Pham Hoang Nam',
    entityType: 'User',
    entityKey: 'nam.pham@youngonevn.com',
    ipAddress: '10.232.100.15',
    userAgent: 'UIMS-AdminConsole/2.4.0 (macOS; arm64)',
    statusCode: 201,
    durationMs: 42.5,
    msAgo: 432000000,
    details:
      'Provisioned Active Directory user account for Pham Hoang Nam (BSL Factory IT Manager).',
    oldValue: null,
    newValue: {
      employeeCode: 'BSL-002',
      displayName: 'Pham Hoang Nam',
      department: 'DEPT-BSL-IT',
      status: 'ACTIVE',
      domainJoined: true,
    },
    diffPayload: {
      action: 'CREATE',
      changedKeys: ['employeeCode', 'displayName', 'department', 'status', 'domainJoined'],
    },
  },
  {
    id: 'aud-002',
    userEmail: 'nam.pham@youngonevn.com',
    userName: 'Pham Hoang Nam',
    action: 'USER_PASSWORD_RESET',
    severity: 'Warning',
    status: 'Success',
    entity: 'Le Thi Thu',
    entityType: 'User',
    entityKey: 'thu.le@youngonevn.com',
    ipAddress: '10.232.100.22',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0',
    statusCode: 200,
    durationMs: 78.1,
    msAgo: 345600000,
    details:
      'Self-service password reset token generated for Le Thi Thu via secure corporate SMS/email channel.',
    oldValue: { mustChangePassword: false, lastPasswordChange: '2026-03-01T08:00:00.000Z' },
    newValue: { mustChangePassword: true, lastPasswordChange: '2026-08-16T10:00:00.000Z' },
    diffPayload: { action: 'UPDATE', changedKeys: ['mustChangePassword', 'lastPasswordChange'] },
  },
  {
    id: 'aud-003',
    userEmail: 'phong.dang@youngonevn.com',
    userName: 'Dang Thanh Phong',
    action: 'ASSET_ASSIGN',
    severity: 'Info',
    status: 'Success',
    entity: 'AST-1001 (MacBook Pro 16" M3)',
    entityType: 'Asset',
    entityKey: 'AST-1001',
    ipAddress: '10.233.100.18',
    userAgent: 'UIMS-Web/2.4.0 (Edge/128.0; Windows 11)',
    statusCode: 200,
    durationMs: 112.4,
    msAgo: 259200000,
    details:
      'Assigned primary executive laptop AST-1001 to Managing Director Doan Minh Tri at BSH Ho Chi Minh.',
    oldValue: { status: 'AVAILABLE', assignedTo: null, department: null },
    newValue: {
      status: 'IN_USE',
      assignedTo: 'tri.doan@youngonevn.com',
      department: 'DEPT-BSH-EXEC',
    },
    diffPayload: { action: 'ASSIGN', changedKeys: ['status', 'assignedTo', 'department'] },
  },
  {
    id: 'aud-004',
    userEmail: 'nam.pham@youngonevn.com',
    userName: 'Pham Hoang Nam',
    action: 'LICENSE_GRANT',
    severity: 'Info',
    status: 'Success',
    entity: 'Lectra Modaris Expert CAD',
    entityType: 'License',
    entityKey: 'lic-lectra',
    ipAddress: '10.232.100.22',
    userAgent: 'UIMS-Web/2.4.0 (Edge/128.0)',
    statusCode: 200,
    durationMs: 95.0,
    msAgo: 172800000,
    details: 'Allocated 1 dedicated CAD license seat for BSL Garment Cutting Bay workstation.',
    oldValue: { usedSeats: 2, remainingSeats: 28 },
    newValue: { usedSeats: 3, remainingSeats: 27, assignedTo: 'tuan.nguyen@youngonevn.com' },
    diffPayload: { action: 'ALLOCATE', changedKeys: ['usedSeats', 'remainingSeats'] },
  },
  {
    id: 'aud-005',
    userEmail: 'admin@youngonevn.com',
    userName: 'Enterprise Admin',
    action: 'INVENTORY_RESTOCK',
    severity: 'Info',
    status: 'Success',
    entity: 'LBL-ZBR-100X150',
    entityType: 'Inventory',
    entityKey: 'LBL-ZBR-100X150',
    ipAddress: '10.233.100.10',
    userAgent: 'UIMS-AdminConsole/2.4.0 (macOS)',
    statusCode: 200,
    durationMs: 64.0,
    msAgo: 86400000,
    details:
      'Received batch restock of Zebra thermal barcode labels, bringing quantity to threshold (30 rolls).',
    oldValue: { quantity: 0, status: 'OUT_OF_STOCK' },
    newValue: { quantity: 30, status: 'LOW_STOCK' },
    diffPayload: { action: 'RESTOCK', changedKeys: ['quantity', 'status'] },
  },
  {
    id: 'aud-006',
    userEmail: 'nam.pham@youngonevn.com',
    userName: 'Pham Hoang Nam',
    action: 'INVENTORY_RESTOCK',
    severity: 'Info',
    status: 'Success',
    entity: 'CBL-CAT6-UTP-3M',
    entityType: 'Inventory',
    entityKey: 'CBL-CAT6-UTP-3M',
    ipAddress: '10.232.100.22',
    userAgent: 'UIMS-AdminConsole/2.4.0 (Windows)',
    statusCode: 200,
    durationMs: 55.0,
    msAgo: 43200000,
    details:
      'Restocked 75 units of Cat6 UTP 3m blue patch cables for BSL shop floor network switches.',
    oldValue: { quantity: 15, status: 'LOW_STOCK' },
    newValue: { quantity: 90, status: 'IN_STOCK' },
    diffPayload: { action: 'RESTOCK', changedKeys: ['quantity', 'status'] },
  },
  {
    id: 'aud-007',
    userEmail: 'nam.pham@youngonevn.com',
    userName: 'Pham Hoang Nam',
    action: 'ASSET_STATUS_UPDATE',
    severity: 'Warning',
    status: 'Success',
    entity: 'AST-1010 (BSL Datacenter Core Switch)',
    entityType: 'Asset',
    entityKey: 'AST-1010',
    ipAddress: '10.232.100.22',
    userAgent: 'UIMS-AdminConsole/2.4.0 (macOS)',
    statusCode: 200,
    durationMs: 88.0,
    msAgo: 216000000,
    details: 'Transitioned Datacenter Core Switch AST-1010 to scheduled firmware maintenance.',
    oldValue: { status: 'IN_USE', firmwareVersion: '17.9.4' },
    newValue: {
      status: 'MAINTENANCE',
      firmwareVersion: '17.9.4a',
      notes: 'Scheduled IOS-XE security patch',
    },
    diffPayload: { action: 'MAINTENANCE', changedKeys: ['status', 'firmwareVersion', 'notes'] },
  },
  {
    id: 'aud-008',
    userEmail: 'admin@youngonevn.com',
    userName: 'Enterprise Admin',
    action: 'LICENSE_THRESHOLD_ALERT',
    severity: 'Warning',
    status: 'Success',
    entity: 'SAP S/4HANA ERP Enterprise User',
    entityType: 'License',
    entityKey: 'lic-sap',
    ipAddress: '10.232.100.15',
    userAgent: 'UIMS-SystemDaemon/2.4.0',
    statusCode: 200,
    durationMs: 62.0,
    msAgo: 129600000,
    details: 'Automated license compliance alert: SAP S/4HANA seats reached 100% capacity.',
    oldValue: { usedSeats: 5, utilization: 83.3 },
    newValue: { usedSeats: 6, utilization: 100.0, alertRaised: true },
    diffPayload: { action: 'ALERT', changedKeys: ['usedSeats', 'utilization'] },
  },
  {
    id: 'aud-009',
    userEmail: 'nam.pham@youngonevn.com',
    userName: 'Pham Hoang Nam',
    action: 'INVENTORY_DISPENSE',
    severity: 'Info',
    status: 'Success',
    entity: 'RBN-ZBR-110X300',
    entityType: 'Inventory',
    entityKey: 'RBN-ZBR-110X300',
    ipAddress: '10.232.100.22',
    userAgent: 'UIMS-AdminConsole/2.4.0 (Windows)',
    statusCode: 200,
    durationMs: 55.0,
    msAgo: 43200000,
    details:
      'Dispensed 12 rolls of Zebra thermal ribbons to Factory 1 Logistics, triggering low-stock alert.',
    oldValue: { quantity: 20, status: 'IN_STOCK' },
    newValue: { quantity: 8, status: 'LOW_STOCK', dispensedTo: 'DEPT-BSL-LOG' },
    diffPayload: { action: 'DISPENSE', changedKeys: ['quantity', 'status'] },
  },
  {
    id: 'aud-010',
    userEmail: 'phong.dang@youngonevn.com',
    userName: 'Dang Thanh Phong',
    action: 'SUBNET_CAPACITY_ALERT',
    severity: 'Warning',
    status: 'Success',
    entity: 'Subnet 10.233.100.0/23 (HCM Office D7)',
    entityType: 'Network',
    entityKey: '10.233.100.0/23',
    ipAddress: '10.233.100.18',
    userAgent: 'UIMS-NetworkMonitor/2.4.0',
    statusCode: 200,
    durationMs: 45.0,
    msAgo: 21600000,
    details:
      'Automated IPAM monitor triggered capacity warning: Subnet 10.233.100.0/23 reached 82% allocation.',
    oldValue: { usedIps: 380, utilization: 74.5 },
    newValue: { usedIps: 418, utilization: 82.0, thresholdExceeded: true },
    diffPayload: { action: 'ALERT', changedKeys: ['usedIps', 'utilization'] },
  },
  {
    id: 'aud-011',
    userEmail: 'nam.pham@youngonevn.com',
    userName: 'Pham Hoang Nam',
    action: 'IP_POOL_ALLOCATED',
    severity: 'Warning',
    status: 'Success',
    entity: 'Subnet 10.232.130.0/24 (BSL Access Control)',
    entityType: 'Network',
    entityKey: '10.232.130.0/24',
    ipAddress: '10.232.100.22',
    userAgent: 'UIMS-Web/2.4.0 (Edge/128.0)',
    statusCode: 200,
    durationMs: 50.0,
    msAgo: 7200000,
    details:
      'Batch allocation for BSL Factory access control terminals pushed pool capacity over 90% (235 of 254 used).',
    oldValue: { usedIps: 220, utilization: 86.6 },
    newValue: { usedIps: 235, utilization: 92.5, criticalCapacity: true },
    diffPayload: { action: 'ALLOCATE', changedKeys: ['usedIps', 'utilization'] },
  },
];

export async function seedAudit(prisma: PrismaClient, ctx?: SeederContext) {
  return runDomainSeeder(
    'AuditSeeder',
    '🔒',
    'Enterprise Governance & Audit Logs',
    async (logger) => {
      const baseDate = new Date('2026-08-20T10:00:00Z');

      const resolveEntityId = async (type: string, key: string): Promise<string> => {
        if (type === 'User') {
          return (
            ctx?.directoryUsers.get(key) ||
            ctx?.appUsers.get(key) ||
            (await prisma.appUser.findUnique({ where: { email: key }, select: { id: true } }))
              ?.id ||
            key
          );
        }
        if (type === 'Asset') {
          return (
            ctx?.assets.get(key) ||
            (await prisma.asset.findUnique({ where: { assetTag: key }, select: { id: true } }))
              ?.id ||
            key
          );
        }
        if (type === 'License') {
          return (
            ctx?.licenses.get(key) ||
            (await prisma.license.findUnique({ where: { id: key }, select: { id: true } }))?.id ||
            key
          );
        }
        if (type === 'Inventory') {
          return (
            ctx?.inventory.get(key) ||
            (await prisma.inventoryItem.findUnique({ where: { sku: key }, select: { id: true } }))
              ?.id ||
            key
          );
        }
        if (type === 'Network') {
          return (
            ctx?.subnets?.get(key) ||
            (await prisma.subnet.findUnique({ where: { cidr: key }, select: { id: true } }))?.id ||
            key
          );
        }
        return key;
      };

      const signingKey =
        process.env.AUDIT_SIGNING_KEY ||
        process.env.JWT_SECRET ||
        'default-audit-signing-key-32chars-min!';

      await inTransactionChunks(prisma, auditSeedItems, 50, async (tx, item) => {
        const userId =
          ctx?.appUsers.get(item.userEmail) ||
          (
            await prisma.appUser.findUnique({
              where: { email: item.userEmail },
              select: { id: true },
            })
          )?.id ||
          null;

        const entityId = await resolveEntityId(item.entityType, item.entityKey);
        const timestamp = new Date(baseDate.getTime() - item.msAgo);

        const hashPayload = {
          id: item.id,
          timestamp: timestamp.toISOString(),
          userId,
          userEmail: item.userEmail,
          action: item.action,
          entity: item.entity,
          entityType: item.entityType,
          entityId,
          status: item.status,
          statusCode: item.statusCode,
          details: item.details,
        };
        const hash = computeSeedAuditHash(signingKey, hashPayload);

        const auditData = {
          id: item.id,
          userId,
          userEmail: item.userEmail,
          userName: item.userName,
          action: item.action,
          severity: item.severity,
          status: item.status,
          entity: item.entity,
          entityType: item.entityType,
          entityId,
          ipAddress: item.ipAddress,
          userAgent: item.userAgent,
          statusCode: item.statusCode,
          durationMs: item.durationMs,
          timestamp,
          details: item.details,
          oldValue: item.oldValue ?? undefined,
          newValue: item.newValue ?? undefined,
          diffPayload: item.diffPayload ?? undefined,
          hash,
        };

        return upsertById(tx.auditLog, auditData);
      });

      logger.log(
        `Seeded ${auditSeedItems.length} structured governance audit log records with HMAC signatures.`,
      );
    },
  );
}
