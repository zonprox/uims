import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

export interface TemplateSubjectData {
  id?: string;
  fullName: string;
  codeOrBadge: string;
  subjectType: 'DIRECTORY_USER' | 'NON_AD_USER';
  companyOrOrg: string;
  departmentOrTitle?: string;
  email?: string;
  phone?: string;
}

export interface TemplateDoorItem {
  id?: string;
  doorCode: string;
  name: string;
  building: string;
  floor: string;
  zone?: string;
  securityLevel: string;
  accessType?: string;
  validFrom?: string;
  validTo?: string;
}

export interface AccessRequestTemplateParams {
  refId: string;
  currentDate: string;
  subject?: TemplateSubjectData | null;
  doors: TemplateDoorItem[];
  reason?: string;
  accessType?: 'PERMANENT' | 'TIME_BOUND';
  validFrom?: string;
  validTo?: string;
}

const PRIMARY_COLOR = '1E3A8A'; // Corporate deep navy blue
const SECONDARY_COLOR = '0F172A'; // Slate-900
const BORDER_COLOR = 'CBD5E1'; // Slate-300
const HEADER_BG = 'F1F5F9'; // Slate-100
const TEXT_MUTED = '64748B'; // Slate-500
const WARNING_COLOR = 'B45309'; // Amber-700

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
 * Builds a standardized Microsoft Word (.docx) Physical Door Access Authorization & Clearance Form.
 */
export async function buildAccessRequestDocx(params: AccessRequestTemplateParams): Promise<Buffer> {
  const applicantName = params.subject?.fullName || '_________________________________';
  const applicantId = params.subject?.codeOrBadge || '_________________';
  const orgOrCompany = params.subject?.companyOrOrg || 'Youngone / Broadpeak Group';
  const deptOrTitle = params.subject?.departmentOrTitle || '_________________';
  const email = params.subject?.email || '_________________';
  const phone = params.subject?.phone || '_________________';
  const subjectClassification =
    params.subject?.subjectType === 'NON_AD_USER'
      ? 'External Personnel (Contractor / Vendor / Auditor)'
      : 'Corporate Domain Employee (Active Directory)';

  const accessDuration =
    params.accessType === 'TIME_BOUND'
      ? `Time-Bound Access (${params.validFrom || 'Immediately'} to ${params.validTo || 'Expiration Date'})`
      : 'Permanent Authorization (Until Revocation or Role Transition)';

  const reasonText = params.reason?.trim()
    ? params.reason.trim()
    : 'Authorized duties, infrastructure maintenance, facilities operation, or security audit.';

  // 1. Header Paragraphs
  const headerParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'YOUNGONE / BROADPEAK ENTERPRISE SECURITY',
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
          text: 'PHYSICAL ACCESS CONTROL CLEARANCE & AUTHORIZATION FORM',
          bold: true,
          size: 32, // 16pt
          color: SECONDARY_COLOR,
          font: 'Arial',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Form UIMS-SEC-FORM-04  |  Information Security & Physical Asset Governance',
          italics: true,
          size: 18, // 9pt
          color: TEXT_MUTED,
          font: 'Arial',
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `Document Ref: ${params.refId}  |  Issuance Date: ${params.currentDate}`,
          bold: true,
          size: 18,
          color: TEXT_MUTED,
          font: 'Arial',
        }),
      ],
      spacing: { after: 180 },
    }),
  ];

  // 2. Applicant Identification Table
  const applicantTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnSpan: 2,
            shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'SECTION 1: APPLICANT IDENTIFICATION & CLASSIFICATION',
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
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Full Name: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: applicantName, size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Company / Org: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: orgOrCompany, size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Department / Title: ',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                  new TextRun({ text: deptOrTitle, size: 18, font: 'Arial' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Employee / Badge ID: ',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                  new TextRun({ text: applicantId, size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Classification: ', bold: true, size: 18, font: 'Arial' }),
                  new TextRun({ text: subjectClassification, size: 18, font: 'Arial' }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Contact Phone / Email: ',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                  new TextRun({ text: `${phone} | ${email}`, size: 18, font: 'Arial' }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // 3. Requested Physical Doors Table
  const doorHeaderRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'DOOR CODE',
                bold: true,
                size: 17,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'FACILITY / DOOR NAME',
                bold: true,
                size: 17,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'BUILDING / FLOOR / ZONE',
                bold: true,
                size: 17,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'SECURITY LEVEL',
                bold: true,
                size: 17,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'VALIDITY WINDOW',
                bold: true,
                size: 17,
                color: PRIMARY_COLOR,
                font: 'Arial',
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doorDataRows = (
    params.doors.length > 0
      ? params.doors
      : [
          {
            doorCode: 'DR-SAMPLE-01',
            name: 'Server Room Core Entrance',
            building: 'Broadpeak Tower',
            floor: '3F',
            zone: 'Data Vault',
            securityLevel: 'CRITICAL',
          },
        ]
  ).map(
    (door) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: door.doorCode, bold: true, size: 17, font: 'Arial' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: door.name, size: 17, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${door.building} - ${door.floor}${door.zone ? ` (${door.zone})` : ''}`,
                    size: 16,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: door.securityLevel, bold: true, size: 16, font: 'Arial' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 80, right: 80 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: params.accessType === 'TIME_BOUND' ? 'TIME_BOUND' : 'PERMANENT',
                    size: 16,
                    font: 'Arial',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
  );

  const doorsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnSpan: 5,
            shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'SECTION 2: PHYSICAL ACCESS CLEARANCE & ACCESS POINTS',
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
      doorHeaderRow,
      ...doorDataRows,
    ],
  });

  // 4. Justification & Security Rules
  const rulesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'SECTION 3: OPERATIONAL JUSTIFICATION & PHYSICAL SECURITY MANDATES',
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
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Business Justification: ',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                  new TextRun({ text: reasonText, size: 18, font: 'Arial' }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Requested Authorization Window: ',
                    bold: true,
                    size: 18,
                    font: 'Arial',
                  }),
                  new TextRun({ text: accessDuration, size: 18, font: 'Arial' }),
                ],
                spacing: { after: 140 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'PHYSICAL ACCESS CODE OF CONDUCT & SECURITY INVARIANTS:',
                    bold: true,
                    size: 17,
                    color: WARNING_COLOR,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '1. ANTI-PASSBACK COMPLIANCE: Badges are strictly non-transferable. Swiping another individual into a secured perimeter is an immediate termination offense.',
                    size: 16,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '2. ZERO TAILGATING POLICY: Every individual must scan their own credential upon entry and exit. Visitors must be escorted at all times in High and Critical zones.',
                    size: 16,
                    font: 'Arial',
                  }),
                ],
                spacing: { after: 40 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '3. INCIDENT REPORTING: Lost or compromised badges must be reported immediately to IT Security within 15 minutes of discovery.',
                    size: 16,
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

  // 5. Formal Signature Blocks Table (4 Signatories)
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnSpan: 4,
            shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'SECTION 4: MULTI-TIER CLEARANCE & SIGN-OFF BLOCKS',
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
        height: { value: 1800, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 80, bottom: 100, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'APPLICANT SIGNATURE',
                    bold: true,
                    size: 15,
                    font: 'Arial',
                    color: PRIMARY_COLOR,
                  }),
                ],
                spacing: { after: 600 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Signature: __________________', size: 15, font: 'Arial' }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Date: ____/____/2026', size: 15, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 80, bottom: 100, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'HOST / SPONSOR APPROVAL',
                    bold: true,
                    size: 15,
                    font: 'Arial',
                    color: PRIMARY_COLOR,
                  }),
                ],
                spacing: { after: 600 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Signature: __________________', size: 15, font: 'Arial' }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Date: ____/____/2026', size: 15, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 80, bottom: 100, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'IT INFOSEC CLEARANCE',
                    bold: true,
                    size: 15,
                    font: 'Arial',
                    color: PRIMARY_COLOR,
                  }),
                ],
                spacing: { after: 600 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Signature: __________________', size: 15, font: 'Arial' }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Date: ____/____/2026', size: 15, font: 'Arial' })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 80, bottom: 100, left: 80, right: 80 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'SECURITY BADGE ENCODING',
                    bold: true,
                    size: 15,
                    font: 'Arial',
                    color: PRIMARY_COLOR,
                  }),
                ],
                spacing: { after: 600 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Signature: __________________', size: 15, font: 'Arial' }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Date: ____/____/2026', size: 15, font: 'Arial' })],
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
          applicantTable,
          new Paragraph({ spacing: { after: 200 } }),
          doorsTable,
          new Paragraph({ spacing: { after: 200 } }),
          rulesTable,
          new Paragraph({ spacing: { after: 200 } }),
          signatureTable,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/**
 * Builds a clean, printable HTML access authorization clearance form with print-ready CSS rules.
 */
export function buildAccessRequestHtml(params: AccessRequestTemplateParams): string {
  const applicantName = params.subject?.fullName || '_________________________________';
  const applicantId = params.subject?.codeOrBadge || '_________________';
  const orgOrCompany = params.subject?.companyOrOrg || 'Youngone / Broadpeak Group';
  const deptOrTitle = params.subject?.departmentOrTitle || '_________________';
  const email = params.subject?.email || '_________________';
  const phone = params.subject?.phone || '_________________';
  const subjectClassification =
    params.subject?.subjectType === 'NON_AD_USER'
      ? 'External Personnel (Contractor / Vendor / Auditor)'
      : 'Corporate Domain Employee (Active Directory)';

  const accessDuration =
    params.accessType === 'TIME_BOUND'
      ? `Time-Bound Access (${params.validFrom || 'Immediately'} to ${params.validTo || 'Expiration Date'})`
      : 'Permanent Authorization (Until Revocation or Role Transition)';

  const reasonText = params.reason?.trim()
    ? params.reason.trim()
    : 'Authorized duties, infrastructure maintenance, facilities operation, or security audit.';

  const doorRows = (
    params.doors.length > 0
      ? params.doors
      : [
          {
            doorCode: 'DR-SAMPLE-01',
            name: 'Server Room Core Entrance',
            building: 'Broadpeak Tower',
            floor: '3F',
            zone: 'Data Vault',
            securityLevel: 'CRITICAL',
          },
        ]
  )
    .map(
      (door) => `
      <tr>
        <td style="font-weight: bold;">${door.doorCode}</td>
        <td>${door.name}</td>
        <td>${door.building} - ${door.floor}${door.zone ? ` (${door.zone})` : ''}</td>
        <td><span class="badge ${door.securityLevel.toLowerCase()}">${door.securityLevel}</span></td>
        <td>${params.accessType === 'TIME_BOUND' ? 'TIME_BOUND' : 'PERMANENT'}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Physical Door Access Authorization & Clearance Form - ${params.refId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 20px;
      font-size: 13px;
      line-height: 1.4;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 30px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
    }
    .header-org {
      color: #1e3a8a;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.5px;
      text-align: center;
      margin-bottom: 4px;
    }
    .header-title {
      font-size: 18px;
      font-weight: 800;
      text-align: center;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .header-sub {
      font-size: 11px;
      color: #64748b;
      text-align: center;
      margin-bottom: 20px;
    }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 6px;
      margin-bottom: 16px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }
    .section-title {
      background: #f1f5f9;
      color: #1e3a8a;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 10px;
      margin-top: 14px;
      margin-bottom: 8px;
      border-left: 4px solid #1e3a8a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
      font-size: 12px;
    }
    th {
      background: #f8fafc;
      color: #1e3a8a;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge.critical { background: #fee2e2; color: #b91c1c; }
    .badge.high { background: #ffedd5; color: #c2410c; }
    .badge.restricted { background: #fef3c7; color: #b45309; }
    .badge.standard { background: #e0f2fe; color: #0369a1; }
    .rules-box {
      border: 1px solid #cbd5e1;
      padding: 10px;
      background: #fdfdfd;
      margin-bottom: 14px;
      font-size: 11px;
    }
    .rules-box h4 {
      margin: 0 0 6px 0;
      color: #b45309;
      font-size: 12px;
    }
    .rules-box ol {
      margin: 0;
      padding-left: 20px;
    }
    .rules-box li {
      margin-bottom: 4px;
    }
    .sign-table td {
      height: 85px;
      vertical-align: bottom;
      text-align: center;
      padding-bottom: 8px;
    }
    .sign-label {
      font-size: 11px;
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 40px;
    }
    .print-actions {
      text-align: right;
      margin-bottom: 16px;
    }
    .btn-print {
      background: #1e3a8a;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-print:hover {
      background: #1e40af;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .container {
        border: none;
        padding: 0;
        max-width: 100%;
      }
      .print-actions {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-actions">
      <button class="btn-print" onclick="window.print()">Print Document</button>
    </div>
    <div class="header-org">YOUNGONE / BROADPEAK ENTERPRISE SECURITY</div>
    <div class="header-title">PHYSICAL ACCESS CONTROL CLEARANCE FORM</div>
    <div class="header-sub">Form UIMS-SEC-FORM-04  |  Information Security & Physical Asset Governance</div>

    <div class="meta-bar">
      <div>Document Ref: <strong>${params.refId}</strong></div>
      <div>Issuance Date: <strong>${params.currentDate}</strong></div>
    </div>

    <div class="section-title">SECTION 1: APPLICANT IDENTIFICATION & CLASSIFICATION</div>
    <table>
      <tr>
        <td style="width: 20%; font-weight: bold;">Full Name:</td>
        <td style="width: 30%;">${applicantName}</td>
        <td style="width: 20%; font-weight: bold;">Badge / ID:</td>
        <td style="width: 30%;">${applicantId}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Organization:</td>
        <td>${orgOrCompany}</td>
        <td style="font-weight: bold;">Classification:</td>
        <td>${subjectClassification}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Department / Role:</td>
        <td>${deptOrTitle}</td>
        <td style="font-weight: bold;">Contact Info:</td>
        <td>${phone} | ${email}</td>
      </tr>
    </table>

    <div class="section-title">SECTION 2: PHYSICAL ACCESS CLEARANCE & ACCESS POINTS</div>
    <table>
      <thead>
        <tr>
          <th>Door Code</th>
          <th>Facility / Door Name</th>
          <th>Building / Location</th>
          <th>Security Level</th>
          <th>Window</th>
        </tr>
      </thead>
      <tbody>
        ${doorRows}
      </tbody>
    </table>

    <div class="section-title">SECTION 3: OPERATIONAL JUSTIFICATION & PHYSICAL SECURITY MANDATES</div>
    <div class="rules-box">
      <p style="margin-top: 0; margin-bottom: 8px;"><strong>Business Justification:</strong> ${reasonText}</p>
      <p style="margin-top: 0; margin-bottom: 8px;"><strong>Authorization Duration:</strong> ${accessDuration}</p>
      <h4>PHYSICAL ACCESS CODE OF CONDUCT & SECURITY INVARIANTS:</h4>
      <ol>
        <li><strong>ANTI-PASSBACK COMPLIANCE:</strong> Badges are strictly non-transferable. Swiping another individual into a secured perimeter is an immediate termination offense.</li>
        <li><strong>ZERO TAILGATING POLICY:</strong> Every individual must scan their own credential upon entry and exit. Visitors must be escorted at all times in High and Critical zones.</li>
        <li><strong>INCIDENT REPORTING:</strong> Lost or compromised badges must be reported immediately to IT Security within 15 minutes of discovery.</li>
      </ol>
    </div>

    <div class="section-title">SECTION 4: MULTI-TIER CLEARANCE & SIGN-OFF BLOCKS</div>
    <table class="sign-table">
      <tr>
        <td style="width: 25%;">
          <div class="sign-label">APPLICANT SIGNATURE</div>
          <div>Signature: __________________</div>
          <div>Date: ____/____/2026</div>
        </td>
        <td style="width: 25%;">
          <div class="sign-label">HOST / SPONSOR APPROVAL</div>
          <div>Signature: __________________</div>
          <div>Date: ____/____/2026</div>
        </td>
        <td style="width: 25%;">
          <div class="sign-label">IT INFOSEC CLEARANCE</div>
          <div>Signature: __________________</div>
          <div>Date: ____/____/2026</div>
        </td>
        <td style="width: 25%;">
          <div class="sign-label">BADGE ENCODING VERIFICATION</div>
          <div>Signature: __________________</div>
          <div>Date: ____/____/2026</div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}
