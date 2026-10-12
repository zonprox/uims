import type { ConfigService } from '@nestjs/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../database/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockPrisma: Record<string, { findMany: ReturnType<typeof vi.fn> }>;
  let mockConfig: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      asset: { findMany: vi.fn().mockResolvedValue([]) },
      license: { findMany: vi.fn().mockResolvedValue([]) },
      inventoryItem: { findMany: vi.fn().mockResolvedValue([]) },
      networkSwitch: { findMany: vi.fn().mockResolvedValue([]) },
      subnet: { findMany: vi.fn().mockResolvedValue([]) },
      directoryUser: { findMany: vi.fn().mockResolvedValue([]) },
      appUser: { findMany: vi.fn().mockResolvedValue([]) },
    };

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === 'MEILISEARCH_HOST') return 'http://localhost:7700';
        if (key === 'MEILISEARCH_API_KEY') return 'test_key';
        return undefined;
      }),
    };

    service = new SearchService(
      mockPrisma as unknown as PrismaService,
      mockConfig as unknown as ConfigService,
    );
  });

  describe('searchDatabaseFallback', () => {
    it('should search across all 6 domains and format results with deep links', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'a1',
          name: 'ThinkPad T14',
          assetTag: 'AST-1005',
          manufacturer: 'Lenovo',
          model: 'T14 Gen 4',
          category: { name: 'Laptops' },
          status: 'IN_USE',
        },
      ]);
      mockPrisma.license.findMany.mockResolvedValue([
        {
          id: 'l1',
          name: 'Microsoft 365',
          vendor: 'Microsoft',
          totalSeats: 100,
          type: 'SUBSCRIPTION',
          status: 'ACTIVE',
        },
      ]);
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'i1',
          name: 'Logitech MX Master 3S',
          sku: 'LOGI-MX3S',
          quantity: 25,
          minThreshold: 5,
          category: { name: 'Peripherals' },
        },
      ]);
      mockPrisma.networkSwitch.findMany.mockResolvedValue([
        {
          id: 'sw1',
          name: 'Core Switch 01',
          model: 'Catalyst 9300',
          vendor: 'Cisco',
          totalPorts: 48,
          role: 'CORE',
          status: 'ONLINE',
        },
      ]);
      mockPrisma.subnet.findMany.mockResolvedValue([
        {
          id: 'sub1',
          name: 'HQ Floor 2',
          cidr: '10.10.20.0/24',
          gateway: '10.10.20.1',
          totalIps: 254,
        },
      ]);
      mockPrisma.directoryUser.findMany.mockResolvedValue([
        {
          id: 'u1',
          displayName: 'Sarah Chen',
          firstName: 'Sarah',
          lastName: 'Chen',
          email: 'sarah.chen@company.com',
          position: { title: 'Systems Admin' },
          department: { name: 'IT Infrastructure' },
          status: 'ACTIVE',
        },
      ]);
      mockPrisma.appUser.findMany.mockResolvedValue([
        {
          id: 'usr1',
          displayName: 'Admin User',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@company.com',
          role: { name: 'Super Admin' },
          status: 'ACTIVE',
        },
      ]);

      const response = await service.searchDatabaseFallback('test', 20);

      expect(response.query).toBe('test');
      expect(response.total).toBe(7);
      expect(response.results).toHaveLength(7);

      // 1. Hardware Asset formatting
      expect(response.results[0]).toEqual({
        id: 'a1',
        title: 'ThinkPad T14 (AST-1005)',
        subtitle: 'Lenovo T14 Gen 4 • Laptops',
        category: 'Hardware',
        path: '/assets?drawer=a1',
        status: 'IN_USE',
      });

      // 2. License formatting
      expect(response.results[1]).toEqual({
        id: 'l1',
        title: 'Microsoft 365 (Microsoft)',
        subtitle: '100 seats • SUBSCRIPTION',
        category: 'License',
        path: '/licenses?drawer=l1',
        status: 'ACTIVE',
      });

      // 3. Inventory formatting
      expect(response.results[2]).toEqual({
        id: 'i1',
        title: 'Logitech MX Master 3S (LOGI-MX3S)',
        subtitle: 'Qty: 25 • Peripherals',
        category: 'Inventory',
        path: '/inventory?sku=LOGI-MX3S',
        status: 'IN_STOCK',
      });

      // 4. Network Switch formatting
      expect(response.results[3]).toEqual({
        id: 'sw1',
        title: 'Core Switch 01 (Catalyst 9300)',
        subtitle: 'Cisco • 48 Ports • CORE',
        category: 'Network',
        path: '/network',
        status: 'ONLINE',
      });

      // 5. Subnet formatting
      expect(response.results[4]).toEqual({
        id: 'sub1',
        title: 'HQ Floor 2 (10.10.20.0/24)',
        subtitle: 'Gateway: 10.10.20.1 • 254 IPs',
        category: 'Network',
        path: '/network',
        status: 'ACTIVE',
      });

      // 6. Directory Employee formatting
      expect(response.results[5]).toEqual({
        id: 'u1',
        title: 'Sarah Chen',
        subtitle: 'sarah.chen@company.com • Systems Admin',
        category: 'Employee',
        path: '/directory?drawer=u1',
        status: 'ACTIVE',
      });

      // 7. Console App User formatting
      expect(response.results[6]).toEqual({
        id: 'usr1',
        title: 'Admin User',
        subtitle: 'admin@company.com • Super Admin',
        category: 'User',
        path: '/users?drawer=usr1',
        status: 'ACTIVE',
      });
    });

    it('should respect the limit parameter', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'a1',
          name: 'Asset 1',
          assetTag: 'AST-1',
          manufacturer: 'Dell',
          model: 'XPS',
          category: { name: 'Laptops' },
          status: 'ACTIVE',
        },
        {
          id: 'a2',
          name: 'Asset 2',
          assetTag: 'AST-2',
          manufacturer: 'Apple',
          model: 'MBP',
          category: { name: 'Laptops' },
          status: 'ACTIVE',
        },
      ]);

      const response = await service.searchDatabaseFallback('Asset', 1);
      expect(response.results).toHaveLength(1);
    });

    it('should query only the targeted domain when type filter is provided', async () => {
      mockPrisma.inventoryItem.findMany.mockResolvedValue([
        {
          id: 'i1',
          name: 'HDMI Cable',
          sku: 'CBL-HDMI',
          quantity: 2,
          minThreshold: 5,
          category: { name: 'Cables' },
        },
      ]);

      const response = await service.searchDatabaseFallback('HDMI', 10, 'inventory');
      expect(response.results).toHaveLength(1);
      expect(response.results[0].category).toBe('Inventory');
      expect(response.results[0].status).toBe('LOW_STOCK');

      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalled();
      expect(mockPrisma.asset.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.license.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.networkSwitch.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.directoryUser.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.appUser.findMany).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should return empty results for blank query', async () => {
      const response = await service.search({ q: '   ' });
      expect(response.total).toBe(0);
      expect(response.results).toEqual([]);
      expect(mockPrisma.asset.findMany).not.toHaveBeenCalled();
    });

    it('should fall back to database search when Meilisearch is not available', async () => {
      mockPrisma.asset.findMany.mockResolvedValue([
        {
          id: 'a1',
          name: 'Dell XPS 15',
          assetTag: 'AST-1001',
          manufacturer: 'Dell',
          model: 'XPS 15',
          category: { name: 'Laptops' },
          status: 'ACTIVE',
        },
      ]);

      const response = await service.search({ q: 'Dell' });
      expect(response.query).toBe('Dell');
      expect(response.total).toBe(1);
      expect(mockPrisma.asset.findMany).toHaveBeenCalled();
    });

    it('should clamp limit to between 1 and 50', async () => {
      await service.search({ q: 'test', limit: 100 });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );

      await service.search({ q: 'test', limit: -5 });
      expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
        }),
      );
    });
  });

  describe('configuration security and fail-fast', () => {
    it('should throw immediately if no API key is provided and getOrThrow throws', () => {
      const emptyConfig = {
        get: vi.fn(() => undefined),
        getOrThrow: vi.fn(() => {
          throw new Error('Config missing');
        }),
      };
      expect(() => {
        new SearchService(
          mockPrisma as unknown as PrismaService,
          emptyConfig as unknown as ConfigService,
        );
      }).toThrow();
    });
  });

  describe('syncAllToMeilisearch', () => {
    it('should process all 6 domains using cursor pagination in batches of 100', async () => {
      // Mock health check
      vi.spyOn(service, 'checkHealthAndInit').mockResolvedValue(true);
      (service as unknown as { isMeiliAvailable: boolean }).isMeiliAvailable = true;

      // 1. Assets: 101 items (batch1: 100, batch2: 1)
      const assetBatch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `a-${i}`,
        name: `Asset ${i}`,
        assetTag: `TAG-${i}`,
        serialNumber: `SN-${i}`,
        model: `Model-${i}`,
        manufacturer: 'Lenovo',
        status: 'IN_USE',
      }));
      const assetBatch2 = [
        {
          id: 'a-100',
          name: 'Asset 100',
          assetTag: 'TAG-100',
          serialNumber: 'SN-100',
          model: 'Model-100',
          manufacturer: 'Lenovo',
          status: 'IN_USE',
        },
      ];
      mockPrisma.asset.findMany
        .mockResolvedValueOnce(assetBatch1)
        .mockResolvedValueOnce(assetBatch2);

      // 2. Licenses
      mockPrisma.license.findMany.mockResolvedValueOnce([
        {
          id: 'lic-1',
          name: 'Office 365',
          vendor: 'Microsoft',
          type: 'SUBSCRIPTION',
          totalSeats: 50,
          status: 'ACTIVE',
        },
      ]);

      // 3. Inventory
      mockPrisma.inventoryItem.findMany.mockResolvedValueOnce([
        {
          id: 'inv-1',
          name: 'USB-C Adapter',
          sku: 'ADPT-USBC',
          quantity: 20,
          minThreshold: 5,
          supplier: 'Anker',
          binNumber: 'B-12',
        },
      ]);

      // 4. Network: 1 switch, 1 subnet
      mockPrisma.networkSwitch.findMany.mockResolvedValueOnce([
        {
          id: 'sw-1',
          name: 'Edge Switch 01',
          model: 'Catalyst 3850',
          vendor: 'Cisco',
          role: 'ACCESS',
          totalPorts: 24,
          status: 'ONLINE',
        },
      ]);
      mockPrisma.subnet.findMany.mockResolvedValueOnce([
        {
          id: 'sub-1',
          name: 'Servers VLAN 100',
          cidr: '192.168.100.0/24',
          gateway: '192.168.100.1',
          totalIps: 254,
        },
      ]);

      // 5. Employees
      mockPrisma.directoryUser.findMany.mockResolvedValueOnce([
        {
          id: 'user-1',
          displayName: 'Jane Doe',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@company.com',
          employeeCode: 'EMP-002',
          status: 'ACTIVE',
        },
      ]);

      // 6. Users
      mockPrisma.appUser.findMany.mockResolvedValueOnce([
        {
          id: 'app-user-1',
          username: 'janedoe',
          displayName: 'Jane Doe',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.admin@company.com',
          status: 'ACTIVE',
        },
      ]);

      // Mock fetch
      const globalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

      try {
        const res = await service.syncAllToMeilisearch();
        expect(res.success).toBe(true);
        expect(res.counts).toEqual({
          assets: 101,
          licenses: 1,
          inventory: 1,
          network: 2,
          employees: 1,
          users: 1,
        });

        // Verify cursor pagination calls on asset
        expect(mockPrisma.asset.findMany).toHaveBeenCalledTimes(2);
        expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
          1,
          expect.objectContaining({
            take: 100,
            skip: 0,
            orderBy: { id: 'asc' },
          }),
        );
        expect(mockPrisma.asset.findMany).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            take: 100,
            skip: 1,
            cursor: { id: 'a-99' },
            orderBy: { id: 'asc' },
          }),
        );

        // Verify calls to other domain models
        expect(mockPrisma.license.findMany).toHaveBeenCalled();
        expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalled();
        expect(mockPrisma.networkSwitch.findMany).toHaveBeenCalled();
        expect(mockPrisma.subnet.findMany).toHaveBeenCalled();
        expect(mockPrisma.directoryUser.findMany).toHaveBeenCalled();
        expect(mockPrisma.appUser.findMany).toHaveBeenCalled();
      } finally {
        global.fetch = globalFetch;
      }
    });
  });
});
