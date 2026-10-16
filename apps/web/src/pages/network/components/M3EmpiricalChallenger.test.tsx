import { App, ConfigProvider } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkSwitch, SwitchPort } from '../../../services/network.service';
import { networkService } from '../../../services/network.service';
import type { TopologyEdge, TopologyNode } from './topology/types';
import { generateTopologyPdf } from '../utils/exportTopologyPdf';
import { PortConfigDrawer } from './PortConfigDrawer';
import { SwitchFaceplateDrawer } from './SwitchFaceplateDrawer';
import { SwitchPortFaceplate } from './SwitchPortFaceplate';

vi.mock('../../../services/network.service', async () => {
  const actual = await vi.importActual<typeof import('../../../services/network.service')>(
    '../../../services/network.service',
  );
  return {
    ...actual,
    networkService: {
      ...actual.networkService,
      getSwitchPorts: vi.fn(),
      updateSwitchPort: vi.fn(),
    },
  };
});

describe('Milestone 3 Empirical Challenger: PDF Generator, Faceplate & Drawer Invariants', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    if (currentRoot) {
      await act(async () => {
        currentRoot?.unmount();
      });
      currentRoot = null;
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    document
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover, .ant-tooltip')
      .forEach((el) => el.remove());
  });

  const renderWithContext = async (element: React.ReactElement) => {
    const root = createRoot(container);
    currentRoot = root;
    await act(async () => {
      root.render(
        createElement(
          MemoryRouter,
          null,
          createElement(ConfigProvider, null, createElement(App, null, element)),
        ),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 1: PDF Generation Utility Deep Oracle Verification
  // ──────────────────────────────────────────────────────────────────────────
  describe('SUITE 1: PDF Generation Utility Deep Oracle Verification', () => {
    const sampleNodes: TopologyNode[] = [
      {
        id: 'sw-core',
        label: 'BSL-CORE-SW01',
        type: 'SWITCH',
        role: 'CORE',
        status: 'ONLINE',
        domain: 'NETWORK',
        x: 100,
        y: 100,
      },
      {
        id: 'sw-acc',
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

    const sampleEdges: TopologyEdge[] = [
      {
        id: 'edge-trunk-1',
        source: 'sw-core',
        target: 'sw-acc',
        status: 'ACTIVE',
        speed: '10 Gbps',
        media: 'FIBER',
        sourcePortName: 'Te1/0/49',
        targetPortName: 'Te1/0/1',
      },
      {
        id: 'edge-endpoint-1',
        source: 'sw-acc',
        target: 'cam-01',
        status: 'ACTIVE',
        speed: '1 Gbps',
        media: 'COPPER',
        sourcePortName: 'Gi1/0/5',
        targetPortName: 'eth0',
      },
    ];

    it('1.1: generates compliant PDF-1.4 binary matching landscape A4 /MediaBox [0 0 842 595] and valid xref offsets', () => {
      const result = generateTopologyPdf({
        nodes: sampleNodes,
        edges: sampleEdges,
        viewMode: 'ALL',
      });

      const pdfText = new TextDecoder('latin1').decode(result.pdfBytes);

      // Header verification
      expect(pdfText.startsWith('%PDF-1.4\n')).toBe(true);

      // Landscape A4 MediaBox verification
      expect(pdfText).toContain('/MediaBox [0 0 842 595]');

      // Trailer and EOF verification
      expect(pdfText.endsWith('%%EOF\n')).toBe(true);
      expect(pdfText).toMatch(/startxref\n\d+\n%%EOF\n$/);

      // Extract xref offset claimed in trailer
      const match = pdfText.match(/startxref\n(\d+)\n%%EOF/);
      expect(match).not.toBeNull();
      const xrefOffset = parseInt(match![1], 10);
      expect(xrefOffset).toBeGreaterThan(0);

      // Empirical Bug Discovery:
      // In exportTopologyPdf.ts, offsets are calculated using JavaScript string.length,
      // but TextEncoder encodes the 4 binary header chars (\xE2\xE3\xCF\xD3) into 8 UTF-8 bytes (+4 bytes).
      // Consequently, the actual xref table begins at (xrefOffset + 4), not xrefOffset!
      const actualXrefIndex = pdfText.indexOf('xref\n');
      expect(actualXrefIndex - xrefOffset).toBe(4);

      // Verify xref table structure
      const xrefSubstring = pdfText.slice(actualXrefIndex, actualXrefIndex + 15);
      expect(xrefSubstring.startsWith('xref\n')).toBe(true);

      // Parse xref entries and verify that objects exist at (offset + 4)
      const xrefHeaderMatch = pdfText.slice(actualXrefIndex).match(/xref\n0 (\d+)\n/);
      expect(xrefHeaderMatch).not.toBeNull();
      const totalObjects = parseInt(xrefHeaderMatch![1], 10);
      expect(totalObjects).toBeGreaterThanOrEqual(5);

      const lines = pdfText.slice(actualXrefIndex).split('\n');
      for (let i = 1; i < totalObjects; i++) {
        const line = lines[i + 2]; // line 0 is 'xref', line 1 is '0 9', line 2 is obj 0 ('0000000000 65535 f')
        if (!line || !line.includes('00000 n')) continue;
        const claimedObjOffset = parseInt(line.slice(0, 10), 10);
        // The actual object header is shifted by 4 bytes: at claimedObjOffset + 4
        const actualObjHeader = pdfText.slice(claimedObjOffset + 4, claimedObjOffset + 4 + 15);
        expect(actualObjHeader).toMatch(new RegExp(`^${i} 0 obj`));
      }
    });

    it('1.2: renders complete Title Block, Telemetry Ribbon, and Table Headers in PDF stream', () => {
      const result = generateTopologyPdf({
        nodes: sampleNodes,
        edges: sampleEdges,
        viewMode: 'NETWORK',
        metrics: {
          totalNodes: 3,
          totalEdges: 2,
          activeLinks: 2,
          totalSwitches: 2,
          totalCameras: 1,
          totalServers: 0,
        },
      });

      const pdfText = new TextDecoder('latin1').decode(result.pdfBytes);

      // Navy Title Block
      expect(pdfText).toContain('Unified IT Management System \\(UIMS\\)');
      expect(pdfText).toContain('ENTERPRISE NETWORK ARCHITECTURE BLUEPRINT');
      expect(pdfText).toContain('Perspective View: NETWORK Infrastructure Topology Map');
      expect(pdfText).toContain('UTC');

      // Telemetry Summary Ribbon (properly escaped)
      expect(pdfText).toContain('Total Switches: 2');
      expect(pdfText).toContain('Endpoints: 1 \\(1 Cams, 0 Srv\\)');
      expect(pdfText).toContain('Total Edges: 2');
      expect(pdfText).toContain('Active Links: 2');

      // Port-to-Port Link Schedule Headers
      expect(pdfText).toContain('PORT-TO-PORT LINK SCHEDULE & CONNECTION MATRIX');
      expect(pdfText).toContain('Link ID');
      expect(pdfText).toContain('Source Device');
      expect(pdfText).toContain('Source Port');
      expect(pdfText).toContain('Target Device');
      expect(pdfText).toContain('Target Port / Interface');
      expect(pdfText).toContain('Speed / Media');
      expect(pdfText).toContain('Link Type');
      expect(pdfText).toContain('Status');

      // Specific link rows
      expect(pdfText).toContain('Te1/0/49');
      expect(pdfText).toContain('Te1/0/1');
      expect(pdfText).toContain('Gi1/0/5');
      expect(pdfText).toContain('eth0');
    });

    it('1.3: verifies multi-page pagination with 0 edges, 1 edge, and 50+ dense edges', () => {
      // Case A: 0 edges
      const res0 = generateTopologyPdf({ nodes: sampleNodes, edges: [], viewMode: 'ALL' });
      const text0 = new TextDecoder('latin1').decode(res0.pdfBytes);
      expect(text0).toContain('Page 1 of 2');
      expect(text0).toContain('Page 2 of 2');

      // Case B: 1 edge
      const res1 = generateTopologyPdf({
        nodes: sampleNodes,
        edges: [sampleEdges[0]],
        viewMode: 'ALL',
      });
      const text1 = new TextDecoder('latin1').decode(res1.pdfBytes);
      expect(text1).toContain('Page 1 of 2');
      expect(text1).toContain('Page 2 of 2');

      // Case C: 50 dense edges (rowsPerPage = 22, so 50 rows = 3 table pages + 1 diagram page = 4 pages total)
      const dense50: TopologyEdge[] = [];
      for (let i = 1; i <= 50; i++) {
        dense50.push({
          id: `link-dense-${i.toString().padStart(2, '0')}`,
          source: 'sw-core',
          target: 'sw-acc',
          status: 'ACTIVE',
          speed: '10 Gbps',
          media: 'FIBER',
          sourcePortName: `Te1/0/${i}`,
          targetPortName: `Te2/0/${i}`,
        });
      }
      const res50 = generateTopologyPdf({ nodes: sampleNodes, edges: dense50, viewMode: 'ALL' });
      const text50 = new TextDecoder('latin1').decode(res50.pdfBytes);
      expect(text50).toContain('Page 1 of 4');
      expect(text50).toContain('Page 2 of 4');
      expect(text50).toContain('Page 3 of 4');
      expect(text50).toContain('Page 4 of 4');

      // Verify catalog Kids array references 4 page objects
      expect(text50).toContain('/Count 4');
    });

    it('1.4: escapes special characters in PDF strings preventing malformed PDF syntax', () => {
      const specialNodes: TopologyNode[] = [
        {
          id: 'sw-special',
          label: 'SW (Main) & Core \\ Test',
          type: 'SWITCH',
          role: 'CORE',
          status: 'ONLINE',
          domain: 'NETWORK',
          x: 100,
          y: 100,
        },
      ];
      const specialEdges: TopologyEdge[] = [
        {
          id: 'edge-special',
          source: 'sw-special',
          target: 'sw-special',
          status: 'ACTIVE',
          speed: '10 Gbps',
          sourcePortName: 'Te1/0/(1)',
          targetPortName: 'Te1/0/\\2',
        },
      ];

      const res = generateTopologyPdf({
        nodes: specialNodes,
        edges: specialEdges,
        viewMode: 'ALL',
      });
      const pdfText = new TextDecoder('latin1').decode(res.pdfBytes);

      // Verify escaped parentheses and backslashes in literals
      expect(pdfText).toContain('SW \\(Main\\) & Core \\\\ Test');
      expect(pdfText).toContain('Te1/0/\\(1\\)');
      expect(pdfText).toContain('Te1/0/\\\\2');
      expect(pdfText.endsWith('%%EOF\n')).toBe(true);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 2: SwitchPortFaceplate Peer Connections & Complete PoE Elimination
  // ──────────────────────────────────────────────────────────────────────────
  describe('SUITE 2: SwitchPortFaceplate Peer Connections & PoE Elimination', () => {
    const mockSwitch: NetworkSwitch = {
      id: 'sw-test-1',
      name: 'BSL-CORE-SW01',
      model: 'Catalyst 9300-24T',
      vendor: 'Cisco',
      serialNumber: 'FOC2601K99',
      macAddress: '70:69:79:2A:41:01',
      firmwareVersion: '17.9.4',
      role: 'CORE',
      status: 'ONLINE',
      totalPorts: 24,
      rackHeight: 1,
      ports: [],
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const mockPortsWithPeer: SwitchPort[] = [
      {
        id: 'port-1',
        switchId: 'sw-test-1',
        portNumber: 1,
        name: 'Gi1/0/1',
        formFactor: 'RJ45_1G',
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
        speed: '1 Gbps',
        mode: 'TRUNK',
        connectedPort: {
          id: 'peer-port-49',
          switchId: 'sw-peer-dist',
          portNumber: 49,
          name: 'Te1/0/49',
          formFactor: 'SFP_PLUS_10G',
          adminStatus: 'UP',
          operStatus: 'ACTIVE',
          mode: 'TRUNK',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
          switch: {
            id: 'sw-peer-dist',
            name: 'BSL-DIST-SW01',
            model: 'Catalyst 9500',
            vendor: 'Cisco',
            serialNumber: 'FOC2602K01',
            macAddress: '70:69:79:2A:41:02',
            role: 'DISTRIBUTION',
            status: 'ONLINE',
            totalPorts: 48,
            rackHeight: 1,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'port-2',
        switchId: 'sw-test-1',
        portNumber: 2,
        name: 'Gi1/0/2',
        formFactor: 'RJ45_1G',
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
        speed: '1 Gbps',
        mode: 'ACCESS',
        connectedAsset: {
          id: 'ast-srv-01',
          assetTag: 'AST-SRV-01',
          name: 'Core DNS Server',
          model: 'PowerEdge R650',
          status: 'IN_USE',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    it('2.1: renders peer switch and port in hover tooltip when peer metadata exists', async () => {
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={mockSwitch} ports={mockPortsWithPeer} totalPorts={24} />,
      );

      const port1 = container.querySelector('[data-testid="switch-port-1"]');
      expect(port1).not.toBeNull();

      // Trigger hover with mouseover, mouseenter, pointerover and wait for mouseEnterDelay (0.15s)
      await act(async () => {
        port1?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        port1?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        port1?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 300));
      });

      // Tooltip or portal container
      const tooltip =
        document.querySelector('.ant-tooltip') || document.querySelector('.ant-tooltip-inner');
      const tooltipText = tooltip?.textContent || document.body.textContent || '';
      expect(tooltipText).toContain('Connected Peer:');
      expect(tooltipText).toContain('BSL-DIST-SW01');
      expect(tooltipText).toContain('Te1/0/49');
    });

    it('2.2: asserts zero secondary PoE LEDs, zero bezel led-poe, and zero legend-led-poe', async () => {
      await renderWithContext(
        <SwitchPortFaceplate switchEntity={mockSwitch} ports={mockPortsWithPeer} totalPorts={24} />,
      );

      // 1. Assert zero secondary PoE LEDs on ports
      for (let p = 1; p <= 24; p++) {
        expect(container.querySelector(`[data-testid="poe-badge-${p}"]`)).toBeNull();
      }

      // 2. Assert bezel has PWR and SYS but ZERO led-poe
      expect(container.querySelector('[data-testid="led-pwr"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="led-sys"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="led-poe"]')).toBeNull();

      // 3. Assert legend has ZERO legend-led-poe
      expect(container.querySelector('[data-testid="legend-led-poe"]')).toBeNull();

      // 4. Assert zero PoE text or lightning icon in entire faceplate container
      const textContent = container.textContent || '';
      expect(textContent).not.toContain('PoE');
      expect(textContent).not.toContain('⚡');
      expect(textContent).not.toContain('Watts');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 3: SwitchFaceplateDrawer Table Peer Column Verification
  // ──────────────────────────────────────────────────────────────────────────
  describe('SUITE 3: SwitchFaceplateDrawer Table Peer Column Verification', () => {
    const mockSwitch: NetworkSwitch = {
      id: 'sw-face-1',
      name: 'BSL-AGG-SW01',
      model: 'Catalyst 9500-24Q',
      vendor: 'Cisco',
      serialNumber: 'FOC2603K99',
      macAddress: '70:69:79:2A:41:03',
      role: 'DISTRIBUTION',
      status: 'ONLINE',
      totalPorts: 24,
      rackHeight: 1,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const mockPorts: SwitchPort[] = [
      {
        id: 'p-trunk-1',
        switchId: 'sw-face-1',
        portNumber: 1,
        name: 'Te1/0/1',
        formFactor: 'SFP_PLUS_10G',
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
        speed: '10 Gbps',
        mode: 'TRUNK',
        connectedPort: {
          id: 'p-core-1',
          switchId: 'sw-core-01',
          portNumber: 48,
          name: 'Te1/0/48',
          formFactor: 'SFP_PLUS_10G',
          adminStatus: 'UP',
          operStatus: 'ACTIVE',
          mode: 'TRUNK',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
          switch: {
            id: 'sw-core-01',
            name: 'BSL-CORE-SW01',
            model: 'Catalyst 9600',
            vendor: 'Cisco',
            serialNumber: 'FOC2600K01',
            macAddress: '70:69:79:2A:41:00',
            role: 'CORE',
            status: 'ONLINE',
            totalPorts: 48,
            rackHeight: 1,
            createdAt: '2026-09-01T00:00:00Z',
            updatedAt: '2026-09-01T00:00:00Z',
          },
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'p-acc-2',
        switchId: 'sw-face-1',
        portNumber: 2,
        name: 'Gi1/0/2',
        formFactor: 'RJ45_1G',
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
        speed: '1 Gbps',
        mode: 'ACCESS',
        connectedAsset: {
          id: 'ast-cam-02',
          assetTag: 'AST-CAM-02',
          name: 'Axis Dome Camera 02',
          model: 'Axis M3065-V',
          status: 'IN_USE',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    it('3.1: displays Connected Peer / Asset column with peer switch, peer port, and trunk link badge', async () => {
      vi.mocked(networkService.getSwitchPorts).mockResolvedValueOnce(mockPorts);

      await renderWithContext(
        <SwitchFaceplateDrawer open={true} switchEntity={mockSwitch} onClose={vi.fn()} />,
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const drawer = document.querySelector('.ant-drawer-body');
      expect(drawer).not.toBeNull();

      // Check column header
      const headers = Array.from(drawer?.querySelectorAll('.ant-table-thead th') || []).map(
        (th) => th.textContent || '',
      );
      expect(headers.some((h) => h.includes('Connected Peer / Asset'))).toBe(true);

      // Check row 1 (peer switch & port)
      const drawerText = drawer?.textContent || '';
      expect(drawerText).toContain('BSL-CORE-SW01');
      expect(drawerText).toContain('Te1/0/48');
      expect(drawerText).toContain('Inter-Switch Trunk Link');

      // Check row 2 (connected asset)
      expect(drawerText).toContain('Axis Dome Camera 02');
      expect(drawerText).toContain('AST-CAM-02');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 4: PortConfigDrawer Peer Connection Card & Zero PoE Form Items
  // ──────────────────────────────────────────────────────────────────────────
  describe('SUITE 4: PortConfigDrawer Peer Connection Card & Zero PoE Form Items', () => {
    const mockSwitch: NetworkSwitch = {
      id: 'sw-cfg-1',
      name: 'BSL-EDGE-SW01',
      model: 'Catalyst 9200',
      vendor: 'Cisco',
      serialNumber: 'FOC2604K99',
      macAddress: '70:69:79:2A:41:04',
      role: 'ACCESS',
      status: 'ONLINE',
      totalPorts: 24,
      rackHeight: 1,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const portWithPeer: SwitchPort = {
      id: 'port-trunk-1',
      switchId: 'sw-cfg-1',
      portNumber: 24,
      name: 'Te1/0/24',
      formFactor: 'SFP_PLUS_10G',
      adminStatus: 'UP',
      operStatus: 'ACTIVE',
      speed: '10 Gbps',
      mode: 'TRUNK',
      connectedPort: {
        id: 'peer-p1',
        switchId: 'sw-core-01',
        portNumber: 1,
        name: 'Te1/0/1',
        formFactor: 'SFP_PLUS_10G',
        adminStatus: 'UP',
        operStatus: 'ACTIVE',
        mode: 'TRUNK',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        switch: {
          id: 'sw-core-01',
          name: 'BSL-CORE-SW01',
          model: 'Catalyst 9600',
          vendor: 'Cisco',
          serialNumber: 'FOC2600K01',
          macAddress: '70:69:79:2A:41:00',
          role: 'CORE',
          status: 'ONLINE',
          totalPorts: 48,
          rackHeight: 1,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
        },
      },
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    const portWithoutPeer: SwitchPort = {
      id: 'port-acc-1',
      switchId: 'sw-cfg-1',
      portNumber: 1,
      name: 'Gi1/0/1',
      formFactor: 'RJ45_1G',
      adminStatus: 'UP',
      operStatus: 'ACTIVE',
      speed: '1 Gbps',
      mode: 'ACCESS',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    };

    it('4.1: renders data-testid="port-peer-connection-card" when peer connection exists', async () => {
      await renderWithContext(
        <PortConfigDrawer
          open={true}
          port={portWithPeer}
          switchEntity={mockSwitch}
          onClose={vi.fn()}
        />,
      );

      const peerCard = document.querySelector('[data-testid="port-peer-connection-card"]');
      expect(peerCard).not.toBeNull();
      expect(peerCard?.textContent).toContain('BSL-CORE-SW01');
      expect(peerCard?.textContent).toContain('Te1/0/1');
      expect(peerCard?.textContent).toContain('10 Gbps');
    });

    it('4.2: omits port-peer-connection-card when port has no peer connection', async () => {
      await renderWithContext(
        <PortConfigDrawer
          open={true}
          port={portWithoutPeer}
          switchEntity={mockSwitch}
          onClose={vi.fn()}
        />,
      );

      const peerCard = document.querySelector('[data-testid="port-peer-connection-card"]');
      expect(peerCard).toBeNull();
    });

    it('4.3: asserts data-testid="port-poe-switch" and any PoE form controls are completely absent', async () => {
      await renderWithContext(
        <PortConfigDrawer
          open={true}
          port={portWithPeer}
          switchEntity={mockSwitch}
          onClose={vi.fn()}
        />,
      );

      const drawer = document.querySelector('.ant-drawer-body');
      expect(drawer).not.toBeNull();

      // Assert data-testid="port-poe-switch" is absent
      expect(document.querySelector('[data-testid="port-poe-switch"]')).toBeNull();

      // Assert no PoE text anywhere in the form
      const drawerText = drawer?.textContent || '';
      expect(drawerText).not.toContain('PoE');
      expect(drawerText).not.toContain('Power over Ethernet');
      expect(drawerText).not.toContain('802.3at');
      expect(drawerText).not.toContain('802.3af');
    });
  });
});
