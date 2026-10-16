import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaService } from '../src/database/prisma.service';
import { NetworkService } from '../src/modules/network/network.service';

describe('Challenger M2-2: Switch Port Endpoints & Peer Connections', () => {
  let prisma: PrismaService;
  let networkService: NetworkService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    // Instantiating NetworkService with real PrismaService
    const mockAuditService = { logEvent: () => Promise.resolve() } as any;
    networkService = new NetworkService(prisma, mockAuditService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.onModuleDestroy();
    }
  });

  it('verifies seeded switch with trunk links returns connectedPort, peerPort, and connectedSwitch in findSwitchPorts', async () => {
    // Find a port that has a peer link in DB
    const peerLinkedPort = await prisma.switchPort.findFirst({
      where: {
        connectedPortId: { not: null },
      },
      include: {
        switch: true,
        connectedPort: { include: { switch: true } },
      },
    });

    expect(peerLinkedPort).toBeDefined();
    expect(peerLinkedPort?.connectedPortId).toBeTruthy();

    const switchId = peerLinkedPort!.switchId;
    const ports = await networkService.findSwitchPorts(switchId);

    expect(Array.isArray(ports)).toBe(true);
    expect(ports.length).toBeGreaterThan(0);

    const formattedTarget = ports.find((p) => p.id === peerLinkedPort!.id);
    expect(formattedTarget).toBeDefined();

    // 1. Check connectedPort
    expect(formattedTarget!.connectedPort).toBeDefined();
    expect(formattedTarget!.connectedPort).not.toBeNull();
    expect(formattedTarget!.connectedPort!.id).toBe(peerLinkedPort!.connectedPortId);
    expect(formattedTarget!.connectedPort!.name).toBe(peerLinkedPort!.connectedPort!.name);
    expect(formattedTarget!.connectedPort!.portNumber).toBe(
      peerLinkedPort!.connectedPort!.portNumber,
    );
    expect(formattedTarget!.connectedPort!.switch).toBeDefined();
    expect(formattedTarget!.connectedPort!.switch?.id).toBe(
      peerLinkedPort!.connectedPort!.switchId,
    );
    expect(formattedTarget!.connectedPort!.switch?.name).toBe(
      peerLinkedPort!.connectedPort!.switch.name,
    );

    // 2. Check peerPort
    expect(formattedTarget!.peerPort).toBeDefined();
    expect(formattedTarget!.peerPort).not.toBeNull();
    expect(formattedTarget!.peerPort!.id).toBe(peerLinkedPort!.connectedPortId);
    expect(formattedTarget!.peerPort!.name).toBe(peerLinkedPort!.connectedPort!.name);
    expect(formattedTarget!.peerPort!.portNumber).toBe(peerLinkedPort!.connectedPort!.portNumber);
    expect(formattedTarget!.peerPort!.switch).toBeDefined();
    expect(formattedTarget!.peerPort!.switch?.name).toBe(
      peerLinkedPort!.connectedPort!.switch.name,
    );

    // 3. Check connectedSwitch
    expect(formattedTarget!.connectedSwitch).toBeDefined();
    expect(formattedTarget!.connectedSwitch).not.toBeNull();
    expect(formattedTarget!.connectedSwitch!.id).toBe(peerLinkedPort!.connectedPort!.switchId);
    expect(formattedTarget!.connectedSwitch!.name).toBe(peerLinkedPort!.connectedPort!.switch.name);
  });

  it('verifies findSwitch returns ports with connectedPort, peerPort, and connectedSwitch', async () => {
    const peerLinkedPort = await prisma.switchPort.findFirst({
      where: {
        connectedPortId: { not: null },
      },
      include: {
        switch: true,
        connectedPort: { include: { switch: true } },
      },
    });

    expect(peerLinkedPort).toBeDefined();
    const switchWithPorts = await networkService.findSwitch(peerLinkedPort!.switchId);

    expect(switchWithPorts.ports).toBeDefined();
    const targetPort = switchWithPorts.ports!.find((p) => p.id === peerLinkedPort!.id);
    expect(targetPort).toBeDefined();
    expect(targetPort!.connectedPort).toBeDefined();
    expect(targetPort!.connectedPort?.name).toBe(peerLinkedPort!.connectedPort!.name);
    expect(targetPort!.peerPort).toBeDefined();
    expect(targetPort!.peerPort?.name).toBe(peerLinkedPort!.connectedPort!.name);
    expect(targetPort!.connectedSwitch).toBeDefined();
    expect(targetPort!.connectedSwitch?.name).toBe(peerLinkedPort!.connectedPort!.switch.name);
  });

  it('verifies findPort returns connectedPort, peerPort, and connectedSwitch when port has peer connection', async () => {
    const peerLinkedPort = await prisma.switchPort.findFirst({
      where: {
        connectedPortId: { not: null },
      },
      include: {
        connectedPort: { include: { switch: true } },
      },
    });

    expect(peerLinkedPort).toBeDefined();

    const result = await networkService.findPort(peerLinkedPort!.id);

    // Verify connectedPort
    expect(result.connectedPort).toBeDefined();
    expect(result.connectedPort).not.toBeNull();
    expect(result.connectedPort!.id).toBe(peerLinkedPort!.connectedPortId);
    expect(result.connectedPort!.name).toBe(peerLinkedPort!.connectedPort!.name);
    expect(result.connectedPort!.switch).toBeDefined();
    expect(result.connectedPort!.switch?.name).toBe(peerLinkedPort!.connectedPort!.switch.name);

    // Verify peerPort
    expect(result.peerPort).toBeDefined();
    expect(result.peerPort).not.toBeNull();
    expect(result.peerPort!.id).toBe(peerLinkedPort!.connectedPortId);
    expect(result.peerPort!.name).toBe(peerLinkedPort!.connectedPort!.name);
    expect(result.peerPort!.switch?.name).toBe(peerLinkedPort!.connectedPort!.switch.name);

    // Verify connectedSwitch
    expect(result.connectedSwitch).toBeDefined();
    expect(result.connectedSwitch).not.toBeNull();
    expect(result.connectedSwitch!.id).toBe(peerLinkedPort!.connectedPort!.switchId);
    expect(result.connectedSwitch!.name).toBe(peerLinkedPort!.connectedPort!.switch.name);
  });

  it('empirically verifies zero PoE references in seeded switches and device models', async () => {
    // 1. Check all NetworkSwitch records
    const switches = await prisma.networkSwitch.findMany({
      where: {
        OR: [
          { name: { contains: 'poe', mode: 'insensitive' } },
          { model: { contains: 'poe', mode: 'insensitive' } },
          { notes: { contains: 'poe', mode: 'insensitive' } },
        ],
      },
    });
    expect(switches).toHaveLength(0);

    // 2. Check all DeviceModel records
    const allDeviceModels = await prisma.deviceModel.findMany();
    const poeDeviceModels = allDeviceModels.filter(
      (m) =>
        m.name.toLowerCase().includes('poe') ||
        m.modelCode.toLowerCase().includes('poe') ||
        JSON.stringify(m.specifications || {})
          .toLowerCase()
          .includes('poe'),
    );
    expect(poeDeviceModels).toHaveLength(0);

    // 3. Check all SwitchPort records
    const switchPorts = await prisma.switchPort.findMany({
      where: {
        OR: [
          { name: { contains: 'poe', mode: 'insensitive' } },
          { description: { contains: 'poe', mode: 'insensitive' } },
        ],
      },
    });
    expect(switchPorts).toHaveLength(0);

    // 4. Check all Subnet records
    const subnets = await prisma.subnet.findMany({
      where: {
        OR: [
          { name: { contains: 'poe', mode: 'insensitive' } },
          { description: { contains: 'poe', mode: 'insensitive' } },
        ],
      },
    });
    expect(subnets).toHaveLength(0);
  });

  it('verifies formatPort unit edge cases for connectedPort, peerPort, and connectedSwitch', () => {
    const formatPort = (networkService as any).formatPort.bind(networkService);

    // Case 1: connectedPort with switch, connectedSwitch is null (fallback test)
    const rawPortWithConnectedPort = {
      id: 'p1',
      switchId: 'sw1',
      portNumber: 1,
      name: 'Gi1/0/1',
      formFactor: 'RJ45_1G',
      adminStatus: 'UP',
      operStatus: 'ACTIVE',
      speed: '1 Gbps',
      duplex: 'FULL',
      vlanId: null,
      mode: 'TRUNK',
      taggedVlanIds: [10, 20],
      ipAddressId: null,
      connectedAssetId: null,
      connectedPortId: 'p2',
      connectedPort: {
        id: 'p2',
        name: 'Gi1/0/24',
        portNumber: 24,
        switchId: 'sw2',
        switch: {
          id: 'sw2',
          name: 'DIST-SW01',
          model: 'C9200L-24T',
        },
      },
      connectedSwitchId: null,
      connectedSwitch: null,
      description: 'Trunk to DIST',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const formatted1 = formatPort(rawPortWithConnectedPort);

    expect(formatted1.connectedPort).toEqual({
      id: 'p2',
      name: 'Gi1/0/24',
      portNumber: 24,
      switchId: 'sw2',
      switch: {
        id: 'sw2',
        name: 'DIST-SW01',
        model: 'C9200L-24T',
      },
    });

    expect(formatted1.peerPort).toEqual({
      id: 'p2',
      name: 'Gi1/0/24',
      portNumber: 24,
      switchId: 'sw2',
      switch: {
        id: 'sw2',
        name: 'DIST-SW01',
        model: 'C9200L-24T',
      },
    });

    // connectedSwitch should fallback to connectedPort.switch
    expect(formatted1.connectedSwitch).toEqual({
      id: 'sw2',
      name: 'DIST-SW01',
      model: 'C9200L-24T',
    });
    // connectedSwitchId should fallback to connectedPort.switchId
    expect(formatted1.connectedSwitchId).toBe('sw2');

    // Case 2: Explicit connectedSwitch present
    const rawPortWithExplicitConnectedSwitch = {
      ...rawPortWithConnectedPort,
      connectedSwitchId: 'sw3',
      connectedSwitch: {
        id: 'sw3',
        name: 'CORE-SW01',
        model: 'C9300-48T',
      },
    };

    const formatted2 = formatPort(rawPortWithExplicitConnectedSwitch);
    expect(formatted2.connectedSwitch).toEqual({
      id: 'sw3',
      name: 'CORE-SW01',
      model: 'C9300-48T',
    });
    expect(formatted2.connectedSwitchId).toBe('sw3');

    // Case 3: No peer connection
    const rawPortNoPeer = {
      id: 'p3',
      switchId: 'sw1',
      portNumber: 2,
      name: 'Gi1/0/2',
      formFactor: 'RJ45_1G',
      adminStatus: 'UP',
      operStatus: 'DOWN',
      speed: '1 Gbps',
      duplex: 'FULL',
      vlanId: null,
      mode: 'ACCESS',
      taggedVlanIds: null,
      ipAddressId: null,
      connectedAssetId: null,
      connectedPortId: null,
      connectedPort: null,
      connectedSwitchId: null,
      connectedSwitch: null,
      description: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const formatted3 = formatPort(rawPortNoPeer);
    expect(formatted3.connectedPort).toBeNull();
    expect(formatted3.peerPort).toBeNull();
    expect(formatted3.connectedSwitch).toBeNull();
    expect(formatted3.connectedPortId).toBeNull();
    expect(formatted3.connectedSwitchId).toBeNull();
  });
});
