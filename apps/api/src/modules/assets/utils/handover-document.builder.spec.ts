import { describe, expect, it } from 'vitest';
import {
  buildHandoverDocx,
  HandoverDocumentParams,
} from './handover-document.builder';

describe('HandoverDocumentBuilder', () => {
  const mockParams: HandoverDocumentParams = {
    title: 'HARDWARE ASSET HANDOVER RECORD',
    subtitle: 'Equipment Assignment & Custody Transfer',
    refId: 'HOR-TEST-001',
    type: 'assignment',
    currentDate: '2026-10-13',
    recipient: {
      fullName: 'Nguyen Van A',
      employeeCode: 'EMP-1234',
      department: 'Software Engineering',
      email: 'a.nguyen@youngonevn.com',
      organization: 'Youngone Nam Dinh',
    },
    assets: [
      {
        tag: 'AST-1001',
        name: 'Dell Latitude 5540',
        manufacturer: 'Dell',
        model: 'Latitude 5540',
        serialNumber: 'SN-DELL-12345',
        condition: 'Good / Operational',
      },
      {
        tag: 'AST-1002',
        name: 'Dell UltraSharp 27',
        manufacturer: 'Dell',
        model: 'U2723QE',
        serialNumber: 'SN-MON-99887',
        condition: 'Brand New',
      },
    ],
    conditionNotes: 'Accessories included: 65W USB-C Charger, HDMI Cable.',
  };

  it('builds a valid DOCX buffer for hardware asset handover', async () => {
    const buffer = await buildHandoverDocx(mockParams);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // DOCX files are zip archives starting with PK (0x50, 0x4B)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it('builds a valid DOCX buffer for asset return template without assets', async () => {
    const returnParams: HandoverDocumentParams = {
      ...mockParams,
      title: 'HARDWARE ASSET RETURN RECORD',
      subtitle: 'Equipment Return & Custody Termination',
      type: 'return',
      assets: [],
    };
    const buffer = await buildHandoverDocx(returnParams);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
