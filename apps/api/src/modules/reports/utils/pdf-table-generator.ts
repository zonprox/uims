/**
 * PDF 1.4 Table Generator
 * Produces standard-compliant PDF 1.4 documents with custom table layout,
 * alternating row styling, pagination, headers, and footers.
 */

export interface PdfColumn {
  header: string;
  width: number; // width in points (A4 landscape total printable width = 770pt)
  align?: 'left' | 'center' | 'right';
}

export interface PdfTableOptions {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: Array<Array<string | number | null | undefined>>;
}

/**
 * Escapes characters for PDF literal strings and converts non-ASCII to clean representation.
 */
function escapePdfText(text: string): string {
  if (!text) return '';
  const sanitized = text.replace(/[\r\n\t]+/g, ' ');
  let out = '';
  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      if (sanitized[i] === '(' || sanitized[i] === ')' || sanitized[i] === '\\') {
        out += '\\' + sanitized[i];
      } else {
        out += sanitized[i];
      }
    } else {
      out += ' ';
    }
  }
  return out;
}

/**
 * Truncates text so it fits within the specified column width.
 */
function fitText(text: string, colWidth: number, charWidth = 4.2): string {
  const maxChars = Math.max(1, Math.floor((colWidth - 8) / charWidth));
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 3)) + '...';
}

export function generatePdfTable(options: PdfTableOptions): Buffer {
  const { title, subtitle, columns, rows } = options;

  // Geometry
  const pageWidth = 842; // A4 Landscape
  const pageHeight = 595;
  const marginLeft = 36;
  const marginRight = pageWidth - 36;
  const tableWidth = marginRight - marginLeft; // 770pt
  const rowHeight = 17;
  const headerHeight = 22;

  // Rows per page calculation
  const firstPageTopY = 492;
  const subsequentPageTopY = 520;
  const bottomLimitY = 46;

  const firstPageCapacity = Math.floor((firstPageTopY - bottomLimitY) / rowHeight);
  const subsequentCapacity = Math.floor((subsequentPageTopY - bottomLimitY) / rowHeight);

  // Split rows across pages
  const pagesData: Array<Array<Array<string | number | null | undefined>>> = [];
  if (rows.length === 0) {
    pagesData.push([]);
  } else {
    let index = 0;
    // Page 1
    const p1Rows = rows.slice(0, firstPageCapacity);
    pagesData.push(p1Rows);
    index += p1Rows.length;

    // Subsequent pages
    while (index < rows.length) {
      const nextBatch = rows.slice(index, index + subsequentCapacity);
      pagesData.push(nextBatch);
      index += nextBatch.length;
    }
  }

  const totalPages = pagesData.length;
  const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  // Build stream content for each page
  const pageStreams: string[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const isFirstPage = pageIdx === 0;
    const pageRows = pagesData[pageIdx];
    let stream = '';

    // Header block
    if (isFirstPage) {
      // Document Title
      stream += `BT\n/F2 15 Tf\n0.086 0.25 0.5 rg\n${marginLeft} 544 Td\n(${escapePdfText(title)}) Tj\nET\n`;

      // Subtitle & Metadata
      const metaText = subtitle
        ? `${subtitle} • Generated: ${dateStr} • Total Records: ${rows.length}`
        : `Unified IT Management System (UIMS) • Generated: ${dateStr} • Total Records: ${rows.length}`;
      stream += `BT\n/F1 8.5 Tf\n0.4 0.45 0.5 rg\n${marginLeft} 526 Td\n(${escapePdfText(metaText)}) Tj\nET\n`;

      // Separator rule
      stream += `0.85 0.88 0.92 RG\n1 w\n${marginLeft} 516 m ${marginRight} 516 l\nS\n`;
    } else {
      // Compact header on subsequent pages
      stream += `BT\n/F2 10 Tf\n0.086 0.25 0.5 rg\n${marginLeft} 560 Td\n(${escapePdfText(title)} - Continued) Tj\nET\n`;
      stream += `BT\n/F1 7.5 Tf\n0.45 0.5 0.55 rg\n${marginLeft} 548 Td\n(Page ${pageIdx + 1} of ${totalPages} • Generated: ${dateStr}) Tj\nET\n`;
      stream += `0.85 0.88 0.92 RG\n0.5 w\n${marginLeft} 542 m ${marginRight} 542 l\nS\n`;
    }

    // Table Header Row
    const headerY = isFirstPage ? firstPageTopY : subsequentPageTopY;

    // Header Background (#1677ff)
    stream += `0.086 0.467 1 rg\n${marginLeft} ${headerY - headerHeight} ${tableWidth} ${headerHeight} re\nf\n`;

    // Header Cells
    let currentX = marginLeft;
    for (const col of columns) {
      const cellText = escapePdfText(fitText(col.header, col.width, 4.8));
      const textX = currentX + 5;
      const textY = headerY - headerHeight + 7;

      stream += `BT\n/F2 8.5 Tf\n1 1 1 rg\n${textX} ${textY} Td\n(${cellText}) Tj\nET\n`;
      currentX += col.width;
    }

    // Data Rows
    let currentY = headerY - headerHeight;

    if (pageRows.length === 0) {
      // Empty data state
      currentY -= rowHeight;
      stream += `1 1 1 rg\n${marginLeft} ${currentY} ${tableWidth} ${rowHeight} re\nf\n`;
      stream += `0.88 0.9 0.93 RG\n0.5 w\n${marginLeft} ${currentY} ${tableWidth} ${rowHeight} re\ns\n`;
      stream += `BT\n/F1 8 Tf\n0.5 0.5 0.5 rg\n${marginLeft + 15} ${currentY + 5} Td\n(No records found for this domain.) Tj\nET\n`;
    } else {
      for (let rIdx = 0; rIdx < pageRows.length; rIdx++) {
        currentY -= rowHeight;
        const row = pageRows[rIdx];
        const isOdd = rIdx % 2 === 1;

        // Row background
        if (isOdd) {
          stream += `0.965 0.975 0.985 rg\n${marginLeft} ${currentY} ${tableWidth} ${rowHeight} re\nf\n`;
        } else {
          stream += `1 1 1 rg\n${marginLeft} ${currentY} ${tableWidth} ${rowHeight} re\nf\n`;
        }

        // Bottom border line
        stream += `0.88 0.9 0.93 RG\n0.5 w\n${marginLeft} ${currentY} m ${marginRight} ${currentY} l\nS\n`;

        // Render cells
        let colX = marginLeft;
        for (let cIdx = 0; cIdx < columns.length; cIdx++) {
          const col = columns[cIdx];
          const rawVal = row[cIdx];
          const valStr = rawVal != null ? String(rawVal) : 'N/A';
          const fittedText = escapePdfText(fitText(valStr, col.width, 4.2));

          const textX = colX + 4;
          const textY = currentY + 5;

          stream += `BT\n/F1 7.5 Tf\n0.15 0.18 0.22 rg\n${textX} ${textY} Td\n(${fittedText}) Tj\nET\n`;
          colX += col.width;
        }
      }
    }

    // Outer Table Border
    const tableTop = headerY;
    const tableHeight = tableTop - currentY;
    stream += `0.75 0.8 0.86 RG\n0.75 w\n${marginLeft} ${currentY} ${tableWidth} ${tableHeight} re\ns\n`;

    // Footer
    stream += `0.85 0.88 0.92 RG\n0.5 w\n${marginLeft} 34 m ${marginRight} 34 l\nS\n`;
    stream += `BT\n/F1 7.5 Tf\n0.45 0.5 0.55 rg\n${marginLeft} 22 Td\n(Confidential • Unified IT Management System (UIMS) • Operational Export) Tj\nET\n`;
    const pageNumberStr = `Page ${pageIdx + 1} of ${totalPages}`;
    stream += `BT\n/F1 7.5 Tf\n0.45 0.5 0.55 rg\n${marginRight - 65} 22 Td\n(${escapePdfText(pageNumberStr)}) Tj\nET\n`;

    pageStreams.push(stream);
  }

  // PDF Structure Generation
  const chunks: Buffer[] = [];
  let currentOffset = 0;
  const offsets: number[] = [];

  function write(chunk: string): void {
    const buf = Buffer.from(chunk, 'latin1');
    chunks.push(buf);
    currentOffset += buf.length;
  }

  // Header
  write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Object 1: Catalog
  offsets[1] = currentOffset;
  write('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Object 2: Pages
  offsets[2] = currentOffset;
  const pageIds: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    pageIds.push(`${5 + i * 2} 0 R`);
  }
  write(`2 0 obj\n<< /Type /Pages /Kids [${pageIds.join(' ')}] /Count ${totalPages} >>\nendobj\n`);

  // Object 3: Font Helvetica (Regular)
  offsets[3] = currentOffset;
  write(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
  );

  // Object 4: Font Helvetica-Bold (Bold)
  offsets[4] = currentOffset;
  write(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
  );

  // Pages & Content Objects
  for (let i = 0; i < totalPages; i++) {
    const pageObjId = 5 + i * 2;
    const contentObjId = 6 + i * 2;
    const content = pageStreams[i];
    const contentLen = Buffer.byteLength(content, 'latin1');

    // Page object
    offsets[pageObjId] = currentOffset;
    write(
      `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`,
    );

    // Content object
    offsets[contentObjId] = currentOffset;
    write(
      `${contentObjId} 0 obj\n<< /Length ${contentLen} >>\nstream\n${content}\nendstream\nendobj\n`,
    );
  }

  // Cross-reference table (xref)
  const totalObjects = 4 + totalPages * 2;
  const xrefOffset = currentOffset;

  write(`xref\n0 ${totalObjects + 1}\n0000000000 65535 f \n`);
  for (let i = 1; i <= totalObjects; i++) {
    const off = (offsets[i] || 0).toString().padStart(10, '0');
    write(`${off} 00000 n \n`);
  }

  // Trailer
  write(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.concat(chunks);
}
