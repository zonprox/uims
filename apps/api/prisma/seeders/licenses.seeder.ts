import type { PrismaClient } from '@prisma/client';
import { encryptLicenseKey } from '../../src/common/crypto/license-crypto';
import { runDomainSeeder, type SeederContext } from './seeder.utils';

interface SeedUsersResult {
  users?: Record<string, { id: string }>;
}

export const licenseRows: string[] = [
  'lic-m365|Microsoft 365 E5 Enterprise Suite|Microsoft Corporation|ven-msft|SUBSCRIPTION|250|456|2024-01-01|2026-12-31|MS-E5-YON-9921-8834-KKL9|Enterprise productivity, Purview DLP, Defender XDR and Entra ID P2 across BSL & BSH.|binh.tran@youngonevn.com,nam.pham@youngonevn.com,thu.le@youngonevn.com,huy.nguyen@youngonevn.com,kim.vo@youngonevn.com,tri.doan@youngonevn.com,phong.dang@youngonevn.com,lan.nguyen@youngonevn.com,ngoc.vu@youngonevn.com,phuong.bui@youngonevn.com,kien.le@youngonevn.com,son.huynh@youngonevn.com',
  'lic-sap|SAP S/4HANA ERP Enterprise User|SAP SE|ven-sap|PERPETUAL|60|1200|2023-05-10|2028-05-10|SAP-S4H-YON-8849-0192-PROD|Youngone Group global ERP client license for manufacturing, costing & supply chain.|binh.tran@youngonevn.com,tri.doan@youngonevn.com,ngoc.vu@youngonevn.com,lan.nguyen@youngonevn.com,thu.le@youngonevn.com,kim.vo@youngonevn.com',
  'lic-lectra|Lectra Modaris Expert CAD|Lectra|ven-lectra|SUBSCRIPTION|30|850|2024-02-01|2027-01-31|LEC-MOD-BSL-2024-9981-CAD|Garment pattern engineering, 3D prototyping & marker making at BSL & BSH.|thu.le@youngonevn.com,lan.nguyen@youngonevn.com,huy.nguyen@youngonevn.com',
  'lic-gerber|Gerber AccuMark Enterprise|Gerber Technology|ven-gerber|SUBSCRIPTION|20|780|2024-03-15|2027-03-15|GBR-ACCU-2024-8849-MRK|Pattern design, grading and automatic marker optimization.|thu.le@youngonevn.com,lan.nguyen@youngonevn.com',
  'lic-fastreact|FastReact Plan Production Scheduler|Coats Digital|ven-coats|SUBSCRIPTION|25|650|2024-01-15|2026-12-31|COAT-FRP-BSL-8849-SCHED|Apparel capacity planning, sewing line balancing and critical path management.|binh.tran@youngonevn.com,thu.le@youngonevn.com,lan.nguyen@youngonevn.com',
  'lic-adobe|Adobe Creative Cloud All Apps Enterprise|Adobe Systems Inc|ven-adobe|SUBSCRIPTION|35|780|2023-09-15|2026-09-15|ADB-CC-YON-8392-1102-ENT|Apparel design, technical drawings and merchandising catalog creation.|lan.nguyen@youngonevn.com,phuong.bui@youngonevn.com,tri.doan@youngonevn.com',
  'lic-cisco|Cisco Umbrella & AnyConnect Secure Client|Cisco Systems|ven-cisco|SUBSCRIPTION|200|65|2024-01-01|2027-01-01|CSCO-UMB-YON-9921-SEC|DNS security filtering and SSL-VPN access for remote merchandisers and managers.|tri.doan@youngonevn.com,phong.dang@youngonevn.com,nam.pham@youngonevn.com,kien.le@youngonevn.com,lan.nguyen@youngonevn.com',
];

export async function seedLicenses(
  prisma: PrismaClient,
  users?: SeedUsersResult,
  vendorMap?: Map<string, string>,
  ctx?: SeederContext,
) {
  return runDomainSeeder(
    'LicensesSeeder',
    '📜',
    'Enterprise Software Licenses & Assignments',
    async (logger) => {
      const userLookupCache = new Map<string, string>();
      const getUserId = async (email: string): Promise<string | null> => {
        if (ctx?.directoryUsers.has(email)) return ctx.directoryUsers.get(email)!;
        if (users?.users?.[email]?.id) return users.users[email].id;
        if (userLookupCache.has(email)) return userLookupCache.get(email)!;
        const dbUser = await prisma.directoryUser.findUnique({
          where: { email },
          select: { id: true },
        });
        if (dbUser) {
          userLookupCache.set(email, dbUser.id);
          return dbUser.id;
        }
        return null;
      };

      for (const row of licenseRows) {
        const [
          id,
          name,
          vendor,
          vendorKey,
          type,
          totalSeatsStr,
          costStr,
          pDate,
          eDate,
          rawKey,
          notes,
          emailsStr,
        ] = row.split('|');

        const totalSeats = parseInt(totalSeatsStr, 10);
        const costPerSeat = parseFloat(costStr);
        const vendorId =
          ctx?.vendors.get(vendorKey) ||
          ctx?.vendors.get(vendor.toLowerCase()) ||
          vendorMap?.get(vendor.toLowerCase()) ||
          vendorMap?.get(vendorKey) ||
          vendorKey;

        // Encrypt key ONCE
        const encryptedKey = encryptLicenseKey(rawKey);
        const licenseType = type as 'SUBSCRIPTION' | 'PERPETUAL';

        await prisma.$transaction(async (tx) => {
          await tx.license.upsert({
            where: { id },
            update: {
              name,
              vendor,
              vendorId,
              type: licenseType,
              totalSeats,
              costPerSeat,
              purchaseDate: new Date(pDate),
              expiryDate: new Date(eDate),
              licenseKey: encryptedKey,
              status: 'ACTIVE',
              autoRenew: true,
              notes,
            },
            create: {
              id,
              name,
              vendor,
              vendorId,
              type: licenseType,
              totalSeats,
              costPerSeat,
              purchaseDate: new Date(pDate),
              expiryDate: new Date(eDate),
              licenseKey: encryptedKey,
              status: 'ACTIVE',
              autoRenew: true,
              notes,
              usedSeats: 0,
            },
          });

          // Deterministic idempotent upsert of assignments
          const userEmails = emailsStr.split(',').filter(Boolean);
          for (const email of userEmails) {
            const userId = await getUserId(email);
            if (userId) {
              const assignmentId = `asgn-${id}-${userId}`;
              await tx.licenseAssignment.upsert({
                where: { id: assignmentId },
                update: {
                  licenseId: id,
                  userId,
                  assignedEmail: email,
                },
                create: {
                  id: assignmentId,
                  licenseId: id,
                  userId,
                  assignedEmail: email,
                  assignedAt: new Date(),
                },
              });
            }
          }

          const activeCount = await tx.licenseAssignment.count({
            where: { licenseId: id, unassignedAt: null },
          });
          await tx.license.update({
            where: { id },
            data: { usedSeats: activeCount },
          });
        });

        if (ctx) {
          ctx.licenses.set(id, id);
          ctx.licenses.set(name, id);
        }
      }

      logger.log(`Seeded ${licenseRows.length} enterprise licenses and synchronized seat counts.`);
    },
  );
}
