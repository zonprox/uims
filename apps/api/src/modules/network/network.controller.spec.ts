import { RackStatus, SwitchRole, SwitchStatus, VlanStatus } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AutoDetectQueryDto,
  CalculateSubnetQueryDto,
  CreateIPAddressDto,
  CreateRackDto,
  CreateSubnetDto,
  CreateSwitchDto,
  CreateSwitchPortDto,
  CreateVlanDto,
  MacVendorQueryDto,
  RackQueryDto,
  SwitchPortQueryDto,
  SwitchQueryDto,
  UpdateIPAddressDto,
  UpdateRackDto,
  UpdateSubnetDto,
  UpdateSwitchDto,
  UpdateSwitchPortDto,
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
      findAllRacks: vi.fn(),
      findRack: vi.fn(),
      createRack: vi.fn(),
      updateRack: vi.fn(),
      deleteRack: vi.fn(),
      getRackElevation: vi.fn(),
      findAllSwitches: vi.fn(),
      findSwitch: vi.fn(),
      createSwitch: vi.fn(),
      updateSwitch: vi.fn(),
      deleteSwitch: vi.fn(),
      findSwitchPorts: vi.fn(),
      findPort: vi.fn(),
      updatePort: vi.fn(),
      createPort: vi.fn(),
      deletePort: vi.fn(),
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
    const mockIps = [{ id: 'ip-1', address: '192.168.1.1' }];
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
    const statsResult = {
      totalVlans: 5,
      managedSubnets: 3,
      totalIps: 100,
      totalRacks: 5,
      totalSwitches: 6,
      totalPorts: 192,
      portUtilization: 65.1,
    };
    mockNetworkService.getStats.mockResolvedValue(statsResult);

    const result = await controller.getStats();
    expect(mockNetworkService.getStats).toHaveBeenCalled();
    expect(result).toBe(statsResult);
  });

  // ==========================================
  // RACK ENDPOINTS
  // ==========================================

  it('findAllRacks calls networkService.findAllRacks with query', async () => {
    const mockRacks = [{ id: 'rack-1', name: 'Core Datacenter Rack 01', code: 'RACK-DC-01' }];
    mockNetworkService.findAllRacks.mockResolvedValue(mockRacks);

    const query: RackQueryDto = { search: 'Core', page: 1, limit: 10 };
    const result = await controller.findAllRacks(query);
    expect(mockNetworkService.findAllRacks).toHaveBeenCalledWith(query);
    expect(result).toBe(mockRacks);
  });

  it('createRack calls networkService.createRack with CreateRackDto', async () => {
    const dto: CreateRackDto = {
      name: 'Core Datacenter Rack 01',
      code: 'RACK-DC-01',
      totalHeight: 42,
      status: RackStatus.ACTIVE,
    };
    const created = { id: 'rack-1', ...dto };
    mockNetworkService.createRack.mockResolvedValue(created);

    const result = await controller.createRack(dto);
    expect(mockNetworkService.createRack).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('getRackElevation calls networkService.getRackElevation with rack id', async () => {
    const elevation = { rackId: 'rack-1', totalHeight: 42, slots: [] };
    mockNetworkService.getRackElevation.mockResolvedValue(elevation);

    const result = await controller.getRackElevation('rack-1');
    expect(mockNetworkService.getRackElevation).toHaveBeenCalledWith('rack-1');
    expect(result).toBe(elevation);
  });

  it('findRack calls networkService.findRack with id', async () => {
    const rack = { id: 'rack-1', name: 'Core Datacenter Rack 01', code: 'RACK-DC-01' };
    mockNetworkService.findRack.mockResolvedValue(rack);

    const result = await controller.findRack('rack-1');
    expect(mockNetworkService.findRack).toHaveBeenCalledWith('rack-1');
    expect(result).toBe(rack);
  });

  it('updateRack calls networkService.updateRack with id and dto', async () => {
    const dto: UpdateRackDto = { name: 'Updated Rack Name' };
    const updated = { id: 'rack-1', name: 'Updated Rack Name' };
    mockNetworkService.updateRack.mockResolvedValue(updated);

    const result = await controller.updateRack('rack-1', dto);
    expect(mockNetworkService.updateRack).toHaveBeenCalledWith('rack-1', dto);
    expect(result).toBe(updated);
  });

  it('deleteRack calls networkService.deleteRack with id', async () => {
    mockNetworkService.deleteRack.mockResolvedValue({ id: 'rack-1' });

    const result = await controller.deleteRack('rack-1');
    expect(mockNetworkService.deleteRack).toHaveBeenCalledWith('rack-1');
    expect(result).toEqual({ id: 'rack-1' });
  });

  // ==========================================
  // SWITCH ENDPOINTS
  // ==========================================

  it('findAllSwitches calls networkService.findAllSwitches with query', async () => {
    const mockSwitches = [{ id: 'sw-1', name: 'BSL-CORE-SW01', vendor: 'Cisco Systems' }];
    mockNetworkService.findAllSwitches.mockResolvedValue(mockSwitches);

    const query: SwitchQueryDto = { search: 'CORE', role: 'CORE' };
    const result = await controller.findAllSwitches(query);
    expect(mockNetworkService.findAllSwitches).toHaveBeenCalledWith(query);
    expect(result).toBe(mockSwitches);
  });

  it('createSwitch calls networkService.createSwitch with CreateSwitchDto', async () => {
    const dto: CreateSwitchDto = {
      name: 'BSL-CORE-SW01',
      model: 'C9300-48P-A',
      vendor: 'Cisco Systems',
      role: SwitchRole.CORE,
      status: SwitchStatus.ONLINE,
      totalPorts: 48,
    };
    const created = { id: 'sw-1', ...dto };
    mockNetworkService.createSwitch.mockResolvedValue(created);

    const result = await controller.createSwitch(dto);
    expect(mockNetworkService.createSwitch).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('findSwitchPorts calls networkService.findSwitchPorts with id and query', async () => {
    const mockPorts = [{ id: 'port-1', portNumber: 1, name: 'Gi1/0/1' }];
    mockNetworkService.findSwitchPorts.mockResolvedValue(mockPorts);

    const query: SwitchPortQueryDto = { operStatus: 'ACTIVE' };
    const result = await controller.findSwitchPorts('sw-1', query);
    expect(mockNetworkService.findSwitchPorts).toHaveBeenCalledWith('sw-1', query);
    expect(result).toBe(mockPorts);
  });

  it('createPort calls networkService.createPort with switch id and dto', async () => {
    const dto: CreateSwitchPortDto = {
      switchId: 'sw-1',
      portNumber: 49,
      name: 'Te1/0/49',
    };
    const created = { id: 'port-49', ...dto };
    mockNetworkService.createPort.mockResolvedValue(created);

    const result = await controller.createPort('sw-1', dto);
    expect(mockNetworkService.createPort).toHaveBeenCalledWith('sw-1', dto);
    expect(result).toBe(created);
  });

  it('findSwitch calls networkService.findSwitch with id', async () => {
    const sw = { id: 'sw-1', name: 'BSL-CORE-SW01' };
    mockNetworkService.findSwitch.mockResolvedValue(sw);

    const result = await controller.findSwitch('sw-1');
    expect(mockNetworkService.findSwitch).toHaveBeenCalledWith('sw-1');
    expect(result).toBe(sw);
  });

  it('updateSwitch calls networkService.updateSwitch with id and dto', async () => {
    const dto: UpdateSwitchDto = { name: 'BSL-CORE-SW01-UPDATED' };
    const updated = { id: 'sw-1', name: 'BSL-CORE-SW01-UPDATED' };
    mockNetworkService.updateSwitch.mockResolvedValue(updated);

    const result = await controller.updateSwitch('sw-1', dto);
    expect(mockNetworkService.updateSwitch).toHaveBeenCalledWith('sw-1', dto);
    expect(result).toBe(updated);
  });

  it('deleteSwitch calls networkService.deleteSwitch with id', async () => {
    mockNetworkService.deleteSwitch.mockResolvedValue({ id: 'sw-1' });

    const result = await controller.deleteSwitch('sw-1');
    expect(mockNetworkService.deleteSwitch).toHaveBeenCalledWith('sw-1');
    expect(result).toEqual({ id: 'sw-1' });
  });

  // ==========================================
  // PORT ENDPOINTS
  // ==========================================

  it('findPort calls networkService.findPort with id', async () => {
    const port = { id: 'port-1', name: 'Gi1/0/1' };
    mockNetworkService.findPort.mockResolvedValue(port);

    const result = await controller.findPort('port-1');
    expect(mockNetworkService.findPort).toHaveBeenCalledWith('port-1');
    expect(result).toBe(port);
  });

  it('updatePort calls networkService.updatePort with id and dto', async () => {
    const dto: UpdateSwitchPortDto = { description: 'Updated port description' };
    const updated = { id: 'port-1', description: 'Updated port description' };
    mockNetworkService.updatePort.mockResolvedValue(updated);

    const result = await controller.updatePort('port-1', dto);
    expect(mockNetworkService.updatePort).toHaveBeenCalledWith('port-1', dto);
    expect(result).toBe(updated);
  });

  it('deletePort calls networkService.deletePort with id', async () => {
    mockNetworkService.deletePort.mockResolvedValue({ id: 'port-1' });

    const result = await controller.deletePort('port-1');
    expect(mockNetworkService.deletePort).toHaveBeenCalledWith('port-1');
    expect(result).toEqual({ id: 'port-1' });
  });
});
