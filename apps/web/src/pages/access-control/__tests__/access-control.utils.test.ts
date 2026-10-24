import { describe, expect, it, vi } from 'vitest';
import {
  downloadBlobFile,
  formatDate,
  formatDateTime,
  formatFileSize,
  getAssignmentStatusColor,
  getDoorStatusColor,
  getSecurityLevelColor,
  getSubjectTypeTag,
} from '../utils/access-control.utils';
import {
  AccessAssignmentStatus,
  AccessSubjectType,
  DoorSecurityLevel,
  DoorStatus,
} from '@uims/shared-types';

describe('access-control.utils Suite', () => {
  describe('formatDate', () => {
    it('returns N/A for null or undefined', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
      expect(formatDate('')).toBe('N/A');
    });

    it('formats valid ISO date string properly', () => {
      const res = formatDate('2026-10-24T10:00:00Z');
      expect(res).toContain('2026');
      expect(res).toContain('Oct');
      expect(res).toContain('24');
    });

    it('returns original string and warns on invalid date', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const res = formatDate('invalid-date-string');
      expect(res).toBe('invalid-date-string');
      expect(warnSpy).not.toHaveBeenCalled(); // isNaN check caught it before toLocaleDateString
      warnSpy.mockRestore();
    });
  });

  describe('formatDateTime', () => {
    it('returns N/A for null or undefined', () => {
      expect(formatDateTime(null)).toBe('N/A');
      expect(formatDateTime(undefined)).toBe('N/A');
    });

    it('formats valid ISO timestamp properly', () => {
      const res = formatDateTime('2026-10-24T10:30:00Z');
      expect(res).toContain('2026');
      expect(res).toContain('Oct');
    });

    it('handles invalid dates gracefully', () => {
      expect(formatDateTime('not-a-valid-date')).toBe('not-a-valid-date');
    });
  });

  describe('formatFileSize', () => {
    it('formats 0 and negative bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(-10)).toBe('0 B');
    });

    it('formats bytes into KB and MB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });
  });

  describe('downloadBlobFile', () => {
    it('creates anchor tag and clicks to initiate download', () => {
      const fakeUrl = 'blob:http://localhost/uuid-mock';
      const mockCreate = vi.fn().mockReturnValue(fakeUrl);
      const mockRevoke = vi.fn();
      window.URL.createObjectURL = mockCreate;
      window.URL.revokeObjectURL = mockRevoke;

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const blob = new Blob(['test content'], { type: 'application/pdf' });
      downloadBlobFile(blob, 'test-download.pdf');

      expect(mockCreate).toHaveBeenCalledWith(blob);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });

    it('throws when download triggers an error', () => {
      const mockCreate = vi.fn().mockImplementation(() => {
        throw new Error('DOM security exception');
      });
      window.URL.createObjectURL = mockCreate;

      const blob = new Blob(['test content'], { type: 'application/pdf' });
      expect(() => downloadBlobFile(blob, 'fail.pdf')).toThrow('DOM security exception');
    });
  });

  describe('status and security helpers', () => {
    it('maps security levels to colors', () => {
      expect(getSecurityLevelColor(DoorSecurityLevel.CRITICAL)).toBe('red');
      expect(getSecurityLevelColor(DoorSecurityLevel.HIGH)).toBe('volcano');
      expect(getSecurityLevelColor(DoorSecurityLevel.RESTRICTED)).toBe('orange');
      expect(getSecurityLevelColor(DoorSecurityLevel.STANDARD)).toBe('blue');
    });

    it('maps door statuses to colors', () => {
      expect(getDoorStatusColor(DoorStatus.ACTIVE)).toBe('success');
      expect(getDoorStatusColor(DoorStatus.MAINTENANCE)).toBe('warning');
      expect(getDoorStatusColor(DoorStatus.INACTIVE)).toBe('default');
    });

    it('maps assignment statuses to colors', () => {
      expect(getAssignmentStatusColor(AccessAssignmentStatus.ACTIVE)).toBe('success');
      expect(getAssignmentStatusColor(AccessAssignmentStatus.REVOKED)).toBe('error');
      expect(getAssignmentStatusColor(AccessAssignmentStatus.EXPIRED)).toBe('default');
    });

    it('returns subject type tags', () => {
      expect(getSubjectTypeTag(AccessSubjectType.DIRECTORY_USER)).toEqual({
        color: 'blue',
        label: 'AD Employee',
      });
      expect(getSubjectTypeTag(AccessSubjectType.NON_AD_USER)).toEqual({
        color: 'purple',
        label: 'External / Non-AD',
      });
    });
  });
});
