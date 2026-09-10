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

  it('handles full IP methods, credential reveal and ping', async () => {
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
      data: { success: true, data: { id: 'ip-2', address: '10.232.10.6', hostname: 'host-2' } },
    });
    const updated = await networkService.updateIp('ip-2', { hostname: 'host-2' });
    expect(api.patch).toHaveBeenCalledWith('/network/ips/ip-2', { hostname: 'host-2' });
    expect(updated.hostname).toBe('host-2');

    // deleteIp
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true } });
    await networkService.deleteIp('ip-2');
    expect(api.delete).toHaveBeenCalledWith('/network/ips/ip-2');

    // revealCredential
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 'cred-1', name: 'Switch Admin', username: 'admin', password: 'DecryptedPass!' },
      },
    });
    const cred = await networkService.revealCredential('ip-1');
    expect(api.post).toHaveBeenCalledWith('/network/ips/ip-1/reveal-credential');
    expect(cred.password).toBe('DecryptedPass!');
  });
});
