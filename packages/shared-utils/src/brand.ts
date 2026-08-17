/**
 * UIMS Enterprise System Information & Standard Brand Credits
 * Single Source of Truth for system metadata, versioning, and unified copyright.
 */

export const SYSTEM_INFO = {
  name: 'UIMS Enterprise',
  shortName: 'UIMS',
  version: '2.4.0',
  releaseChannel: 'Enterprise LTS (2026)',
  buildDate: '2026-08-16',
  tagline: 'Unified IT Management System',
  copyright: '© 2026 UIMS Enterprise. All rights reserved.',
  shortCredit: '© 2026 UIMS Enterprise',
  footerCredit: '© 2026 UIMS Enterprise. All rights reserved.',
  securityStandard: 'FIPS 140-3 & SOC 2 Compliant',
  links: {
    helpCenter: '/help',
    apiDocs: '/api/v1/docs',
    status: '/status',
  },
} as const;

export type SystemInfo = typeof SYSTEM_INFO;
