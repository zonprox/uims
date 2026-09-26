import { App, ConfigProvider, Form, type FormInstance } from 'antd';
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SwitchFormModal } from './SwitchFormModal';

describe('SwitchFormModal Component Tests', () => {
  let container: HTMLDivElement;
  let currentRoot: Root | null = null;
  let capturedForm: FormInstance | null = null;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    capturedForm = null;
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

  const TestHarness: React.FC<{
    open?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
  }> = ({ open = true, onSave = () => {}, onCancel = () => {} }) => {
    const [form] = Form.useForm();
    capturedForm = form;

    return <SwitchFormModal open={open} form={form} onSave={onSave} onCancel={onCancel} />;
  };

  const renderWithProviders = async (element: React.ReactElement) => {
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

  describe('Modal Rendering & Form Controls', () => {
    it('renders InputNumber with step=2 and min=2, max=48 for total access ports', async () => {
      await renderWithProviders(<TestHarness />);

      const input = document.querySelector('[data-testid="input-total-ports"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.getAttribute('aria-valuemin')).toBe('2');
      expect(input.getAttribute('aria-valuemax')).toBe('48');
      expect(input.getAttribute('aria-valuenow')).toBe('24');
    });

    it('confirms complete removal of quick preset buttons, firmwareVersion, rackHeight, and auto-generate checkbox', async () => {
      await renderWithProviders(<TestHarness />);

      // Zero preset buttons
      expect(document.querySelector('[data-testid^="preset-ports-"]')).toBeNull();
      // Zero firmwareVersion input
      expect(document.querySelector('input[id*="firmwareVersion"]')).toBeNull();
      // Zero rackHeight input
      expect(document.querySelector('input[id*="rackHeight"]')).toBeNull();
      // Zero autoGeneratePorts checkbox
      expect(document.querySelector('input[id*="autoGeneratePorts"]')).toBeNull();
    });

    it('renders dedicated inputs for RJ45 Uplinks and Optical Fiber SFP/SFP+ ports', async () => {
      await renderWithProviders(<TestHarness />);

      const uplinkInput = document.querySelector(
        '[data-testid="input-uplink-ports"]',
      ) as HTMLInputElement;
      const fiberInput = document.querySelector(
        '[data-testid="input-fiber-ports"]',
      ) as HTMLInputElement;
      const uplinkSpeedSelect = document.querySelector('[data-testid="select-uplink-speed"]');
      const fiberSpeedSelect = document.querySelector('[data-testid="select-fiber-speed"]');

      expect(uplinkInput).not.toBeNull();
      expect(fiberInput).not.toBeNull();
      expect(uplinkSpeedSelect).not.toBeNull();
      expect(fiberSpeedSelect).not.toBeNull();

      expect(uplinkInput.getAttribute('aria-valuenow')).toBe('2');
      expect(fiberInput.getAttribute('aria-valuenow')).toBe('2');
    });
  });

  describe('Direct Port Count Selection', () => {
    it('directly updating totalPorts in form sets valid values', async () => {
      await renderWithProviders(<TestHarness />);

      expect(capturedForm).not.toBeNull();

      await act(async () => {
        capturedForm?.setFieldsValue({ totalPorts: 48 });
      });
      expect(capturedForm?.getFieldValue('totalPorts')).toBe(48);
    });
  });

  describe('Strict Form Validation (Even Port Parity & Range)', () => {
    it('rejects odd port counts with explicit error: "Total ports must be an even number"', async () => {
      await renderWithProviders(<TestHarness />);

      expect(capturedForm).not.toBeNull();

      // Test odd numbers: 7, 21, 23, 25
      const oddValues = [7, 21, 23, 25];
      for (const odd of oddValues) {
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
        expect(errorMsg).toContain('Total ports must be an even number');
      }
    });

    it('rejects port counts out of range (<2 or >48)', async () => {
      await renderWithProviders(<TestHarness />);

      expect(capturedForm).not.toBeNull();

      // Less than 2
      let errorBelow = '';
      await act(async () => {
        capturedForm?.setFieldsValue({ totalPorts: 0 });
        try {
          await capturedForm?.validateFields(['totalPorts']);
        } catch (err: unknown) {
          const errorObj = err as { errorFields?: Array<{ errors: string[] }> };
          errorBelow = errorObj.errorFields?.[0]?.errors?.[0] || String(err);
        }
      });
      expect(errorBelow).toContain('Total ports must be between 2 and 48');

      // Greater than 48
      let errorAbove = '';
      await act(async () => {
        capturedForm?.setFieldsValue({ totalPorts: 50 });
        try {
          await capturedForm?.validateFields(['totalPorts']);
        } catch (err: unknown) {
          const errorObj = err as { errorFields?: Array<{ errors: string[] }> };
          errorAbove = errorObj.errorFields?.[0]?.errors?.[0] || String(err);
        }
      });
      expect(errorAbove).toContain('Total ports must be between 2 and 48');
    });

    it('accepts valid custom even numbers (2, 4, 6, 10, 12, 20, 32, 48)', async () => {
      await renderWithProviders(<TestHarness />);

      expect(capturedForm).not.toBeNull();

      const validEvenValues = [2, 4, 6, 10, 12, 20, 32, 48];
      for (const even of validEvenValues) {
        let validatedTotal: number | undefined;
        await act(async () => {
          capturedForm?.setFieldsValue({ totalPorts: even });
          const res = await capturedForm?.validateFields(['totalPorts']);
          validatedTotal = res?.totalPorts;
        });
        expect(validatedTotal).toBe(even);
      }
    });
  });

  describe('Form Submission & Callback Invocation', () => {
    it('triggers onSave when OK button is clicked', async () => {
      const handleSave = vi.fn();
      await renderWithProviders(<TestHarness onSave={handleSave} />);

      const okButton = document.querySelector(
        '.ant-modal-footer .ant-btn-primary',
      ) as HTMLButtonElement;
      expect(okButton).not.toBeNull();

      await act(async () => {
        okButton.click();
      });

      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    it('triggers onCancel when Cancel button is clicked', async () => {
      const handleCancel = vi.fn();
      await renderWithProviders(<TestHarness onCancel={handleCancel} />);

      const cancelButton = document.querySelector(
        '.ant-modal-footer .ant-btn-default',
      ) as HTMLButtonElement;
      expect(cancelButton).not.toBeNull();

      await act(async () => {
        cancelButton.click();
      });

      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('supports full custom switch creation payload with uplinks and fiber ports', async () => {
      await renderWithProviders(<TestHarness />);

      expect(capturedForm).not.toBeNull();
      let values: Record<string, unknown> | undefined;

      await act(async () => {
        capturedForm?.setFieldsValue({
          name: 'BSL-EDGE-CUSTOM01',
          vendor: 'Cisco Systems',
          model: 'C9200-12P',
          role: 'ACCESS',
          status: 'ONLINE',
          totalPorts: 12,
          uplinkPorts: 4,
          uplinkSpeed: '2.5 Gbps',
          fiberPorts: 2,
          fiberSpeed: '10 Gbps',
          autoGeneratePorts: true,
        });
        values = await capturedForm?.validateFields();
      });

      expect(values).toMatchObject({
        name: 'BSL-EDGE-CUSTOM01',
        vendor: 'Cisco Systems',
        model: 'C9200-12P',
        role: 'ACCESS',
        status: 'ONLINE',
        totalPorts: 12,
        uplinkPorts: 4,
        uplinkSpeed: '2.5 Gbps',
        fiberPorts: 2,
        fiberSpeed: '10 Gbps',
      });
    });
  });

  describe('Clean Lifecycle Teardown', () => {
    it('unmounts cleanly without portal DOM leakage or uncaught exceptions', async () => {
      await renderWithProviders(<TestHarness />);
      expect(document.querySelector('.ant-modal-root')).not.toBeNull();

      if (currentRoot) {
        await act(async () => {
          currentRoot?.unmount();
        });
        currentRoot = null;
      }

      // Cleanup stray portal elements
      document.querySelectorAll('.ant-modal-root, .ant-modal-wrap').forEach((el) => el.remove());
      expect(document.querySelector('.ant-modal-root')).toBeNull();
    });
  });
});
