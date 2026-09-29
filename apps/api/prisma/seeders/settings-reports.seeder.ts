import type { PrismaClient } from '@prisma/client';
import { runDomainSeeder, type SeederContext } from './seeder.utils';

export const generalSettings = {
  companyName: 'Broadpeak (Youngone Group)',
  supportEmail: 'it-support@youngonevn.com',
  timezone: 'Asia/Ho_Chi_Minh',
  dateFormat: 'YYYY-MM-DD',
  primaryDataCenter: 'BSH Regional Data Center (Ho Chi Minh)',
  operatingCompanies: ['BSL (Soc Trang)', 'BSH (Ho Chi Minh)'],
  complianceFrameworks: ['ISO 9001', 'ISO 27001', 'WRAP', 'Higg Index'],
};

export const securitySettings = {
  enforce2FA: true,
  sessionTimeout: 30,
  minPasswordLength: 12,
  samlEntityId: 'https://youngonevn.com/saml/metadata',
  allowedCidrRanges: ['10.232.0.0/16', '10.233.0.0/16', '192.168.0.0/16'],
  autoLockInactiveAccountsDays: 90,
};

export const notificationSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
  toastEnabled: true,
  toastDuration: 4.5,
  categories: {
    alerts: true,
    tasks: true,
    general: true,
    system: true,
  },
};

export const reportSchedules = [
  {
    id: 'rep-asset-val',
    title: 'Quarterly Asset Valuation & Depreciation Curve',
    category: 'Finance & Hardware',
    frequency: 'Quarterly (1st of Quarter)',
    format: 'PDF + Excel summary',
    recipients: 'ngoc.vu@youngonevn.com, tri.doan@youngonevn.com',
  },
  {
    id: 'rep-license-audit',
    title: 'Monthly SaaS License Optimization & Waste Audit',
    category: 'Software & Cloud',
    frequency: 'Monthly (1st of Month)',
    format: 'PDF + Excel summary',
    recipients: 'phong.dang@youngonevn.com, nam.pham@youngonevn.com',
  },
  {
    id: 'rep-stock-audit',
    title: 'Weekly Hardware Stock & Consumables Consumption Audit',
    category: 'Operations & Inventory',
    frequency: 'Weekly (Mondays 08:00 ICT)',
    format: 'Excel Spreadsheet',
    recipients: 'kim.vo@youngonevn.com, nam.pham@youngonevn.com',
  },
  {
    id: 'rep-network-cap',
    title: 'Bi-Weekly Network Capacity & IP Allocation Report',
    category: 'Infrastructure & Security',
    frequency: 'Bi-Weekly (Fridays 17:00 ICT)',
    format: 'PDF Diagnostic Document',
    recipients: 'kien.le@youngonevn.com, son.huynh@youngonevn.com',
  },
];

export async function seedSettingsAndReports(prisma: PrismaClient, _ctx?: SeederContext) {
  return runDomainSeeder(
    'SettingsReportsSeeder',
    '⚙️',
    'System Settings & Scheduled Reports',
    async (domainLogger) => {
      // 1. System Settings with extracted constant payloads
      await prisma.setting.upsert({
        where: { key: 'general' },
        update: { value: generalSettings },
        create: {
          key: 'general',
          group: 'general',
          description: 'General Enterprise Organization Preferences for Broadpeak',
          value: generalSettings,
        },
      });

      await prisma.setting.upsert({
        where: { key: 'security' },
        update: { value: securitySettings },
        create: {
          key: 'security',
          group: 'security',
          description: 'Security, SAML SSO & Authentication Governance Policy',
          value: securitySettings,
        },
      });

      await prisma.setting.upsert({
        where: { key: 'notifications' },
        update: { value: notificationSettings },
        create: {
          key: 'notifications',
          group: 'notifications',
          description: 'System Notification Preferences & Tone Configuration',
          value: notificationSettings,
        },
      });

      // 2. Report Schedules with deterministic IDs and atomic upserts
      for (const rep of reportSchedules) {
        await prisma.reportSchedule.upsert({
          where: { id: rep.id },
          update: {
            title: rep.title,
            category: rep.category,
            frequency: rep.frequency,
            format: rep.format,
            recipients: rep.recipients,
          },
          create: rep,
        });
      }

      domainLogger.log(`Seeded system settings and ${reportSchedules.length} report schedules.`);
    },
  );
}
