import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as qrDecoderModule from '../utils/qrDecoder';
import { AssetScannerModal } from './AssetScannerModal';

const mockMessageSuccess = vi.fn();
const mockMessageWarning = vi.fn();
const mockMessageError = vi.fn();
const mockNotificationError = vi.fn();

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      useApp: () => ({
        message: {
          success: mockMessageSuccess,
          warning: mockMessageWarning,
          error: mockMessageError,
        },
        notification: {
          error: mockNotificationError,
        },
      }),
    },
  };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AssetScannerModal', () => {
  let container: HTMLDivElement;
  let mockTrackStop: ReturnType<typeof vi.fn>;
  let mockApplyConstraints: ReturnType<typeof vi.fn>;
  let mockTrack: {
    stop: ReturnType<typeof vi.fn>;
    applyConstraints: ReturnType<typeof vi.fn>;
    getCapabilities: () => { torch: boolean };
    getSettings: () => { deviceId: string };
    kind: string;
  };
  let mockStream: MediaStream;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);

    mockTrackStop = vi.fn();
    mockApplyConstraints = vi.fn().mockResolvedValue(undefined);

    mockTrack = {
      stop: mockTrackStop,
      applyConstraints: mockApplyConstraints,
      getCapabilities: () => ({ torch: true }),
      getSettings: () => ({ deviceId: 'cam-rear-1' }),
      kind: 'video',
    };

    mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam-rear-1', label: 'Back Camera' },
          { kind: 'videoinput', deviceId: 'cam-front-2', label: 'Front Camera' },
        ]),
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    container.remove();
    document.body.innerHTML = '';
  });

  it('renders modal with title, reticle, and starts camera stream targeting environment facing mode (R1)', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    expect(document.body.textContent).toContain('Scan Asset QR Code');
    expect(document.body.textContent).toContain('Center asset QR code within reticle frame');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({
          facingMode: { ideal: 'environment' },
        }),
      }),
    );

    act(() => {
      root.unmount();
    });
  });

  it('cleanly stops and releases media tracks when modal closes or unmounts (R1)', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    // Close modal by setting open=false
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: false,
          onClose,
          onScanSuccess,
        }),
      );
    });

    expect(mockTrackStop).toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it('renders device controls including torch toggle and handles torch activation (R1)', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    // Find torch button
    const buttons = Array.from(document.body.querySelectorAll('button'));
    const torchBtn = buttons.find((b) => b.textContent?.includes('Flashlight Off'));
    expect(torchBtn).toBeDefined();

    await act(async () => {
      torchBtn?.click();
    });

    expect(mockApplyConstraints).toHaveBeenCalledWith({
      advanced: [{ torch: true }],
    });

    act(() => {
      root.unmount();
    });
  });

  it('displays graceful fallback UI when camera access is denied (R1)', async () => {
    const deniedError = new Error('Camera permission was denied.');
    deniedError.name = 'NotAllowedError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(deniedError);

    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    expect(document.body.textContent).toContain('Camera Access Unavailable');
    expect(document.body.textContent).toContain('Camera permission was denied');

    act(() => {
      root.unmount();
    });
  });

  it('allows manual asset tag entry and triggers onScanSuccess with parsed tag (R1, R2)', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    const input = document.body.querySelector('input[placeholder*="AST-2026"]') as HTMLInputElement;
    expect(input).toBeDefined();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeSetter?.call(input, 'https://uims.internal/assets/AST-2026-0042');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );
    expect(lookupBtn).toBeDefined();

    await act(async () => {
      lookupBtn?.click();
    });

    expect(onScanSuccess).toHaveBeenCalledWith('AST-2026-0042');

    act(() => {
      root.unmount();
    });
  });

  it('handles image file upload decoding fallback (R1, R2)', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    vi.spyOn(qrDecoderModule, 'decodeQrFromImageFile').mockResolvedValueOnce({
      rawValue: 'AST-7788',
      parsedTag: 'AST-7788',
      source: 'canvas-jsqr',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDefined();

    const testFile = new File(['fake-qr'], 'qr.png', { type: 'image/png' });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(qrDecoderModule.decodeQrFromImageFile).toHaveBeenCalledWith(testFile);
    expect(onScanSuccess).toHaveBeenCalledWith('AST-7788');

    act(() => {
      root.unmount();
    });
  });

  it('stops and releases tracks if getUserMedia resolves after modal was closed (async cancellation)', async () => {
    let resolveGetUserMedia!: (stream: MediaStream) => void;
    const delayedPromise = new Promise<MediaStream>((resolve) => {
      resolveGetUserMedia = resolve;
    });

    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(delayedPromise);

    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    // Close the modal while getUserMedia is still awaiting
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: false,
          onClose,
          onScanSuccess,
        }),
      );
    });

    // Now resolve getUserMedia
    await act(async () => {
      resolveGetUserMedia(mockStream);
    });

    // Verify tracks on the late-arriving stream were immediately stopped
    expect(mockTrackStop).toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it('displays warning toast when manual asset tag input is empty or contains no valid tag', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );
    expect(lookupBtn).toBeDefined();

    // 1. Empty input
    await act(async () => {
      lookupBtn?.click();
    });
    expect(mockMessageWarning).toHaveBeenCalledWith('Please enter an asset tag or identifier.');

    // 2. Generic URL with no asset tag
    const input = document.body.querySelector('input[placeholder*="AST-2026"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, 'https://example.com/');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      lookupBtn?.click();
    });

    expect(mockMessageWarning).toHaveBeenCalledWith(
      'No valid asset tag found in the provided input.',
    );
    expect(onScanSuccess).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it('switches camera device when multiple video devices exist (R1)', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    // Verify initial call targeted environment camera
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        video: expect.objectContaining({
          facingMode: { ideal: 'environment' },
        }),
      }),
    );

    // Find the switch camera button (has SwapOutlined icon)
    const switchBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.querySelector('.anticon-swap'),
    );
    expect(switchBtn).toBeDefined();

    // Click switch camera to toggle to Front Camera (cam-front-2)
    await act(async () => {
      switchBtn?.click();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: { deviceId: { exact: 'cam-front-2' } },
    });

    // Click again to cycle back to Back Camera (cam-rear-1)
    await act(async () => {
      switchBtn?.click();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: { deviceId: { exact: 'cam-rear-1' } },
    });

    act(() => {
      root.unmount();
    });
  });

  it('provides direct register button when onRegisterAsset is passed and validates input (R1, R3)', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();
    const onRegisterAsset = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
          onRegisterAsset,
        }),
      );
    });

    const registerBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Register'),
    );
    expect(registerBtn).toBeDefined();

    // 1. Click register with empty input
    await act(async () => {
      registerBtn?.click();
    });
    expect(mockMessageWarning).toHaveBeenCalledWith('Please enter an asset tag or identifier.');
    expect(onRegisterAsset).not.toHaveBeenCalled();

    // 2. Click register with valid tag
    const input = document.body.querySelector('input[placeholder*="AST-2026"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, 'AST-NEW-8899');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      registerBtn?.click();
    });

    expect(onClose).toHaveBeenCalled();
    expect(onRegisterAsset).toHaveBeenCalledWith('AST-NEW-8899');

    act(() => {
      root.unmount();
    });
  });

  it('preserves camera error state after manual lookup when camera is unavailable (R1)', async () => {
    const deniedError = new Error('Camera permission was denied.');
    deniedError.name = 'NotAllowedError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(deniedError);

    const onClose = vi.fn();
    const onScanSuccess = vi.fn().mockResolvedValue(undefined);

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    expect(document.body.textContent).toContain('Camera Access Unavailable');
    expect(mockNotificationError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Camera Access Denied',
        description: expect.stringContaining('Camera permission was denied'),
      }),
    );

    const input = document.body.querySelector('input[placeholder*="AST-2026"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, 'AST-9900');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );

    await act(async () => {
      lookupBtn?.click();
    });

    expect(onScanSuccess).toHaveBeenCalledWith('AST-9900');
    // Camera error alert must remain visible since camera is still denied/unavailable
    expect(document.body.textContent).toContain('Camera Access Unavailable');

    act(() => {
      root.unmount();
    });
  });

  it('dispatches notification.error when camera hardware is not found (NotFoundError)', async () => {
    const notFoundErr = new Error('No camera found');
    notFoundErr.name = 'NotFoundError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(notFoundErr);

    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    expect(mockNotificationError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Camera Access Denied',
        description: expect.stringContaining('No camera device found on this system'),
      }),
    );

    act(() => {
      root.unmount();
    });
  });

  it('correctly re-initializes camera stream without cancellation when modal is closed and reopened (R1)', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    // 1. Initial open
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);

    // 2. Close modal
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: false,
          onClose,
          onScanSuccess,
        }),
      );
    });

    expect(mockTrackStop).toHaveBeenCalled();
    mockTrackStop.mockClear();

    // 3. Reopen modal: must request camera again and not abort due to stale isOpenRef
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
    // The newly started stream tracks must NOT be stopped immediately
    expect(mockTrackStop).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });

  it('successfully decodes and triggers onScanSuccess when modal is reopened for a second consecutive scan', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    const root = createRoot(container);
    // 1. Initial open
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    // 2. Close modal
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: false,
          onClose,
          onScanSuccess,
        }),
      );
    });

    // 3. Reopen modal for second scan
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    const input = document.body.querySelector('input[placeholder*="AST-2026"]') as HTMLInputElement;
    expect(input).toBeDefined();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeSetter?.call(input, 'AST-9999');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );

    await act(async () => {
      lookupBtn?.click();
    });

    expect(onScanSuccess).toHaveBeenCalledWith('AST-9999');

    act(() => {
      root.unmount();
    });
  });

  it('gracefully handles onScanSuccess rejection in manual lookup without throwing unhandled rejection', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn().mockRejectedValue(new Error('Server lookup network error'));

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    const input = document.body.querySelector('input[placeholder*="AST-2026"]') as HTMLInputElement;
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(input, 'AST-ERR-1122');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const lookupBtn = Array.from(document.body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Lookup Asset'),
    );

    // Click should not throw unhandled promise rejection
    await act(async () => {
      lookupBtn?.click();
    });

    expect(onScanSuccess).toHaveBeenCalledWith('AST-ERR-1122');

    act(() => {
      root.unmount();
    });
  });

  it('displays descriptive warning when uploaded image contains non-asset QR payload', async () => {
    const onClose = vi.fn();
    const onScanSuccess = vi.fn();

    vi.spyOn(qrDecoderModule, 'decodeQrFromImageFile').mockResolvedValueOnce({
      rawValue: 'WIFI:S:MyNetwork;P:password;;',
      parsedTag: '',
      source: 'canvas-jsqr',
    });

    const root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(AssetScannerModal, {
          open: true,
          onClose,
          onScanSuccess,
        }),
      );
    });

    const fileInput = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['fake-wifi-qr'], 'wifi.png', { type: 'image/png' });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(mockMessageWarning).toHaveBeenCalledWith(
      'The detected QR code does not contain a valid asset identifier.',
    );
    expect(onScanSuccess).not.toHaveBeenCalled();

    act(() => {
      root.unmount();
    });
  });
});
