import type { TopologyEdge, TopologyNode, TopologyViewMode } from '../components/topology/types';

export interface ExportTopologyPdfOptions {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  viewMode: TopologyViewMode;
  metrics?: {
    totalNodes?: number;
    totalEdges?: number;
    activeLinks?: number;
    totalSwitches?: number;
    totalCameras?: number;
    totalServers?: number;
    totalRacks?: number;
  } | null;
}

/**
 * Escapes text for PDF string literals.
 */
function escapePdfText(text: string): string {
  if (!text) return '';
  const sanitized = text.replace(/[\r\n\t]+/g, ' ');
  let out = '';
  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i];
    const code = sanitized.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      if (char === '(' || char === ')' || char === '\\') {
        out += '\\' + char;
      } else {
        out += char;
      }
    } else if (char === '↔') {
      out += '<->';
    } else if (char === '→') {
      out += '->';
    } else if (char === '·') {
      out += '|';
    } else {
      out += ' ';
    }
  }
  return out;
}

/**
 * Truncates text so it fits within column width.
 */
function fitText(text: string, colWidth: number, charWidth = 4.8): string {
  const maxChars = Math.max(1, Math.floor((colWidth - 8) / charWidth));
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 2)) + '..';
}

export interface GeneratedPdfResult {
  blob: Blob;
  pdfBytes: Uint8Array;
  fileName: string;
}

/**
 * Generates an authoritative landscape A4 PDF blueprint and cabling schedule.
 */
export function generateTopologyPdf(options: ExportTopologyPdfOptions): GeneratedPdfResult {
  const { nodes, edges, viewMode, metrics } = options;

  const nodeMap = new Map<string, TopologyNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  // A4 Landscape geometry in points
  const pageWidth = 842;
  const pageHeight = 595;
  const marginLeft = 36;
  const printableWidth = 770; // 842 - 72

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeUtcStr = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const fileName = `uims-network-topology-${viewMode.toLowerCase()}-${dateStr}.pdf`;

  // Compute metrics
  const totalNodes = metrics?.totalNodes ?? nodes.length;
  const totalEdges = metrics?.totalEdges ?? edges.length;
  const activeLinks = metrics?.activeLinks ?? edges.filter((e) => e.status === 'ACTIVE').length;
  const totalSwitches = metrics?.totalSwitches ?? nodes.filter((n) => n.type === 'SWITCH').length;
  const totalCameras = metrics?.totalCameras ?? nodes.filter((n) => n.type === 'CAMERA').length;
  const totalServers = metrics?.totalServers ?? nodes.filter((n) => n.type === 'SERVER').length;

  // Sort edges deterministically for schedule table: by Source Label, then Source Port
  const sortedEdges = [...edges].sort((a, b) => {
    const srcA = nodeMap.get(a.source)?.label || a.source;
    const srcB = nodeMap.get(b.source)?.label || b.source;
    if (srcA !== srcB) return srcA.localeCompare(srcB);
    const portA = a.sourcePortName || '';
    const portB = b.sourcePortName || '';
    if (portA !== portB) return portA.localeCompare(portB);
    return a.id.localeCompare(b.id);
  });

  // Table pagination
  const rowsPerPage = 22;
  const tablePagesCount = Math.max(1, Math.ceil(sortedEdges.length / rowsPerPage));
  const totalPages = 1 + tablePagesCount; // Page 1 is diagram, Pages 2..N are schedule table

  const pageStreams: string[] = [];

  // ==========================================
  // PAGE 1: DIAGRAM & OVERVIEW
  // ==========================================
  let p1Stream = '';

  // 1. Top Title Banner (Navy)
  p1Stream += `q\n0.07 0.11 0.18 rg\n${marginLeft} 515 ${printableWidth} 50 re f\nQ\n`;
  // Gold/Blue Sub-title
  p1Stream += `BT /F1 8 Tf 0.38 0.65 0.98 rg ${marginLeft + 14} 549 Td (${escapePdfText('Unified IT Management System (UIMS)')}) Tj ET\n`;
  // Title
  p1Stream += `BT /F2 13 Tf 1.0 1.0 1.0 rg ${marginLeft + 14} 533 Td (${escapePdfText('ENTERPRISE NETWORK ARCHITECTURE BLUEPRINT')}) Tj ET\n`;
  // Perspective Subtitle
  p1Stream += `BT /F1 8.5 Tf 0.88 0.91 0.94 rg ${marginLeft + 14} 521 Td (${escapePdfText(`Perspective View: ${viewMode} Infrastructure Topology Map`)}) Tj ET\n`;
  // Timestamp
  p1Stream += `BT /F1 8 Tf 0.60 0.65 0.72 rg ${marginLeft + 580} 533 Td (${escapePdfText(`Generated: ${timeUtcStr}`)}) Tj ET\n`;

  // 2. Telemetry Summary Ribbon
  p1Stream += `q\n0.96 0.97 0.98 rg\n${marginLeft} 482 ${printableWidth} 26 re f\n`;
  p1Stream += `0.85 0.88 0.91 RG\n1 w\n${marginLeft} 482 ${printableWidth} 26 re S\nQ\n`;
  const telemetrySummaryText = `Total Switches: ${totalSwitches}   |   Endpoints: ${totalNodes - totalSwitches} (${totalCameras} Cams, ${totalServers} Srv)   |   Total Edges: ${totalEdges}   |   Active Links: ${activeLinks}`;
  p1Stream += `BT /F2 9 Tf 0.12 0.16 0.23 rg ${marginLeft + 14} 491 Td (${escapePdfText(telemetrySummaryText)}) Tj ET\n`;

  // 3. Topology Visual Blueprint Container Box
  const diagX = marginLeft;
  const diagY = 50;
  const diagW = printableWidth;
  const diagH = 422;

  p1Stream += `q\n0.98 0.99 1.0 rg\n${diagX} ${diagY} ${diagW} ${diagH} re f\n`;
  p1Stream += `0.80 0.85 0.90 RG\n1 w\n${diagX} ${diagY} ${diagW} ${diagH} re S\nQ\n`;

  // Diagram Header Tag
  p1Stream += `BT /F2 9 Tf 0.25 0.35 0.45 rg ${diagX + 14} ${diagY + diagH - 18} Td (${escapePdfText('TOPOLOGY ARCHITECTURE DIAGRAM & PORT LINK TOPOLOGY')}) Tj ET\n`;

  // Determine Node Coordinates and scale to diagram box
  if (nodes.length > 0) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    const spanX = Math.max(100, maxX - minX);
    const spanY = Math.max(100, maxY - minY);

    const padX = 55;
    const padY = 45;
    const availW = diagW - padX * 2;
    const availH = diagH - padY * 2 - 25; // 25pt for header

    const nodeCoordMap = new Map<string, { cx: number; cy: number; w: number; h: number }>();
    const nodeCardW = 76;
    const nodeCardH = 34;

    for (const n of nodes) {
      const normX = (n.x - minX) / spanX;
      // In SVG y grows downwards; in PDF y grows upwards
      const normY = 1 - (n.y - minY) / spanY;
      const cx = diagX + padX + normX * availW;
      const cy = diagY + padY + normY * availH;
      nodeCoordMap.set(n.id, { cx, cy, w: nodeCardW, h: nodeCardH });
    }

    // Draw Edges
    for (const edge of edges) {
      const srcCoord = nodeCoordMap.get(edge.source);
      const tgtCoord = nodeCoordMap.get(edge.target);
      if (!srcCoord || !tgtCoord) continue;

      const isFiber =
        edge.media === 'FIBER' ||
        edge.speed?.includes('10G') ||
        edge.speed?.includes('40G') ||
        edge.type === 'UPLINK' ||
        edge.type === 'TRUNK';

      const isDown = edge.status === 'DOWN';
      const isDegraded = edge.status === 'CONNECTED_NO_SIGNAL' || edge.status === 'DEGRADED';

      const strokeR = isDown ? 0.94 : isDegraded ? 0.96 : isFiber ? 0.23 : 0.06;
      const strokeG = isDown ? 0.27 : isDegraded ? 0.62 : isFiber ? 0.51 : 0.72;
      const strokeB = isDown ? 0.27 : isDegraded ? 0.04 : isFiber ? 0.96 : 0.51;

      // Link path line
      p1Stream += `q\n${strokeR} ${strokeG} ${strokeB} RG\n${isFiber ? 1.5 : 1.0} w\n`;
      if (isDown || isDegraded) {
        p1Stream += `[4 3] 0 d\n`;
      }
      p1Stream += `${srcCoord.cx.toFixed(1)} ${srcCoord.cy.toFixed(1)} m ${tgtCoord.cx.toFixed(1)} ${tgtCoord.cy.toFixed(1)} l S\nQ\n`;

      // Center Port Badge
      const midX = (srcCoord.cx + tgtCoord.cx) / 2;
      const midY = (srcCoord.cy + tgtCoord.cy) / 2;
      const isTrunk =
        edge.type === 'UPLINK' ||
        edge.type === 'TRUNK' ||
        (nodeMap.get(edge.source)?.type === 'SWITCH' &&
          nodeMap.get(edge.target)?.type === 'SWITCH');

      const speedLabel = edge.speed || '1 Gbps';
      const labelText = isTrunk
        ? edge.sourcePortName
          ? `${edge.sourcePortName} <-> ${edge.targetPortName || 'Uplink'} | ${speedLabel}`
          : speedLabel
        : edge.sourcePortName
          ? `${edge.sourcePortName} -> ${edge.targetPortName || 'Endpoint'} | ${speedLabel}`
          : speedLabel;

      const badgeW = Math.max(50, labelText.length * 4.2 + 8);
      const badgeH = 12;

      p1Stream += `q\n1.0 1.0 1.0 rg\n${strokeR} ${strokeG} ${strokeB} RG\n0.8 w\n`;
      p1Stream += `${(midX - badgeW / 2).toFixed(1)} ${(midY - badgeH / 2).toFixed(1)} ${badgeW.toFixed(1)} ${badgeH} re B\nQ\n`;
      p1Stream += `BT /F1 6 Tf 0.12 0.16 0.23 rg ${(midX - badgeW / 2 + 4).toFixed(1)} ${(midY - 2.5).toFixed(1)} Td (${escapePdfText(fitText(labelText, badgeW, 4.0))}) Tj ET\n`;
    }

    // Draw Nodes
    for (const node of nodes) {
      const coord = nodeCoordMap.get(node.id);
      if (!coord) continue;

      const rx = coord.cx - coord.w / 2;
      const ry = coord.cy - coord.h / 2;

      // Card background
      p1Stream += `q\n1.0 1.0 1.0 rg\n0.80 0.84 0.88 RG\n1 w\n${rx.toFixed(1)} ${ry.toFixed(1)} ${coord.w} ${coord.h} re B\nQ\n`;

      // Header Bar Color
      let hr = 0.28;
      let hg = 0.33;
      let hb = 0.41;
      const role = (node.role || '').toUpperCase();
      if (node.type === 'SWITCH') {
        if (role === 'CORE') {
          hr = 0.45;
          hg = 0.18;
          hb = 0.82; // Purple
        } else if (role === 'DISTRIBUTION') {
          hr = 0.09;
          hg = 0.47;
          hb = 1.0; // Blue
        } else {
          hr = 0.01;
          hg = 0.52;
          hb = 0.78; // Access Teal
        }
      } else if (node.type === 'CAMERA') {
        hr = 0.03;
        hg = 0.57;
        hb = 0.7; // Cyan
      } else if (node.type === 'SERVER') {
        hr = 0.31;
        hg = 0.27;
        hb = 0.9; // Indigo
      } else if (node.type === 'NVR') {
        hr = 0.85;
        hg = 0.47;
        hb = 0.02; // Orange
      }

      // Header rect
      p1Stream += `q\n${hr} ${hg} ${hb} rg\n${rx.toFixed(1)} ${(ry + coord.h - 9).toFixed(1)} ${coord.w} 9 re f\nQ\n`;
      // Header text
      const nodeRoleText = node.type === 'SWITCH' ? role || 'SWITCH' : node.type;
      p1Stream += `BT /F2 5.5 Tf 1.0 1.0 1.0 rg ${(rx + 3).toFixed(1)} ${(ry + coord.h - 7).toFixed(1)} Td (${escapePdfText(fitText(nodeRoleText, coord.w - 6, 3.5))}) Tj ET\n`;

      // Node label
      p1Stream += `BT /F2 7 Tf 0.12 0.16 0.23 rg ${(rx + 4).toFixed(1)} ${(ry + coord.h - 18).toFixed(1)} Td (${escapePdfText(fitText(node.label, coord.w - 8, 4.4))}) Tj ET\n`;

      // Node IP / Subtitle
      const subInfo = node.ipAddress || node.model || 'Device';
      p1Stream += `BT /F1 6 Tf 0.40 0.46 0.54 rg ${(rx + 4).toFixed(1)} ${(ry + 5).toFixed(1)} Td (${escapePdfText(fitText(subInfo, coord.w - 8, 3.8))}) Tj ET\n`;
    }
  }

  // Page 1 Footer
  p1Stream += `BT /F1 7.5 Tf 0.45 0.50 0.58 rg ${marginLeft} 32 Td (${escapePdfText('UIMS Enterprise Network Infrastructure Blueprint — Confidential IT Operational Document')}) Tj ET\n`;
  p1Stream += `BT /F1 7.5 Tf 0.45 0.50 0.58 rg ${marginLeft + 680} 32 Td (${escapePdfText(`Page 1 of ${totalPages}`)}) Tj ET\n`;

  pageStreams.push(p1Stream);

  // ==========================================
  // PAGES 2..N: PORT-TO-PORT CABLING SCHEDULE
  // ==========================================
  const colWidths = {
    id: 70,
    srcNode: 125,
    srcPort: 85,
    tgtNode: 130,
    tgtPort: 105,
    speed: 85,
    type: 85,
    status: 85,
  };
  // 70 + 125 + 85 + 130 + 105 + 85 + 85 + 85 = 770pt

  for (let tablePageIdx = 0; tablePageIdx < tablePagesCount; tablePageIdx++) {
    const pageNum = tablePageIdx + 2;
    const startRow = tablePageIdx * rowsPerPage;
    const endRow = Math.min(sortedEdges.length, startRow + rowsPerPage);
    const pageRows = sortedEdges.slice(startRow, endRow);

    let stream = '';

    // Page Header
    stream += `BT /F2 12 Tf 0.12 0.16 0.23 rg ${marginLeft} 550 Td (${escapePdfText('PORT-TO-PORT LINK SCHEDULE & CONNECTION MATRIX')}) Tj ET\n`;
    stream += `BT /F1 8.5 Tf 0.40 0.46 0.54 rg ${marginLeft} 536 Td (${escapePdfText(`Structured Inter-Switch Trunk Links and Device Endpoint Terminations — Section ${tablePageIdx + 1} of ${tablePagesCount}`)}) Tj ET\n`;
    stream += `BT /F1 8 Tf 0.60 0.65 0.72 rg ${marginLeft + 580} 550 Td (${escapePdfText(`Perspective: ${viewMode}`)}) Tj ET\n`;

    // Table Header
    const tableTopY = 524;
    const rowHeight = 18;
    const headerHeight = 22;

    stream += `q\n0.12 0.16 0.23 rg\n${marginLeft} ${tableTopY - headerHeight} ${printableWidth} ${headerHeight} re f\nQ\n`;

    let curX = marginLeft;
    const headers = [
      { label: 'Link ID', w: colWidths.id },
      { label: 'Source Device', w: colWidths.srcNode },
      { label: 'Source Port', w: colWidths.srcPort },
      { label: 'Target Device', w: colWidths.tgtNode },
      { label: 'Target Port / Interface', w: colWidths.tgtPort },
      { label: 'Speed / Media', w: colWidths.speed },
      { label: 'Link Type', w: colWidths.type },
      { label: 'Status', w: colWidths.status },
    ];

    for (const h of headers) {
      stream += `BT /F2 8 Tf 1.0 1.0 1.0 rg ${curX + 6} ${tableTopY - 15} Td (${escapePdfText(h.label)}) Tj ET\n`;
      curX += h.w;
    }

    // Table Rows
    let rowY = tableTopY - headerHeight;

    for (let rIdx = 0; rIdx < pageRows.length; rIdx++) {
      const edge = pageRows[rIdx];
      const isAlt = rIdx % 2 === 1;
      const srcNode = nodeMap.get(edge.source);
      const tgtNode = nodeMap.get(edge.target);

      const srcLabel = srcNode?.label || edge.source;
      const srcPort = edge.sourcePortName || 'Port';
      const tgtLabel = tgtNode?.label || edge.target;
      const tgtPort = edge.targetPortName || (tgtNode?.type === 'SWITCH' ? 'Uplink' : 'Endpoint');
      const speedMedia = `${edge.speed || '1 Gbps'}${edge.media ? ` (${edge.media})` : ''}`;
      const linkType = edge.type || edge.linkType || 'LINK';
      const status = edge.status;

      // Row background
      if (isAlt) {
        stream += `q\n0.97 0.98 0.99 rg\n${marginLeft} ${rowY - rowHeight} ${printableWidth} ${rowHeight} re f\nQ\n`;
      }
      // Row bottom border
      stream += `q\n0.88 0.91 0.94 RG\n0.5 w\n${marginLeft} ${rowY - rowHeight} m ${marginLeft + printableWidth} ${rowY - rowHeight} l S\nQ\n`;

      // Text cells
      let cellX = marginLeft;
      const cells = [
        { val: edge.id, w: colWidths.id, isCode: true },
        { val: srcLabel, w: colWidths.srcNode, isBold: true },
        { val: srcPort, w: colWidths.srcPort, isCode: true },
        { val: tgtLabel, w: colWidths.tgtNode, isBold: true },
        { val: tgtPort, w: colWidths.tgtPort, isCode: true },
        { val: speedMedia, w: colWidths.speed },
        { val: linkType, w: colWidths.type },
        { val: status, w: colWidths.status, isStatus: true },
      ];

      for (const cell of cells) {
        const font = cell.isBold ? '/F2' : '/F1';
        let tr = 0.12;
        let tg = 0.16;
        let tb = 0.23;
        if (cell.isStatus) {
          if (cell.val === 'ACTIVE') {
            tr = 0.06;
            tg = 0.6;
            tb = 0.35;
          } else if (cell.val === 'DOWN') {
            tr = 0.88;
            tg = 0.18;
            tb = 0.18;
          } else {
            tr = 0.82;
            tg = 0.45;
            tb = 0.05;
          }
        }
        stream += `BT ${font} 7.5 Tf ${tr} ${tg} ${tb} rg ${cellX + 6} ${rowY - 12} Td (${escapePdfText(fitText(cell.val, cell.w - 10, 4.4))}) Tj ET\n`;
        cellX += cell.w;
      }

      rowY -= rowHeight;
    }

    // Outer table border
    const tableTotalH = headerHeight + pageRows.length * rowHeight;
    stream += `q\n0.80 0.84 0.88 RG\n1 w\n${marginLeft} ${tableTopY - tableTotalH} ${printableWidth} ${tableTotalH} re S\nQ\n`;

    // Footer
    stream += `BT /F1 7.5 Tf 0.45 0.50 0.58 rg ${marginLeft} 32 Td (${escapePdfText('UIMS Enterprise Network Infrastructure Blueprint — Confidential IT Operational Document')}) Tj ET\n`;
    stream += `BT /F1 7.5 Tf 0.45 0.50 0.58 rg ${marginLeft + 680} 32 Td (${escapePdfText(`Page ${pageNum} of ${totalPages}`)}) Tj ET\n`;

    pageStreams.push(stream);
  }

  // ==========================================
  // ASSEMBLE PDF 1.4 DOCUMENT
  // ==========================================
  const objects: string[] = [];

  // Obj 1: Catalog
  objects.push(`1 0 obj\n<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj\n`);

  // Obj 2: Pages root
  const pageObjectIds: number[] = [];
  let nextObjId = 3;

  for (let i = 0; i < pageStreams.length; i++) {
    pageObjectIds.push(nextObjId);
    nextObjId += 2; // Each page uses (PageObj, ContentObj)
  }

  const f1ObjId = nextObjId++;
  const f2ObjId = nextObjId++;

  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  objects.push(
    `2 0 obj\n<<\n  /Type /Pages\n  /Kids [${kidsStr}]\n  /Count ${pageStreams.length}\n>>\nendobj\n`,
  );

  // Page objects & Content streams
  for (let i = 0; i < pageStreams.length; i++) {
    const pObjId = pageObjectIds[i];
    const cObjId = pObjId + 1;
    const streamContent = pageStreams[i];
    const streamBytes = new TextEncoder().encode(streamContent);

    objects.push(
      `${pObjId} 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 ${pageWidth} ${pageHeight}]\n  /Resources <<\n    /Font <<\n      /F1 ${f1ObjId} 0 R\n      /F2 ${f2ObjId} 0 R\n    >>\n  >>\n  /Contents ${cObjId} 0 R\n>>\nendobj\n`,
    );

    objects.push(
      `${cObjId} 0 obj\n<<\n  /Length ${streamBytes.length}\n>>\nstream\n${streamContent}\nendstream\nendobj\n`,
    );
  }

  // Font Objects (Helvetica & Helvetica-Bold)
  objects.push(
    `${f1ObjId} 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica\n>>\nendobj\n`,
  );
  objects.push(
    `${f2ObjId} 0 obj\n<<\n  /Type /Font\n  /Subtype /Type1\n  /BaseFont /Helvetica-Bold\n>>\nendobj\n`,
  );

  // Build PDF text and xref
  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  let pdfString = header;
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdfString.length);
    pdfString += objects[i];
  }

  const xrefOffset = pdfString.length;
  pdfString += `xref\n0 ${offsets.length}\n`;
  pdfString += '0000000000 65535 f \n';

  for (let i = 1; i < offsets.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0');
    pdfString += `${offStr} 00000 n \n`;
  }

  pdfString += `trailer\n<<\n  /Size ${offsets.length}\n  /Root 1 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const pdfBytes = new TextEncoder().encode(pdfString);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  return { blob, pdfBytes, fileName };
}

/**
 * Triggers browser download of the generated PDF blueprint.
 */
export function exportTopologyPdf(options: ExportTopologyPdfOptions): void {
  const { blob, fileName } = generateTopologyPdf(options);
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
