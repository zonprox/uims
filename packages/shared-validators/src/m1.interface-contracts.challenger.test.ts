import { describe, expect, it } from 'vitest';
import {
  SwitchRole,
  type SwitchPort,
  type TopologyEdge,
  type NetworkSwitch,
} from '@uims/shared-types';
import {
  createSwitchPortSchema,
  updateSwitchPortSchema,
  patchCableLinkSchema,
} from './network.validator';

type ActualTopologyEdgeType = NonNullable<TopologyEdge['linkType']>;
const _testEdgeType: ActualTopologyEdgeType = 'UPLINK';

describe('Milestone 1 — Interface Contracts & PoE Purge Adversarial Challenger', () => {
  // 1. SwitchPort Interface Verification
  describe('SwitchPort Interface Contract', () => {
    it('supports connectedSwitchId and connectedSwitch with correct types', () => {
      const mockSwitch: NetworkSwitch = {
        id: 'switch-core-01',
        name: 'Core-SW-01',
        model: 'Catalyst 9500',
        vendor: 'Cisco',
        role: SwitchRole.CORE,
        status: 'ONLINE' as any,
        totalPorts: 48,
        rackHeight: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const port: SwitchPort = {
        id: 'port-01',
        switchId: 'switch-acc-01',
        portNumber: 1,
        name: 'Gi1/0/1',
        formFactor: 'RJ45_1G' as any,
        adminStatus: 'UP' as any,
        operStatus: 'ACTIVE' as any,
        mode: 'ACCESS' as any,
        connectedSwitchId: 'switch-core-01',
        connectedSwitch: mockSwitch,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(port.connectedSwitchId).toBe('switch-core-01');
      expect(port.connectedSwitch?.name).toBe('Core-SW-01');
    });

    it('allows connectedSwitchId and connectedSwitch to be null or undefined', () => {
      const portNull: SwitchPort = {
        id: 'port-02',
        switchId: 'switch-acc-01',
        portNumber: 2,
        name: 'Gi1/0/2',
        formFactor: 'RJ45_1G' as any,
        adminStatus: 'UP' as any,
        operStatus: 'ACTIVE' as any,
        mode: 'ACCESS' as any,
        connectedSwitchId: null,
        connectedSwitch: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(portNull.connectedSwitchId).toBeNull();
      expect(portNull.connectedSwitch).toBeNull();
    });

    it('confirms poeEnabled is completely absent from SwitchPort type definition', () => {
      // Test that TypeScript type definition does NOT have poeEnabled
      type HasPoeEnabled<T> = 'poeEnabled' extends keyof T ? true : false;
      type Check = HasPoeEnabled<SwitchPort>;
      const hasPoe: Check = false;
      expect(hasPoe).toBe(false);
    });
  });

  // 2. SwitchRole Enum Verification
  describe('SwitchRole Enum Contract', () => {
    it('has exactly CORE, DISTRIBUTION, ACCESS, TOR', () => {
      const expectedRoles = ['CORE', 'DISTRIBUTION', 'ACCESS', 'TOR'];
      const actualKeys = Object.keys(SwitchRole);
      const actualValues = Object.values(SwitchRole);

      expect(actualValues).toHaveLength(4);
      expect(actualValues.sort()).toEqual(expectedRoles.sort());
      expect(SwitchRole.CORE).toBe('CORE');
      expect(SwitchRole.DISTRIBUTION).toBe('DISTRIBUTION');
      expect(SwitchRole.ACCESS).toBe('ACCESS');
      expect(SwitchRole.TOR).toBe('TOR');
    });

    it('does NOT contain POE_ACCESS or any other role', () => {
      expect('POE_ACCESS' in SwitchRole).toBe(false);
      expect((SwitchRole as Record<string, string>)['POE_ACCESS']).toBeUndefined();
    });
  });

  // 3. TopologyEdge Contract Verification
  describe('TopologyEdge Link Contract', () => {
    it('has sourcePortName, targetPortName, sourcePortId, targetPortId fields', () => {
      type HasSourcePortName<T> = 'sourcePortName' extends keyof T ? true : false;
      type HasTargetPortName<T> = 'targetPortName' extends keyof T ? true : false;
      type HasSourcePortId<T> = 'sourcePortId' extends keyof T ? true : false;
      type HasTargetPortId<T> = 'targetPortId' extends keyof T ? true : false;

      const hasSourcePortName: HasSourcePortName<TopologyEdge> = true;
      const hasTargetPortName: HasTargetPortName<TopologyEdge> = true;
      const hasSourcePortId: HasSourcePortId<TopologyEdge> = true;
      const hasTargetPortId: HasTargetPortId<TopologyEdge> = true;

      expect(hasSourcePortName).toBe(true);
      expect(hasTargetPortName).toBe(true);
      expect(hasSourcePortId).toBe(true);
      expect(hasTargetPortId).toBe(true);

      const edge: TopologyEdge = {
        id: 'edge-01',
        source: 'node-sw-01',
        target: 'node-sw-02',
        sourceNodeId: 'node-sw-01',
        targetNodeId: 'node-sw-02',
        sourcePortId: 'port-sw1-49',
        sourcePortName: 'Te1/0/49',
        targetPortId: 'port-sw2-1',
        targetPortName: 'Te1/0/1',
        domain: 'NETWORK' as any,
        status: 'ACTIVE' as any,
        linkType: 'UPLINK',
      };

      expect(edge.sourcePortName).toBe('Te1/0/49');
      expect(edge.targetPortName).toBe('Te1/0/1');
      expect(edge.sourcePortId).toBe('port-sw1-49');
      expect(edge.targetPortId).toBe('port-sw2-1');
      expect(edge.linkType).toBe('UPLINK');
    });

    it('only permits UPLINK | DOWNLINK | ENDPOINT | TRUNK for linkType', () => {
      type PermittedLinkTypes = NonNullable<TopologyEdge['linkType']>;
      type IsPoeAllowed = 'POE' extends PermittedLinkTypes ? true : false;
      const isPoeAllowed: IsPoeAllowed = false;
      expect(isPoeAllowed).toBe(false);

      const validLinkTypes: PermittedLinkTypes[] = ['UPLINK', 'DOWNLINK', 'ENDPOINT', 'TRUNK'];
      expect(validLinkTypes).toHaveLength(4);
    });

    it('confirms poeEnabled and poeDelivering are purged from TopologyEdge', () => {
      type HasPoeEnabled<T> = 'poeEnabled' extends keyof T ? true : false;
      type HasPoeDelivering<T> = 'poeDelivering' extends keyof T ? true : false;

      const hasPoeEnabled: HasPoeEnabled<TopologyEdge> = false;
      const hasPoeDelivering: HasPoeDelivering<TopologyEdge> = false;

      expect(hasPoeEnabled).toBe(false);
      expect(hasPoeDelivering).toBe(false);
    });
  });

  // 4. Runtime Schemas Verification (PoE Purged)
  describe('Runtime Schemas Verification', () => {
    it('createSwitchPortSchema does not contain or require poeEnabled', () => {
      expect('poeEnabled' in createSwitchPortSchema.shape).toBe(false);

      const parsed = createSwitchPortSchema.safeParse({
        switchId: '123e4567-e89b-12d3-a456-426614174000',
        portNumber: 1,
        name: 'Gi1/0/1',
        formFactor: 'RJ45_1G',
        mode: 'ACCESS',
      });
      expect(parsed.success).toBe(true);
    });

    it('updateSwitchPortSchema does not contain poeEnabled', () => {
      expect('poeEnabled' in updateSwitchPortSchema.shape).toBe(false);
    });

    it('patchCableLinkSchema does not contain poeDelivering', () => {
      expect('poeDelivering' in patchCableLinkSchema.shape).toBe(false);
    });
  });
});
