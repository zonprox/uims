import { describe, expect, it } from 'vitest';
import {
  AccountStatus,
  AssetStatus,
  IPStatus,
  LicenseStatus,
  LicenseType,
  TicketPriority,
  TicketStatus,
} from '@uims/shared-types';
import {
  mapAssetStatus,
  mapAssetStatusToLabel,
  mapDirectoryAccountStatus,
  mapDirectoryAccountStatusToLabel,
  mapIPStatus,
  mapIPStatusToLabel,
  mapLicenseStatus,
  mapLicenseStatusToLabel,
  mapLicenseType,
  mapLicenseTypeToLabel,
  mapTicketPriority,
  mapTicketPriorityToLabel,
  mapTicketStatus,
  mapTicketStatusToLabel,
} from './enum';

describe('Enum Normalization & Labeling Utilities', () => {
  describe('mapAssetStatus', () => {
    it('should map legacy string states and enums correctly', () => {
      expect(mapAssetStatus('Active')).toBe(AssetStatus.IN_USE);
      expect(mapAssetStatus('IN_USE')).toBe(AssetStatus.IN_USE);
      expect(mapAssetStatus('In Repair')).toBe(AssetStatus.MAINTENANCE);
      expect(mapAssetStatus('MAINTENANCE')).toBe(AssetStatus.MAINTENANCE);
      expect(mapAssetStatus('In Storage')).toBe(AssetStatus.AVAILABLE);
      expect(mapAssetStatus('AVAILABLE')).toBe(AssetStatus.AVAILABLE);
      expect(mapAssetStatus('Retired')).toBe(AssetStatus.RETIRED);
      expect(mapAssetStatus('Lost')).toBe(AssetStatus.LOST);
      expect(mapAssetStatus(null)).toBe(AssetStatus.AVAILABLE);
    });

    it('should map AssetStatus enum to user-facing labels', () => {
      expect(mapAssetStatusToLabel(AssetStatus.IN_USE)).toBe('Active');
      expect(mapAssetStatusToLabel(AssetStatus.MAINTENANCE)).toBe('In Repair');
      expect(mapAssetStatusToLabel(AssetStatus.AVAILABLE)).toBe('In Storage');
      expect(mapAssetStatusToLabel(AssetStatus.RETIRED)).toBe('Retired');
    });
  });

  describe('mapTicketStatus & mapTicketPriority', () => {
    it('should map ticket status and priorities correctly', () => {
      expect(mapTicketStatus('in_progress')).toBe(TicketStatus.IN_PROGRESS);
      expect(mapTicketStatus('Resolved')).toBe(TicketStatus.RESOLVED);
      expect(mapTicketStatusToLabel(TicketStatus.IN_PROGRESS)).toBe('In Progress');

      expect(mapTicketPriority('Urgent')).toBe(TicketPriority.URGENT);
      expect(mapTicketPriority('High')).toBe(TicketPriority.HIGH);
      expect(mapTicketPriorityToLabel(TicketPriority.URGENT)).toBe('Urgent');
    });
  });

  describe('mapLicenseType & mapLicenseStatus', () => {
    it('should map license types and statuses correctly', () => {
      expect(mapLicenseType('Subscription')).toBe(LicenseType.SUBSCRIPTION);
      expect(mapLicenseType('Perpetual')).toBe(LicenseType.PERPETUAL);
      expect(mapLicenseTypeToLabel(LicenseType.PERPETUAL)).toBe('Perpetual');

      expect(mapLicenseStatus('Expiring')).toBe(LicenseStatus.EXPIRING_SOON);
      expect(mapLicenseStatusToLabel(LicenseStatus.EXPIRING_SOON)).toBe('Expiring');
    });
  });

  describe('mapDirectoryAccountStatus & mapIPStatus', () => {
    it('should map directory status and IP status correctly', () => {
      expect(mapDirectoryAccountStatus('Inactive')).toBe(AccountStatus.DISABLED);
      expect(mapDirectoryAccountStatus('Suspended')).toBe(AccountStatus.SUSPENDED);
      expect(mapDirectoryAccountStatusToLabel(AccountStatus.DISABLED)).toBe('Inactive');

      expect(mapIPStatus('Reserved')).toBe(IPStatus.RESERVED);
      expect(mapIPStatus('Allocated')).toBe(IPStatus.ASSIGNED);
      expect(mapIPStatusToLabel(IPStatus.ASSIGNED)).toBe('Allocated');
    });
  });
});
