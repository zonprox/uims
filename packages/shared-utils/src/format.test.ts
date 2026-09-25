import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate } from './format';

describe('format utilities', () => {
  it('should format currency', () => {
    expect(formatCurrency(100)).toContain('100');
  });

  it('should format date', () => {
    expect(formatDate('2026-08-14')).toBe('2026-08-14');
  });
});
