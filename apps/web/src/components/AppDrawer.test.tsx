import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AppDrawer, { DrawerSection } from './AppDrawer';

describe('AppDrawer Component Tests', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeAll(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
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
    document.querySelectorAll('.ant-drawer, .ant-drawer-wrapper-body').forEach((el) => {
      el.remove();
    });
    vi.clearAllMocks();
  });

  const renderComponent = async (element: React.ReactElement) => {
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(createElement(ConfigProvider, null, createElement(App, null, element)));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    return root;
  };

  it('renders synchronized header with title truncation and tooltip', async () => {
    await renderComponent(
      <AppDrawer
        open
        title="Super Long Title That Should Truncate Without Overflowing The Container"
        subtitle="Secondary subtitle description"
      >
        <div>Drawer Body Content</div>
      </AppDrawer>,
    );

    const drawerHeader = document.querySelector('.ant-drawer-header');
    expect(drawerHeader).not.toBeNull();
    expect(drawerHeader?.textContent).toContain('Super Long Title');
    expect(drawerHeader?.textContent).toContain('Secondary subtitle description');
  });

  it('renders fixed footer with concise Save and Cancel buttons by default when onOk is provided', async () => {
    const onOkMock = vi.fn();
    const onCancelMock = vi.fn();

    await renderComponent(
      <AppDrawer open title="Profile Details" onOk={onOkMock} onCancel={onCancelMock}>
        <div>Form Content</div>
      </AppDrawer>,
    );

    const footer = document.querySelector('.ant-drawer-footer');
    expect(footer).not.toBeNull();

    const buttons = footer?.querySelectorAll('button');
    expect(buttons).toBeDefined();
    // Default cancel button is 'Cancel' when onOk is present
    const cancelBtn = Array.from(buttons || []).find((b) => b.textContent?.trim() === 'Cancel');
    const saveBtn = Array.from(buttons || []).find((b) => b.textContent?.trim() === 'Save');

    expect(cancelBtn).toBeDefined();
    expect(saveBtn).toBeDefined();

    await act(async () => {
      saveBtn?.click();
    });
    expect(onOkMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      cancelBtn?.click();
    });
    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('renders Close button when onOk is omitted for read-only drawers', async () => {
    const onCloseMock = vi.fn();

    await renderComponent(
      <AppDrawer open title="View Information" onClose={onCloseMock}>
        <div>Read Only Info</div>
      </AppDrawer>,
    );

    const footer = document.querySelector('.ant-drawer-footer');
    expect(footer).not.toBeNull();

    const closeBtn = footer?.querySelector('button');
    expect(closeBtn?.textContent?.trim()).toBe('Close');

    await act(async () => {
      closeBtn?.click();
    });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('supports DrawerSection to balance and structure body content', async () => {
    await renderComponent(
      <AppDrawer open title="Sectional Form">
        <DrawerSection title="General Information">
          <div>Field 1</div>
          <div>Field 2</div>
        </DrawerSection>
        <DrawerSection title="Credentials" extra={<span>Action</span>}>
          <div>Secret Info</div>
        </DrawerSection>
      </AppDrawer>,
    );

    const body = document.querySelector('.ant-drawer-body');
    expect(body?.textContent).toContain('General Information');
    expect(body?.textContent).toContain('Credentials');
  });

  it('hides footer when hideFooter is true', async () => {
    await renderComponent(
      <AppDrawer open title="No Footer" hideFooter>
        <div>Content Without Footer</div>
      </AppDrawer>,
    );

    const footer = document.querySelector('.ant-drawer-footer');
    expect(footer).toBeNull();
  });
});
