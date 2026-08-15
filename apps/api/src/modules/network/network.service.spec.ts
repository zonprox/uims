import { IPStatus } from '@uims/shared-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkService } from './network.service';

describe('NetworkService', () => {
  let service: NetworkService;
  let mockPrisma: {
    iPAddress: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    subnet: {
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrisma = {
      iPAddress: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      subnet: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
    };

    service = new NetworkService(
      mockPrisma as unknown as import('../../database/prisma.service').PrismaService,
    );
  });

  describe('createIp', () => {
    it('should create an IP address record with normalized status', async () => {
      mockPrisma.iPAddress.create.mockResolvedValue({
        id: 'ip-1',
        address: '192.168.1.50',
        hostname: 'core-router-01',
        macAddress: '00:1A:2B:3C:4D:5E',
        status: IPStatus.ASSIGNED,
        subnetName: '192.168.1.0/24',
        vlanName: 'VLAN 10',
        deviceType: 'Router',
      });

      const ip = await service.createIp({
        address: '192.168.1.50',
        hostname: 'core-router-01',
        mac: '00:1A:2B:3C:4D:5E',
        status: 'Allocated',
        subnet: '192.168.1.0/24',
        vlan: 'VLAN 10',
        deviceType: 'Router',
      });

      expect(ip.id).toBe('ip-1');
      expect(ip.status).toBe('Allocated');
    });
  });

  describe('getStats', () => {
    it('should calculate subnet capacity and IP usage correctly', async () => {
      mockPrisma.subnet.count.mockResolvedValue(2);
      mockPrisma.subnet.aggregate.mockResolvedValue({
        _sum: { totalIps: 508 },
      });
      mockPrisma.iPAddress.count
        .mockResolvedValueOnce(2) // allocated
        .mockResolvedValueOnce(1); // reserved

      const stats = await service.getStats();

      expect(stats.managedSubnets).toBe(2);
      expect(stats.allocatedStaticIps).toBe(2);
      expect(stats.reservedDhcpLeases).toBe(1);
      expect(stats.freeIpCapacity).toBe(508 - 3); // 505
    });
  });
});
