import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../services/api';
import { networkService } from '../../services/network.service';

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('networkService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unwraps getStats from API envelope', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          totalVlans: 12,
          managedSubnets: 22,
          totalIps: 927,
          allocatedStaticIps: 450,
          reservedDhcpLeases: 50,
          availableIps: 427,
          freeIpCapacity: 427,
          averageUtilization: 54,
        },
        timestamp: '2026-09-10T08:00:00Z',
      },
    });

    const stats = await networkService.getStats();
    expect(api.get).toHaveBeenCalledWith('/network/stats');
    expect(stats.totalVlans).toBe(12);
    expect(stats.managedSubnets).toBe(22);
    expect(stats.totalIps).toBe(927);
  });

  it('calculates subnet specifications from CIDR', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          networkAddress: '10.232.130.0',
          broadcastAddress: '10.232.130.255',
          subnetMask: '255.255.255.0',
          prefix: 24,
          totalHosts: 256,
          usableHosts: 254,
          usableStart: '10.232.130.1',
          usableEnd: '10.232.130.254',
          suggestedGateway: '10.232.130.254',
        },
        timestamp: '2026-09-10T08:00:00Z',
      },
    });

    const calc = await networkService.calculateSubnet('10.232.130.0/24');
    expect(api.get).toHaveBeenCalledWith('/network/calculate-subnet', {
      params: { cidr: '10.232.130.0/24' },
    });
    expect(calc.usableHosts).toBe(254);
    expect(calc.suggestedGateway).toBe('10.232.130.254');
  });

  it('auto-detects subnet and vlan from IP address', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ip: '10.232.130.15',
          matchedSubnet: { id: 'sub-1', cidr: '10.232.130.0/24' },
          matchedVlan: { id: 'vlan-1', vlanNumber: 130 },
          isWithinSubnet: true,
        },
        timestamp: '2026-09-10T08:00:00Z',
      },
    });

    const res = await networkService.autoDetect('10.232.130.15');
    expect(api.get).toHaveBeenCalledWith('/network/auto-detect', {
      params: { ip: '10.232.130.15' },
    });
    expect(res.isWithinSubnet).toBe(true);
    expect(res.matchedSubnet?.cidr).toBe('10.232.130.0/24');
  });

  it('performs MAC OUI vendor lookup', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: { mac: '00:1B:44:11:22:33', vendor: 'Cisco Systems', isKnown: true },
        timestamp: '2026-09-10T08:00:00Z',
      },
    });

    const res = await networkService.lookupMacVendor('00:1B:44:11:22:33');
    expect(api.get).toHaveBeenCalledWith('/network/mac-vendor', {
      params: { mac: '00:1B:44:11:22:33' },
    });
    expect(res.vendor).toBe('Cisco Systems');
    expect(res.isKnown).toBe(true);
  });

  it('handles full VLAN CRUD methods', async () => {
    // getVlans
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: [{ id: 'v-1', vlanNumber: 10, name: 'Servers' }] },
    });
    const vlans = await networkService.getVlans({ search: 'Servers' });
    expect(api.get).toHaveBeenCalledWith('/network/vlans', { params: { search: 'Servers' } });
    expect(vlans).toHaveLength(1);

    // getVlan
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: { id: 'v-1', vlanNumber: 10, name: 'Servers' } },
    });
    const vlan = await networkService.getVlan('v-1');
    expect(api.get).toHaveBeenCalledWith('/network/vlans/v-1');
    expect(vlan.id).toBe('v-1');

    // createVlan
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, data: { id: 'v-2', vlanNumber: 20, name: 'CCTV' } },
    });
    const created = await networkService.createVlan({ vlanNumber: 20, name: 'CCTV' });
    expect(api.post).toHaveBeenCalledWith('/network/vlans', { vlanNumber: 20, name: 'CCTV' });
    expect(created.vlanNumber).toBe(20);

    // updateVlan
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { success: true, data: { id: 'v-2', vlanNumber: 20, name: 'Security CCTV' } },
    });
    const updated = await networkService.updateVlan('v-2', { name: 'Security CCTV' });
    expect(api.patch).toHaveBeenCalledWith('/network/vlans/v-2', { name: 'Security CCTV' });
    expect(updated.name).toBe('Security CCTV');

    // deleteVlan
    vi.mocked(api.delete).mockResolvedValueOnce({
      data: { success: true },
    });
    await networkService.deleteVlan('v-2');
    expect(api.delete).toHaveBeenCalledWith('/network/vlans/v-2');
  });

  it('handles full Subnet CRUD methods and getNextAvailableIp', async () => {
    // getSubnets
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: [{ id: 's-1', cidr: '10.232.10.0/24' }] },
    });
    const subnets = await networkService.getSubnets();
    expect(api.get).toHaveBeenCalledWith('/network/subnets', { params: undefined });
    expect(subnets).toHaveLength(1);

    // getSubnet
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: { id: 's-1', cidr: '10.232.10.0/24' } },
    });
    const subnet = await networkService.getSubnet('s-1');
    expect(api.get).toHaveBeenCalledWith('/network/subnets/s-1');
    expect(subnet.cidr).toBe('10.232.10.0/24');

    // createSubnet
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, data: { id: 's-2', cidr: '10.232.20.0/24', name: 'AP Subnet' } },
    });
    const created = await networkService.createSubnet({
      cidr: '10.232.20.0/24',
      name: 'AP Subnet',
    });
    expect(api.post).toHaveBeenCalledWith('/network/subnets', {
      cidr: '10.232.20.0/24',
      name: 'AP Subnet',
    });
    expect(created.id).toBe('s-2');

    // updateSubnet
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { success: true, data: { id: 's-2', cidr: '10.232.20.0/24', name: 'Wi-Fi AP Subnet' } },
    });
    const updated = await networkService.updateSubnet('s-2', { name: 'Wi-Fi AP Subnet' });
    expect(api.patch).toHaveBeenCalledWith('/network/subnets/s-2', { name: 'Wi-Fi AP Subnet' });
    expect(updated.name).toBe('Wi-Fi AP Subnet');

    // deleteSubnet
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    await networkService.deleteSubnet('s-2');
    expect(api.delete).toHaveBeenCalledWith('/network/subnets/s-2');

    // getNextAvailableIp
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: { subnetId: 's-1', cidr: '10.232.10.0/24', nextAvailableIp: '10.232.10.45' },
      },
    });
    const nextIp = await networkService.getNextAvailableIp('s-1');
    expect(api.get).toHaveBeenCalledWith('/network/subnets/s-1/next-available-ip');
    expect(nextIp.nextAvailableIp).toBe('10.232.10.45');
  });

  it('handles full IP methods', async () => {
    // getIps
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: [{ id: 'ip-1', address: '10.232.10.5' }] },
    });
    const ips = await networkService.getIps({ search: '10.232.10.5' });
    expect(api.get).toHaveBeenCalledWith('/network/ips', { params: { search: '10.232.10.5' } });
    expect(ips).toHaveLength(1);

    // getIp
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: { id: 'ip-1', address: '10.232.10.5' } },
    });
    const ip = await networkService.getIp('ip-1');
    expect(api.get).toHaveBeenCalledWith('/network/ips/ip-1');
    expect(ip.address).toBe('10.232.10.5');

    // createIp
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, data: { id: 'ip-2', address: '10.232.10.6' } },
    });
    const created = await networkService.createIp({ address: '10.232.10.6' });
    expect(api.post).toHaveBeenCalledWith('/network/ips', { address: '10.232.10.6' });
    expect(created.address).toBe('10.232.10.6');

    // updateIp
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 'ip-2', address: '10.232.10.6', description: 'Updated IP' },
      },
    });
    const updated = await networkService.updateIp('ip-2', { description: 'Updated IP' });
    expect(api.patch).toHaveBeenCalledWith('/network/ips/ip-2', { description: 'Updated IP' });
    expect(updated.description).toBe('Updated IP');

    // deleteIp
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    await networkService.deleteIp('ip-2');
    expect(api.delete).toHaveBeenCalledWith('/network/ips/ip-2');
  });

  it('handles rack methods and elevation data retrieval', async () => {
    // getRacks
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ id: 'rack-1', name: 'Rack 01', code: 'RCK-01', totalHeight: 42 }],
      },
    });
    const racks = await networkService.getRacks({ search: 'RCK' });
    expect(api.get).toHaveBeenCalledWith('/network/racks', { params: { search: 'RCK' } });
    expect(racks).toHaveLength(1);
    expect(racks[0].name).toBe('Rack 01');

    // getRack
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 'rack-1', name: 'Rack 01', code: 'RCK-01', totalHeight: 42 },
      },
    });
    const rack = await networkService.getRack('rack-1');
    expect(api.get).toHaveBeenCalledWith('/network/racks/rack-1');
    expect(rack.code).toBe('RCK-01');

    // createRack
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 'rack-2', name: 'Rack 02', code: 'RCK-02', totalHeight: 48 },
      },
    });
    const created = await networkService.createRack({
      name: 'Rack 02',
      code: 'RCK-02',
      totalHeight: 48,
    });
    expect(api.post).toHaveBeenCalledWith('/network/racks', {
      name: 'Rack 02',
      code: 'RCK-02',
      totalHeight: 48,
    });
    expect(created.totalHeight).toBe(48);

    // updateRack
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 'rack-2', name: 'Rack 02 Updated', code: 'RCK-02', totalHeight: 48 },
      },
    });
    const updated = await networkService.updateRack('rack-2', { name: 'Rack 02 Updated' });
    expect(api.patch).toHaveBeenCalledWith('/network/racks/rack-2', { name: 'Rack 02 Updated' });
    expect(updated.name).toBe('Rack 02 Updated');

    // deleteRack
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    await networkService.deleteRack('rack-2');
    expect(api.delete).toHaveBeenCalledWith('/network/racks/rack-2');

    // getRackElevation
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          rackId: 'rack-1',
          rackName: 'Rack 01',
          rackCode: 'RCK-01',
          totalHeight: 42,
          usedUnits: 2,
          availableUnits: 40,
          occupancyRate: 4.8,
          slots: [],
        },
      },
    });
    const elevation = await networkService.getRackElevation('rack-1');
    expect(api.get).toHaveBeenCalledWith('/network/racks/rack-1/elevation');
    expect(elevation.totalHeight).toBe(42);
    expect(elevation.usedUnits).toBe(2);
  });

  it('handles switch and port methods', async () => {
    // getSwitches
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: [{ id: 'sw-1', name: 'SW-CORE-01', model: 'C9300-48P' }] },
    });
    const switches = await networkService.getSwitches({ vendor: 'Cisco' });
    expect(api.get).toHaveBeenCalledWith('/network/switches', { params: { vendor: 'Cisco' } });
    expect(switches[0].name).toBe('SW-CORE-01');

    // getSwitch
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: { id: 'sw-1', name: 'SW-CORE-01', model: 'C9300-48P' } },
    });
    const sw = await networkService.getSwitch('sw-1');
    expect(api.get).toHaveBeenCalledWith('/network/switches/sw-1');
    expect(sw.model).toBe('C9300-48P');

    // createSwitch
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 'sw-2', name: 'SW-ACC-01', vendor: 'Cisco', model: 'C9200-24T' },
      },
    });
    const createdSw = await networkService.createSwitch({
      name: 'SW-ACC-01',
      vendor: 'Cisco',
      model: 'C9200-24T',
    });
    expect(api.post).toHaveBeenCalledWith('/network/switches', {
      name: 'SW-ACC-01',
      vendor: 'Cisco',
      model: 'C9200-24T',
    });
    expect(createdSw.id).toBe('sw-2');

    // updateSwitch
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { success: true, data: { id: 'sw-2', name: 'SW-ACC-01-RENAMED' } },
    });
    const updatedSw = await networkService.updateSwitch('sw-2', { name: 'SW-ACC-01-RENAMED' });
    expect(api.patch).toHaveBeenCalledWith('/network/switches/sw-2', { name: 'SW-ACC-01-RENAMED' });
    expect(updatedSw.name).toBe('SW-ACC-01-RENAMED');

    // deleteSwitch
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    await networkService.deleteSwitch('sw-2');
    expect(api.delete).toHaveBeenCalledWith('/network/switches/sw-2');

    // getSwitchPorts
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: [{ id: 'p-1', portNumber: 1, name: 'Gi1/0/1' }] },
    });
    const ports = await networkService.getSwitchPorts('sw-1');
    expect(api.get).toHaveBeenCalledWith('/network/switches/sw-1/ports', { params: undefined });
    expect(ports).toHaveLength(1);

    // createSwitchPort
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { success: true, data: { id: 'p-2', portNumber: 2, name: 'Gi1/0/2' } },
    });
    const createdPort = await networkService.createSwitchPort('sw-1', {
      switchId: 'sw-1',
      portNumber: 2,
      name: 'Gi1/0/2',
    });
    expect(api.post).toHaveBeenCalledWith('/network/switches/sw-1/ports', {
      switchId: 'sw-1',
      portNumber: 2,
      name: 'Gi1/0/2',
    });
    expect(createdPort.name).toBe('Gi1/0/2');

    // getPort
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: { id: 'p-1', name: 'Gi1/0/1' } },
    });
    const port = await networkService.getPort('p-1');
    expect(api.get).toHaveBeenCalledWith('/network/ports/p-1');
    expect(port.name).toBe('Gi1/0/1');

    // updateSwitchPort (2-arg and 3-arg support)
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { success: true, data: { id: 'p-1', operStatus: 'ACTIVE' } },
    });
    const updatedPort = await networkService.updateSwitchPort('p-1', { operStatus: 'ACTIVE' });
    expect(api.patch).toHaveBeenCalledWith('/network/ports/p-1', { operStatus: 'ACTIVE' });
    expect(updatedPort.operStatus).toBe('ACTIVE');

    vi.mocked(api.patch).mockResolvedValueOnce({
      data: { success: true, data: { id: 'p-1', operStatus: 'DOWN' } },
    });
    await networkService.updateSwitchPort('sw-1', 'p-1', { operStatus: 'DOWN' });
    expect(api.patch).toHaveBeenCalledWith('/network/ports/p-1', { operStatus: 'DOWN' });

    // deleteSwitchPort
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    await networkService.deleteSwitchPort('p-1');
    expect(api.delete).toHaveBeenCalledWith('/network/ports/p-1');
  });
});
