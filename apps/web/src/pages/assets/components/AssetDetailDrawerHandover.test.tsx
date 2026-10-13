import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Asset } from '../../../services/assets.service';
import { AssetDetailDrawer } from './AssetDetailDrawer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../services/assets.service', () => ({
  assetsService: {
    getCategories: vi.fn().mockResolvedValue([]),
    uploadHandoverDocument: vi.fn().mockResolvedValue({
      fileUrl: '/api/v1/assets/handover-documents/file/signed-resolved.pdf',
      fileName: 'signed-resolved.pdf',
      asset: {
        id: 'ast-drawer-1',
        hasPendingRecord: false,
        signedDocUrl: '/api/v1/assets/handover-documents/file/signed-resolved.pdf',
      },
    }),
  },
}));

vi.mock('../../../services/organization.service', () => ({
  organizationService: {
    getLocationTree: vi.fn().mockResolvedValue([]),
    getLocations: vi.fn().mockResolvedValue([]),
    getDepartments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../services/directory.service', () => ({
  directoryService: {
    getEmployees: vi.fn().mockResolvedValue({ items: [] }),
  },
}));

describe('AssetDetailDrawer Handover Documentation Integration', () => {
  let container: HTMLDivElement;
  let currentRoot: ReturnType<typeof createRoot> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover')
      .forEach((el) => el.remove());
    document.body.innerHTML = '';
  });

  const renderDrawer = async (props: {
    open: boolean;
    selectedAsset: Asset | null;
    onClose?: () => void;
    onOpenEditModal?: (asset: Asset) => void;
    onAssetUpdated?: (updated: Asset) => void;
  }) => {
    if (!currentRoot) {
      currentRoot = createRoot(container);
    }
    await act(async () => {
      currentRoot?.render(
        createElement(
          ConfigProvider,
          null,
          createElement(
            App,
            null,
            createElement(AssetDetailDrawer, {
              open: props.open,
              selectedAsset: props.selectedAsset,
              onClose: props.onClose || vi.fn(),
              onOpenEditModal: props.onOpenEditModal || vi.fn(),
              onAssetUpdated: props.onAssetUpdated,
            }),
          ),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };

  it('renders pending record banner and inline upload when asset has hasPendingRecord = true', async () => {
    const mockAsset: Asset = {
      id: 'ast-drawer-pending',
      tag: 'AST-PENDING-01',
      name: 'MacBook Pro M3',
      manufacturer: 'Apple',
      model: 'M3 Pro',
      serialNumber: 'SN-M3-01',
      category: 'Laptop',
      status: 'In Use',
      assignedTo: 'John Doe',
      assignedEmail: 'john.doe@corp.internal',
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2028-01-01',
      hasPendingRecord: true,
      signedDocUrl: null,
    };

    await renderDrawer({
      open: true,
      selectedAsset: mockAsset,
    });

    const bodyText = document.body.textContent || '';
    expect(bodyText).toContain('Pending Handover Record');
    expect(bodyText).toContain(
      'This asset is flagged with a pending signed handover or return document',
    );
    expect(bodyText).toContain('Upload Signed Document');
    expect(bodyText).toContain('Pending Record');

    const uploadBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-drawer button'),
    ).find((b) => b.textContent?.includes('Upload Signed Document'));
    expect(uploadBtn).toBeDefined();
  });

  it('renders verified signed document with view and download actions when signedDocUrl is present', async () => {
    const mockAsset: Asset = {
      id: 'ast-drawer-verified',
      tag: 'AST-VERIFIED-01',
      name: 'Dell Latitude 7440',
      manufacturer: 'Dell',
      model: 'Latitude 7440',
      serialNumber: 'SN-DELL-7440',
      category: 'Laptop',
      status: 'In Use',
      assignedTo: 'Jane Smith',
      assignedEmail: 'jane.smith@corp.internal',
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2028-01-01',
      hasPendingRecord: false,
      signedDocUrl: '/api/v1/assets/handover-documents/file/signed-dell-7440.pdf',
    };

    await renderDrawer({
      open: true,
      selectedAsset: mockAsset,
    });

    const bodyText = document.body.textContent || '';
    expect(bodyText).toContain('Signed Document');
    expect(bodyText).toContain('Signed & Verified');
    expect(bodyText).toContain('View Document');
    expect(bodyText).toContain('Download');
    expect(bodyText).not.toContain('Pending Handover Record');

    const viewBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-drawer button'),
    ).find((b) => b.textContent?.includes('View Document'));
    expect(viewBtn).toBeDefined();
  });

  it('renders without throwing when selectedAsset is null, maintaining React hook invariants', async () => {
    await renderDrawer({
      open: false,
      selectedAsset: null,
    });

    expect(document.querySelector('.ant-drawer')).toBeNull();

    // Re-render with valid asset then back to null
    const mockAsset: Asset = {
      id: 'ast-null-test',
      tag: 'AST-NULL-01',
      name: 'Test Device',
      manufacturer: 'Dell',
      model: 'Latitude',
      category: 'Laptop',
      status: 'Available',
      assignedTo: 'None',
      assignedEmail: '',
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2028-01-01',
    };

    await renderDrawer({
      open: true,
      selectedAsset: mockAsset,
    });

    expect(document.body.textContent).toContain('AST-NULL-01');

    await renderDrawer({
      open: false,
      selectedAsset: null,
    });

    expect(document.body.textContent).not.toContain('AST-NULL-01');
  });

  it('downloads image signed record with correct image extension (.png) rather than hardcoded .pdf', async () => {
    const mockAsset: Asset = {
      id: 'ast-png-1',
      tag: 'AST-PNG-01',
      name: 'Test PNG Record Device',
      manufacturer: 'Apple',
      model: 'MacBook',
      category: 'Laptop',
      status: 'Active',
      assignedTo: 'Alice',
      assignedEmail: 'alice@corp.internal',
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2028-01-01',
      signedDocUrl: '/api/v1/assets/handover-documents/file/signed-receipt.png',
      hasPendingRecord: false,
    };

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');

    await renderDrawer({
      open: true,
      selectedAsset: mockAsset,
    });

    const downloadBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-drawer button'),
    ).find((b) => b.textContent?.includes('Download'));
    expect(downloadBtn).toBeDefined();

    downloadBtn?.click();

    const createdLink = appendChildSpy.mock.calls
      .map((call) => call[0])
      .find((node) => node instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;

    expect(createdLink).toBeDefined();
    expect(createdLink?.download).toBe('signed_record_AST-PNG-01.png');
    expect(createdLink?.href).toContain('download=true');
    appendChildSpy.mockRestore();
  });

  it('correctly derives .jpg extension and appends download=true even when URL contains query parameters or hash', async () => {
    const mockAsset: Asset = {
      id: 'ast-query-jpg',
      tag: 'AST-JPG-02',
      name: 'Test JPG Query Record Device',
      manufacturer: 'Dell',
      model: 'XPS 15',
      category: 'Laptop',
      status: 'Active',
      assignedTo: 'Bob',
      assignedEmail: 'bob@corp.internal',
      purchaseDate: '2026-01-01',
      warrantyExpiry: '2028-01-01',
      signedDocUrl:
        '/api/v1/assets/handover-documents/file/signed-receipt.jpg?token=abc123xyz&t=99999#preview',
      hasPendingRecord: false,
    };

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');

    await renderDrawer({
      open: true,
      selectedAsset: mockAsset,
    });

    const downloadBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-drawer button'),
    ).find((b) => b.textContent?.includes('Download'));
    expect(downloadBtn).toBeDefined();

    downloadBtn?.click();

    const createdLink = appendChildSpy.mock.calls
      .map((call) => call[0])
      .find((node) => node instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined;

    expect(createdLink).toBeDefined();
    expect(createdLink?.download).toBe('signed_record_AST-JPG-02.jpg');
    expect(createdLink?.href).toContain('download=true');
    appendChildSpy.mockRestore();
  });
});
