import jsQR from 'jsqr';

export interface DecodedQrResult {
  rawValue: string;
  parsedTag: string;
  source: 'barcode-detector' | 'canvas-jsqr';
}

export interface BarcodeDetectorOptions {
  formats: string[];
}

export interface DetectedBarcode {
  rawValue: string;
  format: string;
}

export interface NativeBarcodeDetector {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

export interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

export interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean;
}

/**
 * Known path keywords that precede an asset tag in URL structures.
 */
const ROUTE_KEYWORDS = new Set([
  'assets',
  'asset',
  'view',
  'detail',
  'details',
  'inspect',
  'edit',
  'item',
  'items',
  'show',
  'inventory',
  'hardware',
  'device',
  'devices',
]);

/**
 * Standard asset tag / serial format matcher (e.g. AST-1001, SN-APPLE-1002, IT-9922).
 */
const ASSET_TAG_REGEX = /^(?:AST|SN|IT|DEV|HW|TAG)-[A-Za-z0-9-]+$/i;
const GENERAL_IDENTIFIER_REGEX = /^[A-Za-z0-9]+-[A-Za-z0-9-]+$/;

function extractTagFromSegments(segments: string[]): string {
  if (segments.length === 0) return '';
  const assetsIndex = segments.findIndex((s) => {
    const lower = s.toLowerCase();
    return (
      lower === 'assets' ||
      lower === 'asset' ||
      lower === 'inventory' ||
      lower === 'hardware' ||
      lower === 'devices' ||
      lower === 'device'
    );
  });

  if (assetsIndex !== -1) {
    // Search forward from assetsIndex for the first non-keyword segment
    for (let i = assetsIndex + 1; i < segments.length; i++) {
      const seg = decodeURIComponent(segments[i] || '').trim();
      if (seg && !ROUTE_KEYWORDS.has(seg.toLowerCase())) {
        return seg;
      }
    }
    return '';
  }

  // If no asset route keyword present, accept last segment ONLY if it matches an asset identifier pattern
  const lastSeg = decodeURIComponent(segments[segments.length - 1] || '').trim();
  if (lastSeg && !ROUTE_KEYWORDS.has(lastSeg.toLowerCase())) {
    if (ASSET_TAG_REGEX.test(lastSeg) || GENERAL_IDENTIFIER_REGEX.test(lastSeg)) {
      return lastSeg;
    }
  }

  return '';
}

/**
 * Non-asset URI schemes and signatures to reject immediately.
 */
const NON_ASSET_SCHEME_REGEX =
  /^(?:wifi|begin:vcard|begin:vevent|mailto|tel|sms|smsto|mms|geo|javascript|data|ftp|sftp|ssh|file|ws|wss|smb):/i;

/**
 * Intelligent payload parser extracting asset tag/serial identifier from raw strings, URLs, URNs, or JSON.
 */
export function parseAssetQrPayload(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // Reject non-asset QR payloads (Wi-Fi, vCard, mailto, tel, scripts, network URI schemes)
  if (NON_ASSET_SCHEME_REGEX.test(trimmed)) {
    return '';
  }

  // Reject multi-line text or HTML tags
  if (trimmed.includes('\n') || trimmed.includes('\r') || /<[^>]+>/.test(trimmed)) {
    return '';
  }

  // Reject JSON arrays
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return '';
  }

  // 1. JSON-encoded asset labels (e.g. {"tag":"AST-1001"} or {"assetTag":"AST-1001"})
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsedJson = JSON.parse(trimmed) as Record<string, unknown>;
      if (typeof parsedJson === 'object' && parsedJson !== null) {
        const candidate =
          parsedJson.tag ||
          parsedJson.assetTag ||
          parsedJson.asset_tag ||
          parsedJson.id ||
          parsedJson.assetId ||
          parsedJson.asset_id ||
          parsedJson.serial ||
          parsedJson.serialNumber ||
          parsedJson.serial_number;
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
        // Valid JSON object without asset identifier should not fall through to raw string
        return '';
      }
    } catch (_jsonErr: unknown) {
      // Non-JSON or malformed payload, fall through
    }
  }

  // 2. Custom URN or URI schemes (e.g. asset:AST-1001, tag:AST-1001, urn:asset:AST-1001)
  const uriSchemeMatch = trimmed.match(/^(?:urn:)?(?:asset|tag|uims-asset):(.+)$/i);
  if (uriSchemeMatch?.[1]) {
    return decodeURIComponent(uriSchemeMatch[1]).trim();
  }

  // 3. Extract from HTTP/HTTPS or protocol-relative URLs
  try {
    if (/^(https?:\/\/|\/\/)/i.test(trimmed)) {
      const parsedUrl = new URL(trimmed, 'https://uims.internal');

      // Query parameters lookup
      const param =
        parsedUrl.searchParams.get('tag') ||
        parsedUrl.searchParams.get('assetTag') ||
        parsedUrl.searchParams.get('asset_tag') ||
        parsedUrl.searchParams.get('id') ||
        parsedUrl.searchParams.get('assetId') ||
        parsedUrl.searchParams.get('asset_id') ||
        parsedUrl.searchParams.get('serial') ||
        parsedUrl.searchParams.get('serialNumber');
      if (param?.trim()) {
        return param.trim();
      }

      // Check hash-based routing: e.g. /#/assets/AST-1001 or /#/assets?tag=AST-1001
      if (parsedUrl.hash) {
        const hashContent = parsedUrl.hash.replace(/^#\/?/, '');
        const hashQueryIndex = hashContent.indexOf('?');
        if (hashQueryIndex !== -1) {
          const hashSearchParams = new URLSearchParams(hashContent.slice(hashQueryIndex + 1));
          const hashParam =
            hashSearchParams.get('tag') ||
            hashSearchParams.get('assetTag') ||
            hashSearchParams.get('asset_tag') ||
            hashSearchParams.get('id') ||
            hashSearchParams.get('assetId') ||
            hashSearchParams.get('asset_id') ||
            hashSearchParams.get('serial') ||
            hashSearchParams.get('serialNumber');
          if (hashParam?.trim()) {
            return hashParam.trim();
          }
        }

        const hashPath = hashQueryIndex !== -1 ? hashContent.slice(0, hashQueryIndex) : hashContent;
        const hashSegments = hashPath.split('/').filter(Boolean);
        const extractedFromHash = extractTagFromSegments(hashSegments);
        if (extractedFromHash) {
          return extractedFromHash;
        }
      }

      // Standard pathname segments
      const segments = parsedUrl.pathname.split('/').filter(Boolean);
      const extractedFromSegments = extractTagFromSegments(segments);
      if (extractedFromSegments) {
        return extractedFromSegments;
      }

      // Plain URL with no identifiable asset tag or route
      return '';
    }
  } catch (_urlErr: unknown) {
    // Fall back to regex patterns
  }

  // 4. Domain-like path without protocol (e.g. uims.internal/assets/AST-1001 or uims.internal/assets/view/AST-1001)
  const assetPathMatch = trimmed.match(
    /(?:^|\/)assets\/(?:(?:view|detail|details|inspect)\/)?([^/?#\s]+)/i,
  );
  if (assetPathMatch?.[1]) {
    const candidate = decodeURIComponent(assetPathMatch[1]).trim();
    if (candidate && !ROUTE_KEYWORDS.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  // 5. Query string match without protocol (e.g. ?tag=AST-1001 or ...&assetId=AST-1001)
  const queryParamMatch = trimmed.match(
    /[?&](?:tag|assetTag|id|assetId|serial|serialNumber)=([^&#\s]+)/i,
  );
  if (queryParamMatch?.[1]) {
    return decodeURIComponent(queryParamMatch[1]).trim();
  }

  // 6. Generic URL filter: if string is a URL without tag, reject
  if (/^(?:https?:\/\/|\/\/)/i.test(trimmed)) {
    return '';
  }

  // 7. Reject raw bracketed payloads that failed JSON parsing
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return '';
  }

  // 8. Raw identifier (e.g. AST-2026-0042, SN-APPLE-1001)
  return trimmed;
}

let lastCheckedDetectorClass: unknown = undefined;
let barcodeDetectorSupportedCache: boolean | null = null;

/**
 * Checks whether native BarcodeDetector API with 'qr_code' format is supported.
 */
export async function isBarcodeDetectorSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const detectorClass = (
    window as unknown as {
      BarcodeDetector?: { getSupportedFormats?: () => Promise<string[]> };
    }
  ).BarcodeDetector;

  if (detectorClass !== lastCheckedDetectorClass) {
    lastCheckedDetectorClass = detectorClass;
    barcodeDetectorSupportedCache = null;
  } else if (barcodeDetectorSupportedCache !== null) {
    return barcodeDetectorSupportedCache;
  }

  if (!detectorClass || typeof detectorClass.getSupportedFormats !== 'function') {
    barcodeDetectorSupportedCache = false;
    return false;
  }

  try {
    const formats = await detectorClass.getSupportedFormats();
    const supported = Array.isArray(formats) && formats.includes('qr_code');
    barcodeDetectorSupportedCache = supported;
    return supported;
  } catch (_formatsErr: unknown) {
    barcodeDetectorSupportedCache = false;
    return false;
  }
}

/**
 * Decodes a QR code from a video element, attempting native BarcodeDetector first,
 * with resilient jsQR canvas fallback.
 */
export async function decodeQrFromVideoFrame(
  video: HTMLVideoElement,
  canvas?: HTMLCanvasElement,
): Promise<DecodedQrResult | null> {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  // 1. Hardware accelerated detection via BarcodeDetector
  if (await isBarcodeDetectorSupported()) {
    try {
      const detectorClass = (
        window as unknown as {
          BarcodeDetector: new (opts: BarcodeDetectorOptions) => NativeBarcodeDetector;
        }
      ).BarcodeDetector;
      const detector = new detectorClass({ formats: ['qr_code'] });
      const barcodes = await Promise.race([
        detector.detect(video),
        new Promise<DetectedBarcode[]>((_, reject) =>
          setTimeout(() => reject(new Error('BarcodeDetector timeout')), 150),
        ),
      ]);
      // Prioritize barcodes that resolve to a valid asset tag
      for (const barcode of barcodes) {
        if (barcode.rawValue) {
          const parsed = parseAssetQrPayload(barcode.rawValue);
          if (parsed) {
            return {
              rawValue: barcode.rawValue,
              parsedTag: parsed,
              source: 'barcode-detector',
            };
          }
        }
      }
      if (barcodes.length > 0 && barcodes[0]?.rawValue) {
        const rawValue = barcodes[0].rawValue;
        return {
          rawValue,
          parsedTag: parseAssetQrPayload(rawValue),
          source: 'barcode-detector',
        };
      }
    } catch (_detectErr: unknown) {
      // Fall through to canvas-based jsQR
    }
  }

  // 2. Canvas-based fallback with jsQR
  try {
    const targetCanvas = canvas || document.createElement('canvas');
    const width = video.videoWidth;
    const height = video.videoHeight;

    // Scale high-res frames (e.g. 1080p, 4K) to a maximum dimension of 720px for jsQR performance
    const maxDimension = 720;
    let targetWidth = width;
    let targetHeight = height;
    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      targetWidth = Math.max(1, Math.round(width * scale));
      targetHeight = Math.max(1, Math.round(height * scale));
    }

    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;

    const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const qr = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (qr && qr.data) {
      return {
        rawValue: qr.data,
        parsedTag: parseAssetQrPayload(qr.data),
        source: 'canvas-jsqr',
      };
    }
  } catch (_canvasErr: unknown) {
    // Canvas reading blocked or failed
  }

  return null;
}

/**
 * Decodes a QR code from an uploaded image file.
 */
export async function decodeQrFromImageFile(file: File): Promise<DecodedQrResult | null> {
  if (!file) return null;

  // 1. BarcodeDetector attempt
  if (await isBarcodeDetectorSupported()) {
    let imageSource: ImageBitmap | HTMLImageElement | null = null;
    try {
      if (typeof createImageBitmap === 'function') {
        imageSource = await createImageBitmap(file);
      } else {
        imageSource = await loadImageElement(file);
      }

      if (imageSource) {
        const detectorClass = (
          window as unknown as {
            BarcodeDetector: new (opts: BarcodeDetectorOptions) => NativeBarcodeDetector;
          }
        ).BarcodeDetector;
        const detector = new detectorClass({ formats: ['qr_code'] });
        const barcodes = await detector.detect(imageSource);
        for (const barcode of barcodes) {
          if (barcode.rawValue) {
            const parsed = parseAssetQrPayload(barcode.rawValue);
            if (parsed) {
              return {
                rawValue: barcode.rawValue,
                parsedTag: parsed,
                source: 'barcode-detector',
              };
            }
          }
        }
        if (barcodes.length > 0 && barcodes[0]?.rawValue) {
          const rawValue = barcodes[0].rawValue;
          return {
            rawValue,
            parsedTag: parseAssetQrPayload(rawValue),
            source: 'barcode-detector',
          };
        }
      }
    } catch (_detectorErr: unknown) {
      // Fallback to canvas
    } finally {
      if (imageSource && 'close' in imageSource && typeof imageSource.close === 'function') {
        imageSource.close();
      }
    }
  }

  // 2. Canvas fallback with jsQR
  try {
    const img = await loadImageElement(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 400;
    canvas.height = img.naturalHeight || img.height || 400;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (qr && qr.data) {
      return {
        rawValue: qr.data,
        parsedTag: parseAssetQrPayload(qr.data),
        source: 'canvas-jsqr',
      };
    }
  } catch (_jsqrErr: unknown) {
    // Decoding failed
  }

  return null;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Triggers a pleasant enterprise two-tone chime upon successful QR recognition.
 */
export function playSuccessChime(): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.onended = () => {
      ctx.close().catch((_closeErr: unknown) => {
        // Non-fatal AudioContext cleanup failure
      });
    };

    // Safety fallback: ensure audio context is closed even if onended doesn't trigger
    setTimeout(() => {
      if (ctx.state !== 'closed') {
        ctx.close().catch((_fallbackCloseErr: unknown) => {
          // Non-fatal AudioContext cleanup fallback failure
        });
      }
    }, 300);

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (_audioErr: unknown) {
    // Autoplay policy or unsupported audio environment
  }
}

/**
 * Triggers haptic confirmation vibration where hardware allows.
 */
export function triggerHapticFeedback(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([80, 40, 80]);
    }
  } catch (_hapticErr: unknown) {
    // Haptic feedback not supported
  }
}
