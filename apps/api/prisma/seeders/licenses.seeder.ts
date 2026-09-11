import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';

const logger = new Logger('LicensesSeeder');

interface SeedUsersResult {
  roles?: Record<string, { id: string }>;
  users: Record<string, { id: string }>;
}

export async function seedLicenses(prisma: PrismaClient, users: SeedUsersResult) {
  logger.log('📄 Seeding Software Licenses and Normalized User Assignments...');
  const { users: u } = users;

  const licenseDefinitions = [
    {
      id: 'lic-m365',
      name: 'Microsoft 365 E5 Enterprise Suite',
      vendor: 'Microsoft Corporation',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 150,
      costPerSeat: 456,
      purchaseDate: new Date('2024-01-01'),
      expiryDate: new Date('2026-12-31'),
      licenseKey: 'MS-E5-9921-8834-KKL9-2026',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Core enterprise productivity, Purview DLP, Defender XDR and Entra ID P2.',
    },
    {
      id: 'lic-adobe',
      name: 'Adobe Creative Cloud All Apps Enterprise',
      vendor: 'Adobe Systems Inc',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 30,
      costPerSeat: 780,
      purchaseDate: new Date('2023-09-15'),
      expiryDate: new Date('2026-09-15'),
      licenseKey: 'ADB-CC-8392-1102-LKLM-PRO',
      status: 'EXPIRING_SOON' as const,
      autoRenew: false,
      notes: 'Renewal contract pending procurement approval with Adobe VIP reseller.',
    },
    {
      id: 'lic-jetbrains',
      name: 'JetBrains All Products Pack (Commercial)',
      vendor: 'JetBrains s.r.o.',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 45,
      costPerSeat: 249,
      purchaseDate: new Date('2024-03-01'),
      expiryDate: new Date('2027-02-28'),
      licenseKey: 'JB-ALL-7731-9941-PPX1-2027',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Includes IntelliJ IDEA Ultimate, WebStorm, GoLand, PyCharm and RustRover.',
    },
    {
      id: 'lic-figma',
      name: 'Figma Enterprise Design Workspace',
      vendor: 'Figma Inc',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 35,
      costPerSeat: 540,
      purchaseDate: new Date('2023-11-30'),
      expiryDate: new Date('2026-11-30'),
      licenseKey: 'FIG-ENT-1192-3381-YYE4-TEAM',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Enterprise design system libraries and unlimited Dev Mode seats.',
    },
    {
      id: 'lic-github',
      name: 'GitHub Enterprise Cloud + Copilot Business',
      vendor: 'GitHub / Microsoft',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 60,
      costPerSeat: 252,
      purchaseDate: new Date('2024-01-15'),
      expiryDate: new Date('2027-01-15'),
      licenseKey: 'GH-ENT-COPILOT-9982-1144',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Advanced Security (CodeQL, Dependabot) and AI code completions.',
    },
    {
      id: 'lic-crowdstrike',
      name: 'CrowdStrike Falcon Complete Endpoint EDR',
      vendor: 'CrowdStrike Inc',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 200,
      costPerSeat: 180,
      purchaseDate: new Date('2023-06-01'),
      expiryDate: new Date('2026-06-01'),
      licenseKey: 'CS-FALCON-CCID-91820492-X88',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: '24/7 Managed detection and response across all company laptops and servers.',
    },
    {
      id: 'lic-datadog',
      name: 'Datadog Enterprise APM & Pro Suite',
      vendor: 'Datadog Inc',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 25,
      costPerSeat: 1800,
      purchaseDate: new Date('2023-10-01'),
      expiryDate: new Date('2026-10-01'),
      licenseKey: 'DD-API-KEY-88491024-SYNTH',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Infrastructure metric collectors, APM distributed traces and synthetic tests.',
    },
    {
      id: 'lic-slack',
      name: 'Slack Enterprise Grid Plan',
      vendor: 'Slack Technologies / Salesforce',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 160,
      costPerSeat: 180,
      purchaseDate: new Date('2024-01-01'),
      expiryDate: new Date('2026-12-31'),
      licenseKey: 'SLK-GRID-ORG-99218491-PROD',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Enterprise key management, unlimited channels and DLP audit streams.',
    },
    {
      id: 'lic-okta',
      name: 'Okta Workforce Identity Cloud (Adaptive MFA)',
      vendor: 'Okta Inc',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 150,
      costPerSeat: 72,
      purchaseDate: new Date('2024-01-01'),
      expiryDate: new Date('2026-12-31'),
      licenseKey: 'OKTA-TENANT-uims-internal.okta.com',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Universal Directory, Single Sign-On and Adaptive MFA with FastPass.',
    },
    {
      id: 'lic-zoom',
      name: 'Zoom Workplace Enterprise E4 Suite',
      vendor: 'Zoom Video Communications',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 80,
      costPerSeat: 240,
      purchaseDate: new Date('2023-12-15'),
      expiryDate: new Date('2026-12-15'),
      licenseKey: 'ZM-ENT-99120-ROOMS-500',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Zoom Rooms, 500-attendee webinars and cloud meeting transcripts.',
    },
    {
      id: 'lic-salesforce',
      name: 'Salesforce Sales Cloud Unlimited Edition',
      vendor: 'Salesforce.com',
      type: 'SUBSCRIPTION' as const,
      totalSeats: 20,
      costPerSeat: 3600,
      purchaseDate: new Date('2024-02-01'),
      expiryDate: new Date('2027-01-31'),
      licenseKey: 'SFDC-ORG-00D5e000000XyZ1',
      status: 'ACTIVE' as const,
      autoRenew: true,
      notes: 'Global CRM and pipeline tracking for sales executive teams.',
    },
    {
      id: 'lic-vmware',
      name: 'VMware vSphere Enterprise Plus (v8.0)',
      vendor: 'Broadcom / VMware',
      type: 'PERPETUAL' as const,
      totalSeats: 8,
      costPerSeat: 3500,
      purchaseDate: new Date('2023-05-01'),
      expiryDate: new Date('2028-05-01'),
      licenseKey: 'VMW-VSP-4491-0021-HH82-ESX8',
      status: 'ACTIVE' as const,
      autoRenew: false,
      notes: 'Per-CPU socket license with Tanzu Kubernetes grid integration.',
    },
  ];

  // 1. Initial License Definitions (Upsert with initial usedSeats: 0)
  for (const lic of licenseDefinitions) {
    await prisma.license.upsert({
      where: { id: lic.id },
      update: {
        name: lic.name,
        vendor: lic.vendor,
        type: lic.type,
        totalSeats: lic.totalSeats,
        costPerSeat: lic.costPerSeat,
        purchaseDate: lic.purchaseDate,
        expiryDate: lic.expiryDate,
        licenseKey: lic.licenseKey,
        status: lic.status,
        autoRenew: lic.autoRenew,
        notes: lic.notes,
      },
      create: {
        ...lic,
        usedSeats: 0,
      },
    });
  }

  // 2. Normalized License Assignments (Relational Foreign Key Binding)
  const candidateAssignments: Array<{ licenseId: string; userObj: { id: string } | undefined }> = [
    // Microsoft 365 E5
    { licenseId: 'lic-m365', userObj: u.userAlex },
    { licenseId: 'lic-m365', userObj: u.userSarah },
    { licenseId: 'lic-m365', userObj: u.userMichael },
    { licenseId: 'lic-m365', userObj: u.userDavidKim },
    { licenseId: 'lic-m365', userObj: u.userSophiaPatel },
    { licenseId: 'lic-m365', userObj: u.userMarcusVance },
    { licenseId: 'lic-m365', userObj: u.userElena },
    { licenseId: 'lic-m365', userObj: u.userRobertTorres },
    { licenseId: 'lic-m365', userObj: u.userLisaWang },
    { licenseId: 'lic-m365', userObj: u.userRachelAdams },
    // Adobe Creative Cloud
    { licenseId: 'lic-adobe', userObj: u.userMarcusVance },
    { licenseId: 'lic-adobe', userObj: u.userChloeMartin },
    { licenseId: 'lic-adobe', userObj: u.userElena },
    // JetBrains
    { licenseId: 'lic-jetbrains', userObj: u.userDavidKim },
    { licenseId: 'lic-jetbrains', userObj: u.userSophiaPatel },
    { licenseId: 'lic-jetbrains', userObj: u.userLiamNguyen },
    { licenseId: 'lic-jetbrains', userObj: u.userCarlosMendez },
    // Figma
    { licenseId: 'lic-figma', userObj: u.userMarcusVance },
    { licenseId: 'lic-figma', userObj: u.userChloeMartin },
    { licenseId: 'lic-figma', userObj: u.userSophiaPatel },
    // GitHub Enterprise + Copilot
    { licenseId: 'lic-github', userObj: u.userDavidKim },
    { licenseId: 'lic-github', userObj: u.userSophiaPatel },
    { licenseId: 'lic-github', userObj: u.userLiamNguyen },
    { licenseId: 'lic-github', userObj: u.userCarlosMendez },
    // Okta
    { licenseId: 'lic-okta', userObj: u.userAlex },
    { licenseId: 'lic-okta', userObj: u.userSarah },
    { licenseId: 'lic-okta', userObj: u.userDavidKim },
    { licenseId: 'lic-okta', userObj: u.userMarcusVance },
    // Slack
    { licenseId: 'lic-slack', userObj: u.userAlex },
    { licenseId: 'lic-slack', userObj: u.userSarah },
    { licenseId: 'lic-slack', userObj: u.userDavidKim },
    { licenseId: 'lic-slack', userObj: u.userSophiaPatel },
    { licenseId: 'lic-slack', userObj: u.userMarcusVance },
    { licenseId: 'lic-slack', userObj: u.userElena },
    // Zoom
    { licenseId: 'lic-zoom', userObj: u.userAlex },
    { licenseId: 'lic-zoom', userObj: u.userLisaWang },
    { licenseId: 'lic-zoom', userObj: u.userElena },
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

  // 3. Synchronize `usedSeats` mathematically with actual active assignments
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

  logger.log('✅ Synchronized all license seats with active user assignment records.');
}
