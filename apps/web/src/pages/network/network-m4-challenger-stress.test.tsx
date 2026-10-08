import { App, ConfigProvider, Form } from 'antd';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SwitchFormModal } from './components/SwitchFormModal';
import { SwitchPortFaceplate } from './components/SwitchPortFaceplate';
import { calculatePortClusters, getPortRowAndColumn } from './utils/clustering';

describe('Milestone 4 Challenger: Exhaustive Monorepo Stress Test Suite (Frontend & UI)', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;

  const ALL_24_EVEN_PORT_CONFIGS = [
    2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48,
  ] as const;

  const ALL_ODD_NUMBERS_IN_SCOPE = [
    1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49,
  ];

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
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  };

  // =========================================================================
  // 1. CLUSTERING ALGORITHM MATHEMATICAL STRESS TEST (ALL 24 EVEN CONFIGS)
  // =========================================================================
  describe('1. Clustering Algorithm Invariant Assertions Across All 24 Even Configs', () => {
    it('1.1 verifies exactly 24 even configurations [2, 48]', () => {
      expect(ALL_24_EVEN_PORT_CONFIGS.length).toBe(24);
      expect(ALL_24_EVEN_PORT_CONFIGS[0]).toBe(2);
      expect(ALL_24_EVEN_PORT_CONFIGS[23]).toBe(48);
    });

    for (const ports of ALL_24_EVEN_PORT_CONFIGS) {
      it(`1.2 calculatePortClusters(${ports}) produces balanced, even partitions summing to ${ports}`, () => {
        const clusters = calculatePortClusters(ports);

        // Sum invariant
        const sum = clusters.reduce((a, b) => a + b, 0);
        expect(sum).toBe(ports);

        // All clusters must be even numbers >= 2
        for (const c of clusters) {
          expect(c % 2).toBe(0);
          expect(c).toBeGreaterThanOrEqual(2);
          expect(c).toBeLessThanOrEqual(12);
        }

        // Balance invariant: max - min <= 4
        const max = Math.max(...clusters);
        const min = Math.min(...clusters);
        expect(max - min).toBeLessThanOrEqual(4);
      });
    }

    it('1.3 canonical industry presets match expected hardware architectures', () => {
      expect(calculatePortClusters(8)).toEqual([8]);
      expect(calculatePortClusters(16)).toEqual([8, 8]);
      expect(calculatePortClusters(24)).toEqual([12, 12]);
      expect(calculatePortClusters(48)).toEqual([12, 12, 12, 12]);
    });

    it('1.4 getPortRowAndColumn correctly maps every port across all 24 configurations', () => {
      for (const ports of ALL_24_EVEN_PORT_CONFIGS) {
        const clusters = calculatePortClusters(ports);

        for (let p = 1; p <= ports; p++) {
          const coords = getPortRowAndColumn(p, clusters);

          // Cluster index valid
          expect(coords.clusterIndex).toBeGreaterThanOrEqual(0);
          expect(coords.clusterIndex).toBeLessThan(clusters.length);

          // Row 'top' for odd, Row 'bottom' for even
          if (p % 2 === 1) {
            expect(coords.row).toBe('top');
          } else {
            expect(coords.row).toBe('bottom');
          }

          // Column index within cluster half-width
          const clusterSize = clusters[coords.clusterIndex];
          expect(coords.columnIndex).toBeGreaterThanOrEqual(0);
          expect(coords.columnIndex).toBeLessThan(clusterSize / 2);
        }
      }
    });
  });

  // =========================================================================
  // 2. FACEPLATE RENDERING STRESS TEST ACROSS ALL 24 CONFIGURATIONS
  // =========================================================================
  describe('2. SwitchPortFaceplate Full Monorepo Rendering Matrix (All 24 Even Configs)', () => {
    for (const ports of ALL_24_EVEN_PORT_CONFIGS) {
      it(`2.1 renders configuration ${ports}P with exact port counts, zigzag rows, and cluster blocks`, async () => {
        if (currentRoot) {
          await act(async () => {
            currentRoot?.unmount();
          });
          currentRoot = null;
        }

        await renderWithContext(<SwitchPortFaceplate totalPorts={ports} ports={[]} />);

        // Verify all 1..ports RJ45 sockets exist
        for (let p = 1; p <= ports; p++) {
          const portEl = container.querySelector(`[data-testid="switch-port-${p}"]`);
          expect(portEl, `Port ${p} must exist in ${ports}-port switch`).not.toBeNull();
        }

        // Port ports + 1 must NOT exist in the RJ45 bay
        const outOfRangePort = container.querySelector(`[data-testid="switch-port-${ports + 1}"]`);
        expect(outOfRangePort).toBeNull();

        // Verify cluster block count
        const expectedClusters = calculatePortClusters(ports);
        for (let c = 0; c < expectedClusters.length; c++) {
          expect(container.querySelector(`[data-testid="cluster-block-${c}"]`)).not.toBeNull();
        }
        expect(
          container.querySelector(`[data-testid="cluster-block-${expectedClusters.length}"]`),
        ).toBeNull();

        // Verify dual-row zigzag structure: port 1 on top, port 2 on bottom
        const p1 = container.querySelector('[data-testid="switch-port-1"]');
        const p2 = container.querySelector('[data-testid="switch-port-2"]');
        expect(p1?.parentElement).not.toBe(p2?.parentElement);

        // Verify silkscreen label positions: top for odd, bottom for even
        const p1Label = container.querySelector('[data-testid="port-label-1"]');
        const p2Label = container.querySelector('[data-testid="port-label-2"]');
        expect(p1?.firstElementChild).toBe(p1Label);
        expect(p2?.lastElementChild).toBe(p2Label);
      });
    }

    it('2.2 renders authentic 1U chassis elements across any switch size', async () => {
      await renderWithContext(<SwitchPortFaceplate totalPorts={24} ports={[]} />);

      // 19" Rack ears with screw cutouts
      expect(container.querySelector('[data-testid="rack-ear-left"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="rack-ear-right"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="rack-screw-left-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="rack-screw-left-2"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="rack-screw-right-1"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="rack-screw-right-2"]')).not.toBeNull();

      // Left System Bezel: PWR, SYS, PoE, CONSOLE
      expect(container.querySelector('[data-testid="switch-system-bezel"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="led-pwr"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="led-sys"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="led-poe"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="console-port"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="console-socket"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="console-label"]')).not.toBeNull();

      // Metallic dividing bezel
      expect(container.querySelector('[data-testid="metallic-dividing-bezel"]')).not.toBeNull();
    });

    it('2.3 renders dedicated RJ45 Uplinks and Optical SFP+ Cages with authentic physical cutouts', async () => {
      await renderWithContext(
        <SwitchPortFaceplate totalPorts={24} uplinkPorts={4} fiberPorts={4} ports={[]} />,
      );

      // 4 RJ45 Uplinks
      for (let u = 1; u <= 4; u++) {
        expect(container.querySelector(`[data-testid="switch-uplink-${u}"]`)).not.toBeNull();
        expect(container.querySelector(`[data-testid="uplink-led-${u}"]`)).not.toBeNull();
      }
      expect(container.querySelector('[data-testid="switch-uplink-5"]')).toBeNull();

      // 4 SFP Cages
      for (let f = 1; f <= 4; f++) {
        expect(container.querySelector(`[data-testid="switch-sfp-${f}"]`)).not.toBeNull();
        expect(container.querySelector(`[data-testid="sfp-led-${f}"]`)).not.toBeNull();
        expect(container.querySelector(`[data-testid="sfp-cage-frame-${f}"]`)).not.toBeNull();
        expect(container.querySelector(`[data-testid="sfp-latch-${f}"]`)).not.toBeNull();
        expect(container.querySelector(`[data-testid="sfp-fiber-left-${f}"]`)).not.toBeNull();
        expect(container.querySelector(`[data-testid="sfp-fiber-right-${f}"]`)).not.toBeNull();
      }
      expect(container.querySelector('[data-testid="switch-sfp-5"]')).toBeNull();
    });

    it('2.4 handles interactive onPortClick callbacks across Access, Uplink, and Fiber bays', async () => {
      const handlePortClick = vi.fn();
      await renderWithContext(
        <SwitchPortFaceplate
          totalPorts={8}
          uplinkPorts={2}
          fiberPorts={2}
          ports={[]}
          onPortClick={handlePortClick}
        />,
      );

      // Click Access port 3
      const port3 = container.querySelector('[data-testid="switch-port-3"]') as HTMLElement;
      await act(async () => {
        port3.click();
      });
      expect(handlePortClick).toHaveBeenCalledWith(
        expect.objectContaining({ portNumber: 3, formFactor: 'RJ45_1G', mode: 'ACCESS' }),
      );

      // Click Uplink 1
      const up1 = container.querySelector('[data-testid="switch-uplink-1"]') as HTMLElement;
      await act(async () => {
        up1.click();
      });
      expect(handlePortClick).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Uplink1', mode: 'TRUNK' }),
      );

      // Click SFP 1
      const sfp1 = container.querySelector('[data-testid="switch-sfp-1"]') as HTMLElement;
      await act(async () => {
        sfp1.click();
      });
      expect(handlePortClick).toHaveBeenCalledWith(expect.objectContaining({ mode: 'TRUNK' }));
    });
  });

  // =========================================================================
  // 3. FRONTEND FORM MODAL VALIDATION & ODD NUMBER REJECTION
  // =========================================================================
  describe('3. SwitchFormModal InputNumber Parity & Range Rejection', () => {
    let capturedForm: ReturnType<typeof Form.useForm>[0] | null = null;

    const renderFormModal = async () => {
      const TestComponent = () => {
        const [form] = Form.useForm();
        capturedForm = form;
        return (
          <SwitchFormModal
            open={true}
            editingSwitch={null}
            form={form}
            submitting={false}
            racks={[]}
            onSave={vi.fn()}
            onCancel={vi.fn()}
          />
        );
      };

      await renderWithContext(<TestComponent />);
    };

    it('3.1 rejects odd numbers with exact message: "Total ports must be an even number"', async () => {
      await renderFormModal();
      expect(capturedForm).not.toBeNull();

      for (const odd of ALL_ODD_NUMBERS_IN_SCOPE) {
        let errorMsg = '';
        await act(async () => {
          capturedForm?.setFieldsValue({ totalPorts: odd });
          try {
            await capturedForm?.validateFields(['totalPorts']);
          } catch (err: unknown) {
            const errorObj = err as { errorFields?: Array<{ errors: string[] }> };
            errorMsg = errorObj.errorFields?.[0]?.errors?.[0] || String(err);
          }
        });

        if (odd >= 2 && odd <= 48) {
          expect(errorMsg).toBe('Total ports must be an even number');
        } else {
          expect(
            errorMsg === 'Total ports must be an even number' ||
              errorMsg === 'Total ports must be between 2 and 48',
          ).toBe(true);
        }
      }
    });

    it('3.2 confirms removal of preset buttons and supports direct totalPorts input', async () => {
      await renderFormModal();
      expect(capturedForm).not.toBeNull();

      for (const size of [8, 16, 24, 48]) {
        expect(document.querySelector(`[data-testid="preset-ports-${size}"]`)).toBeNull();

        await act(async () => {
          capturedForm?.setFieldsValue({ totalPorts: size });
        });

        expect(capturedForm?.getFieldValue('totalPorts')).toBe(size);
      }
    });

    it('3.3 rejects out-of-range (< 2 or > 48) and non-integer inputs', async () => {
      await renderFormModal();
      expect(capturedForm).not.toBeNull();

      // < 2
      let errUnder = '';
      await act(async () => {
        capturedForm?.setFieldsValue({ totalPorts: 0 });
        try {
          await capturedForm?.validateFields(['totalPorts']);
        } catch (err: unknown) {
          const errorObj = err as { errorFields?: Array<{ errors: string[] }> };
          errUnder = errorObj.errorFields?.[0]?.errors?.[0] || '';
        }
      });
      expect(errUnder).toBe('Total ports must be between 2 and 48');

      // > 48
      let errOver = '';
      await act(async () => {
        capturedForm?.setFieldsValue({ totalPorts: 50 });
        try {
          await capturedForm?.validateFields(['totalPorts']);
        } catch (err: unknown) {
          const errorObj = err as { errorFields?: Array<{ errors: string[] }> };
          errOver = errorObj.errorFields?.[0]?.errors?.[0] || '';
        }
      });
      expect(errOver).toBe('Total ports must be between 2 and 48');

      // Float
      let errFloat = '';
      await act(async () => {
        capturedForm?.setFieldsValue({ totalPorts: 24.5 });
        try {
          await capturedForm?.validateFields(['totalPorts']);
        } catch (err: unknown) {
          const errorObj = err as { errorFields?: Array<{ errors: string[] }> };
          errFloat = errorObj.errorFields?.[0]?.errors?.[0] || '';
        }
      });
      expect(errFloat).toBe('Total ports must be an integer');
    });
  });
});
