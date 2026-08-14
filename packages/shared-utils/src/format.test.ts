import { describe, expect, it } from 'vitest';
import { formatBytes, formatCurrency, formatDate } from './format';

describe('format utilities', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('should format currency', () => {
    expect(formatCurrency(100)).toContain('100');
  });

  it('should format date', () => {
    expect(formatDate('2026-08-14')).toBe('2026-08-14');
  });
});
