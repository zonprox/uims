import {
  LinkMediumType,
  PortMode,
  PortRole,
  TopologyNodeType,
  TopologyViewMode,
} from '@uims/shared-types';
import { describe, expect, it } from 'vitest';
import {
  canvasNodePositionItemSchema,
  patchCableLinkSchema,
  unpatchCableLinkSchema,
  updateCanvasLayoutSchema,
} from './network.validator';

describe('Milestone 7 Challenger — Empirical Zod Schema Adversarial Suite', () => {
  const validPortA = 'a0000000-0000-4000-8000-000000000001';
  const validPortB = 'a0000000-0000-4000-8000-000000000002';
  const validAssetId = 'b0000000-0000-4000-8000-000000000001';
  const validIpId = 'c0000000-0000-4000-8000-000000000001';
  const validVlanId = 'd0000000-0000-4000-8000-000000000001';

  // =========================================================================
  // 1. ADVERSARIAL STRESS TESTING: patchCableLinkSchema
  // =========================================================================
  describe('patchCableLinkSchema Adversarial Challenges', () => {
    describe('Self-loop payload detection', () => {
      it('rejects self-loop when sourcePortId === targetPortId', () => {
        const payload = {
          sourcePortId: validPortA,
          targetPortId: validPortA,
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('self-loop');
          expect(result.error.issues[0].path).toEqual(['targetPortId']);
        }
      });

      it('rejects self-loop even if additional fields (medium, vlanId, etc.) are valid', () => {
        const payload = {
          sourcePortId: validPortB,
          targetPortId: validPortB,
          medium: LinkMediumType.FIBER_MULTI,
          portRole: PortRole.UPLINK,
          mode: PortMode.TRUNK,
          speedMbps: 10000,
          taggedVlanIds: [10, 20, 30],
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('self-loop');
        }
      });
    });

    describe('Empty target payload detection', () => {
      it('rejects payload when no target field is supplied', () => {
        const payload = {
          sourcePortId: validPortA,
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('At least one target connection');
          expect(result.error.issues[0].path).toEqual(['targetPortId']);
        }
      });

      it('rejects payload when all target fields are explicitly null', () => {
        const payload = {
          sourcePortId: validPortA,
          targetPortId: null,
          targetAssetId: null,
          targetIpAddressId: null,
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('At least one target connection');
        }
      });

      it('rejects payload when all target fields are undefined', () => {
        const payload = {
          sourcePortId: validPortA,
          targetPortId: undefined,
          targetAssetId: undefined,
          targetIpAddressId: undefined,
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('At least one target connection');
        }
      });
    });

    describe('VLAN number boundary and integer challenges', () => {
      it('rejects non-integer floating-point VLAN numbers in taggedVlanIds', () => {
        const floatVlans = [10.5, 0.5, 4093.99, -1.2];
        for (const fv of floatVlans) {
          const payload = {
            sourcePortId: validPortA,
            targetPortId: validPortB,
            taggedVlanIds: [fv],
          };
          const result = patchCableLinkSchema.safeParse(payload);
          expect(result.success).toBe(false);
        }
      });

      it('rejects non-integer string floating-point VLAN numbers in taggedVlanIds', () => {
        const floatStrings = ['10.5', '1.23', '4093.9'];
        for (const fs of floatStrings) {
          const payload = {
            sourcePortId: validPortA,
            targetPortId: validPortB,
            taggedVlanIds: [fs],
          };
          const result = patchCableLinkSchema.safeParse(payload);
          expect(result.success).toBe(false);
        }
      });

      it('rejects out-of-range VLAN numbers (< 1 or > 4094)', () => {
        const outOfRange = [0, -1, -500, 4095, 5000, 65535];
        for (const val of outOfRange) {
          const payload = {
            sourcePortId: validPortA,
            targetPortId: validPortB,
            taggedVlanIds: [val],
          };
          const result = patchCableLinkSchema.safeParse(payload);
          expect(result.success).toBe(false);
        }
      });

      it('rejects non-numeric string items in taggedVlanIds', () => {
        const garbage = ['vlan10', 'abc', '10a', '', ' '];
        for (const item of garbage) {
          const payload = {
            sourcePortId: validPortA,
            targetPortId: validPortB,
            taggedVlanIds: [item],
          };
          const result = patchCableLinkSchema.safeParse(payload);
          expect(result.success).toBe(false);
        }
      });

      it('accepts valid integer numbers and numeric digit strings in taggedVlanIds within [1..4094]', () => {
        const payload = {
          sourcePortId: validPortA,
          targetPortId: validPortB,
          taggedVlanIds: [1, 10, '20', 100, '4094'],
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });

    describe('Link speed boundary and adversarial challenges', () => {
      it('rejects negative link speeds', () => {
        const negativeSpeeds = [-1, -10, -100, -10000];
        for (const speed of negativeSpeeds) {
          const payload = {
            sourcePortId: validPortA,
            targetPortId: validPortB,
            speedMbps: speed,
          };
          const result = patchCableLinkSchema.safeParse(payload);
          expect(result.success).toBe(false);
        }
      });

      it('rejects zero link speed', () => {
        const payload = {
          sourcePortId: validPortA,
          targetPortId: validPortB,
          speedMbps: 0,
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('rejects non-integer floating-point link speeds', () => {
        const floatSpeeds = [100.5, 1000.25, 10000.99];
        for (const speed of floatSpeeds) {
          const payload = {
            sourcePortId: validPortA,
            targetPortId: validPortB,
            speedMbps: speed,
          };
          const result = patchCableLinkSchema.safeParse(payload);
          expect(result.success).toBe(false);
        }
      });

      it('rejects non-numeric link speeds (NaN, Infinity, -Infinity)', () => {
        const nonNumerics = [NaN, Infinity, -Infinity];
        for (const speed of nonNumerics) {
          const payload = {
            sourcePortId: validPortA,
            targetPortId: validPortB,
            speedMbps: speed,
          };
          const result = patchCableLinkSchema.safeParse(payload);
          expect(result.success).toBe(false);
        }
      });

      it('accepts positive integer link speeds and null/omitted speed', () => {
        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: validPortA,
            targetPortId: validPortB,
            speedMbps: 1000,
          }).success,
        ).toBe(true);

        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: validPortA,
            targetPortId: validPortB,
            speedMbps: 10000,
          }).success,
        ).toBe(true);

        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: validPortA,
            targetPortId: validPortB,
            speedMbps: null,
          }).success,
        ).toBe(true);

        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: validPortA,
            targetPortId: validPortB,
          }).success,
        ).toBe(true);
      });
    });

    describe('UUID validation on all identifier fields', () => {
      it('rejects malformed sourcePortId', () => {
        const badIds = ['not-a-uuid', '123', '', '   ', 'a0000000-0000-4000-8000-00000000000z'];
        for (const id of badIds) {
          const result = patchCableLinkSchema.safeParse({
            sourcePortId: id,
            targetPortId: validPortB,
          });
          expect(result.success).toBe(false);
        }
      });

      it('rejects malformed target identifiers when supplied', () => {
        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: validPortA,
            targetPortId: 'invalid-uuid',
          }).success,
        ).toBe(false);

        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: validPortA,
            targetAssetId: 'invalid-asset-uuid',
          }).success,
        ).toBe(false);

        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: validPortA,
            targetIpAddressId: 'invalid-ip-uuid',
          }).success,
        ).toBe(false);

        expect(
          patchCableLinkSchema.safeParse({
            sourcePortId: validPortA,
            targetPortId: validPortB,
            vlanId: 'invalid-vlan-uuid',
          }).success,
        ).toBe(false);
      });
    });

    describe('Positive valid link variations', () => {
      it('accepts valid switch port to asset endpoint link', () => {
        const payload = {
          sourcePortId: validPortA,
          targetAssetId: validAssetId,
          vlanId: validVlanId,
          medium: LinkMediumType.COPPER,
          portRole: PortRole.ACCESS,
          mode: PortMode.ACCESS,
          speedMbps: 1000,
          description: 'IP Camera 4K Dome',
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });

      it('accepts valid switch port to IP address link', () => {
        const payload = {
          sourcePortId: validPortA,
          targetIpAddressId: validIpId,
          medium: LinkMediumType.COPPER,
          portRole: PortRole.ACCESS,
          mode: PortMode.ACCESS,
          speedMbps: 1000,
        };
        const result = patchCableLinkSchema.safeParse(payload);
        expect(result.success).toBe(true);
      });
    });
  });

  // =========================================================================
  // 2. ADVERSARIAL STRESS TESTING: updateCanvasLayoutSchema
  // =========================================================================
  describe('updateCanvasLayoutSchema Adversarial Challenges', () => {
    it('rejects empty positions array (0 items)', () => {
      const payload = {
        viewMode: TopologyViewMode.ALL,
        positions: [],
      };
      const result = updateCanvasLayoutSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 1 item');
      }
    });

    it('rejects oversized positions array (>500 items, exactly 501)', () => {
      const oversized = Array.from({ length: 501 }, (_, i) => ({
        nodeId: `node-${i}`,
        nodeType: TopologyNodeType.SWITCH,
        x: i * 10,
        y: i * 10,
      }));
      const payload = {
        viewMode: TopologyViewMode.ALL,
        positions: oversized,
      };
      const result = updateCanvasLayoutSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('cannot exceed 500 items');
      }
    });

    it('accepts boundary sizes: exactly 1 item and exactly 500 items', () => {
      const singleItem = {
        viewMode: TopologyViewMode.NETWORK,
        positions: [
          {
            nodeId: 'node-1',
            x: 100,
            y: 200,
          },
        ],
      };
      expect(updateCanvasLayoutSchema.safeParse(singleItem).success).toBe(true);

      const maxItems = {
        viewMode: TopologyViewMode.CCTV,
        positions: Array.from({ length: 500 }, (_, i) => ({
          nodeId: `node-${i}`,
          x: i,
          y: i,
        })),
      };
      expect(updateCanvasLayoutSchema.safeParse(maxItems).success).toBe(true);
    });

    describe('Non-finite coordinate challenges (canvasNodePositionItemSchema)', () => {
      it('rejects NaN coordinates for X or Y', () => {
        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: 'node-nan-x',
            x: NaN,
            y: 100,
          }).success,
        ).toBe(false);

        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: 'node-nan-y',
            x: 100,
            y: NaN,
          }).success,
        ).toBe(false);

        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: 'node-nan-both',
            x: NaN,
            y: NaN,
          }).success,
        ).toBe(false);
      });

      it('rejects Infinity and -Infinity coordinates for X or Y', () => {
        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: 'node-inf-x',
            x: Infinity,
            y: 100,
          }).success,
        ).toBe(false);

        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: 'node-neg-inf-x',
            x: -Infinity,
            y: 100,
          }).success,
        ).toBe(false);

        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: 'node-inf-y',
            x: 100,
            y: Infinity,
          }).success,
        ).toBe(false);

        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: 'node-neg-inf-y',
            x: 100,
            y: -Infinity,
          }).success,
        ).toBe(false);
      });

      it('rejects non-finite coordinates inside updateCanvasLayoutSchema batch', () => {
        const payload = {
          positions: [
            { nodeId: 'node-ok', x: 100, y: 100 },
            { nodeId: 'node-corrupt', x: 200, y: Infinity },
          ],
        };
        const result = updateCanvasLayoutSchema.safeParse(payload);
        expect(result.success).toBe(false);
      });

      it('rejects empty or whitespace-only nodeId in canvas items', () => {
        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: '',
            x: 100,
            y: 100,
          }).success,
        ).toBe(false);

        expect(
          canvasNodePositionItemSchema.safeParse({
            nodeId: '   ',
            x: 100,
            y: 100,
          }).success,
        ).toBe(false);
      });
    });
  });

  // =========================================================================
  // 3. ADVERSARIAL STRESS TESTING: unpatchCableLinkSchema
  // =========================================================================
  describe('unpatchCableLinkSchema Adversarial Challenges', () => {
    it('rejects non-UUID portId strings', () => {
      const nonUuids = [
        'invalid-id',
        '12345',
        '',
        '   ',
        'a0000000-0000-4000-8000-00000000000g', // non-hex character
        'a0000000-0000-4000-8000', // too short
        'a0000000-0000-4000-8000-0000000000001', // too long
      ];
      for (const id of nonUuids) {
        const result = unpatchCableLinkSchema.safeParse({ portId: id });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('UUID');
        }
      }
    });

    it('rejects non-string portId types', () => {
      const nonStrings = [123, true, null, undefined, {}, []];
      for (const val of nonStrings) {
        const result = unpatchCableLinkSchema.safeParse({ portId: val as unknown as string });
        expect(result.success).toBe(false);
      }
    });

    it('rejects reason exceeding 255 characters', () => {
      const payload = {
        portId: validPortA,
        reason: 'a'.repeat(256),
      };
      const result = unpatchCableLinkSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('accepts valid unpatch request with UUID, reason, and resetPortConfig', () => {
      const payload = {
        portId: validPortA,
        reason: 'Decommissioning access switch uplink',
        resetPortConfig: true,
      };
      const result = unpatchCableLinkSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.portId).toBe(validPortA);
        expect(result.data.resetPortConfig).toBe(true);
        expect(result.data.reason).toBe('Decommissioning access switch uplink');
      }
    });

    it('defaults resetPortConfig to false when omitted', () => {
      const result = unpatchCableLinkSchema.safeParse({ portId: validPortA });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resetPortConfig).toBe(false);
      }
    });
  });
});
