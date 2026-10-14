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

