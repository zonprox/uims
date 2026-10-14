import {
  IPStatus,
  InfrastructureDomain,
  LinkMediumType,
  PortAdminStatus,
  PortFormFactor,
  PortMode,
  PortOperStatus,
  PortRole,
  RackStatus,
  SwitchRole,
  SwitchStatus,
  TopologyNodeType,
  TopologyViewMode,
  VlanStatus,
} from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  autoDetectQuerySchema,
  calculateSubnetQuerySchema,
  canvasNodePositionItemSchema,
  createIpAddressSchema,
  createRackSchema,
  createSubnetSchema,
  createSwitchPortSchema,
  createSwitchSchema,
  createTopologyLinkSchema,
  createVlanSchema,
  infrastructureDomainSchema,
  ipAddressQuerySchema,
  linkMediumTypeSchema,
  macVendorQuerySchema,
  patchCableLinkSchema,
  portRoleSchema,
  rackQuerySchema,
  subnetQuerySchema,
  switchPortQuerySchema,
  switchQuerySchema,
  topologyNodeTypeSchema,
  topologyQuerySchema,
  topologyViewModeSchema,
  unpatchCableLinkSchema,
  updateCanvasLayoutSchema,
  updateIpAddressSchema,
  updateRackSchema,
  updateSubnetSchema,
  updateSwitchPortSchema,
  updateSwitchSchema,
  updateTopologyLayoutSchema,
  updateVlanSchema,
  vlanQuerySchema,
} from './network.validator';


describe('network.validator', () => {
  describe('createVlanSchema', () => {
    it('validates a correct VLAN input', () => {
      const valid = {
        vlanNumber: 130,
        name: 'Access Control',
        description: 'VLAN for door access and fingerprint readers',
        status: VlanStatus.ACTIVE,
      };
      const result = createVlanSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid VLAN number', () => {
      expect(createVlanSchema.safeParse({ vlanNumber: 0, name: 'VLAN 0' }).success).toBe(false);
      expect(createVlanSchema.safeParse({ vlanNumber: 5000, name: 'VLAN 5000' }).success).toBe(
        false,
      );
    });

    it('rejects missing VLAN name', () => {
      expect(createVlanSchema.safeParse({ vlanNumber: 100, name: '' }).success).toBe(false);
    });
  });

  describe('updateVlanSchema', () => {
    it('allows partial updates', () => {
      const result = updateVlanSchema.safeParse({ name: 'Renamed VLAN' });
      expect(result.success).toBe(true);
    });
  });

  describe('vlanQuerySchema', () => {
    it('coerces numeric page and limit', () => {
      const result = vlanQuerySchema.safeParse({ page: '2', limit: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(25);
      }
    });
  });

  describe('createSubnetSchema', () => {
    it('validates valid CIDR and name', () => {
      const valid = {
        cidr: '10.232.130.0/24',
        name: 'BSL Access Control Subnet',
        gateway: '10.232.130.254',
      };
      const result = createSubnetSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects malformed CIDR', () => {
      expect(
        createSubnetSchema.safeParse({ cidr: '10.232.130.0/35', name: 'Bad CIDR' }).success,
      ).toBe(false);
      expect(createSubnetSchema.safeParse({ cidr: 'invalid-cidr', name: 'Bad CIDR' }).success).toBe(
        false,
      );
    });

    it('rejects invalid gateway address', () => {
      expect(
        createSubnetSchema.safeParse({
          cidr: '10.232.130.0/24',
          name: 'Subnet',
          gateway: '999.999.999.999',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateSubnetSchema', () => {
    it('allows partial subnet updates', () => {
      const result = updateSubnetSchema.safeParse({ gateway: '10.232.130.1' });
      expect(result.success).toBe(true);
    });
  });

  describe('createIpAddressSchema', () => {
    it('validates a complete IP record', () => {
      const valid = {
        address: '10.232.130.15',
        macAddress: '00:1A:2B:3C:4D:5E',
        vendor: 'Cisco',
        status: IPStatus.ASSIGNED,
        deviceType: 'Access Control',
      };
      const result = createIpAddressSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid IP address', () => {
      expect(createIpAddressSchema.safeParse({ address: 'not-an-ip' }).success).toBe(false);
    });
  });

  describe('automation query schemas', () => {
    it('validates calculateSubnetQuerySchema', () => {
      expect(calculateSubnetQuerySchema.safeParse({ cidr: '192.168.1.0/24' }).success).toBe(true);
      expect(calculateSubnetQuerySchema.safeParse({ cidr: '192.168.1.0' }).success).toBe(false);
    });

    it('validates autoDetectQuerySchema', () => {
      expect(autoDetectQuerySchema.safeParse({ ip: '10.232.130.15' }).success).toBe(true);
      expect(autoDetectQuerySchema.safeParse({ ip: 'invalid' }).success).toBe(false);
    });

    it('validates macVendorQuerySchema', () => {
      expect(macVendorQuerySchema.safeParse({ mac: '44:19:B6' }).success).toBe(true);
      expect(macVendorQuerySchema.safeParse({ mac: '12' }).success).toBe(false);
    });
  });

  describe('createRackSchema', () => {
    it('validates a correct Rack payload', () => {
      const valid = {
        name: 'Datacenter Rack 01',
        code: 'RACK-DC-01',
        depth: 1070,
        width: 600,
        maxPowerKw: 10,
        maxWeightKg: 1200,
        status: RackStatus.ACTIVE,
        notes: 'Main server and network cabinet',
      };
      const result = createRackSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects missing name or code', () => {
      expect(createRackSchema.safeParse({ name: '', code: 'RACK-01' }).success).toBe(false);
      expect(createRackSchema.safeParse({ name: 'Rack 01', code: '' }).success).toBe(false);
    });
  });

  describe('updateRackSchema', () => {
    it('allows partial updates to rack fields', () => {
      const result = updateRackSchema.safeParse({
        maxPowerKw: 12.5,
        status: RackStatus.MAINTENANCE,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('rackQuerySchema', () => {
    it('coerces numeric page and limit parameters', () => {
      const result = rackQuerySchema.safeParse({ page: '1', pageSize: '20', search: 'DC-01' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
        expect(result.data.search).toBe('DC-01');
      }
    });
  });

  describe('createSwitchSchema', () => {
    it('validates a complete NetworkSwitch payload', () => {
      const valid = {
        name: 'BSL-CORE-SW01',
        model: 'Catalyst 9300-48P',
        vendor: 'Cisco',
        serialNumber: 'FOC2345ABCD',
        macAddress: '00:1A:2B:3C:4D:5E',
        role: SwitchRole.CORE,
        status: SwitchStatus.ONLINE,
        totalPorts: 48,
        rackPosition: 39,
        rackHeight: 1,
      };
      const result = createSwitchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('validates switch configurations with even totalPorts in [2, 48]', () => {
      const base = {
        name: 'Edge Switch',
        model: 'Catalyst 1000',
        vendor: 'Cisco',
      };
      for (const ports of [2, 4, 8, 12, 16, 20, 24, 32, 48]) {
        expect(createSwitchSchema.safeParse({ ...base, totalPorts: ports }).success).toBe(true);
      }
    });

    it('rejects odd totalPorts with explicit message', () => {
      const base = {
        name: 'Edge Switch',
        model: 'Catalyst 1000',
        vendor: 'Cisco',
      };
      for (const oddPorts of [1, 3, 7, 23, 25, 47, 49]) {
        const result = createSwitchSchema.safeParse({ ...base, totalPorts: oddPorts });
        expect(result.success).toBe(false);
        if (!result.success) {
          const messages = result.error.issues.map((i) => i.message);
          expect(
            messages.includes('Total ports must be an even number') ||
              messages.some((m) => m.includes('Total ports')),
          ).toBe(true);
        }
      }
    });

    it('validates uplinkPorts and fiberPorts bounds (0..8)', () => {
      const base = {
        name: 'Edge Switch',
        model: 'Catalyst 1000',
        vendor: 'Cisco',
      };
      expect(createSwitchSchema.safeParse({ ...base, uplinkPorts: 0, fiberPorts: 0 }).success).toBe(
        true,
      );
      expect(createSwitchSchema.safeParse({ ...base, uplinkPorts: 4, fiberPorts: 4 }).success).toBe(
        true,
      );
      expect(createSwitchSchema.safeParse({ ...base, uplinkPorts: 8, fiberPorts: 8 }).success).toBe(
        true,
      );
      expect(createSwitchSchema.safeParse({ ...base, uplinkPorts: -1 }).success).toBe(false);
      expect(createSwitchSchema.safeParse({ ...base, uplinkPorts: 9 }).success).toBe(false);
      expect(createSwitchSchema.safeParse({ ...base, fiberPorts: -1 }).success).toBe(false);
      expect(createSwitchSchema.safeParse({ ...base, fiberPorts: 9 }).success).toBe(false);
    });

    it('validates updateSwitchSchema allows partial updates without requiring totalPorts', () => {
      expect(updateSwitchSchema.safeParse({ name: 'Renamed Switch' }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ totalPorts: 12 }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ totalPorts: 11 }).success).toBe(false);
      expect(updateSwitchSchema.safeParse({ uplinkPorts: 4 }).success).toBe(true);
      expect(updateSwitchSchema.safeParse({ uplinkPorts: 12 }).success).toBe(false);
    });

    it('rejects missing name, model, or vendor', () => {
      expect(
        createSwitchSchema.safeParse({ name: '', model: '9300', vendor: 'Cisco' }).success,
      ).toBe(false);
      expect(
        createSwitchSchema.safeParse({ name: 'Switch', model: '', vendor: 'Cisco' }).success,
      ).toBe(false);
      expect(
        createSwitchSchema.safeParse({ name: 'Switch', model: '9300', vendor: '' }).success,
      ).toBe(false);
    });

    it('rejects invalid MAC address format', () => {
      expect(
        createSwitchSchema.safeParse({
          name: 'SW',
          model: 'M',
          vendor: 'V',
          macAddress: 'not-a-mac',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateSwitchSchema', () => {
    it('allows partial switch updates', () => {
      const result = updateSwitchSchema.safeParse({
        status: SwitchStatus.MAINTENANCE,
        firmwareVersion: '17.9.4a',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('switchQuerySchema', () => {
    it('parses filter criteria', () => {
      const result = switchQuerySchema.safeParse({
        vendor: 'Cisco',
        role: SwitchRole.CORE,
        status: SwitchStatus.ONLINE,
        page: '1',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.vendor).toBe('Cisco');
        expect(result.data.page).toBe(1);
      }
    });
  });

  describe('createSwitchPortSchema', () => {
    it('validates a complete switch port payload', () => {
      const valid = {
        switchId: '123e4567-e89b-12d3-a456-426614174000',
        portNumber: 1,
        name: 'Gi1/0/1',
        formFactor: PortFormFactor.RJ45_1G,
        poeEnabled: true,
        adminStatus: PortAdminStatus.UP,
        operStatus: PortOperStatus.ACTIVE,
        speed: '1 Gbps',
        duplex: 'Full',
        mode: PortMode.ACCESS,
      };
      const result = createSwitchPortSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects invalid port number or missing name', () => {
      expect(
        createSwitchPortSchema.safeParse({
          switchId: '123e4567-e89b-12d3-a456-426614174000',
          portNumber: 0,
          name: 'Gi1/0/1',
        }).success,
      ).toBe(false);
      expect(
        createSwitchPortSchema.safeParse({
          switchId: '123e4567-e89b-12d3-a456-426614174000',
          portNumber: 1,
          name: '',
        }).success,
      ).toBe(false);
    });
  });

  describe('updateSwitchPortSchema', () => {
    it('allows updating port status and mode', () => {
      const result = updateSwitchPortSchema.safeParse({
        adminStatus: PortAdminStatus.DOWN,
        operStatus: PortOperStatus.DOWN,
        mode: PortMode.TRUNK,
        taggedVlanIds: [100, 110, 120],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('switchPortQuerySchema', () => {
    it('validates switch port query filters', () => {
      const result = switchPortQuerySchema.safeParse({
        switchId: '123e4567-e89b-12d3-a456-426614174000',
        operStatus: PortOperStatus.ACTIVE,
        page: '1',
        pageSize: '48',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageSize).toBe(48);
      }
    });
  });

  describe('Strict boundaries and Physical Location purge verifications', () => {
    it('confirms complete Physical Location purge: zero location fields on network schemas', () => {
      expect('locationId' in createVlanSchema.shape).toBe(false);
      expect('locationId' in vlanQuerySchema.shape).toBe(false);
      expect('locationId' in createSubnetSchema.shape).toBe(false);
      expect('locationId' in subnetQuerySchema.shape).toBe(false);
      expect('locationId' in createIpAddressSchema.shape).toBe(false);
      expect('locationId' in ipAddressQuerySchema.shape).toBe(false);
      expect('locationId' in createRackSchema.shape).toBe(false);
      expect('locationId' in rackQuerySchema.shape).toBe(false);
      expect('locationId' in createSwitchSchema.shape).toBe(false);
      expect('locationId' in switchQuerySchema.shape).toBe(false);
    });

    it('rejects leading zeroes in IPv4 octets', () => {
      expect(createIpAddressSchema.safeParse({ address: '01.0.0.1' }).success).toBe(false);
      expect(createIpAddressSchema.safeParse({ address: '10.00.0.1' }).success).toBe(false);
      expect(createIpAddressSchema.safeParse({ address: '192.168.01.1' }).success).toBe(false);
      expect(createIpAddressSchema.safeParse({ address: '10.232.130.15' }).success).toBe(true);
    });

    it('rejects invalid or leading-zero CIDR prefixes', () => {
      expect(createSubnetSchema.safeParse({ cidr: '10.232.130.0/35', name: 'S1' }).success).toBe(
        false,
      );
      expect(createSubnetSchema.safeParse({ cidr: '10.232.130.0/01', name: 'S1' }).success).toBe(
        false,
      );
      expect(createSubnetSchema.safeParse({ cidr: '01.0.0.0/24', name: 'S1' }).success).toBe(false);
      expect(createSubnetSchema.safeParse({ cidr: '10.232.130.0/24', name: 'S1' }).success).toBe(
        true,
      );
    });

    it('validates MAC address formats in createIpAddressSchema', () => {
      expect(
        createIpAddressSchema.safeParse({
          address: '10.232.130.15',
          macAddress: '00:1B:44:11:3A:B7',
        }).success,
      ).toBe(true);
      expect(
        createIpAddressSchema.safeParse({
          address: '10.232.130.15',
          macAddress: '001b.4411.3ab7',
        }).success,
      ).toBe(true);
      expect(
        createIpAddressSchema.safeParse({
          address: '10.232.130.15',
          macAddress: 'invalid-mac',
        }).success,
      ).toBe(false);
    });

    it('validates taggedVlanIds bounds in createSwitchPortSchema', () => {
      const basePort = {
        switchId: '123e4567-e89b-12d3-a456-426614174000',
        portNumber: 1,
        name: 'Gi1/0/1',
      };
      expect(
        createSwitchPortSchema.safeParse({
          ...basePort,
          taggedVlanIds: [1, 100, 4094],
        }).success,
      ).toBe(true);

      // Rejects VLAN ID out of bounds [1..4094]
      expect(
        createSwitchPortSchema.safeParse({
          ...basePort,
          taggedVlanIds: [0],
        }).success,
      ).toBe(false);
      expect(
        createSwitchPortSchema.safeParse({
          ...basePort,
          taggedVlanIds: [5000],
        }).success,
      ).toBe(false);
    });
  });

  describe('Milestone 7 Topology Schemas & Enums', () => {
    describe('Enum Schemas', () => {
      it('validates InfrastructureDomain values and defaults', () => {
        expect(infrastructureDomainSchema.parse(undefined)).toBe(InfrastructureDomain.NETWORK);
        expect(infrastructureDomainSchema.parse(InfrastructureDomain.CCTV)).toBe(InfrastructureDomain.CCTV);
        expect(infrastructureDomainSchema.parse(InfrastructureDomain.SHARED)).toBe(InfrastructureDomain.SHARED);
        expect(infrastructureDomainSchema.safeParse('INVALID').success).toBe(false);
      });

      it('validates TopologyViewMode values and defaults', () => {
        expect(topologyViewModeSchema.parse(undefined)).toBe(TopologyViewMode.ALL);
        expect(topologyViewModeSchema.parse(TopologyViewMode.NETWORK)).toBe(TopologyViewMode.NETWORK);
        expect(topologyViewModeSchema.parse(TopologyViewMode.CCTV)).toBe(TopologyViewMode.CCTV);
        expect(topologyViewModeSchema.safeParse('UNKNOWN').success).toBe(false);
      });

      it('validates LinkMediumType values and defaults', () => {
        expect(linkMediumTypeSchema.parse(undefined)).toBe(LinkMediumType.COPPER);
        expect(linkMediumTypeSchema.parse(LinkMediumType.FIBER_SINGLE)).toBe(LinkMediumType.FIBER_SINGLE);
        expect(linkMediumTypeSchema.parse(LinkMediumType.FIBER_MULTI)).toBe(LinkMediumType.FIBER_MULTI);
        expect(linkMediumTypeSchema.parse(LinkMediumType.DAC)).toBe(LinkMediumType.DAC);
        expect(linkMediumTypeSchema.parse(LinkMediumType.WIRELESS)).toBe(LinkMediumType.WIRELESS);
        expect(linkMediumTypeSchema.safeParse('COAXIAL').success).toBe(false);
      });

      it('validates PortRole values and defaults', () => {
        expect(portRoleSchema.parse(undefined)).toBe(PortRole.ACCESS);
        expect(portRoleSchema.parse(PortRole.TRUNK)).toBe(PortRole.TRUNK);
        expect(portRoleSchema.parse(PortRole.UPLINK)).toBe(PortRole.UPLINK);
        expect(portRoleSchema.parse(PortRole.STACK)).toBe(PortRole.STACK);
        expect(portRoleSchema.parse(PortRole.ROUTED)).toBe(PortRole.ROUTED);
      });

      it('validates TopologyNodeType values', () => {
        expect(topologyNodeTypeSchema.parse(undefined)).toBe(TopologyNodeType.SWITCH);
        expect(topologyNodeTypeSchema.parse(TopologyNodeType.CORE_SWITCH)).toBe(TopologyNodeType.CORE_SWITCH);
        expect(topologyNodeTypeSchema.parse(TopologyNodeType.CAMERA)).toBe(TopologyNodeType.CAMERA);
        expect(topologyNodeTypeSchema.parse(TopologyNodeType.NVR)).toBe(TopologyNodeType.NVR);
      });
    });

    describe('patchCableLinkSchema', () => {
      const portA = 'a0000000-0000-4000-8000-000000000001';
      const portB = 'a0000000-0000-4000-8000-000000000002';
      const assetId = 'b0000000-0000-4000-8000-000000000001';
      const ipId = 'c0000000-0000-4000-8000-000000000001';
      const vlanId = 'd0000000-0000-4000-8000-000000000001';


      it('validates a valid switch-to-switch trunk link', () => {
        const payload = {
          sourcePortId: portA,
          targetPortId: portB,
          medium: LinkMediumType.FIBER_MULTI,
          portRole: PortRole.UPLINK,
          mode: PortMode.TRUNK,
          speedMbps: 10000,
          speed: '10 Gbps',
          taggedVlanIds: [10, 20, 30, 100],
          poeDelivering: false,
          description: '10G Core to Dist Uplink',
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sourcePortId).toBe(portA);
          expect(result.data.targetPortId).toBe(portB);
          expect(result.data.medium).toBe(LinkMediumType.FIBER_MULTI);
        }
      });

      it('validates an endpoint asset connection', () => {
        const payload = {
          sourcePortId: portA,
          targetAssetId: assetId,
          vlanId,
          medium: LinkMediumType.COPPER,
          portRole: PortRole.ACCESS,
          poeDelivering: true,
          speedMbps: 1000,
          description: 'Dome 4K Camera Connection',
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('validates an IP address binding', () => {
        const payload = {
          sourcePortId: portA,
          targetIpAddressId: ipId,
          speedMbps: 1000,
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('rejects self-loop port connections (sourcePortId === targetPortId)', () => {
        const payload = {
          sourcePortId: portA,
          targetPortId: portA,
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('self-loop');
        }
      });

      it('rejects payloads missing all target fields', () => {
        const payload = {
          sourcePortId: portA,
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('At least one target connection');
        }
      });

      it('rejects invalid or non-UUID identifiers', () => {
        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: 'not-a-uuid',
            targetPortId: portB,
          }).success,
        ).toBe(false);

        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: portA,
            targetPortId: 'invalid-port-uuid',
          }).success,
        ).toBe(false);
      });

      it('rejects negative or zero speedMbps', () => {
        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: portA,
            targetPortId: portB,
            speedMbps: 0,
          }).success,
        ).toBe(false);

        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: portA,
            targetPortId: portB,
            speedMbps: -100,
          }).success,
        ).toBe(false);
      });

      it('works identically via createTopologyLinkSchema alias', () => {
        const valid = {
          sourcePortId: portA,
          targetPortId: portB,
        };
        expect(createTopologyLinkSchema.safeParse(valid).success).toBe(true);
      });
    });

    describe('unpatchCableLinkSchema', () => {
      const portId = 'a0000000-0000-4000-8000-000000000001';


      it('validates a correct unpatch request', () => {
        const payload = {
          portId,
          reason: 'Decommissioning access switch uplink',
          resetPortConfig: true,
        };
        const result = unpatchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.portId).toBe(portId);
          expect(result.data.resetPortConfig).toBe(true);
        }
      });

      it('defaults resetPortConfig to false when omitted', () => {
        const result = unpatchCableLinkSchema.safeParse({ portId });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.resetPortConfig).toBe(false);
        }
      });

      it('rejects invalid UUID portId', () => {
        expect(unpatchCableLinkSchema.safeParse({ portId: 'bad-id' }).success).toBe(false);
      });
    });

    describe('updateCanvasLayoutSchema & canvasNodePositionItemSchema', () => {
      it('validates valid batch canvas coordinates with isPinned', () => {
        const payload = {
          viewMode: TopologyViewMode.NETWORK,
          positions: [
            {
              nodeId: 'sw-core-1',
              nodeType: TopologyNodeType.CORE_SWITCH,
              x: 250.5,
              y: 180.0,
              isPinned: true,
            },
            {
              nodeId: 'sw-dist-1',
              nodeType: TopologyNodeType.DISTRIBUTION_SWITCH,
              x: 600,
              y: 350,
              isPinned: false,
            },
          ],
        };
        const result = updateCanvasLayoutSchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.positions.length).toBe(2);
          expect(result.data.positions[0].isPinned).toBe(true);
          expect(result.data.positions[1].isPinned).toBe(false);
        }
      });

      it('rejects empty positions array (min 1 required)', () => {
        const result = updateCanvasLayoutSchema.safeParse({
          positions: [],
        });
        expect(result.success).toBe(false);
      });

      it('rejects batch exceeding 500 items', () => {
        const tooMany = Array.from({ length: 501 }, (_, i) => ({
          nodeId: `node-${i}`,
          x: i,
          y: i,
        }));
        const result = updateCanvasLayoutSchema.safeParse({
          positions: tooMany,
        });
        expect(result.success).toBe(false);
      });

      it('rejects non-finite coordinate values (NaN, Infinity)', () => {
        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: 'test',
            x: NaN,
            y: 100,
          }).success,
        ).toBe(false);

        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: 'test',
            x: 100,
            y: Infinity,
          }).success,
        ).toBe(false);
      });

      it('works identically via updateTopologyLayoutSchema alias', () => {
        expect(
          updateTopologyLayoutSchema.safeParse({
            positions: [{ nodeId: 'n1', x: 10, y: 20 }],
          }).success,
        ).toBe(true);
      });
    });

    describe('topologyQuerySchema', () => {
      it('validates complete query filters', () => {
        const rackId = 'e0000000-0000-4000-8000-000000000001';
        const vlanId = 'd0000000-0000-4000-8000-000000000001';
        const subnetId = 'f0000000-0000-4000-8000-000000000001';


        const payload = {
          mode: TopologyViewMode.CCTV,
          domain: InfrastructureDomain.CCTV,
          rackId,
          vlanId,
          subnetId,
          floor: '1F Production',
          status: 'ONLINE',
          includeMetrics: 'true',
        };

        const result = topologyQuerySchema.safeParse(payload);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.mode).toBe(TopologyViewMode.CCTV);
          expect(result.data.domain).toBe(InfrastructureDomain.CCTV);
          expect(result.data.floor).toBe('1F Production');
          expect(result.data.includeMetrics).toBe(true);
        }
      });

      it('coerces includeMetrics boolean properly', () => {
        expect(topologyQuerySchema.parse({ includeMetrics: 'false' }).includeMetrics).toBe(false);
        expect(topologyQuerySchema.parse({ includeMetrics: false }).includeMetrics).toBe(false);
        expect(topologyQuerySchema.parse({}).includeMetrics).toBe(true);
      });
    });
  });
});

