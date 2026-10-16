import { describe, expect, it, vi } from 'vitest';
import type { TopologyEdge, TopologyNode } from '../components/topology/types';
import { exportTopologyPdf, generateTopologyPdf } from './exportTopologyPdf';

describe('exportTopologyPdf Utility Test Suite', () => {
  const mockNodes: TopologyNode[] = [
    {
      id: 'sw-core-01',
      label: 'BSL-CORE-SW01',
      type: 'SWITCH',
      role: 'CORE',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 100,
      y: 100,
    },
    {
      id: 'sw-access-01',
      label: 'BSL-ACC-SW01',
      type: 'SWITCH',
      role: 'ACCESS',
      status: 'ONLINE',
      domain: 'NETWORK',
      x: 300,
      y: 100,
    },
    {
      id: 'cam-01',
      label: 'CAM-LOBBY-01',
      type: 'CAMERA',
      status: 'ACTIVE',
      domain: 'CCTV',
      x: 300,
      y: 300,
    },
  ];

  const mockEdges: TopologyEdge[] = [
    {
      id: 'edge-trunk-01',
      source: 'sw-core-01',
      target: 'sw-access-01',
      status: 'ACTIVE',
      speed: '10 Gbps',
      media: 'FIBER',
      sourcePortName: 'Te1/0/49',
      targetPortName: 'Te1/0/1',
      vlanNumber: 100,
      vlanName: 'Management',
    },
    {
      id: 'edge-endpoint-01',
      source: 'sw-access-01',
      target: 'cam-01',
      status: 'ACTIVE',
      speed: '1 Gbps',
      media: 'COPPER',
      sourcePortName: 'Gi1/0/5',
      targetPortName: 'eth0',
      vlanNumber: 105,
      vlanName: 'Surveillance',
    },
  ];

  it('generates compliant PDF 1.4 binary stream with title block, diagram, and link schedule', () => {
    const result = generateTopologyPdf({
      nodes: mockNodes,
      edges: mockEdges,
      viewMode: 'ALL',
      metrics: {
        totalNodes: 3,
        totalEdges: 2,
        activeLinks: 2,
        totalSwitches: 2,
        totalCameras: 1,
        totalServers: 0,
        totalRacks: 0,
      },
    });

    expect(result).toBeDefined();
    expect(result.fileName).toContain('uims-network-topology-all-');
    expect(result.fileName.endsWith('.pdf')).toBe(true);
    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.blob).toBeInstanceOf(Blob);

    // Verify PDF header magic bytes "%PDF-1.4"
    const textDecoder = new TextDecoder('latin1');
    const pdfString = textDecoder.decode(result.pdfBytes);
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true);

    // Verify Title Block & Enterprise metadata
    expect(pdfString).toContain('ENTERPRISE NETWORK ARCHITECTURE BLUEPRINT');
    expect(pdfString).toContain('Unified IT Management System \\(UIMS\\)');
    expect(pdfString).toContain('Perspective View: ALL Infrastructure Topology Map');

    // Verify Telemetry Ribbon
    expect(pdfString).toContain('Total Switches: 2');
    expect(pdfString).toContain('Active Links: 2');

    // Verify Port-to-Port Link Schedule Table Headers & Records
    expect(pdfString).toContain('PORT-TO-PORT LINK SCHEDULE');
    expect(pdfString).toContain('BSL-CORE-SW01');
    expect(pdfString).toContain('Te1/0/49');
    expect(pdfString).toContain('BSL-ACC-SW01');
    expect(pdfString).toContain('Te1/0/1');
    expect(pdfString).toContain('CAM-LOBBY-01');
    expect(pdfString).toContain('Gi1/0/5');
    expect(pdfString).toContain('eth0');

    // Verify PDF Trailer & EOF
    expect(pdfString).toContain('%%EOF');
  });

  it('generates multi-page PDF blueprint when link count exceeds single page limit', () => {
    // Generate 30 mock edges to exceed rowsPerPage (22)
    const denseEdges: TopologyEdge[] = [];
    for (let i = 1; i <= 30; i++) {
      denseEdges.push({
        id: `edge-dense-${i}`,
        source: 'sw-core-01',
        target: 'sw-access-01',
        status: 'ACTIVE',
        speed: '1 Gbps',
        sourcePortName: `Gi1/0/${i}`,
        targetPortName: `Gi2/0/${i}`,
      });
    }

    const result = generateTopologyPdf({
      nodes: mockNodes,
      edges: denseEdges,
      viewMode: 'NETWORK',
    });

    const textDecoder = new TextDecoder('latin1');
    const pdfString = textDecoder.decode(result.pdfBytes);

    // Multi-page schedule table (Page 1 diagram, Page 2 table part 1, Page 3 table part 2)
    expect(pdfString).toContain('Page 1 of 3');
    expect(pdfString).toContain('Page 2 of 3');
    expect(pdfString).toContain('Page 3 of 3');
  });

  it('handles empty nodes and edges gracefully without throwing errors', () => {
    const result = generateTopologyPdf({
      nodes: [],
      edges: [],
      viewMode: 'CCTV',
      metrics: null,
    });

    expect(result).toBeDefined();
    expect(result.pdfBytes.length).toBeGreaterThan(0);
    const textDecoder = new TextDecoder('latin1');
    const pdfString = textDecoder.decode(result.pdfBytes);
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfString).toContain('%%EOF');
  });

  it('triggers browser download workflow when exportTopologyPdf is invoked', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/test-pdf-uuid');
    const mockRevokeObjectURL = vi.fn();
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;

    let capturedDownload = '';
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        el.click = clickSpy;
        Object.defineProperty(el, 'download', {
          set(val: string) {
            capturedDownload = val;
          },
          get() {
            return capturedDownload;
          },
        });
      }
      return el;
    });

    exportTopologyPdf({
      nodes: mockNodes,
      edges: mockEdges,
      viewMode: 'ALL',
    });

    expect(capturedDownload).toContain('uims-network-topology-all-');
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-pdf-uuid');

    // Restore globals
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });
});
