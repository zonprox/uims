import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DirectoryGroup } from '@uims/shared-types';
import { DirectoryGroupsTab } from './DirectoryGroupsTab';

const mockGroups: DirectoryGroup[] = [
  {
    id: 'grp-1',
    name: 'GR_Engineering_Staff',
    type: 'Security',
    scope: 'Global',
    managedBy: 'Alex Johnson',
    memberCount: 24,
    description: 'Core software engineering and infrastructure staff',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'grp-2',
    name: 'GR_Production_All',
    type: 'Distribution',
    scope: 'Universal',
    managedBy: 'Operations Manager',
    memberCount: 150,
    description: 'All plant and factory floor personnel',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockCreateGroup = vi.fn();
const mockUpdateGroup = vi.fn();
const mockDeleteGroup = vi.fn();

vi.mock('../../services/directory.service', () => ({
  directoryService: {
    createGroup: (...args: unknown[]) => mockCreateGroup(...args),
    updateGroup: (...args: unknown[]) => mockUpdateGroup(...args),
    deleteGroup: (...args: unknown[]) => mockDeleteGroup(...args),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DirectoryGroupsTab Component Tests', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  const onRefreshMock = vi.fn();
  const setCreateModalOpenMock = vi.fn();

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockCreateGroup.mockReset().mockResolvedValue(mockGroups[0]);
    mockUpdateGroup.mockReset().mockResolvedValue(mockGroups[0]);
    mockDeleteGroup.mockReset().mockResolvedValue({ success: true });
    onRefreshMock.mockReset();
    setCreateModalOpenMock.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-popconfirm')
      .forEach((el) => {
        el.remove();
      });
    vi.clearAllMocks();
  });

  const renderComponent = async (props?: Partial<React.ComponentProps<typeof DirectoryGroupsTab>>) => {
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          null,
          createElement(
            ConfigProvider,
            null,
            createElement(
              App,
              null,
              createElement(DirectoryGroupsTab, {
                groups: mockGroups,
                loading: false,
                onRefresh: onRefreshMock,
                createModalOpen: false,
                setCreateModalOpen: setCreateModalOpenMock,
                ...props,
              }),
            ),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    return root;
  };

  it('renders Ant Design Table with all 6 columns, sorters, and standard pagination', async () => {
    await renderComponent();

    // Verify Ant Design Table is rendered
    const table = container.querySelector('.ant-table');
    expect(table).not.toBeNull();

    // Verify all 6 Table Headers
    const headers = Array.from(container.querySelectorAll('.ant-table-thead th')).map(
      (th) => th.textContent?.trim(),
    );
    expect(headers.some((h) => h?.includes('Group Name'))).toBe(true);
    expect(headers.some((h) => h === 'Type' || (h?.includes('Type') && !h?.includes('Scope')))).toBe(true);
    expect(headers.some((h) => h === 'Scope' || (h?.includes('Scope') && !h?.includes('Type')))).toBe(true);
    expect(headers.some((h) => h?.includes('Type & Scope'))).toBe(false);
    expect(headers.some((h) => h?.includes('Managed By'))).toBe(true);
    expect(headers.some((h) => h?.includes('Members'))).toBe(true);
    expect(headers.some((h) => h?.includes('Actions'))).toBe(true);

    // Strictly verify Distribution Email and Container / OU Path headers are absent
    expect(headers.some((h) => h?.includes('Distribution Email'))).toBe(false);
    expect(headers.some((h) => h?.includes('Container / OU Path'))).toBe(false);
    expect(headers.some((h) => h?.includes('OU Path'))).toBe(false);

    // Verify Row Contents
    expect(container.textContent).toContain('GR_Engineering_Staff');
    expect(container.textContent).toContain('Alex Johnson');
    expect(container.textContent).toContain('24 members');
    expect(container.textContent).toContain('Security');
    expect(container.textContent).toContain('Global');

    expect(container.textContent).toContain('GR_Production_All');
    expect(container.textContent).toContain('Operations Manager');
    expect(container.textContent).toContain('150 members');
    expect(container.textContent).toContain('Distribution');
    expect(container.textContent).toContain('Universal');

    // Verify Sorter triggers on columns
    const sortableHeaders = container.querySelectorAll('.ant-table-column-has-sorters');
    expect(sortableHeaders.length).toBeGreaterThanOrEqual(5);

    // Verify Pagination is present with showSizeChanger and total count
    const pagination = container.querySelector('.ant-pagination');
    expect(pagination).not.toBeNull();
    expect(container.textContent).toContain('Total 2 groups');
  });

  it('confirms card grid layout is strictly absent', async () => {
    await renderComponent();

    // Confirm that individual group card containers do not exist
    const cards = container.querySelectorAll('.ant-card-hoverable');
    expect(cards.length).toBe(0);
  });

  it('filters table rows based on keyword search across name, description, and managedBy', async () => {
    await renderComponent();

    const searchInput = container.querySelector(
      'input[placeholder*="Search groups"]',
    ) as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(searchInput, 'Production');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.textContent).toContain('GR_Production_All');
    expect(container.textContent).not.toContain('GR_Engineering_Staff');

    // Filter by managedBy
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(searchInput, 'Alex Johnson');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(container.textContent).toContain('GR_Engineering_Staff');
    expect(container.textContent).not.toContain('GR_Production_All');
  });

  it('strictly ensures distribution email and OU path form inputs do not exist', async () => {
    await renderComponent({ createModalOpen: true });

    // Verify modal title
    const modalTitle = document.querySelector('.ant-modal-title');
    expect(modalTitle?.textContent).toContain('Create Directory Group');

    // Verify email and ouPath inputs are absent
    expect(document.querySelector('input[placeholder*="engineering-staff"]')).toBeNull();
    expect(document.querySelector('input[placeholder*="OU="]')).toBeNull();
  });

  it('opens Create Group modal when clicking Create Group button and handles submission', async () => {
    await renderComponent({ createModalOpen: true });

    const modalTitle = document.querySelector('.ant-modal-title');
    expect(modalTitle?.textContent).toContain('Create Directory Group');

    const nameInput = document.querySelector('input[placeholder*="GR_Engineering_Staff"]') as HTMLInputElement;
    expect(nameInput).not.toBeNull();

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(nameInput, 'GR_New_Security_Team');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const submitBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find((b) =>
      b.textContent?.includes('Create Group'),
    ) as HTMLButtonElement;
    expect(submitBtn).toBeDefined();

    await act(async () => {
      submitBtn.click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockCreateGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'GR_New_Security_Team',
      }),
    );
    expect(onRefreshMock).toHaveBeenCalled();
  });

  it('opens Edit Group modal upon clicking Edit and updates record', async () => {
    await renderComponent();

    const editBtns = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.querySelector('.anticon-edit'),
    );
    expect(editBtns.length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      editBtns[0].click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const editModalTitle = document.querySelector('.ant-modal-title');
    expect(editModalTitle?.textContent).toContain('Edit Directory Group');

    // Name input should be populated with existing record name
    const nameInput = document.querySelector('.ant-modal input[placeholder*="GR_Engineering_Staff"]') as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(nameInput.value).toBe('GR_Engineering_Staff');

    // Change description
    const descTextarea = document.querySelector('.ant-modal textarea') as HTMLTextAreaElement;
    if (descTextarea) {
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value',
        )?.set;
        setter?.call(descTextarea, 'Updated description text');
        descTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        descTextarea.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    const saveBtn = Array.from(document.querySelectorAll('.ant-modal-footer button')).find((b) =>
      b.textContent?.includes('Save Changes'),
    ) as HTMLButtonElement;
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn.click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockUpdateGroup).toHaveBeenCalledWith(
      'grp-1',
      expect.objectContaining({
        name: 'GR_Engineering_Staff',
      }),
    );
    expect(onRefreshMock).toHaveBeenCalled();
  });

  it('triggers Delete popconfirm and invokes deleteGroup upon confirmation', async () => {
    await renderComponent();

    const deleteBtns = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.querySelector('.anticon-delete'),
    );
    expect(deleteBtns.length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      deleteBtns[0].click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Popconfirm opens
    const popconfirmTitle = document.querySelector('.ant-popconfirm-title, .ant-popover-title');
    expect(popconfirmTitle?.textContent).toContain('Delete Directory Group');

    const confirmBtn = Array.from(
      document.querySelectorAll('.ant-popconfirm-buttons button, .ant-popover-buttons button'),
    ).find((b) => b.textContent?.trim() === 'Delete') as HTMLButtonElement;
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      confirmBtn.click();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(mockDeleteGroup).toHaveBeenCalledWith('grp-1');
    expect(onRefreshMock).toHaveBeenCalled();
  });

  it('handles empty group dataset with Ant Design empty state', async () => {
    await renderComponent({ groups: [] });

    expect(container.querySelector('.ant-empty')).not.toBeNull();
    expect(container.textContent).toContain('No data');
  });

  it('triggers onRefresh when clicking toolbar Refresh button', async () => {
    await renderComponent();

    const refreshBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Refresh'),
    );
    expect(refreshBtn).toBeDefined();

    await act(async () => {
      refreshBtn?.click();
    });

    expect(onRefreshMock).toHaveBeenCalledTimes(1);
  });
});
