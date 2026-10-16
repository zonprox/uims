/**
 * Milestone 8 Adversarial Patching & Transaction Integrity Specification Suite
 * Target: apps/api/test/challenger-m8-2-adversarial-patching.spec.ts
 *
 * Empirical challenger tests verifying:
 * a. Self-loop payload (sourcePortId === targetPortId) throws BadRequestException
 * b. Same-switch trunk payload (sourcePort.switchId === targetPort.switchId) throws BadRequestException
 * c. Stale reverse link eviction: port C -> port A, then connect port A -> port B (no P2002, clean eviction)
 * d. Endpoint asset collision: port A -> asset X, then port B -> asset X (port A evicted, port B attached)
 * e. Unpatch symmetry: delete link on port A, confirm port B is also disconnected
 * f. resetPortConfig: true: confirm port mode is reset to ACCESS, vlan disconnected
 * g. Layout batch > 500 items rejected via validation
 * h. Structured audit logs emitted for CABLE_PATCH_CONNECTED and CABLE_PATCH_DISCONNECTED
 */

import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateTopologyLinkDto } from '../src/modules/network/dto/create-topology-link.dto';
import { UpdateTopologyLayoutDto } from '../src/modules/network/dto/update-topology-layout.dto';
import { NetworkService } from '../src/modules/network/network.service';

describe('Challenger M8-2: Adversarial Patching & Transaction Integrity Suite', () => {
  let service: NetworkService;
  let mockAuditService: {
    logEvent: ReturnType<typeof vi.fn>;
  };
  let mockPrisma: {
    switchPort: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    asset: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    iPAddress: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    canvasNodePosition: {
      findMany: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    networkSwitch: {
      updateMany: ReturnType<typeof vi.fn>;
    };
    networkRack: {
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockPrisma = {
      switchPort: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      asset: {
        findUnique: vi.fn(),
      },
      iPAddress: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      canvasNodePosition: {
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({}),
      },
      networkSwitch: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      networkRack: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: vi.fn(async (cbOrPromises) => {
        if (typeof cbOrPromises === 'function') {
          return cbOrPromises(mockPrisma);
        }
        return Promise.all(cbOrPromises);
      }),
    };

    mockAuditService = {
      logEvent: vi.fn().mockResolvedValue({}),
    };

    service = new NetworkService(
      mockPrisma as unknown as import('../src/database/prisma.service').PrismaService,
      mockAuditService as unknown as import('../src/modules/audit/audit.service').AuditService,
    );
  });

  // =========================================================================
  // a. Self-loop payload (sourcePortId === targetPortId) throws BadRequestException
  // =========================================================================
  it('a. Rejects self-loop payload where sourcePortId === targetPortId with BadRequestException', async () => {
    mockPrisma.switchPort.findUnique.mockResolvedValueOnce({
      id: 'port-self',
      switchId: 'sw-1',
      switch: { id: 'sw-1', name: 'Switch-1' },
    });

    await expect(
      service.createTopologyLink({
        sourcePortId: 'port-self',
        targetPortId: 'port-self',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // b. Same-switch trunk payload (sourcePort.switchId === targetPort.switchId) throws BadRequestException
  // =========================================================================
  it('b. Rejects same-switch trunk uplink where ports belong to the same switch with BadRequestException', async () => {
    mockPrisma.switchPort.findUnique
      .mockResolvedValueOnce({
        id: 'port-1',
        switchId: 'sw-core',
        switch: { id: 'sw-core', name: 'BSL-CORE-SW01' },
      })
      .mockResolvedValueOnce({
        id: 'port-2',
        switchId: 'sw-core',
        switch: { id: 'sw-core', name: 'BSL-CORE-SW01' },
      });

    await expect(
      service.createTopologyLink({
        sourcePortId: 'port-1',
        targetPortId: 'port-2',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // =========================================================================
  // c. Stale reverse link eviction: port C -> port A, then port A -> port B
  // =========================================================================
  it('c. Cleanly evicts stale reverse links pointing to target ports to prevent P2002 unique constraint violations', async () => {
    const portA = {
      id: 'port-A',
      switchId: 'sw-1',
      switch: { id: 'sw-1', name: 'SW-1' },
      connectedPortId: null,
    };
    const portB = {
      id: 'port-B',
      switchId: 'sw-2',
      switch: { id: 'sw-2', name: 'SW-2' },
      connectedPortId: null,
    };

    mockPrisma.switchPort.findUnique.mockResolvedValueOnce(portA).mockResolvedValueOnce(portB);

    mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.switchPort.update
      .mockResolvedValueOnce({ ...portA, connectedPortId: 'port-B', mode: 'TRUNK' })
      .mockResolvedValueOnce({ ...portB, connectedPortId: 'port-A', mode: 'TRUNK' });

    const result = await service.createTopologyLink({
      sourcePortId: 'port-A',
      targetPortId: 'port-B',
      mode: 'TRUNK' as unknown as import('@uims/shared-types').PortMode,
    });

    expect(result.success).toBe(true);

    // Verify reverse link eviction updateMany call
    expect(mockPrisma.switchPort.updateMany).toHaveBeenCalledWith({
      where: {
        connectedPortId: { in: ['port-A', 'port-B'] },
        id: { notIn: ['port-A', 'port-B'] },
      },
      data: { connectedPortId: null, connectedSwitchId: null, operStatus: 'DOWN' },
    });
  });

  // =========================================================================
  // d. Endpoint asset collision: port A -> asset X, then port B -> asset X
  // =========================================================================
  it('d. Enforces single custody on endpoint asset by evicting stale port attachments', async () => {
    const portB = {
      id: 'port-B',
      switchId: 'sw-2',
      switch: { id: 'sw-2', name: 'SW-2' },
    };
    const assetX = { id: 'asset-X', assetTag: 'AST-CAM-015' };

    mockPrisma.switchPort.findUnique.mockResolvedValueOnce(portB);
    mockPrisma.asset.findUnique.mockResolvedValueOnce(assetX);
    mockPrisma.iPAddress.findFirst.mockResolvedValueOnce(null);
    mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.switchPort.update.mockResolvedValueOnce({
      id: 'port-B',
      connectedAssetId: 'asset-X',
      mode: 'ACCESS',
      operStatus: 'ACTIVE',
    });

    await service.createTopologyLink({
      sourcePortId: 'port-B',
      targetAssetId: 'asset-X',
    });

    // Verify eviction of any other port attached to asset-X
    expect(mockPrisma.switchPort.updateMany).toHaveBeenCalledWith({
      where: {
        connectedAssetId: 'asset-X',
        id: { not: 'port-B' },
      },
      data: { connectedAssetId: null, operStatus: 'DOWN' },
    });
  });

  // =========================================================================
  // e. Unpatch symmetry: delete link on port A, confirm port B is also disconnected
  // =========================================================================
  it('e. Guarantees unpatch symmetry: breaking link on port A atomically clears connected peer port B', async () => {
    const portA = {
      id: 'port-A',
      connectedPortId: 'port-B',
      switchId: 'sw-1',
      switch: { id: 'sw-1', name: 'SW-1' },
    };

    mockPrisma.switchPort.findUnique.mockResolvedValueOnce(portA);
    mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.switchPort.update.mockResolvedValue({});

    const result = await service.deleteTopologyLink('port-A');
    expect(result.success).toBe(true);

    // Verify peer port B update
    expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'port-B' },
        data: expect.objectContaining({
          connectedPortId: null,
          connectedSwitchId: null,
          operStatus: 'DOWN',
        }),
      }),
    );

    // Verify subject port A update
    expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'port-A' },
        data: expect.objectContaining({
          connectedPortId: null,
          connectedSwitchId: null,
          operStatus: 'DOWN',
        }),
      }),
    );
  });

  // =========================================================================
  // f. resetPortConfig: true: confirm port mode is reset to ACCESS, vlan disconnected
  // =========================================================================
  it('f. [CHALLENGE] deleteTopologyLink resets port mode to ACCESS and disconnects VLAN when resetPortConfig is requested', async () => {
    const portA = {
      id: 'port-A',
      mode: 'TRUNK',
      vlanId: 'vlan-100',
      connectedPortId: 'port-B',
      switchId: 'sw-1',
      switch: { id: 'sw-1', name: 'SW-1' },
    };

    mockPrisma.switchPort.findUnique.mockResolvedValueOnce(portA);
    mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.switchPort.update.mockResolvedValue({});

    // Attempt to invoke with resetPortConfig: true
    // Note: If service does not accept or implement query/resetPortConfig, this will fail or ignore config reset
    const serviceWithQuery = service as unknown as {
      deleteTopologyLink: (
        portId: string,
        query?: { resetPortConfig?: boolean },
      ) => Promise<unknown>;
    };

    await serviceWithQuery.deleteTopologyLink('port-A', { resetPortConfig: true });

    // Assert that port A update payload contained mode: 'ACCESS', vlanId: null
    expect(mockPrisma.switchPort.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'port-A' },
        data: expect.objectContaining({
          mode: 'ACCESS',
          vlanId: null,
        }),
      }),
    );
  });

  // =========================================================================
  // g. Layout batch > 500 items rejected
  // =========================================================================
  it('g1. Rejects UpdateTopologyLayoutDto when positions batch exceeds 500 items', async () => {
    const positions501 = Array.from({ length: 501 }, (_, i) => ({
      nodeId: `node-${i}`,
      nodeType: 'SWITCH',
      x: i,
      y: i,
    }));

    const dto = plainToInstance(UpdateTopologyLayoutDto, {
      viewMode: 'ALL',
      positions: positions501,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const posError = errors.find((e) => e.property === 'positions');
    expect(posError).toBeDefined();
    expect(posError?.constraints).toHaveProperty('arrayMaxSize');
  });

  it('g2. Accepts UpdateTopologyLayoutDto when positions batch is <= 500 items', async () => {
    const positions500 = Array.from({ length: 500 }, (_, i) => ({
      nodeId: `node-${i}`,
      nodeType: 'SWITCH',
      x: i,
      y: i,
    }));

    const dto = plainToInstance(UpdateTopologyLayoutDto, {
      viewMode: 'ALL',
      positions: positions500,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  // =========================================================================
  // h. Structured audit logs emitted for CABLE_PATCH_CONNECTED and CABLE_PATCH_DISCONNECTED
  // =========================================================================
  it('h. Records structured audit logs for both CABLE_PATCH_CONNECTED and CABLE_PATCH_DISCONNECTED', async () => {
    const portA = {
      id: 'port-A',
      switchId: 'sw-1',
      switch: { id: 'sw-1', name: 'SW-1' },
      connectedPortId: null,
    };
    const portB = {
      id: 'port-B',
      switchId: 'sw-2',
      switch: { id: 'sw-2', name: 'SW-2' },
      connectedPortId: null,
    };

    mockPrisma.switchPort.findUnique.mockResolvedValueOnce(portA).mockResolvedValueOnce(portB);

    mockPrisma.switchPort.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.switchPort.update
      .mockResolvedValueOnce({ ...portA, connectedPortId: 'port-B', mode: 'TRUNK' })
      .mockResolvedValueOnce({ ...portB, connectedPortId: 'port-A', mode: 'TRUNK' });

    // Connect
    await service.createTopologyLink({
      sourcePortId: 'port-A',
      targetPortId: 'port-B',
    });

    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CABLE_PATCH_CONNECTED',
        entity: 'SwitchPort',
        entityId: 'port-A',
      }),
    );

    // Disconnect
    mockPrisma.switchPort.findUnique.mockResolvedValueOnce({
      ...portA,
      connectedPortId: 'port-B',
    });

    await service.deleteTopologyLink('port-A');

    expect(mockAuditService.logEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CABLE_PATCH_DISCONNECTED',
        entity: 'SwitchPort',
        entityId: 'port-A',
      }),
    );
  });
});
