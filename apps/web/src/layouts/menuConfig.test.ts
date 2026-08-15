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
    expect(setActiveOrg).toHaveBeenCalledWith('Acme Enterprise HQ (US-East)');
  });

  it('should generate quick create menu items and navigate', () => {
    const navigate = vi.fn();
    const items = getQuickCreateMenu(navigate);
    expect(items?.length).toBe(4);

    const assetItem = items?.[0] as { onClick?: () => void };
    assetItem?.onClick?.();
    expect(navigate).toHaveBeenCalledWith('/assets');
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
    const logoutItem = items?.find(
      (item) => (item as { key?: string })?.key === 'logout',
    ) as { onClick?: () => void };
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
});
