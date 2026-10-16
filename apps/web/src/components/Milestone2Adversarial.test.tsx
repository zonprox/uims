/**
 * Milestone 2 Empirical Adversarial Challenger Test Suite (challenger_m2_2)
 *
 * Verifies:
 * 1. CommandPalette Launcher:
 *    - Search for 'compliance' -> matches Audit item (/audit)
 *    - Search for 'directory' -> matches Directory item (/directory)
 *    - Search for 'records' -> matches Directory description (/directory)
 *    - Search for 'Assets' -> matches Assets item (/assets)
 *    - Search for 'Licenses' -> matches Licenses item (/licenses)
 *    - Case insensitivity, whitespace, extreme/non-matching input strings
 *    - Arrow key navigation & Enter key activation
 * 2. NotificationDrawer:
 *    - Mount/open/tab-switch/search/close/unmount
 *    - ZERO console.warn or console.error emitted (no antd Drawer width deprecation)
 * 3. PageContainer:
 *    - Title whitespace trimming
 *    - Empty breadcrumbs [] omitted cleanly
 *    - Empty stats [] omitted cleanly
 *    - Integer grid column spans for stats (1 to 6 items)
 *    - ZERO console.warn or console.error emitted
 * 4. Production Logging Elimination:
 *    - Programmatic audit of apps/web/src for zero un-gated console.* calls
 */

import { App as AntApp, ConfigProvider } from 'antd';
import fs from 'node:fs';
import path from 'node:path';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommandPalette from './CommandPalette';
import NotificationDrawer from './NotificationDrawer';
import PageContainer, { type PageStatItem } from './PageContainer';
import type { NotificationItem } from '../services/notifications.service';
import { useThemeStore } from '../stores/theme.store';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Milestone 2 Empirical Adversarial Challenger Verification', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  let currentLocation: { pathname: string } = { pathname: '/' };

  const LocationWatcher = () => {
    const loc = useLocation();
    currentLocation = loc;
    return null;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    currentLocation = { pathname: '/' };
    useThemeStore.setState({ mode: 'light', resolvedMode: 'light' });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    container.remove();
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-modal-mask, .ant-drawer')
      .forEach((el) => el.remove());
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. CommandPalette Launcher & Search Verification
  // =========================================================================
  describe('1. CommandPalette Launcher & Search Filtering', () => {
    const renderPalette = async (open = true, onClose = vi.fn()) => {
      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            MemoryRouter,
            { initialEntries: ['/'] },
            createElement(
              ConfigProvider,
              null,
              createElement(
                AntApp,
                null,
                createElement('div', null, [
                  createElement(LocationWatcher, { key: 'watcher' }),
                  createElement(CommandPalette, { key: 'palette', open, onClose }),
                ]),
              ),
            ),
          ),
        );
      });
      return { onClose };
    };

    const typeQuery = async (query: string) => {
      const input = document.querySelector('.ant-modal input') as HTMLInputElement;
      expect(input).toBeDefined();
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setter?.call(input, query);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    };

    it('empirically verifies searching for "compliance" finds Audit and navigates to /audit', async () => {
      const { onClose } = await renderPalette(true);
      await typeQuery('compliance');

      const modalText = document.querySelector('.ant-modal')?.textContent || '';
      expect(modalText).toContain('Audit');
      expect(modalText).toContain('compliance events');

      const input = document.querySelector('.ant-modal input') as HTMLInputElement;
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });

      expect(onClose).toHaveBeenCalled();
      expect(currentLocation.pathname).toBe('/audit');
    });

    it('empirically verifies searching for "directory" finds Directory and navigates to /directory', async () => {
      const { onClose } = await renderPalette(true);
      await typeQuery('directory');

      const modalText = document.querySelector('.ant-modal')?.textContent || '';
      expect(modalText).toContain('Directory');

      const input = document.querySelector('.ant-modal input') as HTMLInputElement;
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });

      expect(onClose).toHaveBeenCalled();
      expect(currentLocation.pathname).toBe('/directory');
    });

    it('empirically verifies searching for "records" matches Directory description and navigates to /directory', async () => {
      const { onClose } = await renderPalette(true);
      await typeQuery('records');

      const modalText = document.querySelector('.ant-modal')?.textContent || '';
      expect(modalText).toContain('Directory');
      expect(modalText).toContain('employee directory records');

      const input = document.querySelector('.ant-modal input') as HTMLInputElement;
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });

      expect(onClose).toHaveBeenCalled();
      expect(currentLocation.pathname).toBe('/directory');
    });

    it('empirically verifies searching for "Assets" (capitalized) finds Assets and navigates to /assets', async () => {
      const { onClose } = await renderPalette(true);
      await typeQuery('Assets');

      const modalText = document.querySelector('.ant-modal')?.textContent || '';
      expect(modalText).toContain('Assets');

      const input = document.querySelector('.ant-modal input') as HTMLInputElement;
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });

      expect(onClose).toHaveBeenCalled();
      expect(currentLocation.pathname).toBe('/assets');
    });

    it('empirically verifies searching for "Licenses" (capitalized) finds Licenses and navigates to /licenses', async () => {
      const { onClose } = await renderPalette(true);
      await typeQuery('Licenses');

      const modalText = document.querySelector('.ant-modal')?.textContent || '';
      expect(modalText).toContain('Licenses');

      const input = document.querySelector('.ant-modal input') as HTMLInputElement;
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });

      expect(onClose).toHaveBeenCalled();
      expect(currentLocation.pathname).toBe('/licenses');
    });

    it('verifies case insensitivity on adversarial mixed-case queries', async () => {
      await renderPalette(true);

      // Mixed case COMPLIANCE
      await typeQuery('COMPLIANCE');
      let text = document.querySelector('.ant-modal')?.textContent || '';
      expect(text).toContain('Audit');

      // Mixed case dIrEcToRy
      await typeQuery('dIrEcToRy');
      text = document.querySelector('.ant-modal')?.textContent || '';
      expect(text).toContain('Directory');

      // Mixed case rEcOrDs
      await typeQuery('rEcOrDs');
      text = document.querySelector('.ant-modal')?.textContent || '';
      expect(text).toContain('Directory');

      // Lowercase assets
      await typeQuery('assets');
      text = document.querySelector('.ant-modal')?.textContent || '';
      expect(text).toContain('Assets');

      // Lowercase licenses
      await typeQuery('licenses');
      text = document.querySelector('.ant-modal')?.textContent || '';
      expect(text).toContain('Licenses');
    });

    it('handles extreme non-matching and malicious strings safely without errors', async () => {
      await renderPalette(true);

      // Malicious XSS string
      await typeQuery('<script>alert("hack")</script>');
      let modalText = document.querySelector('.ant-modal')?.textContent || '';
      expect(modalText).toContain('No matching results or commands found');

      // Whitespace string: CommandPalette matches query literally without trim in filteredCommands, showing clean Empty state
      await typeQuery('     ');
      modalText = document.querySelector('.ant-modal')?.textContent || '';
      expect(modalText).toContain('No matching results or commands found');

      // Cleared query restores all commands
      await typeQuery('');
      const allText = document.querySelector('.ant-modal')?.textContent || '';
      expect(allText).toContain('Dashboard');
      expect(allText).toContain('Assets');
    });

    it('emits ZERO console.error or console.warn calls during full palette lifecycle', async () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const errSpy = vi.spyOn(console, 'error');

      const { onClose } = await renderPalette(true);
      await typeQuery('compliance');
      await typeQuery('records');
      await typeQuery('Assets');

      const input = document.querySelector('.ant-modal input') as HTMLInputElement;
      await act(async () => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(onClose).toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. NotificationDrawer & PageContainer Zero-Warning Invariants
  // =========================================================================
  describe('2. NotificationDrawer & PageContainer Invariants', () => {
    const mockNotifications: NotificationItem[] = [
      {
        id: 'n1',
        title: 'Depleted License Warning',
        description: 'AutoCAD seats have reached 100% capacity',
        type: 'warning',
        category: 'alerts',
        time: '5m ago',
        read: false,
        link: '/licenses',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'n2',
        title: 'Hardware Audit Completed',
        description: 'Asset reconciliation logged 42 items',
        type: 'success',
        category: 'tasks',
        time: '1h ago',
        read: true,
        createdAt: new Date().toISOString(),
      },
    ];

    it('mounts NotificationDrawer with size={440} and emits ZERO console warnings or errors', async () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const errSpy = vi.spyOn(console, 'error');
      const mockClose = vi.fn();

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(
                AntApp,
                null,
                createElement(NotificationDrawer, {
                  open: true,
                  onClose: mockClose,
                  notifications: mockNotifications,
                  unreadCount: 1,
                  loading: false,
                  onRefresh: vi.fn(),
                  onMarkAsRead: vi.fn().mockResolvedValue(undefined),
                  onMarkAllAsRead: vi.fn().mockResolvedValue(undefined),
                }),
              ),
            ),
          ),
        );
      });

      // Verify drawer rendered
      const drawer = document.querySelector('.ant-drawer');
      expect(drawer).not.toBeNull();
      expect(drawer?.textContent).toContain('Notifications');
      expect(drawer?.textContent).toContain('Depleted License Warning');

      // Click "All" tab and "Alerts" tab
      const alertsTab = Array.from(document.querySelectorAll('.ant-tabs-tab')).find((tab) =>
        tab.textContent?.includes('Alerts'),
      );
      if (alertsTab) {
        await act(async () => {
          (alertsTab as HTMLElement).click();
        });
      }

      // Filter by keyword
      const filterInput = document.querySelector('.ant-drawer input') as HTMLInputElement;
      if (filterInput) {
        await act(async () => {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value',
          )?.set;
          setter?.call(filterInput, 'AutoCAD');
          filterInput.dispatchEvent(new Event('input', { bubbles: true }));
        });
      }

      // Close drawer
      const closeBtn = document.querySelector('.ant-drawer-close') as HTMLElement;
      if (closeBtn) {
        await act(async () => {
          closeBtn.click();
        });
      }

      // CRITICAL CHECK: No Ant Design deprecated 'width' warning or any other console issue
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errSpy).not.toHaveBeenCalled();
    });

    it('mounts PageContainer with empty breadcrumbs and stats without rendering empty containers or console errors', async () => {
      const warnSpy = vi.spyOn(console, 'warn');
      const errSpy = vi.spyOn(console, 'error');

      currentRoot = createRoot(container);
      await act(async () => {
        currentRoot?.render(
          createElement(
            MemoryRouter,
            null,
            createElement(
              ConfigProvider,
              null,
              createElement(
                AntApp,
                null,
                createElement(PageContainer, {
                  title: '  Trimmed Systems Title   ',
                  subtitle: 'Operational systems telemetry',
                  breadcrumbs: [],
                  stats: [],
                  children: createElement('div', { id: 'inner-content' }, 'Active View Content'),
                }),
              ),
            ),
          ),
        );
      });

      // Title must be trimmed cleanly
      const titleEl = container.querySelector('.ant-typography');
      expect(titleEl?.textContent).toBe('Trimmed Systems Title');

      // Breadcrumb container must NOT be rendered when breadcrumbs is empty []
      const breadcrumbEl = container.querySelector('.ant-breadcrumb');
      expect(breadcrumbEl).toBeNull();

      // Stats row must NOT be rendered when stats is empty []
      const statsCard = container.querySelector('.uims-stat-card');
      expect(statsCard).toBeNull();

      // Zero console warnings or errors
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errSpy).not.toHaveBeenCalled();
    });

    it('verifies integer grid column spans in PageContainer across 1 to 6 stats cards', async () => {
      const generateStats = (count: number): PageStatItem[] =>
        Array.from({ length: count }, (_, i) => ({
          title: `Stat ${i + 1}`,
          value: (i + 1) * 100,
        }));

      for (const count of [1, 2, 3, 4, 5, 6]) {
        if (currentRoot) {
          await act(async () => {
            currentRoot?.unmount();
          });
        }
        currentRoot = createRoot(container);

        await act(async () => {
          currentRoot?.render(
            createElement(
              MemoryRouter,
              null,
              createElement(
                ConfigProvider,
                null,
                createElement(
                  AntApp,
                  null,
                  createElement(PageContainer, {
                    title: 'Stats Test',
                    stats: generateStats(count),
                    children: createElement('div', null, 'Content'),
                  }),
                ),
              ),
            ),
          );
        });

        // Verify that expected integer grid span is applied
        const expectedLgSpan = Math.floor(24 / Math.min(count, 4));
        const statCols = container.querySelectorAll('.ant-col');
        expect(statCols.length).toBe(count);

        for (const col of Array.from(statCols)) {
          expect(col.className).toContain(`ant-col-lg-${expectedLgSpan}`);
        }
      }
    });
  });

  // =========================================================================
  // 3. Production Logging Elimination Across apps/web/src
  // =========================================================================
  describe('3. Production Logging Elimination Across apps/web/src', () => {
    const srcDir = path.resolve(__dirname, '..');

    const getAllSourceFiles = (dir: string): string[] => {
      const results: string[] = [];
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of list) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && item.name !== 'node_modules' && item.name !== 'dist') {
          results.push(...getAllSourceFiles(fullPath));
        } else if (
          item.isFile() &&
          (item.name.endsWith('.ts') || item.name.endsWith('.tsx')) &&
          !item.name.includes('.test.') &&
          !item.name.includes('.spec.')
        ) {
          results.push(fullPath);
        }
      }
      return results;
    };

    it('verifies ZERO raw console.log, console.warn, console.info, console.debug in production code', () => {
      const files = getAllSourceFiles(srcDir);
      expect(files.length).toBeGreaterThan(30);

      const forbiddenMethods = ['log', 'warn', 'info', 'debug', 'trace', 'table'];
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const method of forbiddenMethods) {
          const regex = new RegExp(`\\bconsole\\.${method}\\s*\\(`, 'g');
          if (regex.test(content)) {
            violations.push(`${file}: console.${method}`);
          }
        }
      }

      expect(violations, `Found forbidden console calls: ${violations.join(', ')}`).toEqual([]);
    });

    it('verifies that console.error is strictly guarded or eliminated across all production files', () => {
      const files = getAllSourceFiles(srcDir);
      const consoleErrors: { file: string; line: number; text: string }[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/\bconsole\.error\s*\(/.test(line)) {
            consoleErrors.push({
              file: path.relative(srcDir, file),
              line: i + 1,
              text: line.trim(),
            });
          }
        }
      }

      // Exactly 1 occurrence permitted: ErrorBoundary.tsx guarded by import.meta.env.DEV
      expect(consoleErrors.length).toBe(1);
      expect(consoleErrors[0].file).toBe('components/ErrorBoundary.tsx');

      // Verify the guard in ErrorBoundary.tsx
      const errorBoundaryContent = fs.readFileSync(
        path.resolve(srcDir, 'components/ErrorBoundary.tsx'),
        'utf-8',
      );
      expect(errorBoundaryContent).toContain('if (import.meta.env.DEV)');
    });
  });
});
