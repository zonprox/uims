import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateIpDto } from './dto/create-ip.dto';
import type { CreateSubnetDto } from './dto/create-subnet.dto';
import type { UpdateIpDto } from './dto/update-ip.dto';
import { NetworkController } from './network.controller';
import type { NetworkService } from './network.service';

describe('NetworkController', () => {
  let controller: NetworkController;
  let mockNetworkService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    mockNetworkService = {
      findAllIps: vi.fn(),
      findAllSubnets: vi.fn(),
      findAllDns: vi.fn(),
      getStats: vi.fn(),
      createIp: vi.fn(),
      updateIp: vi.fn(),
      deleteIp: vi.fn(),
      createSubnet: vi.fn(),
      pingIp: vi.fn(),
    };

    controller = new NetworkController(mockNetworkService as unknown as NetworkService);
  });

  it('should call findAllIps with query filters', async () => {
    const mockIps = [{ id: 'ip-1', address: '192.168.1.1', hostname: 'cisco-gw' }];
    mockNetworkService.findAllIps.mockResolvedValue(mockIps);

    const result = await controller.findAllIps({ search: 'cisco', status: 'ASSIGNED' });

    expect(mockNetworkService.findAllIps).toHaveBeenCalledWith({
      search: 'cisco',
      status: 'ASSIGNED',
    });
    expect(result).toBe(mockIps);
  });

  it('should call createIp with CreateIpDto', async () => {
    const dto: CreateIpDto = {
      ip: '192.168.1.25',
      hostname: 'srv-db-01.uims.lan',
      mac: '00:11:22:33:44:55',
      deviceType: 'Server',
      status: 'Allocated',
    };
    const created = { id: 'ip-2', ...dto };
    mockNetworkService.createIp.mockResolvedValue(created);

    const result = await controller.createIp(dto);

    expect(mockNetworkService.createIp).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('should call updateIp with id and UpdateIpDto', async () => {
    const dto: UpdateIpDto = {
      status: 'Reserved',
    };
    const updated = { id: 'ip-1', status: 'Reserved' };
    mockNetworkService.updateIp.mockResolvedValue(updated);

    const result = await controller.updateIp('ip-1', dto);

    expect(mockNetworkService.updateIp).toHaveBeenCalledWith('ip-1', dto);
    expect(result).toBe(updated);
  });

  it('should call deleteIp with id', async () => {
    mockNetworkService.deleteIp.mockResolvedValue({ success: true, id: 'ip-1' });

    const result = await controller.deleteIp('ip-1');

    expect(mockNetworkService.deleteIp).toHaveBeenCalledWith('ip-1');
    expect(result).toEqual({ success: true, id: 'ip-1' });
  });

  it('should call createSubnet with CreateSubnetDto', async () => {
    const dto: CreateSubnetDto = {
      cidr: '10.200.0.0/22',
      name: 'Wi-Fi AP Pool',
      gateway: '10.200.0.1',
      totalIps: 1022,
    };
    const created = { id: 'sub-1', ...dto };
    mockNetworkService.createSubnet.mockResolvedValue(created);

    const result = await controller.createSubnet(dto);

    expect(mockNetworkService.createSubnet).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('should call pingIp with target IP from body object', async () => {
    const pingResult = { ip: '192.168.1.1', status: 'online', latencyMs: 0.4 };
    mockNetworkService.pingIp.mockResolvedValue(pingResult);

    const result = await controller.pingIp({ ip: '192.168.1.1' });

    expect(mockNetworkService.pingIp).toHaveBeenCalledWith('192.168.1.1');
    expect(result).toBe(pingResult);
  });
});
