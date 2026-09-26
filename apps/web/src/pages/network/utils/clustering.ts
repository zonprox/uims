/**
 * Intelligent Modular Port Clustering Algorithm
 *
 * Mathematically partitions any even number of access ports (2..48) into balanced
 * modular hardware blocks mirroring physical enterprise switch chassis (Cisco Catalyst,
 * Aruba CX, Juniper EX).
 */

/**
 * Pre-calculated modular hardware cluster partitions for even switch port counts (2..48).
 * Satisfies the following invariants:
 * 1. Sum of returned cluster sizes equals totalPorts.
 * 2. Every cluster size is strictly an even integer >= 2.
 * 3. Cluster sizes within a switch are balanced (max - min <= 4).
 * 4. Backward compatibility: 8 -> [8], 16 -> [8, 8], 24 -> [12, 12], 48 -> [12, 12, 12, 12].
 */
const CLUSTER_PARTITIONS: Readonly<Record<number, readonly number[]>> = {
  2: [2],
  4: [4],
  6: [6],
  8: [8],
  10: [6, 4],
  12: [6, 6],
  14: [8, 6],
  16: [8, 8],
  18: [10, 8],
  20: [10, 10],
  22: [12, 10],
  24: [12, 12],
  26: [10, 8, 8],
  28: [10, 10, 8],
  30: [10, 10, 10],
  32: [8, 8, 8, 8],
  34: [12, 12, 10],
  36: [12, 12, 12],
  38: [10, 10, 10, 8],
  40: [10, 10, 10, 10],
  42: [12, 10, 10, 10],
  44: [12, 12, 10, 10],
  46: [12, 12, 12, 10],
  48: [12, 12, 12, 12],
};

/**
 * Dynamically partitions any even port count into balanced modular clusters.
 *
 * @param totalPorts Number of access ports to cluster (expected strictly even, 2..48).
 * @returns Array of cluster sizes summing to the even port count.
 */
export function calculatePortClusters(totalPorts: number): number[] {
  if (totalPorts <= 0) return [0];

  // Sanitize and ensure even count within [2, 48]
  const evenCount = Math.floor(totalPorts / 2) * 2;
  const clamped = Math.min(Math.max(2, evenCount), 48);

  const partition = CLUSTER_PARTITIONS[clamped];
  if (partition) {
    return [...partition];
  }

  // Dynamic fallback for any unforeseen out-of-range even number
  return dynamicPartitionEvenPorts(clamped);
}

/**
 * Fallback dynamic balanced partitioner for even numbers.
 */
function dynamicPartitionEvenPorts(count: number): number[] {
  if (count <= 8) return [count];

  const targetBlockSize = count > 32 ? 12 : 8;
  const numBlocks = Math.max(1, Math.round(count / targetBlockSize));
  const base = Math.floor(count / (numBlocks * 2)) * 2;
  const remainder = count - base * numBlocks;

  const result: number[] = Array(numBlocks).fill(base);
  let rem = remainder;
  for (let i = 0; i < result.length && rem > 0; i++) {
    result[i] += 2;
    rem -= 2;
  }

  return result;
}

/**
 * Detailed 2D coordinate for a physical port within its modular hardware cluster.
 */
export interface PortClusterPosition {
  clusterIndex: number;
  portInCluster: number;
  clusterSize: number;
  row: 'top' | 'bottom';
  columnIndex: number;
}

/**
 * Resolves the physical row and column coordinate for any 1-based port index
 * given the calculated modular clusters.
 *
 * Dual-row physical layout:
 * - Upper row: odd port numbers within the cluster (1, 3, 5, 7...)
 * - Lower row: even port numbers within the cluster (2, 4, 6, 8...)
 *
 * @param portNumber 1-based port index (1..totalPorts)
 * @param clusters Array of cluster sizes (e.g. [12, 12])
 */
export function getPortRowAndColumn(portNumber: number, clusters: number[]): PortClusterPosition {
  let accumulated = 0;

  for (let c = 0; c < clusters.length; c++) {
    const size = clusters[c];
    if (portNumber <= accumulated + size) {
      const portInCluster = portNumber - accumulated;
      const isOdd = portInCluster % 2 !== 0;

      return {
        clusterIndex: c,
        portInCluster,
        clusterSize: size,
        row: isOdd ? 'top' : 'bottom',
        columnIndex: isOdd ? Math.floor(portInCluster / 2) : portInCluster / 2 - 1,
      };
    }
    accumulated += size;
  }

  // Graceful fallback for port numbers exceeding total cluster capacity
  const lastIndex = Math.max(0, clusters.length - 1);
  const isOdd = portNumber % 2 !== 0;
  return {
    clusterIndex: lastIndex,
    portInCluster: portNumber,
    clusterSize: clusters[lastIndex] ?? 0,
    row: isOdd ? 'top' : 'bottom',
    columnIndex: 0,
  };
}
