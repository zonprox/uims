import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
} from 'docx';
import ExcelJS from 'exceljs';

export interface HandoverRecipient {
  fullName: string;
  employeeCode?: string;
  department?: string;
  email?: string;
  organization?: string;
}

export interface HandoverAssetItem {
  id?: string;
  tag: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string | null;
  condition: string;
}

export interface HandoverDocumentParams {
  title: string;
  subtitle: string;
  refId: string;
  type: 'assignment' | 'return';
  currentDate: string;
  recipient?: HandoverRecipient | null;
  assets: HandoverAssetItem[];
  conditionNotes?: string;
}

const PRIMARY_COLOR = '1E3A8A'; // Dark corporate blue
const BORDER_COLOR = 'CBD5E1'; // Slate-300
const HEADER_BG = 'F1F5F9'; // Slate-100
const TEXT_MUTED = '64748B'; // Slate-500

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: BORDER_COLOR,
};

const cellBorders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};

/**
 * Builds a professional Microsoft Word (.docx) document for Hardware Asset Handover / Return Record.
 */
export async function buildHandoverDocx(params: HandoverDocumentParams): Promise<Buffer> {
  const isReturn = params.type === 'return';
  const orgName = params.recipient?.organization || 'Youngone Corporation';
  const departmentName = params.recipient?.department || 'Information Technology';

  // 1. Organization Header & Title
  const headerParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: orgName.toUpperCase(),
          bold: true,
          size: 26, // 13pt
          color: PRIMARY_COLOR,
          font: 'Arial',
        }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'INFORMATION TECHNOLOGY DEPARTMENT — ASSET CUSTODY RECORD',
          size: 18, // 9pt
          color: TEXT_MUTED,
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: params.title,
          bold: true,
          size: 32, // 16pt
          color: '0F172A',
          font: 'Arial',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: params.subtitle,
          italics: true,
          size: 20, // 10pt
          color: TEXT_MUTED,
          font: 'Arial',
        }),
      ],
      spacing: { after: 240 },
    }),
    // Reference Number and Date
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `Document Ref: ${params.refId}  |  Date: ${params.currentDate}`,
          bold: true,
          size: 18,
          color: TEXT_MUTED,
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    }),
  ];

  // 2. Metadata Table (Recipient & Issuer info)
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: isReturn ? 'RETURNER / CUSTODIAN' : 'RECIPIENT / CUSTODIAN',
                    bold: true,
                    size: 19,
                    color: PRIMARY_COLOR,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: isReturn ? 'RECEIVER / IT DEPARTMENT' : 'ISSUER / IT DEPARTMENT',
                    bold: true,
                    size: 19,
                    color: PRIMARY_COLOR,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Full Name: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({
                    text: params.recipient?.fullName || '__________________________',
                    size: 18,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Employee ID: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({
                    text: params.recipient?.employeeCode || '—',
                    size: 18,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Department: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: departmentName, size: 18, font: 'Arial' }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Email: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({
                    text: params.recipient?.email || '—',
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Organization: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: orgName, size: 18, font: 'Arial' }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Issuer Dept: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: 'IT Asset Operations & Logistics', size: 18, font: 'Arial' }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Status: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({
                    text: isReturn ? 'Custody Terminated' : 'Assigned / In Use',
                    size: 18,
                    bold: true,
                    color: isReturn ? 'B45309' : '15803D',
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // 3. Equipment Specification Table
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 6, type: WidthType.PERCENTAGE },
        shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 60, right: 60 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: '#', bold: true, size: 18, color: 'FFFFFF', font: 'Arial' }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 18, type: WidthType.PERCENTAGE },
        shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Asset Tag',
                bold: true,
                size: 18,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 26, type: WidthType.PERCENTAGE },
        shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Equipment Name',
                bold: true,
                size: 18,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Model / Brand',
                bold: true,
                size: 18,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 18, type: WidthType.PERCENTAGE },
        shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Serial Number',
                bold: true,
                size: 18,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 12, type: WidthType.PERCENTAGE },
        shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Condition',
                bold: true,
                size: 18,
                color: 'FFFFFF',
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const assetRows: TableRow[] = [];
  if (params.assets.length > 0) {
    params.assets.forEach((asset, idx) => {
      assetRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 6, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 80, bottom: 80, left: 60, right: 60 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: String(idx + 1), size: 18, font: 'Arial' })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 18, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: asset.tag, bold: true, size: 18, font: 'Arial' })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 26, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: asset.name, size: 18, font: 'Arial' })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${asset.manufacturer || ''} ${asset.model || ''}`.trim() || 'Standard',
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 18, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: asset.serialNumber || 'N/A',
                      size: 18,
                      font: 'Courier New',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: asset.condition, size: 18, font: 'Arial' })],
                }),
              ],
            }),
          ],
        }),
      );
    });
  } else {
    // 3 blank placeholder rows for manual fill-in
    for (let i = 1; i <= 3; i++) {
      assetRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 6, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 120, bottom: 120, left: 60, right: 60 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: String(i), size: 18, font: 'Arial' })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 18, type: WidthType.PERCENTAGE },
              margins: { top: 120, bottom: 120, left: 80, right: 80 },
              children: [new Paragraph({ text: 'AST-___________' })],
            }),
            new TableCell({
              width: { size: 26, type: WidthType.PERCENTAGE },
              margins: { top: 120, bottom: 120, left: 80, right: 80 },
              children: [new Paragraph({ text: '________________________' })],
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              margins: { top: 120, bottom: 120, left: 80, right: 80 },
              children: [new Paragraph({ text: '____________________' })],
            }),
            new TableCell({
              width: { size: 18, type: WidthType.PERCENTAGE },
              margins: { top: 120, bottom: 120, left: 80, right: 80 },
              children: [new Paragraph({ text: 'SN-_________________' })],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              margins: { top: 120, bottom: 120, left: 80, right: 80 },
              children: [
                new Paragraph({
                  text: isReturn ? '[ ] Normal  [ ] Damaged' : '[ ] Operational',
                }),
              ],
            }),
          ],
        }),
      );
    }
  }

  const equipmentTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [tableHeaderRow, ...assetRows],
  });

  // 4. Custody Terms & Conditions
  const termsParagraphs = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'TERMS OF CUSTODY & RESPONSIBILITY AGREEMENT',
          bold: true,
          size: 19,
          color: PRIMARY_COLOR,
          font: 'Arial',
        }),
      ],
      spacing: { before: 240, after: 100 },
    }),
  ];

  if (params.conditionNotes) {
    termsParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Inspection / Condition Notes: ',
            bold: true,
            size: 18,
            font: 'Arial',
          }),
          new TextRun({ text: params.conditionNotes, italics: true, size: 18, font: 'Arial' }),
        ],
        spacing: { after: 100 },
      }),
    );
  }

  const termsList = isReturn
    ? [
        '1. The employee confirms the physical return and custody release of all equipment listed above.',
        '2. The IT Department has inspected the equipment and verified serial numbers and physical state.',
        '3. All corporate data on the device will be securely archived or sanitized per Youngone Security Policy.',
      ]
    : [
        '1. The recipient acknowledges receipt of the hardware equipment listed above in working condition.',
        '2. The recipient agrees to exercise reasonable care in safeguarding the equipment against damage, loss, or theft.',
        '3. The equipment remains corporate property and must be returned upon transfer, resignation, or company request.',
        '4. Any loss, damage, or malfunction must be reported immediately to the IT Department.',
      ];

  termsList.forEach((term) => {
    termsParagraphs.push(
      new Paragraph({
        children: [new TextRun({ text: term, size: 17, color: '334155', font: 'Arial' })],
        spacing: { after: 60 },
      }),
    );
  });

  // 5. Signature Section (2 side-by-side boxes)
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 140, bottom: 140, left: 140, right: 140 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: isReturn
                      ? 'Employee / Custodian (Returner)'
                      : 'Employee / Custodian (Recipient)',
                    bold: true,
                    size: 19,
                    color: PRIMARY_COLOR,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '(Sign and Print Full Name)',
                    italics: true,
                    size: 16,
                    color: TEXT_MUTED,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 400 }, // Space for signature
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Signature: _________________________________`,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Full Name: ${params.recipient?.fullName || '_________________________________'}`,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Date: _____ / _____ / __________`,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 140, bottom: 140, left: 140, right: 140 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: isReturn
                      ? 'IT Department Representative (Receiver)'
                      : 'IT Department Representative (Issuer)',
                    bold: true,
                    size: 19,
                    color: PRIMARY_COLOR,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '(Sign and Print Full Name)',
                    italics: true,
                    size: 16,
                    color: TEXT_MUTED,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 400 }, // Space for signature
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Signature: _________________________________`,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Full Name: _________________________________`,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Date: _____ / _____ / __________`,
                    size: 18,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000,
            },
          },
        },
        children: [
          ...headerParagraphs,
          metaTable,
          new Paragraph({ spacing: { after: 200 } }),
          equipmentTable,
          ...termsParagraphs,
          new Paragraph({ spacing: { after: 200 } }),
          signatureTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Builds an Excel (.xlsx) workbook for Hardware Asset Handover / Return Record.
 */
export async function buildHandoverXlsx(params: HandoverDocumentParams): Promise<Buffer> {
  const isReturn = params.type === 'return';
  const orgName = params.recipient?.organization || 'Youngone Corporation';
  const departmentName = params.recipient?.department || 'Information Technology';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Unified IT Management System (UIMS)';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(isReturn ? 'Return Record' : 'Handover Record', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
  });

  // Columns setup
  worksheet.columns = [
    { width: 6 }, // A: #
    { width: 18 }, // B: Asset Tag
    { width: 28 }, // C: Name
    { width: 24 }, // D: Model/Brand
    { width: 22 }, // E: Serial
    { width: 16 }, // F: Condition
  ];

  // 1. Header Rows
  worksheet.addRow([orgName.toUpperCase()]);
  worksheet.mergeCells('A1:F1');
  const orgCell = worksheet.getCell('A1');
  orgCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: '1E3A8A' } };
  orgCell.alignment = { horizontal: 'center' };

  worksheet.addRow(['INFORMATION TECHNOLOGY DEPARTMENT — ASSET CUSTODY RECORD']);
  worksheet.mergeCells('A2:F2');
  const subDeptCell = worksheet.getCell('A2');
  subDeptCell.font = { name: 'Arial', size: 9, color: { argb: '64748B' } };
  subDeptCell.alignment = { horizontal: 'center' };

  worksheet.addRow([params.title]);
  worksheet.mergeCells('A3:F3');
  const titleCell = worksheet.getCell('A3');
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: '0F172A' } };
  titleCell.alignment = { horizontal: 'center' };

  worksheet.addRow([params.subtitle]);
  worksheet.mergeCells('A4:F4');
  const subTitleCell = worksheet.getCell('A4');
  subTitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '64748B' } };
  subTitleCell.alignment = { horizontal: 'center' };

  worksheet.addRow([`Document Ref: ${params.refId}   |   Date: ${params.currentDate}`]);
  worksheet.mergeCells('A5:F5');
  const refCell = worksheet.getCell('A5');
  refCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '64748B' } };
  refCell.alignment = { horizontal: 'right' };

  worksheet.addRow([]); // Blank line 6

  // 2. Custodian & Issuer Details
  const startRow = 7;
  worksheet.addRow([
    isReturn ? 'RETURNER / CUSTODIAN' : 'RECIPIENT / CUSTODIAN',
    '',
    '',
    isReturn ? 'RECEIVER / IT DEPARTMENT' : 'ISSUER / IT DEPARTMENT',
  ]);
  worksheet.mergeCells(`A${startRow}:C${startRow}`);
  worksheet.mergeCells(`D${startRow}:F${startRow}`);
  worksheet.getCell(`A${startRow}`).font = { bold: true, color: { argb: '1E3A8A' } };
  worksheet.getCell(`D${startRow}`).font = { bold: true, color: { argb: '1E3A8A' } };
  worksheet.getCell(`A${startRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F1F5F9' },
  };
  worksheet.getCell(`D${startRow}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F1F5F9' },
  };

  worksheet.addRow([
    `Full Name: ${params.recipient?.fullName || '—'}`,
    '',
    '',
    `Organization: ${orgName}`,
  ]);
  worksheet.mergeCells(`A8:C8`);
  worksheet.mergeCells(`D8:F8`);

  worksheet.addRow([
    `Employee ID: ${params.recipient?.employeeCode || '—'}`,
    '',
    '',
    `Issuer Dept: IT Asset Operations`,
  ]);
  worksheet.mergeCells(`A9:C9`);
  worksheet.mergeCells(`D9:F9`);

  worksheet.addRow([
    `Department: ${departmentName}`,
    '',
    '',
    `Status: ${isReturn ? 'Custody Terminated' : 'Assigned / In Use'}`,
  ]);
  worksheet.mergeCells(`A10:C10`);
  worksheet.mergeCells(`D10:F10`);

  worksheet.addRow([]); // Blank line 11

  // 3. Equipment Table Header
  const th = worksheet.addRow([
    '#',
    'Asset Tag',
    'Equipment Name',
    'Model / Brand',
    'Serial Number',
    'Condition',
  ]);
  th.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  });

  // Rows
  if (params.assets.length > 0) {
    params.assets.forEach((a, i) => {
      const row = worksheet.addRow([
        i + 1,
        a.tag,
        a.name,
        `${a.manufacturer || ''} ${a.model || ''}`.trim() || 'Standard',
        a.serialNumber || 'N/A',
        a.condition,
      ]);
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9.5 };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'left' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
          left: { style: 'thin', color: { argb: 'E2E8F0' } },
          right: { style: 'thin', color: { argb: 'E2E8F0' } },
        };
      });
    });
  } else {
    for (let i = 1; i <= 3; i++) {
      const row = worksheet.addRow([
        i,
        'AST-__________',
        '____________________',
        '____________________',
        'SN-_________________',
        isReturn ? 'Normal' : 'Good / Operational',
      ]);
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9.5, color: { argb: '64748B' } };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'left' };
      });
    }
  }

  worksheet.addRow([]); // Blank
  if (params.conditionNotes) {
    const notesRow = worksheet.addRow([`Condition Notes: ${params.conditionNotes}`]);
    worksheet.mergeCells(`A${notesRow.number}:F${notesRow.number}`);
    notesRow.getCell(1).font = { italic: true, size: 9.5, color: { argb: '475569' } };
  }

  // Signatures
  const sigHeaderRow = worksheet.addRow([
    isReturn ? 'Employee / Custodian (Returner)' : 'Employee / Custodian (Recipient)',
    '',
    '',
    isReturn ? 'IT Department Representative (Receiver)' : 'IT Department Representative (Issuer)',
  ]);
  worksheet.mergeCells(`A${sigHeaderRow.number}:C${sigHeaderRow.number}`);
  worksheet.mergeCells(`D${sigHeaderRow.number}:F${sigHeaderRow.number}`);
  sigHeaderRow.getCell(1).font = { bold: true, color: { argb: '1E3A8A' } };
  sigHeaderRow.getCell(4).font = { bold: true, color: { argb: '1E3A8A' } };

  worksheet.addRow([]);
  worksheet.addRow([]); // Blank for signature

  const signLine = worksheet.addRow([
    'Signature: _______________________',
    '',
    '',
    'Signature: _______________________',
  ]);
  worksheet.mergeCells(`A${signLine.number}:C${signLine.number}`);
  worksheet.mergeCells(`D${signLine.number}:F${signLine.number}`);

  const nameLine = worksheet.addRow([
    `Full Name: ${params.recipient?.fullName || '_______________________'}`,
    '',
    '',
    'Full Name: _______________________',
  ]);
  worksheet.mergeCells(`A${nameLine.number}:C${nameLine.number}`);
  worksheet.mergeCells(`D${nameLine.number}:F${nameLine.number}`);

  const dateLine = worksheet.addRow([
    'Date: _____ / _____ / ________',
    '',
    '',
    'Date: _____ / _____ / ________',
  ]);
  worksheet.mergeCells(`A${dateLine.number}:C${dateLine.number}`);
  worksheet.mergeCells(`D${dateLine.number}:F${dateLine.number}`);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
