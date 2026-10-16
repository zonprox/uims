import type { PrismaClient } from '@prisma/client';
import { encryptLicenseKey } from '../../src/common/crypto/license-crypto';
import { runDomainSeeder, type SeederContext } from './seeder.utils';

interface SeedUsersResult {
  users?: Record<string, { id: string }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const nowMs = Date.now();
const relativeDateStr = (days: number): string =>
  new Date(nowMs + days * DAY_MS).toISOString().split('T')[0];

export const licenseRows: string[] = [
  // 1. Baseline Enterprise Subscription (Surplus)
  `lic-m365|Microsoft 365 E5 Enterprise Suite|Microsoft Corporation|ven-msft|SUBSCRIPTION|250|456|${relativeDateStr(-365)}|${relativeDateStr(365)}|MS-E5-YON-9921-8834-KKL9|Enterprise productivity, Purview DLP, Defender XDR and Entra ID P2 across BSL & BSH.|binh.tran@youngonevn.com,nam.pham@youngonevn.com,thu.le@youngonevn.com,huy.nguyen@youngonevn.com,kim.vo@youngonevn.com,tri.doan@youngonevn.com,phong.dang@youngonevn.com,lan.nguyen@youngonevn.com,ngoc.vu@youngonevn.com,phuong.bui@youngonevn.com,kien.le@youngonevn.com,son.huynh@youngonevn.com|ACTIVE|true`,

  // 2. Depleted Perpetual License (100% utilized: 6 of 6 seats allocated, matching notif-001)
  `lic-sap|SAP S/4HANA ERP Enterprise User|SAP SE|ven-sap|PERPETUAL|6|1200|${relativeDateStr(-730)}|${relativeDateStr(730)}|SAP-S4H-YON-8849-0192-PROD|Youngone Group global ERP client license for manufacturing, costing & supply chain.|binh.tran@youngonevn.com,tri.doan@youngonevn.com,ngoc.vu@youngonevn.com,lan.nguyen@youngonevn.com,thu.le@youngonevn.com,kim.vo@youngonevn.com|ACTIVE|true`,

  // 3. Depleted Cloud Subscription (100% utilized: 12 of 12 seats allocated)
  `lic-figma|Figma Organization Enterprise|Figma|ven-figma|SUBSCRIPTION|12|540|${relativeDateStr(-300)}|${relativeDateStr(65)}|FIG-ORG-YON-9912-3341-ENT|Enterprise apparel UX design, pattern collaboration and brand assets.|binh.tran@youngonevn.com,nam.pham@youngonevn.com,thu.le@youngonevn.com,huy.nguyen@youngonevn.com,kim.vo@youngonevn.com,tri.doan@youngonevn.com,phong.dang@youngonevn.com,lan.nguyen@youngonevn.com,ngoc.vu@youngonevn.com,phuong.bui@youngonevn.com,kien.le@youngonevn.com,son.huynh@youngonevn.com|ACTIVE|true`,

  // 4. Enterprise Cloud Subscription (90% utilized: 9 of 10 seats allocated)
  `lic-jetbrains|JetBrains All Products Pack|JetBrains|ven-jetbrains|SUBSCRIPTION|10|680|${relativeDateStr(-200)}|${relativeDateStr(165)}|JB-APP-BSL-2024-8849-DEV|IDE developer licenses for industrial automation and systems development.|phong.dang@youngonevn.com,kien.le@youngonevn.com,nam.pham@youngonevn.com,son.huynh@youngonevn.com,bao.pham@youngonevn.com,long.vu@youngonevn.com,son.bui@youngonevn.com,minh.nguyen@youngonevn.com,admin@youngonevn.com|ACTIVE|true`,

  // 5. Expired Commercial License (status: EXPIRED, expiryDate in past, autoRenew: false)
  `lic-autodesk|Autodesk AutoCAD Commercial|Autodesk Inc|ven-autodesk|SUBSCRIPTION|10|1850|${relativeDateStr(-730)}|${relativeDateStr(-60)}|ADSK-ACAD-2023-8821-EXP|Legacy drafting seat quota. Decommissioned after migration to Lectra Modaris platform.||EXPIRED|false`,

  // 6. Expiring Soon License (status: EXPIRING_SOON, expiring in 18 days, autoRenew: false)
  `lic-adobe|Adobe Creative Cloud All Apps Enterprise|Adobe Systems Inc|ven-adobe|SUBSCRIPTION|35|780|${relativeDateStr(-347)}|${relativeDateStr(18)}|ADB-CC-YON-8392-1102-ENT|Apparel design and merchandising catalog creation. Annual agreement expiring soon.|lan.nguyen@youngonevn.com,phuong.bui@youngonevn.com,tri.doan@youngonevn.com|EXPIRING_SOON|false`,

  // 7. Specialized CAD/CAM Subscriptions
  `lic-lectra|Lectra Modaris Expert CAD|Lectra|ven-lectra|SUBSCRIPTION|30|850|${relativeDateStr(-365)}|${relativeDateStr(365)}|LEC-MOD-BSL-2024-9981-CAD|Garment pattern engineering, 3D prototyping & marker making at BSL & BSH.|thu.le@youngonevn.com,lan.nguyen@youngonevn.com,huy.nguyen@youngonevn.com|ACTIVE|true`,
  `lic-gerber|Gerber AccuMark Enterprise|Gerber Technology|ven-gerber|SUBSCRIPTION|20|780|${relativeDateStr(-365)}|${relativeDateStr(365)}|GBR-ACCU-2024-8849-MRK|Pattern design, grading and automatic marker optimization.|thu.le@youngonevn.com,lan.nguyen@youngonevn.com|ACTIVE|true`,
  `lic-fastreact|FastReact Plan Production Scheduler|Coats Digital|ven-coats|SUBSCRIPTION|25|650|${relativeDateStr(-365)}|${relativeDateStr(365)}|COAT-FRP-BSL-8849-SCHED|Apparel capacity planning, sewing line balancing and critical path management.|binh.tran@youngonevn.com,thu.le@youngonevn.com,lan.nguyen@youngonevn.com|ACTIVE|true`,
  `lic-cisco|Cisco Umbrella & AnyConnect Secure Client|Cisco Systems|ven-cisco|SUBSCRIPTION|200|65|${relativeDateStr(-365)}|${relativeDateStr(365)}|CSCO-UMB-YON-9921-SEC|DNS security filtering and SSL-VPN access for remote merchandisers and managers.|tri.doan@youngonevn.com,phong.dang@youngonevn.com,nam.pham@youngonevn.com,kien.le@youngonevn.com,lan.nguyen@youngonevn.com|ACTIVE|true`,
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
          statusOverride,
          autoRenewStr,
        ] = row.split('|');

        const totalSeats = parseInt(totalSeatsStr, 10);
        const costPerSeat = parseFloat(costStr);

        // Safe Vendor Foreign Key Resolution:
        // License.vendorId has a foreign key to Vendor.id. If not in canonical vendors, fallback to null.
        const resolvedVendor =
          ctx?.vendors.get(vendorKey) ||
          ctx?.vendors.get(vendor.toLowerCase()) ||
          vendorMap?.get(vendor.toLowerCase()) ||
          vendorMap?.get(vendorKey) ||
          null;
        const vendorId = resolvedVendor || null;

        // Encrypt key ONCE
        const encryptedKey = encryptLicenseKey(rawKey);
        const licenseType = type as 'SUBSCRIPTION' | 'PERPETUAL';
        const licenseStatus =
          (statusOverride as 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' | 'REVOKED') || 'ACTIVE';
        const autoRenew = autoRenewStr !== undefined ? autoRenewStr === 'true' : true;

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
              status: licenseStatus,
              autoRenew,
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
              status: licenseStatus,
              autoRenew,
              notes,
              usedSeats: 0,
            },
          });

          // Deterministic idempotent upsert of assignments
          const userEmails = emailsStr ? emailsStr.split(',').filter(Boolean) : [];
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
