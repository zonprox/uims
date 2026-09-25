import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../../services/assets.service';
import { buildAssetPayload } from './useAssetManagement';

describe('useAssetManagement helpers', () => {
  it('should format dates and fields in buildAssetPayload without specs', () => {
    const now = dayjs('2026-01-15');
    const future = dayjs('2029-01-15');

    const payload = buildAssetPayload({
      tag: 'AST-1099',
      name: 'Dell XPS 16',
      manufacturer: 'Dell',
      model: 'XPS 9640',
      serialNumber: 'SN-998811',
      category: 'Laptops / Notebooks',
      categoryId: 'cat-laptop',
      status: 'Active',
      assignedTo: 'Marcus Vance',
      location: 'NY Office - Floor 4',
      purchaseDate: now,
      purchasePrice: 2499,
      warrantyExpiry: future,
      notes: 'Dock included. Assigned to senior developer.',
    });

    expect(payload).toEqual({
      tag: 'AST-1099',
      name: 'Dell XPS 16',
      manufacturer: 'Dell',
      model: 'XPS 9640',
      serialNumber: 'SN-998811',
      category: 'Laptops / Notebooks',
      categoryId: 'cat-laptop',
      status: 'Active',
      assignedTo: 'Marcus Vance',
      assignedToId: undefined,
      department: undefined,
      departmentId: undefined,
      location: 'NY Office - Floor 4',
      locationId: undefined,
      purchaseDate: '2026-01-15',
      purchasePrice: 2499,
      warrantyExpiry: '2029-01-15',
      notes: 'Dock included. Assigned to senior developer.',
    });
    expect(payload).not.toHaveProperty('specs');
  });

  it('should build payload for network hardware retaining notes and omitting specs', () => {
    const payload = buildAssetPayload({
      tag: 'AST-SW-01',
      name: 'Cisco Catalyst 9300-48P',
      manufacturer: 'Cisco',
      model: 'C9300-48P',
      serialNumber: 'FCW2340A01B',
      category: 'Network Switches',
      categoryId: 'cat-switch',
      status: 'Active',
      notes: '48x 1GbE PoE+, 4x 10G SFP+ Uplinks',
    });

    expect(payload.categoryId).toBe('cat-switch');
    expect(payload.notes).toBe('48x 1GbE PoE+, 4x 10G SFP+ Uplinks');
    expect(payload).not.toHaveProperty('specs');
  });

  it('should preserve relational IDs in buildAssetPayload', () => {
    const payload = buildAssetPayload({
      tag: 'AST-1099',
      name: 'Dell XPS 16',
      categoryId: 'cat-uuid-1',
      assignedToId: 'user-uuid-1',
      locationId: 'loc-uuid-1',
      departmentId: 'dept-uuid-1',
      status: 'Active',
    });

    expect(payload.categoryId).toBe('cat-uuid-1');
    expect(payload.assignedToId).toBe('user-uuid-1');
    expect(payload.locationId).toBe('loc-uuid-1');
    expect(payload.departmentId).toBe('dept-uuid-1');
  });

  it('should properly extract and populate form fields in handleOpenEditModal simulation without specs', () => {
    const mockForm = {
      setFieldsValue: vi.fn(),
    };

    const assetToEdit: Asset = {
      id: 'ast-sw-002',
      tag: 'AST-SW-002',
      name: 'Aruba CX 6200F',
      manufacturer: 'Aruba HPE',
      model: 'CX 6200F 24G',
      serialNumber: 'SG98124011',
      category: 'Network Switches',
      categoryId: 'cat-switch',
      status: 'Active',
      assignedTo: 'Network Operations',
      assignedToId: 'usr-net-01',
      assignedEmail: 'netops@youngonevn.com',
      location: 'Primary DC - Rack 04',
      locationId: 'loc-dc-rack4',
      department: 'IT Infrastructure',
      departmentId: 'dept-infra-01',
      purchaseDate: '2026-02-10',
      purchasePrice: 2200,
      warrantyExpiry: '2029-02-10',
      notes: 'Primary core switch in Rack 04',
    };

    const resolvedCategoryId =
      assetToEdit.categoryId ||
      (typeof assetToEdit.category === 'string' ? assetToEdit.category : undefined);

    mockForm.setFieldsValue({
      ...assetToEdit,
      categoryId: resolvedCategoryId,
      assignedToId: assetToEdit.assignedToId,
      locationId: assetToEdit.locationId,
      departmentId: assetToEdit.departmentId,
      purchaseDate: assetToEdit.purchaseDate ? dayjs(assetToEdit.purchaseDate) : undefined,
      warrantyExpiry: assetToEdit.warrantyExpiry ? dayjs(assetToEdit.warrantyExpiry) : undefined,
      notes: assetToEdit.notes,
    });

    expect(mockForm.setFieldsValue).toHaveBeenCalledTimes(1);
    const populatedValues = mockForm.setFieldsValue.mock.calls[0][0] as Record<string, unknown>;

    expect(populatedValues.categoryId).toBe('cat-switch');
    expect(populatedValues.notes).toBe('Primary core switch in Rack 04');
    expect(populatedValues).not.toHaveProperty('specs');
    expect(dayjs.isDayjs(populatedValues.purchaseDate)).toBe(true);
    expect(dayjs.isDayjs(populatedValues.warrantyExpiry)).toBe(true);
  });
});
