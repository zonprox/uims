import { App as AntApp, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationItem } from '../services/notifications.service';
import NotificationDrawer from './NotificationDrawer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockNotifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Low Stock Alert',
    description: 'Cat6 Cables are running low',
    type: 'warning',
    category: 'alerts',
    time: 'Just now',
    read: false,
    link: '/inventory',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    title: 'Asset Assigned',
    description: 'Laptop assigned to John',
    type: 'info',
    category: 'tasks',
    time: '2h ago',
    read: true,
    createdAt: new Date().toISOString(),
  },
];

describe('NotificationDrawer Component', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  const mockClose = vi.fn();
  const mockRefresh = vi.fn();
  const mockMarkAsRead = vi.fn().mockResolvedValue(undefined);
  const mockMarkAllAsRead = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
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
    document.querySelectorAll('.ant-drawer').forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  const renderDrawer = async (unreadCount = 1) => {
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
                unreadCount,
                loading: false,
                onRefresh: mockRefresh,
                onMarkAsRead: mockMarkAsRead,
                onMarkAllAsRead: mockMarkAllAsRead,
              }),
            ),
          ),
        ),
      );
    });
  };

  it('renders title and does NOT display LIVE or SYNCING status', async () => {
    await renderDrawer();
    const bodyText = document.body.textContent || '';
    expect(bodyText).toContain('Notifications');
    expect(bodyText).not.toContain('LIVE');
    expect(bodyText).not.toContain('SYNCING');
  });

  it('does NOT render any manual delete or clear all buttons', async () => {
    await renderDrawer();
    const bodyText = document.body.textContent || '';
    expect(bodyText).not.toContain('Clear all');
    expect(bodyText).not.toContain('Clear All');
    expect(bodyText).not.toContain('Dismiss notification');

    // No trash/delete button elements
    const deleteIcons = document.querySelectorAll('.anticon-delete');
    expect(deleteIcons.length).toBe(0);
  });

  it('renders mark all as read button when unreadCount > 0 and triggers handler', async () => {
    await renderDrawer(2);
    const markAllBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Mark all as read'),
    );
    expect(markAllBtn).toBeDefined();

    await act(async () => {
      markAllBtn?.click();
    });
    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  it('clicks notification item to mark as read and closes if link exists', async () => {
    await renderDrawer();
    const notifItem = document.querySelector('[data-testid="notif-item-n1"]') as HTMLElement;
    expect(notifItem).toBeDefined();

    await act(async () => {
      notifItem.click();
    });

    expect(mockMarkAsRead).toHaveBeenCalledWith('n1', '/inventory');
    expect(mockClose).toHaveBeenCalled();
  });
});
