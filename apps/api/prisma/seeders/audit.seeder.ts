import type { PrismaClient } from '@prisma/client';
import {
  inTransactionChunks,
  runDomainSeeder,
  type SeederContext,
  upsertById,
} from './seeder.utils';

export const auditRows: string[] = [
  'aud-001|admin@youngonevn.com|Enterprise Admin|USER_PROVISION|Info|Success|Pham Hoang Nam|User|nam.pham@youngonevn.com|10.232.100.15|UIMS-AdminConsole/2.4.0 (macOS; arm64)|201|42.5|432000000|Provisioned Active Directory user account for Pham Hoang Nam (BSL Factory IT Manager).',
  'aud-002|nam.pham@youngonevn.com|Pham Hoang Nam|USER_PASSWORD_RESET|Warning|Success|Le Thi Thu|User|thu.le@youngonevn.com|10.232.100.22|Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0|200|78.1|345600000|Self-service password reset token generated for Le Thi Thu via secure corporate SMS/email channel.',
  'aud-003|phong.dang@youngonevn.com|Dang Thanh Phong|ASSET_ASSIGN|Info|Success|AST-1001 (MacBook Pro 16" M3)|Asset|AST-1001|10.233.100.18|UIMS-Web/2.4.0 (Edge/128.0; Windows 11)|200|112.4|259200000|Assigned primary executive laptop AST-1001 to Managing Director Doan Minh Tri at BSH Ho Chi Minh.',
  'aud-004|nam.pham@youngonevn.com|Pham Hoang Nam|LICENSE_GRANT|Info|Success|Lectra Modaris Expert CAD|License|lic-lectra|10.232.100.22|UIMS-Web/2.4.0 (Edge/128.0)|200|95.0|172800000|Allocated 1 dedicated CAD license seat for BSL Garment Cutting Bay workstation.',
  'aud-005|admin@youngonevn.com|Enterprise Admin|INVENTORY_RESTOCK|Info|Success|LBL-ZBR-100X150|Inventory|LBL-ZBR-100X150|10.233.100.10|UIMS-AdminConsole/2.4.0 (macOS)|200|64.0|86400000|Received batch restock of 120 rolls of Zebra thermal transfer barcode labels at BSL Soc Trang Warehouse.',
  'aud-006|nam.pham@youngonevn.com|Pham Hoang Nam|INVENTORY_RESTOCK|Info|Success|CBL-CAT6-UTP-3M|Inventory|CBL-CAT6-UTP-3M|10.232.100.22|UIMS-AdminConsole/2.4.0 (Windows)|200|55.0|43200000|Restocked 75 units of Cat6 UTP 3m blue patch cables for BSL shop floor network switches.',
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
        return key;
      };

      await inTransactionChunks(prisma, auditRows, 50, async (tx, row) => {
        const [
          id,
          userEmail,
          userName,
          action,
          severity,
          status,
          entity,
          entityType,
          entityKey,
          ipAddress,
          userAgent,
          codeStr,
          durStr,
          msAgoStr,
          details,
        ] = row.split('|');

        const userId =
          ctx?.appUsers.get(userEmail) ||
          (await prisma.appUser.findUnique({ where: { email: userEmail }, select: { id: true } }))
            ?.id ||
          null;

        const entityId = await resolveEntityId(entityType, entityKey);

        const auditData = {
          id,
          userId,
          userEmail,
          userName,
          action,
          severity,
          status,
          entity,
          entityType,
          entityId,
          ipAddress,
          userAgent,
          statusCode: parseInt(codeStr, 10),
          durationMs: parseFloat(durStr),
          timestamp: new Date(baseDate.getTime() - parseInt(msAgoStr, 10)),
          details,
        };

        return upsertById(tx.auditLog, auditData);
      });

      logger.log(`Seeded ${auditRows.length} structured governance audit log records.`);
    },
  );
}
