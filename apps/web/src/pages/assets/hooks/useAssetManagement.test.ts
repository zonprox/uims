import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { buildAssetPayload, buildAssetSpecs } from './useAssetManagement';

describe('useAssetManagement helpers', () => {
  it('should build asset specs correctly', () => {
    const specs = buildAssetSpecs({
      cpu: 'Apple M3 Max',
      ram: '64 GB',
      storage: '1 TB NVMe',
      os: 'macOS Sequoia',
    });

    expect(specs).toEqual({
      cpu: 'Apple M3 Max',
      ram: '64 GB',
      storage: '1 TB NVMe',
      os: 'macOS Sequoia',
    });
  });

  it('should fallback missing specs to N/A', () => {
    const specs = buildAssetSpecs({});
    expect(specs).toEqual({
      cpu: 'N/A',
      ram: 'N/A',
      storage: 'N/A',
      os: 'N/A',
    });
  });

  it('should format dates and fields in buildAssetPayload', () => {
    const now = dayjs('2026-01-15');
    const future = dayjs('2029-01-15');

    const payload = buildAssetPayload({
      tag: 'AST-1099',
      name: 'Dell XPS 16',
      manufacturer: 'Dell',
      model: 'XPS 9640',
      serialNumber: 'SN-998811',
      category: 'Laptop',
      status: 'Active',
      assignedTo: 'Marcus Vance',
      location: 'NY Office - Floor 4',
      purchaseDate: now,
      purchasePrice: 2499,
      warrantyExpiry: future,
      cpu: 'Intel Core Ultra 7',
      ram: '32 GB',
      storage: '1 TB SSD',
      os: 'Windows 11 Pro',
      notes: 'Dock included',
    });

    expect(payload).toEqual({
      tag: 'AST-1099',
      name: 'Dell XPS 16',
      manufacturer: 'Dell',
      model: 'XPS 9640',
      serialNumber: 'SN-998811',
      category: 'Laptop',
      status: 'Active',
      assignedTo: 'Marcus Vance',
      location: 'NY Office - Floor 4',
      purchaseDate: '2026-01-15',
      purchasePrice: 2499,
      warrantyExpiry: '2029-01-15',
      specs: {
        cpu: 'Intel Core Ultra 7',
        ram: '32 GB',
        storage: '1 TB SSD',
        os: 'Windows 11 Pro',
      },
      notes: 'Dock included',
    });
  });
});
