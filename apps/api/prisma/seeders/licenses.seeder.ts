import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { encryptLicenseKey } from '../../src/common/crypto/license-crypto';

const logger = new Logger('LicensesSeeder');

interface SeedUsersResult {
  roles?: Record<string, { id: string }>;
  users: Record<string, { id: string }>;
}

export async function seedLicenses(
  prisma: PrismaClient,
  users: SeedUsersResult,
  vendorMap?: Map<string, string>,
) {
  logger.log('📄 Seeding Software Licenses and User Assignments for Broadpeak (Youngone Group)...');
  const { users: u } = users;

  const licenseDefinitions = [
    {
      id: 'lic-m365',
      name: 'Microsoft 365 E5 Enterprise Suite',
      vendor: 'Microsoft Corporation',
      vendorId: vendorMap?.get('microsoft corporation') || 'ven-msft',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 250,
      costPerSeat: 456,
      purchaseDate: new Date('2024-01-01'),
      expiryDate: new Date('2026-12-31'),
      licenseKey: encryptLicenseKey('MS-E5-YON-9921-8834-KKL9'),
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Enterprise productivity, Purview DLP, Defender XDR and Entra ID P2 across BSL & BSH.',
    },
    {
      id: 'lic-sap',
      name: 'SAP S/4HANA ERP Enterprise User',
      vendor: 'SAP SE',
      vendorId: vendorMap?.get('sap se') || 'ven-sap',
      type: 'PERPETUAL' as const,
      totalSeats: 60,
      costPerSeat: 1200,
      purchaseDate: new Date('2023-05-10'),
      expiryDate: new Date('2028-05-10'),
      licenseKey: encryptLicenseKey('SAP-S4H-YON-8849-0192-PROD'),
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Youngone Group global ERP client license for manufacturing, costing & supply chain.',
    },
    {
      id: 'lic-lectra',
      name: 'Lectra Modaris Expert CAD',
      vendor: 'Lectra',
      vendorId: vendorMap?.get('lectra') || 'ven-lectra',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 30,
      costPerSeat: 850,
      purchaseDate: new Date('2024-02-01'),
      expiryDate: new Date('2027-01-31'),
      licenseKey: encryptLicenseKey('LEC-MOD-BSL-2024-9981-CAD'),
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Garment pattern engineering, 3D prototyping & marker making at BSL & BSH.',
    },
    {
      id: 'lic-gerber',
      name: 'Gerber AccuMark Enterprise',
      vendor: 'Gerber Technology',
      vendorId: vendorMap?.get('gerber technology') || 'ven-gerber',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 20,
      costPerSeat: 780,
      purchaseDate: new Date('2024-03-15'),
      expiryDate: new Date('2027-03-15'),
      licenseKey: encryptLicenseKey('GBR-ACCU-2024-8849-MRK'),
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Pattern design, grading and automatic marker optimization.',
    },
    {
      id: 'lic-fastreact',
      name: 'FastReact Plan Production Scheduler',
      vendor: 'Coats Digital',
      vendorId: vendorMap?.get('coats digital') || 'ven-coats',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 25,
      costPerSeat: 650,
      purchaseDate: new Date('2024-01-15'),
      expiryDate: new Date('2026-12-31'),
      licenseKey: encryptLicenseKey('COAT-FRP-BSL-8849-SCHED'),
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Apparel capacity planning, sewing line balancing and critical path management.',
    },
    {
      id: 'lic-adobe',
      name: 'Adobe Creative Cloud All Apps Enterprise',
      vendor: 'Adobe Systems Inc',
      vendorId: vendorMap?.get('adobe systems inc') || 'ven-adobe',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 35,
      costPerSeat: 780,
      purchaseDate: new Date('2023-09-15'),
      expiryDate: new Date('2026-09-15'),
      licenseKey: encryptLicenseKey('ADB-CC-YON-8392-1102-ENT'),
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Apparel design, technical drawings and merchandising catalog creation.',
    },
    {
      id: 'lic-cisco',
      name: 'Cisco Umbrella & AnyConnect Secure Client',
      vendor: 'Cisco Systems',
      vendorId: vendorMap?.get('cisco systems') || 'ven-cisco',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 200,
      costPerSeat: 65,
      purchaseDate: new Date('2024-01-01'),
      expiryDate: new Date('2027-01-01'),
      licenseKey: encryptLicenseKey('CSCO-UMB-YON-9921-SEC'),
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'DNS security filtering and SSL-VPN access for remote merchandisers and managers.',
    },
  ];

  for (const lic of licenseDefinitions) {
    await prisma.license.upsert({
      where: { id: lic.id },
      update: {
        name: lic.name,
        vendor: lic.vendor,
        vendorId: lic.vendorId,
        type: lic.type,
        totalSeats: lic.totalSeats,
        costPerSeat: lic.costPerSeat,
        purchaseDate: lic.purchaseDate,
        expiryDate: lic.expiryDate,
        licenseKey: encryptLicenseKey(lic.licenseKey),
        status: lic.status,
        autoRenew: lic.autoRenew,
        notes: lic.notes,
      },
      create: {
        ...lic,
        licenseKey: encryptLicenseKey(lic.licenseKey),
        usedSeats: 0,
      },
    });
  }

  // 2. Normalized License Assignments
  const defaultUser = Object.values(u)[0];
  const userBinh = u['binh.tran@broadpeak.youngone.com'] || u.userAlex || defaultUser;
  const userNam = u['nam.pham@broadpeak.youngone.com'] || u.userSarah || defaultUser;
  const userThu = u['thu.le@broadpeak.youngone.com'] || u.userCarlosMendez || defaultUser;
  const userHuy = u['huy.nguyen@broadpeak.youngone.com'] || u.userElena || defaultUser;
  const userKim = u['kim.vo@broadpeak.youngone.com'] || u.userRobertTorres || defaultUser;
  const userTri = u['tri.doan@broadpeak.youngone.com'] || u.userMarcusVance || defaultUser;
  const userPhong = u['phong.dang@broadpeak.youngone.com'] || u.userMichael || defaultUser;
  const userLan = u['lan.nguyen@broadpeak.youngone.com'] || u.userSophiaPatel || defaultUser;
  const userNgoc = u['ngoc.vu@broadpeak.youngone.com'] || u.userMarcusBell || defaultUser;
  const userPhuong = u['phuong.bui@broadpeak.youngone.com'] || u.userChloeMartin || defaultUser;
  const userKien = u['kien.le@broadpeak.youngone.com'] || u.userDavidKim || defaultUser;
  const userSon = u['son.huynh@broadpeak.youngone.com'] || u.userLiamNguyen || defaultUser;

  const candidateAssignments: Array<{ licenseId: string; userObj: { id: string } | undefined }> = [
    // Microsoft 365 E5
    { licenseId: 'lic-m365', userObj: userBinh },
    { licenseId: 'lic-m365', userObj: userNam },
    { licenseId: 'lic-m365', userObj: userThu },
    { licenseId: 'lic-m365', userObj: userHuy },
    { licenseId: 'lic-m365', userObj: userKim },
    { licenseId: 'lic-m365', userObj: userTri },
    { licenseId: 'lic-m365', userObj: userPhong },
    { licenseId: 'lic-m365', userObj: userLan },
    { licenseId: 'lic-m365', userObj: userNgoc },
    { licenseId: 'lic-m365', userObj: userPhuong },
    { licenseId: 'lic-m365', userObj: userKien },
    { licenseId: 'lic-m365', userObj: userSon },

    // SAP S/4HANA ERP
    { licenseId: 'lic-sap', userObj: userBinh },
    { licenseId: 'lic-sap', userObj: userTri },
    { licenseId: 'lic-sap', userObj: userNgoc },
    { licenseId: 'lic-sap', userObj: userLan },
    { licenseId: 'lic-sap', userObj: userThu },
    { licenseId: 'lic-sap', userObj: userKim },

    // Lectra Modaris CAD
    { licenseId: 'lic-lectra', userObj: userThu },
    { licenseId: 'lic-lectra', userObj: userLan },
    { licenseId: 'lic-lectra', userObj: userHuy },

    // Gerber AccuMark
    { licenseId: 'lic-gerber', userObj: userThu },
    { licenseId: 'lic-gerber', userObj: userLan },

    // FastReact Plan
    { licenseId: 'lic-fastreact', userObj: userBinh },
    { licenseId: 'lic-fastreact', userObj: userThu },
    { licenseId: 'lic-fastreact', userObj: userLan },

    // Adobe Creative Cloud
    { licenseId: 'lic-adobe', userObj: userLan },
    { licenseId: 'lic-adobe', userObj: userPhuong },
    { licenseId: 'lic-adobe', userObj: userTri },

    // Cisco Umbrella & AnyConnect
    { licenseId: 'lic-cisco', userObj: userTri },
    { licenseId: 'lic-cisco', userObj: userPhong },
    { licenseId: 'lic-cisco', userObj: userNam },
    { licenseId: 'lic-cisco', userObj: userKien },
    { licenseId: 'lic-cisco', userObj: userLan },
  ];

  for (const item of candidateAssignments) {
    if (item.userObj?.id) {
      await prisma.licenseAssignment.create({
        data: {
          licenseId: item.licenseId,
          userId: item.userObj.id,
          assignedAt: new Date(),
        },
      });
    }
  }

  // 3. Synchronize `usedSeats` with actual active assignments
  for (const lic of licenseDefinitions) {
    const activeCount = await prisma.licenseAssignment.count({
      where: {
        licenseId: lic.id,
        unassignedAt: null,
      },
    });

    await prisma.license.update({
      where: { id: lic.id },
      data: { usedSeats: activeCount },
    });
  }

  logger.log(
    `✅ Seeded ${licenseDefinitions.length} enterprise software licenses and synchronized seat counts.`,
  );
}
