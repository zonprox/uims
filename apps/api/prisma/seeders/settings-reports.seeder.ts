import type { PrismaClient } from '@prisma/client';

export async function seedSettingsAndReports(prisma: PrismaClient) {
  // 18. System Settings
  await prisma.setting.upsert({
    where: { key: 'general' },
    update: {},
    create: {
      key: 'general',
      group: 'general',
      description: 'General Enterprise Organization Preferences',
      value: {
        companyName: 'Acme Enterprise Global Inc.',
        supportEmail: 'it-support@company.com',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        primaryDataCenter: 'Equinix NY4 Secaucus',
        complianceFrameworks: ['SOC2 Type II', 'ISO 27001', 'GDPR', 'HIPAA'],
      },
    },
  });

  await prisma.setting.upsert({
    where: { key: 'security' },
    update: {},
    create: {
      key: 'security',
      group: 'security',
      description: 'Security, SAML SSO & Authentication Governance Policy',
      value: {
        enforce2FA: true,
        sessionTimeout: 30,
        minPasswordLength: 12,
        samlEntityId: 'https://uims.internal/saml/metadata',
        allowedCidrRanges: ['192.168.0.0/16', '10.0.0.0/8', '172.16.0.0/12'],
        autoLockInactiveAccountsDays: 90,
      },
    },
  });

  // 19. Report Schedules
  const reportSchedules = [
    {
      title: 'Quarterly Asset Valuation & Depreciation Curve',
      category: 'Finance & Hardware',
      frequency: 'Quarterly (1st of Quarter)',
      format: 'PDF + Excel summary',
      recipients: 'lisa.wang@company.com, alex.johnson@company.com',
    },
    {
      title: 'Monthly SaaS License Optimization & Waste Audit',
      category: 'Software & Cloud',
      frequency: 'Monthly (1st of Month)',
      format: 'PDF + Excel summary',
      recipients: 'procurement-finance@company.com, cio@company.com',
    },
    {
      title: 'Weekly Hardware Stock & Consumables Consumption Audit',
      category: 'Operations & Inventory',
      frequency: 'Weekly (Mondays 08:00 UTC)',
      format: 'PDF',
      recipients: 'it-ops@company.com, robert.torres@company.com',
    },
    {
      title: 'Continuous SOC2 & ISO 27001 Compliance Audit Telemetry',
      category: 'Security & Compliance',
      frequency: 'Continuous / Monthly Digest',
      format: 'PDF + Raw CSV Data Stream',
      recipients: 'compliance@uims.internal, auditor.marcus@uims.internal',
    },
  ];

  for (const rs of reportSchedules) {
    await prisma.reportSchedule.create({
      data: rs,
    });
  }
}
