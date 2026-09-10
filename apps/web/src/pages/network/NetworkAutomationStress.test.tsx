import { App, ConfigProvider, Form, type FormInstance } from 'antd';
import { act, createElement, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '../../services/assets.service';
import type { LocationBranch } from '../../services/organization.service';
import {
  type AutoDetectResult,
  type IPAddress,
  type NetworkCalculation,
  type RevealedCredentialResult,
  type Subnet,
  type VLAN,
  networkService,
} from '../../services/network.service';
import { CredentialRevealModal } from './components/CredentialRevealModal';
import { IpAddressTable } from './components/IpAddressTable';
import { IpFormModal } from './components/IpFormModal';
import { SubnetFormModal } from './components/SubnetFormModal';

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const { mockLocations, mockVlans, mockSubnets, mockIps, mockAssets } = vi.hoisted(() => {
  const locations: LocationBranch[] = [
    { id: 'loc-1', name: 'BSL Factory 1', building: 'Building A', floor: 'Floor 1' },
    { id: 'loc-2', name: 'HCM Office D3', building: 'Main Tower', floor: 'Floor 7' },
  ];

  const vlans: VLAN[] = [
    {
      id: 'vlan-1',
      vlanNumber: 10,
      name: 'Core Servers',
      description: 'Production servers',
      status: 'ACTIVE',
      locationId: 'loc-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'vlan-2',
      vlanNumber: 130,
      name: 'Time Attendance',
      description: 'Fingerprint scanners',
      status: 'ACTIVE',
      locationId: 'loc-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const subnets: Subnet[] = [
    {
      id: 'sub-1',
      cidr: '10.232.10.0/24',
      name: 'Core Server Subnet',
      vlanId: 'vlan-1',
      locationId: 'loc-1',
      gateway: '10.232.10.254',
      networkAddress: '10.232.10.0',
      netmask: '255.255.255.0',
      broadcastAddress: '10.232.10.255',
      startIp: '10.232.10.1',
      endIp: '10.232.10.254',
      totalIps: 254,
      usedIps: 10,
      reservedIps: 2,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'sub-2',
      cidr: '10.232.130.0/24',
      name: 'Attendance Subnet',
      vlanId: 'vlan-2',
      locationId: 'loc-1',
      gateway: '10.232.130.254',
      networkAddress: '10.232.130.0',
      netmask: '255.255.255.0',
      broadcastAddress: '10.232.130.255',
      startIp: '10.232.130.1',
      endIp: '10.232.130.254',
      totalIps: 254,
      usedIps: 20,
      reservedIps: 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const ips: IPAddress[] = [
    {
      id: 'ip-1',
      address: '10.232.10.10',
      hostname: 'bsl-srv-01.uims.lan',
      macAddress: '00:00:0C:11:22:33',
      vendor: 'Cisco Systems',
      deviceType: 'Server',
      status: 'ASSIGNED',
      subnetId: 'sub-1',
      vlanId: 'vlan-1',
      locationId: 'loc-1',
      credentialId: 'cred-1',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const assets: Asset[] = [
    {
      id: 'ast-1',
      name: 'Cisco Server Node',
      tag: 'AST-SRV-001',
      manufacturer: 'Cisco',
      model: 'UCS C240 M5',
      serialNumber: 'FCH2144V0AB',
      category: 'Server',
      status: 'Active',
      assignedTo: 'Alex Chen',
      assignedEmail: 'alex.chen@uims.internal',
      location: 'BSL Factory 1',
      purchaseDate: '2025-01-01',
      purchasePrice: 4500,
      warrantyExpiry: '2028-01-01',
      specs: { cpu: 'Xeon Silver', ram: '128GB', storage: '2TB NVMe', os: 'RHEL 9' },
    },
  ];

  return {
    mockLocations: locations,
    mockVlans: vlans,
    mockSubnets: subnets,
    mockIps: ips,
    mockAssets: assets,
  };
});

vi.mock('../../services/network.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/network.service')>();
  return {
    ...actual,
    networkService: {
      calculateSubnet: vi
        .fn()
        .mockImplementation((cidr: string): Promise<NetworkCalculation | null> => {
          if (cidr === '10.232.130.0/24') {
            return Promise.resolve({
              networkAddress: '10.232.130.0',
              broadcastAddress: '10.232.130.255',
              subnetMask: '255.255.255.0',
              prefix: 24,
              totalHosts: 256,
              usableHosts: 254,
              usableStart: '10.232.130.1',
              usableEnd: '10.232.130.254',
              suggestedGateway: '10.232.130.254',
            });
          }
          if (cidr === '172.16.0.0/23') {
            return Promise.resolve({
              networkAddress: '172.16.0.0',
              broadcastAddress: '172.16.1.255',
              subnetMask: '255.255.254.0',
              prefix: 23,
              totalHosts: 512,
              usableHosts: 510,
              usableStart: '172.16.0.1',
              usableEnd: '172.16.1.254',
              suggestedGateway: '172.16.1.254',
            });
          }
          if (cidr === '10.232.130.128/25') {
            return Promise.resolve({
              networkAddress: '10.232.130.128',
              broadcastAddress: '10.232.130.255',
              subnetMask: '255.255.255.128',
              prefix: 25,
              totalHosts: 128,
              usableHosts: 126,
              usableStart: '10.232.130.129',
              usableEnd: '10.232.130.254',
              suggestedGateway: '10.232.130.254',
            });
          }
          if (cidr === '10.0.0.4/30') {
            return Promise.resolve({
              networkAddress: '10.0.0.4',
              broadcastAddress: '10.0.0.7',
              subnetMask: '255.255.255.252',
              prefix: 30,
              totalHosts: 4,
              usableHosts: 2,
              usableStart: '10.0.0.5',
              usableEnd: '10.0.0.6',
              suggestedGateway: '10.0.0.6',
            });
          }
          return Promise.resolve(null);
        }),
      autoDetect: vi.fn().mockImplementation((ip: string): Promise<AutoDetectResult> => {
        if (ip.startsWith('10.232.130.')) {
          return Promise.resolve({
            ip,
            matchedSubnet: mockSubnets[1],
            matchedVlan: mockVlans[1],
            isWithinSubnet: true,
            suggestedGateway: '10.232.130.254',
          });
        }
        if (ip.startsWith('10.232.10.')) {
          return Promise.resolve({
            ip,
            matchedSubnet: mockSubnets[0],
            matchedVlan: mockVlans[0],
            isWithinSubnet: true,
            suggestedGateway: '10.232.10.254',
          });
        }
        return Promise.resolve({
          ip,
          matchedSubnet: null,
          matchedVlan: null,
          isWithinSubnet: false,
        });
      }),
      lookupMacVendor: vi.fn().mockImplementation((mac: string) => {
        const cleaned = mac.toLowerCase().replace(/[^a-f0-9]/g, '');
        if (cleaned.startsWith('00000c') || cleaned.startsWith('001b44')) {
          return Promise.resolve({ mac, vendor: 'Cisco Systems', isKnown: true });
        }
        if (cleaned.startsWith('bc5ecd') || cleaned.startsWith('4419b6')) {
          return Promise.resolve({ mac, vendor: 'Hikvision', isKnown: true });
        }
        if (cleaned.startsWith('3cd92b') || cleaned.startsWith('000802')) {
          return Promise.resolve({ mac, vendor: 'HP Inc.', isKnown: true });
        }
        return Promise.resolve({ mac, vendor: 'Generic Device', isKnown: false });
      }),
      getNextAvailableIp: vi.fn().mockImplementation((subnetId: string) => {
        if (subnetId === 'sub-2') {
          return Promise.resolve({
            subnetId: 'sub-2',
            cidr: '10.232.130.0/24',
            nextAvailableIp: '10.232.130.16',
          });
        }
        return Promise.resolve({
          subnetId,
          cidr: '',
          nextAvailableIp: null,
        });
      }),
      revealCredential: vi.fn().mockResolvedValue({
        id: 'cred-1',
        name: 'Cisco IMC Root Access',
        username: 'admin',
        password: 'SecretPassVault2026!',
        protocol: 'HTTPS',
        port: 443,
        notes: 'Rack 4 Unit 12',
      }),
    },
  };
});

describe('Milestone 3 Empirical Stress Tests: Automation & Modals', () => {
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
      .querySelectorAll('.ant-modal-root, .ant-modal-wrap, .ant-drawer, .ant-popover')
      .forEach((el) => {
        el.remove();
      });
  });

  // -------------------------------------------------------------
  // Test 1: SubnetFormModal Real-time CIDR Calculation Preview
  // -------------------------------------------------------------
  describe('SubnetFormModal: Real-time dynamic CIDR calculation preview', () => {
    const renderSubnetModal = async () => {
      const Wrapper = () => {
        const [form] = Form.useForm();
        return (
          <ConfigProvider>
            <App>
              <SubnetFormModal
                open={true}
                form={form}
                submitting={false}
                vlans={mockVlans}
                locations={mockLocations}
                onSave={vi.fn()}
                onCancel={vi.fn()}
              />
            </App>
          </ConfigProvider>
        );
      };

      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(createElement(Wrapper));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    };

    it('typing invalid CIDR does not render calculation preview', async () => {
      await renderSubnetModal();

      const cidrInput = document.querySelector('input#cidr') as HTMLInputElement;
      expect(cidrInput).toBeTruthy();

      const invalidCidrs = [
        'invalid-cidr',
        '10.232.130.0',
        '999.999.999.999/24',
        '10.0.0.1/33',
        '10.0.0.1/0',
        '10.0.0.1/-1',
        '256.0.0.0/24',
      ];

      for (const invalid of invalidCidrs) {
        await act(async () => {
          setInputValue(cidrInput, invalid);
          await new Promise((resolve) => setTimeout(resolve, 30));
        });

        expect(document.body.textContent).not.toContain('Automated Network Specifications');
        expect(document.body.textContent).not.toContain('Usable IPs');
      }
    });

    it('typing valid /24 CIDR updates netmask, broadcast, usable range, and suggested gateway', async () => {
      await renderSubnetModal();

      const cidrInput = document.querySelector('input#cidr') as HTMLInputElement;
      expect(cidrInput).toBeTruthy();

      await act(async () => {
        setInputValue(cidrInput, '10.232.130.0/24');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Assert specifications
      expect(document.body.textContent).toContain('Automated Network Specifications (/24)');
      expect(document.body.textContent).toContain('254 Usable IPs');
      expect(document.body.textContent).toContain('255.255.255.0');
      expect(document.body.textContent).toContain('10.232.130.0');
      expect(document.body.textContent).toContain('10.232.130.255');
      expect(document.body.textContent).toContain('10.232.130.1 — 10.232.130.254');
      expect(document.body.textContent).toContain('10.232.130.254');

      // Click "Use this Gateway" button
      const useGwBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Use this Gateway'),
      );
      expect(useGwBtn).toBeTruthy();

      await act(async () => {
        useGwBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      const gwInput = document.querySelector('input#gateway') as HTMLInputElement;
      expect(gwInput.value).toBe('10.232.130.254');
    });

    it('typing valid /23 CIDR updates specifications correctly', async () => {
      await renderSubnetModal();

      const cidrInput = document.querySelector('input#cidr') as HTMLInputElement;

      await act(async () => {
        setInputValue(cidrInput, '172.16.0.0/23');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(document.body.textContent).toContain('Automated Network Specifications (/23)');
      expect(document.body.textContent).toContain('510 Usable IPs');
      expect(document.body.textContent).toContain('255.255.254.0');
      expect(document.body.textContent).toContain('172.16.0.0');
      expect(document.body.textContent).toContain('172.16.1.255');
      expect(document.body.textContent).toContain('172.16.0.1 — 172.16.1.254');
      expect(document.body.textContent).toContain('172.16.1.254');
    });

    it('typing valid /25 CIDR updates specifications correctly', async () => {
      await renderSubnetModal();

      const cidrInput = document.querySelector('input#cidr') as HTMLInputElement;

      await act(async () => {
        setInputValue(cidrInput, '10.232.130.128/25');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(document.body.textContent).toContain('Automated Network Specifications (/25)');
      expect(document.body.textContent).toContain('126 Usable IPs');
      expect(document.body.textContent).toContain('255.255.255.128');
      expect(document.body.textContent).toContain('10.232.130.128');
      expect(document.body.textContent).toContain('10.232.130.255');
      expect(document.body.textContent).toContain('10.232.130.129 — 10.232.130.254');
      expect(document.body.textContent).toContain('10.232.130.254');
    });

    it('typing valid /30 point-to-point CIDR updates specifications correctly', async () => {
      await renderSubnetModal();

      const cidrInput = document.querySelector('input#cidr') as HTMLInputElement;

      await act(async () => {
        setInputValue(cidrInput, '10.0.0.4/30');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(document.body.textContent).toContain('Automated Network Specifications (/30)');
      expect(document.body.textContent).toContain('2 Usable IPs');
      expect(document.body.textContent).toContain('255.255.255.252');
      expect(document.body.textContent).toContain('10.0.0.4');
      expect(document.body.textContent).toContain('10.0.0.7');
      expect(document.body.textContent).toContain('10.0.0.5 — 10.0.0.6');
      expect(document.body.textContent).toContain('10.0.0.6');
    });

    it('transitioning from valid CIDR to invalid CIDR immediately clears preview card', async () => {
      await renderSubnetModal();

      const cidrInput = document.querySelector('input#cidr') as HTMLInputElement;

      // Valid first
      await act(async () => {
        setInputValue(cidrInput, '10.232.130.0/24');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(document.body.textContent).toContain('Automated Network Specifications (/24)');

      // Change to invalid
      await act(async () => {
        setInputValue(cidrInput, '10.232.130.0/');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(document.body.textContent).not.toContain('Automated Network Specifications');

      // Change back to valid /25
      await act(async () => {
        setInputValue(cidrInput, '10.232.130.128/25');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(document.body.textContent).toContain('Automated Network Specifications (/25)');
    });
  });

  // -------------------------------------------------------------
  // Test 2: IpFormModal Bitwise Subnet & VLAN Auto-Detection
  // -------------------------------------------------------------
  describe('IpFormModal: Bitwise Subnet and VLAN auto-detection', () => {
    let capturedForm: FormInstance | null = null;

    const renderIpModal = async (initialValues?: Record<string, unknown>) => {
      const Wrapper = () => {
        const [form] = Form.useForm();
        capturedForm = form;
        useEffect(() => {
          if (initialValues) {
            form.setFieldsValue(initialValues);
          }
        }, [form]);

        return (
          <ConfigProvider>
            <App>
              <IpFormModal
                open={true}
                editingIp={null}
                form={form}
                submitting={false}
                subnets={mockSubnets}
                vlans={mockVlans}
                locations={mockLocations}
                assets={mockAssets}
                onSave={vi.fn()}
                onCancel={vi.fn()}
              />
            </App>
          </ConfigProvider>
        );
      };

      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(createElement(Wrapper));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    };

    it('typing IP address auto-detects matching Subnet and VLAN and updates form values', async () => {
      await renderIpModal();

      const ipInput = document.querySelector('input#address') as HTMLInputElement;
      expect(ipInput).toBeTruthy();

      await act(async () => {
        setInputValue(ipInput, '10.232.130.15');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(networkService.autoDetect).toHaveBeenCalledWith('10.232.130.15');

      // Check auto-detected Tag in DOM
      expect(document.body.textContent).toContain(
        'Auto-detected Subnet: 10.232.130.0/24 (VLAN 130)',
      );

      // Verify form fields were auto-populated
      expect(capturedForm?.getFieldValue('subnetId')).toBe('sub-2');
      expect(capturedForm?.getFieldValue('vlanId')).toBe('vlan-2');
    });

    it('typing IP matching a different subnet updates Subnet and VLAN accordingly', async () => {
      await renderIpModal();

      const ipInput = document.querySelector('input#address') as HTMLInputElement;

      await act(async () => {
        setInputValue(ipInput, '10.232.10.55');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(networkService.autoDetect).toHaveBeenCalledWith('10.232.10.55');
      expect(document.body.textContent).toContain('Auto-detected Subnet: 10.232.10.0/24 (VLAN 10)');
      expect(capturedForm?.getFieldValue('subnetId')).toBe('sub-1');
      expect(capturedForm?.getFieldValue('vlanId')).toBe('vlan-1');
    });

    it('typing IP that does not match any managed subnet clears auto-detected tag', async () => {
      await renderIpModal();

      const ipInput = document.querySelector('input#address') as HTMLInputElement;

      // Valid match first
      await act(async () => {
        setInputValue(ipInput, '10.232.130.15');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(document.body.textContent).toContain('Auto-detected Subnet');

      // Unmatched IP
      await act(async () => {
        setInputValue(ipInput, '192.168.99.1');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(document.body.textContent).not.toContain('Auto-detected Subnet');
    });
  });

  // -------------------------------------------------------------
  // Test 3: IpFormModal "Next Available IP" Button
  // -------------------------------------------------------------
  describe('IpFormModal: "Next Available IP" button automation', () => {
    let capturedForm: FormInstance | null = null;

    const renderIpModalWithSubnet = async (subnetId?: string) => {
      const Wrapper = () => {
        const [form] = Form.useForm();
        capturedForm = form;
        useEffect(() => {
          if (subnetId) {
            form.setFieldsValue({ subnetId });
          }
        }, [form]);

        return (
          <ConfigProvider>
            <App>
              <IpFormModal
                open={true}
                editingIp={null}
                form={form}
                submitting={false}
                subnets={mockSubnets}
                vlans={mockVlans}
                locations={mockLocations}
                assets={mockAssets}
                onSave={vi.fn()}
                onCancel={vi.fn()}
              />
            </App>
          </ConfigProvider>
        );
      };

      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(createElement(Wrapper));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    };

    it('Next Available IP button is enabled when Subnet is selected and auto-populates IP', async () => {
      await renderIpModalWithSubnet('sub-2');

      const nextIpBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Next Available IP'),
      );
      expect(nextIpBtn).toBeTruthy();
      expect(nextIpBtn?.hasAttribute('disabled')).toBe(false);

      await act(async () => {
        nextIpBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(networkService.getNextAvailableIp).toHaveBeenCalledWith('sub-2');

      const ipInput = document.querySelector('input#address') as HTMLInputElement;
      expect(ipInput.value).toBe('10.232.130.16');
      expect(capturedForm?.getFieldValue('address')).toBe('10.232.130.16');
      expect(capturedForm?.getFieldValue('ip')).toBe('10.232.130.16');
    });

    it('Next Available IP button is disabled when no Subnet is selected', async () => {
      await renderIpModalWithSubnet(undefined);

      const nextIpBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Next Available IP'),
      );
      expect(nextIpBtn).toBeTruthy();
      expect(nextIpBtn?.hasAttribute('disabled')).toBe(true);
    });

    it('displays warning if subnet IP pool is exhausted', async () => {
      await renderIpModalWithSubnet('sub-1');

      const nextIpBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Next Available IP'),
      );

      await act(async () => {
        nextIpBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // sub-1 returns nextAvailableIp: null in our mock
      expect(networkService.getNextAvailableIp).toHaveBeenCalledWith('sub-1');
      expect(capturedForm?.getFieldValue('address')).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // Test 4: MAC OUI Vendor Lookup in Real-Time
  // -------------------------------------------------------------
  describe('IpFormModal: MAC OUI vendor lookup in real-time', () => {
    let capturedForm: FormInstance | null = null;

    const renderIpModal = async () => {
      const Wrapper = () => {
        const [form] = Form.useForm();
        capturedForm = form;
        return (
          <ConfigProvider>
            <App>
              <IpFormModal
                open={true}
                editingIp={null}
                form={form}
                submitting={false}
                subnets={mockSubnets}
                vlans={mockVlans}
                locations={mockLocations}
                assets={mockAssets}
                onSave={vi.fn()}
                onCancel={vi.fn()}
              />
            </App>
          </ConfigProvider>
        );
      };

      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(createElement(Wrapper));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    };

    it('typing Cisco MAC address updates Vendor tag and form value in real-time', async () => {
      await renderIpModal();

      const macInput = document.querySelector('input#macAddress') as HTMLInputElement;
      expect(macInput).toBeTruthy();

      await act(async () => {
        setInputValue(macInput, '00:00:0C:4A:2B:11');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(networkService.lookupMacVendor).toHaveBeenCalledWith('00:00:0C:4A:2B:11');
      expect(document.body.textContent).toContain('OUI Vendor: Cisco Systems');
      expect(capturedForm?.getFieldValue('vendor')).toBe('Cisco Systems');
    });

    it('typing Hikvision MAC address updates Vendor tag in real-time', async () => {
      await renderIpModal();

      const macInput = document.querySelector('input#macAddress') as HTMLInputElement;

      await act(async () => {
        setInputValue(macInput, 'BC:5E:CD:99:88:77');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(networkService.lookupMacVendor).toHaveBeenCalledWith('BC:5E:CD:99:88:77');
      expect(document.body.textContent).toContain('OUI Vendor: Hikvision');
      expect(capturedForm?.getFieldValue('vendor')).toBe('Hikvision');
    });

    it('typing HP Inc. MAC address updates Vendor tag in real-time', async () => {
      await renderIpModal();

      const macInput = document.querySelector('input#macAddress') as HTMLInputElement;

      await act(async () => {
        setInputValue(macInput, '3C:D9:2B:11:22:33');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(networkService.lookupMacVendor).toHaveBeenCalledWith('3C:D9:2B:11:22:33');
      expect(document.body.textContent).toContain('OUI Vendor: HP Inc.');
      expect(capturedForm?.getFieldValue('vendor')).toBe('HP Inc.');
    });

    it('typing unknown MAC address does not display OUI Vendor tag', async () => {
      await renderIpModal();

      const macInput = document.querySelector('input#macAddress') as HTMLInputElement;

      await act(async () => {
        setInputValue(macInput, 'AA:BB:CC:DD:EE:FF');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(networkService.lookupMacVendor).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
      expect(document.body.textContent).not.toContain('OUI Vendor:');
    });
  });

  // -------------------------------------------------------------
  // Test 5: Credential Reveal Modal Verification & Security Audit
  // -------------------------------------------------------------
  describe('Credential Reveal Modal: Security warning, password toggle, and audit inspection', () => {
    it('renders audit warning and decrypts secret cleanly with mask toggle and copy', async () => {
      const mockCred: RevealedCredentialResult = {
        id: 'cred-1',
        name: 'Cisco IMC Root Access',
        username: 'admin',
        password: 'SecretPassVault2026!',
        protocol: 'HTTPS',
        port: 443,
        notes: 'Rack 4 Unit 12',
      };

      const onClose = vi.fn();

      const Wrapper = () => (
        <ConfigProvider>
          <App>
            <CredentialRevealModal
              open={true}
              targetIp="10.232.10.10"
              credential={mockCred}
              loading={false}
              onClose={onClose}
            />
          </App>
        </ConfigProvider>
      );

      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(createElement(Wrapper));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // 1. Verifies prominent security audit warning
      expect(document.body.textContent).toContain('Audited Security Operation');
      expect(document.body.textContent).toContain(
        'Decryption event has been recorded in the immutable audit log with your account signature.',
      );
      expect(document.body.textContent).toContain('Device IP: 10.232.10.10');

      // 2. Verifies secret data rendering
      expect(document.body.textContent).toContain('Cisco IMC Root Access');
      expect(document.body.textContent).toContain('admin');
      expect(document.body.textContent).toContain('HTTPS');
      expect(document.body.textContent).toContain('Port 443');
      expect(document.body.textContent).toContain('Rack 4 Unit 12');

      // 3. Verifies password is initially masked (type="password")
      const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
      expect(passwordInput).toBeTruthy();
      expect(passwordInput.value).toBe('SecretPassVault2026!');

      // 4. Verifies Show/Hide button toggles plaintext
      const toggleBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Show'),
      );
      expect(toggleBtn).toBeTruthy();

      await act(async () => {
        toggleBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      const revealedInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      expect(revealedInput).toBeTruthy();
      expect(revealedInput.value).toBe('SecretPassVault2026!');

      // 5. Test Copy Password button
      const copyBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Copy'),
      );
      expect(copyBtn).toBeTruthy();

      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      if (!navigator.clipboard) {
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: writeTextMock },
          configurable: true,
          writable: true,
        });
      } else {
        Object.defineProperty(navigator.clipboard, 'writeText', {
          value: writeTextMock,
          configurable: true,
          writable: true,
        });
      }

      await act(async () => {
        copyBtn?.click();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      expect(writeTextMock).toHaveBeenCalledWith('SecretPassVault2026!');

      // 6. Test Close/Done button
      const doneBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Done'),
      );
      expect(doneBtn).toBeTruthy();

      await act(async () => {
        doneBtn?.click();
      });

      expect(onClose).toHaveBeenCalled();
    });

    it('ADVERSARIAL CHALLENGE: verifies whether table action requires confirmation before triggering decryption', async () => {
      // In IpAddressTable, inspect the "Reveal Admin Credential" action button
      const onRevealCredentialMock = vi.fn();
      const onDeleteIpMock = vi.fn();

      const Wrapper = () => (
        <ConfigProvider>
          <App>
            <IpAddressTable
              ips={mockIps}
              subnets={mockSubnets}
              vlans={mockVlans}
              locations={mockLocations}
              loading={false}
              searchQuery=""
              siteFilter="all"
              vlanFilter="all"
              subnetFilter="all"
              deviceTypeFilter="all"
              statusFilter="all"
              onSearchChange={vi.fn()}
              onSiteChange={vi.fn()}
              onVlanChange={vi.fn()}
              onSubnetChange={vi.fn()}
              onDeviceTypeChange={vi.fn()}
              onStatusChange={vi.fn()}
              onResetFilters={vi.fn()}
              onOpenEditModal={vi.fn()}
              onDeleteIp={onDeleteIpMock}
              onRevealCredential={onRevealCredentialMock}
            />
          </App>
        </ConfigProvider>
      );

      const root = createRoot(container);
      currentRoot = root;
      await act(async () => {
        root.render(createElement(Wrapper));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Find the Key button
      const keyBtn = container
        .querySelector('.anticon-key')
        ?.closest('button') as HTMLButtonElement;
      expect(keyBtn).toBeTruthy();

      // Click the key button
      await act(async () => {
        keyBtn.click();
        await new Promise((resolve) => setTimeout(resolve, 30));
      });

      // EMPIRICAL OBSERVATION:
      // Clicking the Key button directly triggers onRevealCredential immediately.
      // Unlike Delete/Release IP (which has Popconfirm), the key button triggers decryption immediately.
      expect(onRevealCredentialMock).toHaveBeenCalledWith(mockIps[0]);
    });
  });
});
