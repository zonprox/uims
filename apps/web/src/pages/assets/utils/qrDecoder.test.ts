import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  decodeQrFromImageFile,
  decodeQrFromVideoFrame,
  isBarcodeDetectorSupported,
  parseAssetQrPayload,
  playSuccessChime,
  triggerHapticFeedback,
} from './qrDecoder';

describe('qrDecoder utilities', () => {
  describe('parseAssetQrPayload', () => {
    it('returns empty string for null, empty, or whitespace inputs', () => {
      expect(parseAssetQrPayload('')).toBe('');
      expect(parseAssetQrPayload('   ')).toBe('');
    });

    it('extracts raw asset tags and serial numbers', () => {
      expect(parseAssetQrPayload('AST-2026-0042')).toBe('AST-2026-0042');
      expect(parseAssetQrPayload('  ast-1099  ')).toBe('ast-1099');
      expect(parseAssetQrPayload('SN-88776655')).toBe('SN-88776655');
    });

    it('extracts asset tag from standard internal UIMS URLs', () => {
      expect(parseAssetQrPayload('https://uims.internal/assets/AST-2026-0042')).toBe(
        'AST-2026-0042',
      );
      expect(parseAssetQrPayload('https://uims.internal/assets/AST-1099/')).toBe('AST-1099');
      expect(
        parseAssetQrPayload('https://uims.internal/assets/AST-2026-0042?view=full&tab=specs'),
      ).toBe('AST-2026-0042');
    });

    it('extracts tag from query parameters in external scanner URLs', () => {
      expect(parseAssetQrPayload('https://example.com/scan?tag=AST-3344')).toBe('AST-3344');
      expect(parseAssetQrPayload('https://scanner.corp/lookup?id=AST-9911')).toBe('AST-9911');
      expect(parseAssetQrPayload('https://scanner.corp/lookup?assetTag=AST-5522')).toBe('AST-5522');
      expect(parseAssetQrPayload('?tag=AST-1122')).toBe('AST-1122');
    });

    it('extracts tag from domain-like paths without protocol', () => {
      expect(parseAssetQrPayload('uims.internal/assets/AST-7788')).toBe('AST-7788');
      expect(parseAssetQrPayload('inventory.local/assets/AST-8899?ref=app')).toBe('AST-8899');
    });

    it('handles encoded URL characters cleanly', () => {
      expect(parseAssetQrPayload('https://uims.internal/assets/AST%2D2026%2D001')).toBe(
        'AST-2026-001',
      );
    });

    it('extracts asset tag from JSON-encoded QR payloads', () => {
      expect(parseAssetQrPayload('{"tag":"AST-2026-0042"}')).toBe('AST-2026-0042');
      expect(
        parseAssetQrPayload('{"assetTag":"AST-1001","model":"MacBook Pro","serial":"SN-9988"}'),
      ).toBe('AST-1001');
      expect(parseAssetQrPayload('{"serialNumber":"SN-DELL-1002"}')).toBe('SN-DELL-1002');
      expect(parseAssetQrPayload('{"id":"ast-9988"}')).toBe('ast-9988');
      expect(parseAssetQrPayload('{"assetId":"AST-7766"}')).toBe('AST-7766');
    });

    it('extracts asset tag from custom URN and URI schemes', () => {
      expect(parseAssetQrPayload('asset:AST-2026-0042')).toBe('AST-2026-0042');
      expect(parseAssetQrPayload('urn:asset:AST-1001')).toBe('AST-1001');
      expect(parseAssetQrPayload('tag:SN-55443322')).toBe('SN-55443322');
      expect(parseAssetQrPayload('uims-asset:AST-9900')).toBe('AST-9900');
    });

    it('extracts tag from keyword-prefixed URLs (/view/, /detail/, /inspect/)', () => {
      expect(parseAssetQrPayload('https://uims.internal/assets/view/AST-2026-0042')).toBe(
        'AST-2026-0042',
      );
      expect(parseAssetQrPayload('https://uims.internal/assets/detail/AST-1099')).toBe('AST-1099');
      expect(parseAssetQrPayload('https://uims.internal/assets/inspect/AST-8822')).toBe('AST-8822');
      expect(parseAssetQrPayload('uims.internal/assets/view/AST-7788')).toBe('AST-7788');
    });

    it('extracts tag from hash-routed SPA URLs', () => {
      expect(parseAssetQrPayload('https://uims.internal/#/assets/AST-2026-0042')).toBe(
        'AST-2026-0042',
      );
      expect(parseAssetQrPayload('https://uims.internal/#/assets/view/AST-1001')).toBe('AST-1001');
      expect(parseAssetQrPayload('https://uims.internal/#/assets?tag=AST-3344')).toBe('AST-3344');
      expect(parseAssetQrPayload('https://uims.internal/#/assets?assetId=AST-5566')).toBe(
        'AST-5566',
      );
    });

    it('extracts assetId from URL query strings and plain query fragments', () => {
      expect(parseAssetQrPayload('https://uims.internal/assets?assetId=AST-4455')).toBe('AST-4455');
      expect(parseAssetQrPayload('?assetId=AST-4455')).toBe('AST-4455');
    });

    it('returns empty string for URLs that contain no asset identifier', () => {
      expect(parseAssetQrPayload('https://uims.internal/assets')).toBe('');
      expect(parseAssetQrPayload('https://uims.internal/assets/')).toBe('');
      expect(parseAssetQrPayload('https://uims.internal/')).toBe('');
      expect(parseAssetQrPayload('https://google.com')).toBe('');
      expect(parseAssetQrPayload('http://localhost:3000')).toBe('');
      expect(parseAssetQrPayload('https://example.com/about')).toBe('');
      expect(parseAssetQrPayload('https://example.com/login')).toBe('');
      expect(parseAssetQrPayload('https://google.com/search?q=foo')).toBe('');
      expect(parseAssetQrPayload('https://example.com/index.html')).toBe('');
      expect(parseAssetQrPayload('https://example.com/dashboard')).toBe('');
    });

    it('extracts asset-formatted tags from URLs without explicit assets keyword', () => {
      expect(parseAssetQrPayload('https://corp.internal/AST-2026-9999')).toBe('AST-2026-9999');
      expect(parseAssetQrPayload('https://labels.internal/SN-APPLE-1002')).toBe('SN-APPLE-1002');
      expect(parseAssetQrPayload('https://uims.internal/inventory/AST-4411')).toBe('AST-4411');
      expect(parseAssetQrPayload('https://uims.internal/hardware/view/AST-8822')).toBe('AST-8822');
    });

    it('rejects non-asset QR schemes such as Wi-Fi, vCard, mailto, tel, and network URI schemes', () => {
      expect(parseAssetQrPayload('WIFI:T:WPA;S:OfficeNet;P:secret123;;')).toBe('');
      expect(parseAssetQrPayload('BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nEND:VCARD')).toBe('');
      expect(parseAssetQrPayload('mailto:admin@uims.internal')).toBe('');
      expect(parseAssetQrPayload('tel:+15551234567')).toBe('');
      expect(parseAssetQrPayload('geo:37.7749,-122.4194')).toBe('');
      expect(parseAssetQrPayload('javascript:alert(1)')).toBe('');
      expect(parseAssetQrPayload('ftp://files.corp/downloads')).toBe('');
      expect(parseAssetQrPayload('ssh://git@github.com')).toBe('');
      expect(parseAssetQrPayload('file:///etc/passwd')).toBe('');
      expect(parseAssetQrPayload('ws://socket.internal')).toBe('');
      expect(parseAssetQrPayload('//example.com/about')).toBe('');
    });

    it('rejects JSON arrays and JSON objects lacking asset identification properties', () => {
      expect(parseAssetQrPayload('["AST-1001", "AST-1002"]')).toBe('');
      expect(parseAssetQrPayload('[1, 2, 3]')).toBe('');
      expect(parseAssetQrPayload('{"status":200,"message":"success"}')).toBe('');
      expect(parseAssetQrPayload('{"name":"Conference Room Monitor"}')).toBe('');
      expect(parseAssetQrPayload('{invalid json}')).toBe('');
    });

    it('rejects multi-line strings and HTML tags', () => {
      expect(parseAssetQrPayload('AST-1001\nAST-1002')).toBe('');
      expect(parseAssetQrPayload('<script>alert("xss")</script>')).toBe('');
      expect(parseAssetQrPayload('<b>AST-1001</b>')).toBe('');
    });
  });

  describe('isBarcodeDetectorSupported', () => {
    afterEach(() => {
      delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
    });

    it('returns false when window.BarcodeDetector is undefined', async () => {
      delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
      const supported = await isBarcodeDetectorSupported();
      expect(supported).toBe(false);
    });

    it('returns true when BarcodeDetector supports qr_code', async () => {
      (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = {
        getSupportedFormats: vi.fn().mockResolvedValue(['qr_code', 'aztec']),
      };
      const supported = await isBarcodeDetectorSupported();
      expect(supported).toBe(true);
    });

    it('returns false when BarcodeDetector does not support qr_code', async () => {
      (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = {
        getSupportedFormats: vi.fn().mockResolvedValue(['ean_13']),
      };
      const supported = await isBarcodeDetectorSupported();
      expect(supported).toBe(false);
    });

    it('returns false when getSupportedFormats throws an error', async () => {
      (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = {
        getSupportedFormats: vi.fn().mockRejectedValue(new Error('Device error')),
      };
      const supported = await isBarcodeDetectorSupported();
      expect(supported).toBe(false);
    });
  });

  describe('decodeQrFromVideoFrame', () => {
    afterEach(() => {
      delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
    });

    it('returns null if video element is not ready', async () => {
      const mockVideo = {
        readyState: 1,
        videoWidth: 0,
        videoHeight: 0,
      } as unknown as HTMLVideoElement;

      const result = await decodeQrFromVideoFrame(mockVideo);
      expect(result).toBeNull();
    });

    it('uses native BarcodeDetector when supported', async () => {
      const mockDetect = vi.fn().mockResolvedValue([
        {
          rawValue: 'https://uims.internal/assets/AST-1002',
          format: 'qr_code',
        },
      ]);

      class MockBarcodeDetector {
        static getSupportedFormats = vi.fn().mockResolvedValue(['qr_code']);
        detect = mockDetect;
      }

      (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = MockBarcodeDetector;

      const mockVideo = {
        readyState: 4,
        videoWidth: 640,
        videoHeight: 480,
      } as unknown as HTMLVideoElement;

      const result = await decodeQrFromVideoFrame(mockVideo);
      expect(result).toEqual({
        rawValue: 'https://uims.internal/assets/AST-1002',
        parsedTag: 'AST-1002',
        source: 'barcode-detector',
      });
      expect(mockDetect).toHaveBeenCalledWith(mockVideo);
    });

    it('prioritizes valid asset barcodes when multiple barcodes are detected in a frame', async () => {
      const mockDetect = vi.fn().mockResolvedValue([
        {
          rawValue: 'https://fedex.com/tracking/1234567890',
          format: 'qr_code',
        },
        {
          rawValue: 'https://uims.internal/assets/AST-2026-9999',
          format: 'qr_code',
        },
      ]);

      class MockBarcodeDetector {
        static getSupportedFormats = vi.fn().mockResolvedValue(['qr_code']);
        detect = mockDetect;
      }

      (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = MockBarcodeDetector;

      const mockVideo = {
        readyState: 4,
        videoWidth: 640,
        videoHeight: 480,
      } as unknown as HTMLVideoElement;

      const result = await decodeQrFromVideoFrame(mockVideo);
      expect(result).toEqual({
        rawValue: 'https://uims.internal/assets/AST-2026-9999',
        parsedTag: 'AST-2026-9999',
        source: 'barcode-detector',
      });
    });

    it('downscales high-resolution video frames exceeding 720px max dimension for jsQR canvas processing', async () => {
      delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;

      const mockContext = {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(720 * 405 * 4),
          width: 720,
          height: 405,
        }),
      };

      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(mockContext),
        width: 0,
        height: 0,
      } as unknown as HTMLCanvasElement;

      // 1080p stream: 1920x1080 -> scaled to 720x405
      const mockVideo = {
        readyState: 4,
        videoWidth: 1920,
        videoHeight: 1080,
      } as unknown as HTMLVideoElement;

      await decodeQrFromVideoFrame(mockVideo, mockCanvas);
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 720, 405);
      expect(mockCanvas.width).toBe(720);
      expect(mockCanvas.height).toBe(405);
    });

    it('falls back to canvas and jsQR when BarcodeDetector is unavailable', async () => {
      delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;

      const mockContext = {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray(640 * 480 * 4),
          width: 640,
          height: 480,
        }),
      };

      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(mockContext),
        width: 0,
        height: 0,
      } as unknown as HTMLCanvasElement;

      const mockVideo = {
        readyState: 4,
        videoWidth: 640,
        videoHeight: 480,
      } as unknown as HTMLVideoElement;

      const result = await decodeQrFromVideoFrame(mockVideo, mockCanvas);
      // If jsQR finds nothing in blank image data, it returns null without throwing
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 640, 480);
      expect(result).toBeNull();
    });
  });

  describe('decodeQrFromImageFile', () => {
    afterEach(() => {
      delete (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector;
    });

    it('returns null for empty file input', async () => {
      const result = await decodeQrFromImageFile(null as unknown as File);
      expect(result).toBeNull();
    });

    it('decodes QR from image file using native BarcodeDetector when supported', async () => {
      const mockDetect = vi.fn().mockResolvedValue([
        {
          rawValue: 'https://uims.internal/assets/AST-IMG-7788',
          format: 'qr_code',
        },
      ]);

      class MockBarcodeDetector {
        static getSupportedFormats = vi.fn().mockResolvedValue(['qr_code']);
        detect = mockDetect;
      }

      (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = MockBarcodeDetector;

      const mockClose = vi.fn();
      const mockBitmap = { width: 400, height: 400, close: mockClose } as unknown as ImageBitmap;
      (window as unknown as { createImageBitmap: unknown }).createImageBitmap = vi
        .fn()
        .mockResolvedValue(mockBitmap);

      const file = new File(['dummy-content'], 'qr.png', { type: 'image/png' });
      const result = await decodeQrFromImageFile(file);

      expect(result).toEqual({
        rawValue: 'https://uims.internal/assets/AST-IMG-7788',
        parsedTag: 'AST-IMG-7788',
        source: 'barcode-detector',
      });
      expect(mockDetect).toHaveBeenCalledWith(mockBitmap);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('audio and haptic feedback', () => {
    it('executes playSuccessChime safely in all environments', () => {
      expect(() => playSuccessChime()).not.toThrow();

      const mockStart = vi.fn();
      class MockAudioContext {
        currentTime = 0;
        destination = {};
        createOscillator() {
          return {
            type: 'sine',
            frequency: {
              setValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
            start: mockStart,
            stop: vi.fn(),
          };
        }
        createGain() {
          return {
            gain: {
              setValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
          };
        }
      }

      (window as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
      playSuccessChime();
      expect(mockStart).toHaveBeenCalled();
    });

    it('executes triggerHapticFeedback safely with vibrate mock', () => {
      const mockVibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: mockVibrate,
        configurable: true,
        writable: true,
      });

      triggerHapticFeedback();
      expect(mockVibrate).toHaveBeenCalledWith([80, 40, 80]);
    });
  });
});
