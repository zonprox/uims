import { VlanStatus } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AutoDetectQueryDto,
  CalculateSubnetQueryDto,
  CreateIPAddressDto,
  CreateSubnetDto,
  CreateVlanDto,
  MacVendorQueryDto,
  UpdateIPAddressDto,
  UpdateSubnetDto,
  UpdateVlanDto,
} from './dto';
import { NetworkController } from './network.controller';
import type { NetworkService } from './network.service';

describe('NetworkController', () => {
  let controller: NetworkController;
  let mockNetworkService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockNetworkService = {
      findAllVlans: vi.fn(),
      findVlan: vi.fn(),
      createVlan: vi.fn(),
      updateVlan: vi.fn(),
      deleteVlan: vi.fn(),
      findAllSubnets: vi.fn(),
      findSubnet: vi.fn(),
      createSubnet: vi.fn(),
      updateSubnet: vi.fn(),
      deleteSubnet: vi.fn(),
      getNextAvailableIp: vi.fn(),
      findAllIps: vi.fn(),
      findIp: vi.fn(),
      createIp: vi.fn(),
      updateIp: vi.fn(),
      deleteIp: vi.fn(),
      calculateSubnet: vi.fn(),
      autoDetect: vi.fn(),
      lookupMacVendor: vi.fn(),
      getStats: vi.fn(),
    };

    controller = new NetworkController(mockNetworkService as unknown as NetworkService);
  });

  // ==========================================
  // VLAN ENDPOINTS
  // ==========================================

  it('findAllVlans calls networkService.findAllVlans with query', async () => {
    const mockVlans = [{ id: 'vlan-1', vlanNumber: 130, name: 'Access Control' }];
    mockNetworkService.findAllVlans.mockResolvedValue(mockVlans);

    const result = await controller.findAllVlans({ search: 'Access', page: 1, limit: 10 });
    expect(mockNetworkService.findAllVlans).toHaveBeenCalledWith({
      search: 'Access',
      page: 1,
      limit: 10,
    });
    expect(result).toBe(mockVlans);
  });

  it('createVlan calls networkService.createVlan with CreateVlanDto', async () => {
    const dto: CreateVlanDto = {
      vlanNumber: 130,
      name: 'Access Control',
      status: VlanStatus.ACTIVE,
    };
    const created = { id: 'vlan-130', ...dto };
    mockNetworkService.createVlan.mockResolvedValue(created);

    const result = await controller.createVlan(dto);
    expect(mockNetworkService.createVlan).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('findVlan calls networkService.findVlan with id', async () => {
    const vlan = { id: 'vlan-1', vlanNumber: 130 };
    mockNetworkService.findVlan.mockResolvedValue(vlan);

    const result = await controller.findVlan('vlan-1');
    expect(mockNetworkService.findVlan).toHaveBeenCalledWith('vlan-1');
    expect(result).toBe(vlan);
  });

  it('updateVlan calls networkService.updateVlan with id and dto', async () => {
    const dto: UpdateVlanDto = { name: 'Updated VLAN' };
    const updated = { id: 'vlan-1', name: 'Updated VLAN' };
    mockNetworkService.updateVlan.mockResolvedValue(updated);

    const result = await controller.updateVlan('vlan-1', dto);
    expect(mockNetworkService.updateVlan).toHaveBeenCalledWith('vlan-1', dto);
    expect(result).toBe(updated);
  });

  it('deleteVlan calls networkService.deleteVlan with id', async () => {
    mockNetworkService.deleteVlan.mockResolvedValue({ id: 'vlan-1' });
    const result = await controller.deleteVlan('vlan-1');
    expect(mockNetworkService.deleteVlan).toHaveBeenCalledWith('vlan-1');
    expect(result).toEqual({ id: 'vlan-1' });
  });

  // ==========================================
  // SUBNET ENDPOINTS
  // ==========================================

  it('findAllSubnets calls networkService.findAllSubnets with query', async () => {
    const mockSubnets = [{ id: 'sub-1', cidr: '10.232.130.0/24' }];
    mockNetworkService.findAllSubnets.mockResolvedValue(mockSubnets);

    const result = await controller.findAllSubnets({ search: '10.232' });
    expect(mockNetworkService.findAllSubnets).toHaveBeenCalledWith({ search: '10.232' });
    expect(result).toBe(mockSubnets);
  });

  it('createSubnet calls networkService.createSubnet with CreateSubnetDto', async () => {
    const dto: CreateSubnetDto = {
      cidr: '10.232.130.0/24',
      name: 'Access Control',
      gateway: '10.232.130.254',
    };
    const created = { id: 'sub-1', ...dto };
    mockNetworkService.createSubnet.mockResolvedValue(created);

    const result = await controller.createSubnet(dto);
    expect(mockNetworkService.createSubnet).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('findSubnet calls networkService.findSubnet with id', async () => {
    const subnet = { id: 'sub-1', cidr: '10.232.130.0/24' };
    mockNetworkService.findSubnet.mockResolvedValue(subnet);

    const result = await controller.findSubnet('sub-1');
    expect(mockNetworkService.findSubnet).toHaveBeenCalledWith('sub-1');
    expect(result).toBe(subnet);
  });

  it('updateSubnet calls networkService.updateSubnet with id and dto', async () => {
    const dto: UpdateSubnetDto = { name: 'Renamed Subnet' };
    const updated = { id: 'sub-1', name: 'Renamed Subnet' };
    mockNetworkService.updateSubnet.mockResolvedValue(updated);

    const result = await controller.updateSubnet('sub-1', dto);
    expect(mockNetworkService.updateSubnet).toHaveBeenCalledWith('sub-1', dto);
    expect(result).toBe(updated);
  });

  it('deleteSubnet calls networkService.deleteSubnet with id', async () => {
    mockNetworkService.deleteSubnet.mockResolvedValue({ id: 'sub-1' });
    const result = await controller.deleteSubnet('sub-1');
    expect(mockNetworkService.deleteSubnet).toHaveBeenCalledWith('sub-1');
    expect(result).toEqual({ id: 'sub-1' });
  });

  it('getNextAvailableIp calls networkService.getNextAvailableIp', async () => {
    const expected = {
      subnetId: 'sub-1',
      cidr: '10.232.130.0/24',
      nextAvailableIp: '10.232.130.5',
    };
    mockNetworkService.getNextAvailableIp.mockResolvedValue(expected);

    const result = await controller.getNextAvailableIp('sub-1');
    expect(mockNetworkService.getNextAvailableIp).toHaveBeenCalledWith('sub-1');
    expect(result).toBe(expected);
  });

  // ==========================================
  // IP ADDRESS ENDPOINTS
  // ==========================================

  it('findAllIps calls networkService.findAllIps with query filters', async () => {
    const mockIps = [{ id: 'ip-1', address: '192.168.1.1', hostname: 'cisco-gw' }];
    mockNetworkService.findAllIps.mockResolvedValue(mockIps);

    const result = await controller.findAllIps({ search: 'cisco', status: 'ASSIGNED' });
    expect(mockNetworkService.findAllIps).toHaveBeenCalledWith({
      search: 'cisco',
      status: 'ASSIGNED',
    });
    expect(result).toBe(mockIps);
  });

  it('createIp calls networkService.createIp with CreateIPAddressDto', async () => {
    const dto: CreateIPAddressDto = {
      address: '192.168.1.25',
      hostname: 'srv-db-01.uims.lan',
      macAddress: '00:11:22:33:44:55',
      deviceType: 'Server',
      status: 'Allocated',
    };
    const created = { id: 'ip-2', ...dto };
    mockNetworkService.createIp.mockResolvedValue(created);

    const result = await controller.createIp(dto);
    expect(mockNetworkService.createIp).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('findIp calls networkService.findIp with id', async () => {
    const ip = { id: 'ip-1', address: '10.232.130.15' };
    mockNetworkService.findIp.mockResolvedValue(ip);

    const result = await controller.findIp('ip-1');
    expect(mockNetworkService.findIp).toHaveBeenCalledWith('ip-1');
    expect(result).toBe(ip);
  });

  it('updateIp calls networkService.updateIp with id and dto', async () => {
    const dto: UpdateIPAddressDto = { status: 'Reserved' };
    const updated = { id: 'ip-1', status: 'Reserved' };
    mockNetworkService.updateIp.mockResolvedValue(updated);

    const result = await controller.updateIp('ip-1', dto);
    expect(mockNetworkService.updateIp).toHaveBeenCalledWith('ip-1', dto);
    expect(result).toBe(updated);
  });

  it('deleteIp calls networkService.deleteIp with id', async () => {
    mockNetworkService.deleteIp.mockResolvedValue({ success: true, id: 'ip-1' });

    const result = await controller.deleteIp('ip-1');
    expect(mockNetworkService.deleteIp).toHaveBeenCalledWith('ip-1');
    expect(result).toEqual({ success: true, id: 'ip-1' });
  });

  // ==========================================
  // AUTOMATION ENDPOINTS
  // ==========================================

  it('calculateSubnet calls networkService.calculateSubnet with CIDR', () => {
    const calcResult = { totalHosts: 256, usableHosts: 254 };
    mockNetworkService.calculateSubnet.mockReturnValue(calcResult);

    const query: CalculateSubnetQueryDto = { cidr: '10.232.130.0/24' };
    const result = controller.calculateSubnet(query);
    expect(mockNetworkService.calculateSubnet).toHaveBeenCalledWith('10.232.130.0/24');
    expect(result).toBe(calcResult);
  });

  it('autoDetect calls networkService.autoDetect with IP address', async () => {
    const autoResult = { isWithinSubnet: true, matchedSubnet: { cidr: '10.232.130.0/24' } };
    mockNetworkService.autoDetect.mockResolvedValue(autoResult);

    const query: AutoDetectQueryDto = { ip: '10.232.130.15' };
    const result = await controller.autoDetect(query);
    expect(mockNetworkService.autoDetect).toHaveBeenCalledWith('10.232.130.15');
    expect(result).toBe(autoResult);
  });

  it('lookupMacVendor calls networkService.lookupMacVendor with MAC', () => {
    const vendorResult = { mac: '44:19:B6:11:22:33', vendor: 'Hikvision' };
    mockNetworkService.lookupMacVendor.mockReturnValue(vendorResult);

    const query: MacVendorQueryDto = { mac: '44:19:B6:11:22:33' };
    const result = controller.lookupMacVendor(query);
    expect(mockNetworkService.lookupMacVendor).toHaveBeenCalledWith('44:19:B6:11:22:33');
    expect(result).toBe(vendorResult);
  });

  it('getStats calls networkService.getStats', async () => {
    const statsResult = { totalVlans: 5, managedSubnets: 3, totalIps: 100 };
    mockNetworkService.getStats.mockResolvedValue(statsResult);

    const result = await controller.getStats();
    expect(mockNetworkService.getStats).toHaveBeenCalled();
    expect(result).toBe(statsResult);
  });
});
