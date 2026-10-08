import { z } from 'zod';
import type { Asset } from '../../../services/assets.service';

export const printableAssetSchema = z.object({
  tag: z.string().min(1, 'Tag is required'),
  name: z.string().min(1, 'Name is required'),
  sapCode: z.string().nullable().optional(),
  subcode: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  category: z
    .union([z.object({ name: z.string() }), z.string()])
    .nullable()
    .optional(),
  location: z
    .union([z.object({ name: z.string() }), z.string()])
    .nullable()
    .optional(),
  costCenter: z
    .union([
      z.object({
        id: z.string().optional(),
        code: z.string().optional(),
        name: z.string().optional(),
      }),
      z.string(),
    ])
    .nullable()
    .optional(),
  date: z.string().nullable().optional(),
});

export type PrintableAssetData = z.infer<typeof printableAssetSchema>;

/**
 * Escapes special characters to prevent HTML injection.
 * Safely handles null, undefined, numbers, and objects without crashing.
 */
export function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) {
    return '';
  }
  let str: string;
  try {
    str = String(text);
  } catch (_error: unknown) {
    return '';
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely sanitizes and validates printable asset data at runtime,
 * falling back to safe defaults if fields are missing, invalid, or null.
 */
export function sanitizePrintableAsset(input: unknown): PrintableAssetData {
  if (typeof input !== 'object' || input === null) {
    return {
      tag: 'UNKNOWN-TAG',
      name: 'Unnamed Asset',
      sapCode: 'UNKNOWN-TAG',
      subcode: 'UNKNOWN-TAG',
      serialNumber: null,
      model: null,
      category: null,
      location: null,
      costCenter: 'IT-OPS',
      date: new Date().toISOString().slice(0, 10),
    };
  }

  const raw = input as Record<string, unknown>;

  const tag =
    typeof raw.tag === 'string' && raw.tag.trim().length > 0
      ? raw.tag.trim()
      : raw.tag != null
        ? String(raw.tag).trim() || 'UNKNOWN-TAG'
        : 'UNKNOWN-TAG';

  const sapCode =
    typeof raw.sapCode === 'string' && raw.sapCode.trim().length > 0
      ? raw.sapCode.trim()
      : typeof raw.assetCode === 'string' && raw.assetCode.trim().length > 0
        ? raw.assetCode.trim()
        : tag;

  const subcode =
    typeof raw.subcode === 'string' && raw.subcode.trim().length > 0 ? raw.subcode.trim() : tag;

  const name =
    typeof raw.name === 'string' && raw.name.trim().length > 0
      ? raw.name.trim()
      : raw.name != null
        ? String(raw.name).trim() || 'Unnamed Asset'
        : 'Unnamed Asset';

  const serialNumber =
    typeof raw.serialNumber === 'string'
      ? raw.serialNumber
      : raw.serialNumber != null
        ? String(raw.serialNumber)
        : null;

  const model =
    typeof raw.model === 'string' ? raw.model : raw.model != null ? String(raw.model) : null;

  const date =
    typeof raw.date === 'string' && raw.date.trim().length > 0
      ? raw.date.trim()
      : typeof raw.purchaseDate === 'string' && raw.purchaseDate.trim().length > 0
        ? raw.purchaseDate.trim().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

  let costCenter: PrintableAssetData['costCenter'] = 'IT-OPS';
  if (typeof raw.costCenter === 'string' && raw.costCenter.trim().length > 0) {
    costCenter = raw.costCenter.trim();
  } else if (
    typeof raw.costCenter === 'object' &&
    raw.costCenter !== null &&
    'code' in raw.costCenter &&
    typeof (raw.costCenter as { code: unknown }).code === 'string'
  ) {
    const ccObj = raw.costCenter as { code: string; name?: string };
    costCenter = {
      code: ccObj.code,
      name: typeof ccObj.name === 'string' ? ccObj.name : undefined,
    };
  }

  let category: PrintableAssetData['category'] = null;
  if (typeof raw.category === 'string') {
    category = raw.category;
  } else if (
    typeof raw.category === 'object' &&
    raw.category !== null &&
    'name' in raw.category &&
    typeof (raw.category as { name: unknown }).name === 'string'
  ) {
    category = { name: (raw.category as { name: string }).name };
  }

  let location: PrintableAssetData['location'] = null;
  if (typeof raw.location === 'string') {
    location = raw.location;
  } else if (
    typeof raw.location === 'object' &&
    raw.location !== null &&
    'name' in raw.location &&
    typeof (raw.location as { name: unknown }).name === 'string'
  ) {
    location = { name: (raw.location as { name: string }).name };
  }

  return {
    tag,
    name,
    sapCode,
    subcode,
    serialNumber,
    model,
    category,
    location,
    costCenter,
    date,
  };
}

/**
 * Converts a rendered QRCode canvas into a high-contrast black-on-white image,
 * ensuring dark mode canvases with white modules or transparent backgrounds
 * are converted into pure black (#000000) modules on white (#ffffff) for printing.
 */
export function convertToBlackAndWhiteQr(sourceCanvas: HTMLCanvasElement): string {
  try {
    const width = sourceCanvas.width || 200;
    const height = sourceCanvas.height || 200;
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    const srcCtx = sourceCanvas.getContext('2d');

    if (!offCtx || !srcCtx) {
      return typeof sourceCanvas.toDataURL === 'function'
        ? sourceCanvas.toDataURL('image/png')
        : '';
    }

    // Fill offscreen background with white
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, width, height);

    const imgData = srcCtx.getImageData(0, 0, width, height);
    const src = imgData.data;
    const targetImgData = offCtx.createImageData(width, height);
    const dst = targetImgData.data;

    // Detect whether canvas uses transparent background or opaque background
    let transparentCount = 0;
    let lightCount = 0;
    let darkCount = 0;
    const totalPixels = src.length / 4;

    for (let i = 0; i < src.length; i += 4) {
      const a = src[i + 3];
      if (a < 50) {
        transparentCount++;
      } else {
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        if (lum >= 128) {
          lightCount++;
        } else {
          darkCount++;
        }
      }
    }

    const isTransparentBg = transparentCount > totalPixels * 0.05;
    const isDarkOpaqueBg = !isTransparentBg && darkCount > lightCount;

    for (let i = 0; i < src.length; i += 4) {
      const a = src[i + 3];
      let isModule = false;

      if (isTransparentBg) {
        // Transparent background: any visible/semi-opaque pixel is a QR module
        isModule = a >= 50;
      } else if (isDarkOpaqueBg) {
        // Dark opaque background: modules are light pixels
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        isModule = lum >= 128;
      } else {
        // Standard light opaque background: modules are dark pixels
        const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        isModule = lum < 128;
      }

      if (isModule) {
        dst[i] = 0;
        dst[i + 1] = 0;
        dst[i + 2] = 0;
        dst[i + 3] = 255;
      } else {
        dst[i] = 255;
        dst[i + 1] = 255;
        dst[i + 2] = 255;
        dst[i + 3] = 255;
      }
    }

    offCtx.putImageData(targetImgData, 0, 0);
    return offscreen.toDataURL('image/png');
  } catch (_error: unknown) {
    return typeof sourceCanvas.toDataURL === 'function' ? sourceCanvas.toDataURL('image/png') : '';
  }
}

/**
 * Converts an SVG QR code element to an image data URL for printing.
 */
export function convertSvgToDataUrl(svgElement: SVGElement): string {
  try {
    const clone = svgElement.cloneNode(true) as SVGElement;
    clone.setAttribute('width', '160');
    clone.setAttribute('height', '160');
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  } catch (_error: unknown) {
    return '';
  }
}

/**
 * Builds self-contained HTML for printing an asset label sticker.
 */
export function generatePrintLabelHtml(assetInput: PrintableAssetData, qrDataUrl: string): string {
  const asset = sanitizePrintableAsset(assetInput);
  const categoryName =
    typeof asset.category === 'object' && asset.category !== null
      ? asset.category.name
      : typeof asset.category === 'string'
        ? asset.category
        : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Asset Label - ${escapeHtml(asset.tag)}</title>
  <style>
    @page {
      size: auto;
      margin: 0mm;
    }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .label-print-page {
        width: 100vw;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
      }
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .label-print-page {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 16px;
      box-sizing: border-box;
    }
    .asset-label-badge {
      width: 100%;
      max-width: 380px;
      border: 1.5px dashed #777777;
      border-radius: 4px;
      padding: 12px 14px;
      background: #ffffff;
      color: #000000;
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 14px;
      text-align: left;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .label-org-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: #000000;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 3px;
      margin-bottom: 6px;
      line-height: 1.2;
    }
    .label-qr-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      background: #ffffff;
    }
    .label-qr-img {
      width: 110px;
      height: 110px;
      display: block;
      image-rendering: pixelated;
    }
    .label-content-wrap {
      flex: 1;
      min-width: 0;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .label-tag {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      color: #000000;
    }
    .label-name {
      color: #000000;
    }
    .label-meta-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 11px;
      line-height: 1.3;
      color: #000000;
    }
    .label-meta-item {
      white-space: normal;
      word-break: break-word;
      overflow-wrap: break-word;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="label-print-page">
    <div class="asset-label-badge">
      <div class="label-qr-wrap">
        ${
          qrDataUrl
            ? `<img src="${qrDataUrl}" class="label-qr-img" alt="QR Code: ${escapeHtml(asset.subcode || asset.tag)}" />`
            : `<div style="width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; border: 1px solid #000;">${escapeHtml(asset.subcode || asset.tag)}</div>`
        }
      </div>
      <div class="label-content-wrap">
        <div class="label-org-title">IT ASSET TAGGING</div>
        <div class="label-meta-row">
          <div class="label-meta-item"><strong>SAP Code: </strong><span class="label-tag">${escapeHtml(asset.sapCode || asset.tag)}</span></div>
          <div class="label-meta-item"><strong>SUB Code: </strong><span class="label-tag">${escapeHtml(asset.subcode || asset.tag)}</span></div>
          <div class="label-meta-item"><strong>Model: </strong><span class="label-name">${escapeHtml(asset.model || asset.name)}</span></div>
          <div class="label-meta-item"><strong>Date: </strong><span style="font-family: monospace;">${escapeHtml(asset.date || new Date().toISOString().slice(0, 10))}</span></div>
          <div class="label-meta-item"><strong>Cost Center: </strong><span>${escapeHtml(typeof asset.costCenter === 'object' && asset.costCenter ? `${asset.costCenter.code || ''} ${asset.costCenter.name ? `- ${asset.costCenter.name}` : ''}`.trim() : asset.costCenter || 'IT-OPS')}</span></div>
          ${categoryName ? `<div class="label-meta-item">Category: ${escapeHtml(categoryName)}</div>` : ''}
          <div style="display:none;" class="legacy-name">${escapeHtml(asset.name)}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Executes isolated asset label printing via a hidden iframe,
 * printing ONLY the asset sticker label and avoiding any full-page leakage.
 */
export function printAssetLabel(
  assetInput: PrintableAssetData | Asset,
  qrCanvasOrContainer?: HTMLCanvasElement | HTMLElement | null,
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const asset = sanitizePrintableAsset(assetInput);

  // 1. Locate the rendered QR canvas or SVG
  let canvas: HTMLCanvasElement | null = null;
  let svg: SVGElement | null = null;

  if (qrCanvasOrContainer instanceof HTMLCanvasElement) {
    canvas = qrCanvasOrContainer;
  } else if (qrCanvasOrContainer instanceof SVGElement) {
    svg = qrCanvasOrContainer;
  } else if (qrCanvasOrContainer instanceof HTMLElement) {
    canvas = qrCanvasOrContainer.querySelector('canvas');
    svg = qrCanvasOrContainer.querySelector('svg');
  }

  if (!canvas && !svg) {
    canvas =
      document.querySelector('.printable-asset-label canvas') ||
      document.querySelector('.ant-qrcode canvas');
    svg =
      document.querySelector('.printable-asset-label svg') ||
      document.querySelector('.ant-qrcode svg');
  }

  let qrDataUrl = '';
  if (canvas) {
    qrDataUrl = convertToBlackAndWhiteQr(canvas);
  } else if (svg) {
    qrDataUrl = convertSvgToDataUrl(svg);
  }

  // 2. Build isolated label HTML
  const html = generatePrintLabelHtml(asset, qrDataUrl);

  // 3. Create isolated iframe for printing with valid dimensions
  const iframe = document.createElement('iframe');
  iframe.setAttribute('id', 'uims-print-frame');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '350px';
  iframe.style.height = '450px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback if iframe document is not accessible
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const handlePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (_printErr: unknown) {
      window.print();
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  };

  const img = doc.querySelector('img');
  if (img) {
    if (typeof img.decode === 'function') {
      img
        .decode()
        .then(() => setTimeout(handlePrint, 50))
        .catch((_decodeErr: unknown) => handlePrint());
    } else if (!img.complete) {
      img.onload = () => setTimeout(handlePrint, 50);
      img.onerror = () => handlePrint();
    } else {
      setTimeout(handlePrint, 100);
    }
  } else {
    setTimeout(handlePrint, 150);
  }
}

/**
 * Builds self-contained HTML for batch printing multiple asset QR label sheets.
 */
export function generateBatchPrintSheetHtml(sheetContentHtml: string, columns: 3 | 4 = 3): string {
  const is4Cols = columns === 4;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Batch Asset Labels - UIMS</title>
  <style>
    @page {
      size: auto;
      margin: 8mm;
    }
    :root {
      color-scheme: light !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      color-scheme: light !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .printable-asset-sheet {
      display: grid !important;
      grid-template-columns: repeat(${columns}, 1fr) !important;
      gap: ${is4Cols ? '6px' : '8px'} !important;
      width: 100% !important;
      box-sizing: border-box !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
    }
    .printable-sheet-card {
      position: static !important;
      border: 1.5px dashed #777777 !important;
      border-radius: 4px !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      box-sizing: border-box !important;
      padding: ${is4Cols ? '8px 10px' : '12px 14px'} !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      text-align: left !important;
      gap: ${is4Cols ? '8px' : '14px'} !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .printable-sheet-card span,
    .printable-sheet-card strong,
    .printable-sheet-card p,
    .printable-sheet-card div {
      color: #000000 !important;
      background: transparent !important;
      white-space: normal !important;
      word-break: break-word !important;
      overflow-wrap: break-word !important;
    }
    .printable-sheet-qr {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      padding: 2px !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
    }
    .printable-sheet-qr svg {
      display: block !important;
    }
  </style>
</head>
<body>
  <div class="printable-asset-sheet ${is4Cols ? 'cols-4' : 'cols-3'}">
    ${sheetContentHtml}
  </div>
</body>
</html>`;
}

/**
 * Executes isolated batch asset label printing via a hidden iframe.
 * Ensures the print dialog renders in pure white with black text without
 * modifying or overriding any styles on the main application design page.
 */
export function printBatchAssetSheet(
  sheetContainer?: HTMLElement | null,
  columns: 3 | 4 = 3,
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  const target = sheetContainer || document.querySelector('.printable-asset-sheet');
  const sheetContentHtml = target ? target.innerHTML : '';
  const html = generateBatchPrintSheetHtml(sheetContentHtml, columns);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('id', 'uims-batch-print-frame');
  iframe.style.position = 'fixed';
  iframe.style.top = '-9999px';
  iframe.style.left = '-9999px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    if (typeof window.print === 'function') {
      window.print();
    }
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const handlePrint = () => {
    try {
      if (typeof iframe.contentWindow?.print === 'function') {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else if (typeof window.print === 'function') {
        window.print();
      }
    } catch (_printErr: unknown) {
      if (typeof window.print === 'function') {
        window.print();
      }
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  };

  handlePrint();
}
