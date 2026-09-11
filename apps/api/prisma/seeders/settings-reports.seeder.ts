import type { PrismaClient } from '@prisma/client';

export async function seedSettingsAndReports(prisma: PrismaClient) {
  // 1. System Settings
  await prisma.setting.upsert({
    where: { key: 'general' },
    update: {
      value: {
        companyName: 'Broadpeak (Youngone Group)',
        supportEmail: 'it-support@broadpeak.youngone.com',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'YYYY-MM-DD',
        primaryDataCenter: 'BSH Regional Data Center (Ho Chi Minh)',
        operatingCompanies: ['BSL (Soc Trang)', 'BSH (Ho Chi Minh)'],
        complianceFrameworks: ['ISO 9001', 'ISO 27001', 'WRAP', 'Higg Index'],
      },
    },
    create: {
      key: 'general',
      group: 'general',
      description: 'General Enterprise Organization Preferences for Broadpeak',
      value: {
        companyName: 'Broadpeak (Youngone Group)',
        supportEmail: 'it-support@broadpeak.youngone.com',
        timezone: 'Asia/Ho_Chi_Minh',
        dateFormat: 'YYYY-MM-DD',
        primaryDataCenter: 'BSH Regional Data Center (Ho Chi Minh)',
        operatingCompanies: ['BSL (Soc Trang)', 'BSH (Ho Chi Minh)'],
        complianceFrameworks: ['ISO 9001', 'ISO 27001', 'WRAP', 'Higg Index'],
      },
    },
  });

  await prisma.setting.upsert({
    where: { key: 'security' },
    update: {
      value: {
        enforce2FA: true,
        sessionTimeout: 30,
        minPasswordLength: 12,
        samlEntityId: 'https://uims.internal/saml/metadata',
        allowedCidrRanges: ['10.232.0.0/16', '10.233.0.0/16', '192.168.0.0/16'],
        autoLockInactiveAccountsDays: 90,
      },
    },
    create: {
      key: 'security',
      group: 'security',
      description: 'Security, SAML SSO & Authentication Governance Policy',
      value: {
        enforce2FA: true,
        sessionTimeout: 30,
        minPasswordLength: 12,
        samlEntityId: 'https://uims.internal/saml/metadata',
        allowedCidrRanges: ['10.232.0.0/16', '10.233.0.0/16', '192.168.0.0/16'],
        autoLockInactiveAccountsDays: 90,
      },
    },
  });

  // 2. Report Schedules
  const reportSchedules = [
    {
      title: 'Quarterly Asset Valuation & Depreciation Curve',
      category: 'Finance & Hardware',
      frequency: 'Quarterly (1st of Quarter)',
      format: 'PDF + Excel summary',
      recipients: 'ngoc.vu@broadpeak.youngone.com, tri.doan@broadpeak.youngone.com',
    },
    {
      title: 'Monthly SaaS License Optimization & Waste Audit',
      category: 'Software & Cloud',
      frequency: 'Monthly (1st of Month)',
      format: 'PDF + Excel summary',
      recipients: 'phong.dang@broadpeak.youngone.com, nam.pham@broadpeak.youngone.com',
    },
    {
      title: 'Weekly Hardware Stock & Consumables Consumption Audit',
      category: 'Operations & Inventory',
      frequency: 'Weekly (Mondays 08:00 ICT)',
      format: 'Excel Spreadsheet',
      recipients: 'kim.vo@broadpeak.youngone.com, nam.pham@broadpeak.youngone.com',
    },
    {
      title: 'Bi-Weekly Network Capacity & IP Allocation Report',
      category: 'Infrastructure & Security',
      frequency: 'Bi-Weekly (Fridays 17:00 ICT)',
      format: 'PDF Diagnostic Document',
      recipients: 'kien.le@broadpeak.youngone.com, son.huynh@broadpeak.youngone.com',
    },
  ];

  for (const rep of reportSchedules) {
    const existing = await prisma.reportSchedule.findFirst({
      where: { title: rep.title },
    });
    if (existing) {
      await prisma.reportSchedule.update({
        where: { id: existing.id },
        data: rep,
      });
    } else {
      await prisma.reportSchedule.create({
        data: rep,
      });
    }
  }
}
