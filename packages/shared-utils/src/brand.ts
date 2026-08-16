/**
 * UIMS Enterprise System Information & Standard Brand Credits
 * Single Source of Truth for system metadata, versioning, and unified copyright.
 */

export const SYSTEM_INFO = {
  name: 'UIMS Enterprise',
  shortName: 'UIMS',
  version: '2.4.0',
  releaseChannel: 'Enterprise LTS (2026 Edition)',
  buildDate: '2026-08-15',
  tagline: 'Unified IT Infrastructure & Assets Management Platform',
  copyright: '© 2026 UIMS Enterprise. All rights reserved.',
  fullCredit: 'UIMS Enterprise v2.4 • Unified IT Infrastructure & Assets Management Platform',
  footerCredit:
    '© 2026 UIMS Enterprise v2.4 • Unified IT Infrastructure & Assets Management Platform. All rights reserved.',
  securityStandard: 'FIPS 140-3 & AES-256-GCM Enterprise Compliant',
  links: {
    helpCenter: '/help',
    apiDocs: '/api/v1/docs',
    status: '/status',
  },
} as const;

export type SystemInfo = typeof SYSTEM_INFO;
