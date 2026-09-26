import { describe, expect, it } from 'vitest';
import { calculatePortClusters, getPortRowAndColumn } from './clustering';

describe('Intelligent Modular Port Clustering Algorithm (clustering.ts)', () => {
  describe('calculatePortClusters — Even Port Range 2..48 Invariants', () => {
    const allEvenPorts = Array.from({ length: 24 }, (_, i) => (i + 1) * 2); // [2, 4, 6, ..., 48]

    it.each(allEvenPorts)(
      'preserves sum invariant for %i ports: sum(clusters) === totalPorts',
      (ports) => {
        const clusters = calculatePortClusters(ports);
        const sum = clusters.reduce((acc, c) => acc + c, 0);
        expect(sum).toBe(ports);
      },
    );

    it.each(allEvenPorts)('ensures all clusters for %i ports are even integers >= 2', (ports) => {
      const clusters = calculatePortClusters(ports);
      expect(clusters.length).toBeGreaterThan(0);
      for (const size of clusters) {
        expect(Number.isInteger(size)).toBe(true);
        expect(size).toBeGreaterThanOrEqual(2);
        expect(size % 2).toBe(0);
      }
    });

    it.each(allEvenPorts)(
      'ensures cluster sizes for %i ports are balanced (max - min <= 4)',
      (ports) => {
        const clusters = calculatePortClusters(ports);
        const max = Math.max(...clusters);
        const min = Math.min(...clusters);
        expect(max - min).toBeLessThanOrEqual(4);
      },
    );
  });

  describe('Standard Enterprise Switch Profiles & Canonical Presets', () => {
    it('clusters 8-port compact switches into 1 block of 8', () => {
      expect(calculatePortClusters(8)).toEqual([8]);
    });

    it('clusters 16-port branch switches into 2 balanced blocks of 8', () => {
      expect(calculatePortClusters(16)).toEqual([8, 8]);
    });

    it('clusters 24-port 1U enterprise switches into 2 balanced blocks of 12', () => {
      expect(calculatePortClusters(24)).toEqual([12, 12]);
    });

    it('clusters 48-port high-density 1U switches into 4 balanced blocks of 12', () => {
      expect(calculatePortClusters(48)).toEqual([12, 12, 12, 12]);
    });
  });

  describe('Small Switches (<= 8 ports)', () => {
    it('clusters 2 ports into [2]', () => {
      expect(calculatePortClusters(2)).toEqual([2]);
    });

    it('clusters 4 ports into [4]', () => {
      expect(calculatePortClusters(4)).toEqual([4]);
    });

    it('clusters 6 ports into [6]', () => {
      expect(calculatePortClusters(6)).toEqual([6]);
    });
  });

  describe('Mid-Range Switches (10..16 ports)', () => {
    it('clusters 10 ports into [6, 4]', () => {
      expect(calculatePortClusters(10)).toEqual([6, 4]);
    });

    it('clusters 12 ports into [6, 6]', () => {
      expect(calculatePortClusters(12)).toEqual([6, 6]);
    });

    it('clusters 14 ports into [8, 6]', () => {
      expect(calculatePortClusters(14)).toEqual([8, 6]);
    });
  });

  describe('Larger Switches (18..32 ports)', () => {
    it('clusters 18 ports into [10, 8]', () => {
      expect(calculatePortClusters(18)).toEqual([10, 8]);
    });

    it('clusters 20 ports into [10, 10]', () => {
      expect(calculatePortClusters(20)).toEqual([10, 10]);
    });

    it('clusters 22 ports into [12, 10]', () => {
      expect(calculatePortClusters(22)).toEqual([12, 10]);
    });

    it('clusters 26 ports into [10, 8, 8]', () => {
      expect(calculatePortClusters(26)).toEqual([10, 8, 8]);
    });

    it('clusters 28 ports into [10, 10, 8]', () => {
      expect(calculatePortClusters(28)).toEqual([10, 10, 8]);
    });

    it('clusters 30 ports into [10, 10, 10]', () => {
      expect(calculatePortClusters(30)).toEqual([10, 10, 10]);
    });

    it('clusters 32 ports into [8, 8, 8, 8]', () => {
      expect(calculatePortClusters(32)).toEqual([8, 8, 8, 8]);
    });
  });

  describe('High-Density Switches (34..48 ports)', () => {
    it('clusters 34 ports into [12, 12, 10]', () => {
      expect(calculatePortClusters(34)).toEqual([12, 12, 10]);
    });

    it('clusters 36 ports into [12, 12, 12]', () => {
      expect(calculatePortClusters(36)).toEqual([12, 12, 12]);
    });

    it('clusters 38 ports into [10, 10, 10, 8]', () => {
      expect(calculatePortClusters(38)).toEqual([10, 10, 10, 8]);
    });

    it('clusters 40 ports into [10, 10, 10, 10]', () => {
      expect(calculatePortClusters(40)).toEqual([10, 10, 10, 10]);
    });

    it('clusters 42 ports into [12, 10, 10, 10]', () => {
      expect(calculatePortClusters(42)).toEqual([12, 10, 10, 10]);
    });

    it('clusters 44 ports into [12, 12, 10, 10]', () => {
      expect(calculatePortClusters(44)).toEqual([12, 12, 10, 10]);
    });

    it('clusters 46 ports into [12, 12, 12, 10]', () => {
      expect(calculatePortClusters(46)).toEqual([12, 12, 12, 10]);
    });
  });

  describe('Edge Cases & Sanitization', () => {
    it('returns [0] for <= 0 inputs', () => {
      expect(calculatePortClusters(0)).toEqual([0]);
      expect(calculatePortClusters(-10)).toEqual([0]);
    });

    it('floors odd inputs to the nearest even number within [2, 48]', () => {
      expect(calculatePortClusters(7)).toEqual([6]);
      expect(calculatePortClusters(25)).toEqual([12, 12]);
    });
  });

  describe('getPortRowAndColumn Coordinate Resolution', () => {
    it('correctly maps ports in a 24-port switch [12, 12]', () => {
      const clusters = [12, 12];

      // Block 0, Port 1: upper row, col 0
      const p1 = getPortRowAndColumn(1, clusters);
      expect(p1).toEqual({
        clusterIndex: 0,
        portInCluster: 1,
        clusterSize: 12,
        row: 'top',
        columnIndex: 0,
      });

      // Block 0, Port 2: lower row, col 0
      const p2 = getPortRowAndColumn(2, clusters);
      expect(p2).toEqual({
        clusterIndex: 0,
        portInCluster: 2,
        clusterSize: 12,
        row: 'bottom',
        columnIndex: 0,
      });

      // Block 0, Port 11: upper row, col 5
      const p11 = getPortRowAndColumn(11, clusters);
      expect(p11).toEqual({
        clusterIndex: 0,
        portInCluster: 11,
        clusterSize: 12,
        row: 'top',
        columnIndex: 5,
      });

      // Block 0, Port 12: lower row, col 5
      const p12 = getPortRowAndColumn(12, clusters);
      expect(p12).toEqual({
        clusterIndex: 0,
        portInCluster: 12,
        clusterSize: 12,
        row: 'bottom',
        columnIndex: 5,
      });

      // Block 1, Port 13: upper row, col 0 in cluster 1
      const p13 = getPortRowAndColumn(13, clusters);
      expect(p13).toEqual({
        clusterIndex: 1,
        portInCluster: 1,
        clusterSize: 12,
        row: 'top',
        columnIndex: 0,
      });

      // Block 1, Port 24: lower row, col 5 in cluster 1
      const p24 = getPortRowAndColumn(24, clusters);
      expect(p24).toEqual({
        clusterIndex: 1,
        portInCluster: 12,
        clusterSize: 12,
        row: 'bottom',
        columnIndex: 5,
      });
    });
  });
});
