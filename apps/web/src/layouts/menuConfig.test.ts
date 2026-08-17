import { describe, expect, it, vi } from 'vitest';
import {
  getNavMenuItems,
  getOrgMenuItems,
  getQuickCreateMenu,
  getUserMenuItems,
} from './menuConfig';

describe('menuConfig', () => {
  it('should generate org menu items with callback triggers', () => {
    const setActiveOrg = vi.fn();
    const items = getOrgMenuItems(setActiveOrg);
    expect(items).toBeDefined();
    expect(items?.length).toBe(3);

    // Call first item click
    const firstItem = items?.[0] as { onClick?: () => void };
    firstItem?.onClick?.();
    expect(setActiveOrg).toHaveBeenCalledWith('Acme Enterprise Global HQ');
  });

  it('should generate quick create menu items and navigate', () => {
    const navigate = vi.fn();
    const items = getQuickCreateMenu(navigate);
    expect(items?.length).toBe(5);

    const firstItem = items?.[0] as { onClick?: () => void };
    firstItem?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/users');
  });

  it('should filter quick create menu items based on user permissions', () => {
    const navigate = vi.fn();
    // User only has Asset:create permission
    const can = (action: string, subject: string) => action === 'create' && subject === 'Asset';
    const items = getQuickCreateMenu(navigate, can);
    expect(items?.length).toBe(1);
    expect((items?.[0] as { key: string }).key).toBe('new-asset');
  });

  it('should generate user menu items and handle logout', () => {
    const navigate = vi.fn();
    const handleLogout = vi.fn();
    const items = getUserMenuItems(
      { name: 'Alex Johnson', role: 'Super Admin', email: 'admin@uims.internal' },
      navigate,
      handleLogout,
    );

    expect(items).toBeDefined();
    const logoutItem = items?.find((item) => (item as { key?: string })?.key === 'logout') as {
      onClick?: () => void;
    };
    logoutItem?.onClick?.();
    expect(handleLogout).toHaveBeenCalled();
  });

  it('should generate nav menu items with telemetry badge counts', () => {
    const items = getNavMenuItems(false, false, {
      expiringLicenses: 3,
      lowStockItems: 2,
    });

    expect(items).toBeDefined();
    expect(items?.length).toBeGreaterThan(5);
  });

  it('should filter nav menu items dynamically when permissions are restricted', () => {
    // Read only for Asset and License
    const can = (action: string, subject: string) =>
      action === 'read' && (subject === 'Asset' || subject === 'License');

    const items = getNavMenuItems(false, false, undefined, can);
    expect(items).toBeDefined();

    // Check that group-org is omitted because user cannot read Organization or User
    const groupOrg = items?.find((item) => (item as { key?: string })?.key === 'group-org');
    expect(groupOrg).toBeUndefined();

    // Check that group-assets is included
    const groupAssets = items?.find(
      (item) => (item as { key?: string })?.key === 'group-assets',
    ) as {
      children?: Array<{ key: string }>;
    };
    expect(groupAssets).toBeDefined();
    expect(groupAssets.children?.some((c) => c.key === '/assets')).toBe(true);
    expect(groupAssets.children?.some((c) => c.key === '/licenses')).toBe(true);
    expect(groupAssets.children?.some((c) => c.key === '/network')).toBe(false);
  });
});
