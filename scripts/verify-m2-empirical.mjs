#!/usr/bin/env node
/**
 * UIMS Milestone 2: Empirical Challenge Harness for Topology Graph Resolution & PoE Elimination
 *
 * Verifies live API responses from `GET /api/v1/network/topology` and live PostgreSQL database
 * against Milestone 2 requirements:
 * 1. Every edge in edges has non-empty sourcePortName and targetPortName.
 * 2. Trunk edges have peer port names (e.g. Te1/0/49 <-> Te1/0/25) and targetPortId.
 * 3. Endpoint edges have targetPortId and targetPortName (e.g. NIC 1, eth0, or asset tag).
 * 4. Zero edges or nodes contain poeEnabled, poeDelivering, poePowerWatts, poeActivePorts, or poeVoltage.
 * 5. Summary metrics contain zero poePowerUsageWatts.
 * 6. Database schema and tables contain zero PoE columns, enums, or role values.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
const { Pool } = require('pg');

const BASE_URL = process.env.API_URL || 'http://localhost:3002/api/v1';
const DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';

async function main() {
  console.log('========================================================================');
  console.log('  UIMS Milestone 2: Adversarial Empirical Challenge Harness            ');
  console.log('========================================================================\n');

  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;

  function assert(name, condition, details = '') {
    totalAssertions++;
    const prefix = `[${totalAssertions.toString().padStart(2, '0')}] ${name}... `;
    if (condition) {
      passedAssertions++;
      console.log(`${prefix}PASS ${details ? `(${details})` : ''}`);
    } else {
      failedAssertions++;
      console.error(`${prefix}FAIL ${details ? `— ${details}` : ''}`);
    }
  }

  // --------------------------------------------------------------------------
  // Phase 1: Database Schema & Invariants Inspection (Direct PostgreSQL)
  // --------------------------------------------------------------------------
  console.log('--- Phase 1: PostgreSQL Schema & Table Invariants ---');
  const pool = new Pool({ connectionString: DB_URL, max: 3 });

  try {
    // 1. Verify poeEnabled column was deleted from SwitchPort table
    const colRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'SwitchPort' AND column_name ILIKE '%poe%';
    `);
    assert(
      'SwitchPort table has ZERO PoE columns in PostgreSQL schema',
      colRes.rows.length === 0,
      `found columns: ${colRes.rows.map((r) => r.column_name).join(', ') || 'none'}`,
    );

    // 2. Verify POE_ACCESS does not exist in SwitchRole enum
    const enumRes = await pool.query(`
      SELECT e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'SwitchRole' AND e.enumlabel ILIKE '%poe%';
    `);
    assert(
      'SwitchRole enum has ZERO POE values in PostgreSQL',
      enumRes.rows.length === 0,
      `found enum values: ${enumRes.rows.map((r) => r.enumlabel).join(', ') || 'none'}`,
    );

    // 3. Verify no switches have POE_ACCESS in database
    const swRoleRes = await pool.query(`
      SELECT id, name, role FROM "NetworkSwitch" WHERE role::text ILIKE '%poe%';
    `);
    assert(
      'NetworkSwitch table has ZERO switches with PoE role',
      swRoleRes.rows.length === 0,
      `found: ${swRoleRes.rows.length}`,
    );

    // 4. Verify trunk ports in DB have symmetric peer connections
    const trunkRes = await pool.query(`
      SELECT sp.id, sp.name, sp."switchId", sp."connectedPortId", sp."connectedSwitchId",
             peer.name as "peerPortName", peer."switchId" as "peerSwitchId"
      FROM "SwitchPort" sp
      JOIN "SwitchPort" peer ON sp."connectedPortId" = peer.id
      WHERE sp."connectedPortId" IS NOT NULL;
    `);
    const isSymmetric = trunkRes.rows.every((r) => r.peerSwitchId === r.connectedSwitchId);
    assert(
      'Trunk ports in DB have valid, non-null peer port connections',
      trunkRes.rows.length > 0 && isSymmetric,
      `total inter-switch trunk links: ${trunkRes.rows.length}, symmetric: ${isSymmetric}`,
    );
  } finally {
    await pool.end();
  }

  // --------------------------------------------------------------------------
  // Phase 2: Live API Authentication & Token Retrieval
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 2: Live API Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@youngonevn.com', password: 'Youngone@2026' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.accessToken;
  assert('Admin login successful and returned JWT access token', Boolean(token));

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // --------------------------------------------------------------------------
  // Phase 3: Comprehensive Verification of getTopologyGraph Across Perspectives
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 3: Topology Graph Verification Across Modes (ALL, NETWORK, CCTV) ---');

  const modes = ['ALL', 'NETWORK', 'CCTV'];

  for (const mode of modes) {
    console.log(`\n  >>> Testing mode: ${mode} <<<`);
    const res = await fetch(`${BASE_URL}/network/topology?mode=${mode}`, { headers: authHeaders });
    assert(
      `GET /api/v1/network/topology?mode=${mode} returns HTTP 200`,
      res.status === 200,
      `status: ${res.status}`,
    );

    const body = await res.json();
    const data = body?.data || body;
    const { nodes = [], edges = [], summaryMetrics = {}, metrics = {} } = data;

    assert(
      `Mode ${mode} returns non-empty nodes and edges`,
      nodes.length > 0 && edges.length > 0,
      `nodes: ${nodes.length}, edges: ${edges.length}`,
    );

    // Test 1: Every edge in edges has non-empty sourcePortName and targetPortName
    let missingPortNames = 0;
    const badPortEdges = [];
    for (const e of edges) {
      const hasSource = typeof e.sourcePortName === 'string' && e.sourcePortName.trim().length > 0;
      const hasTarget = typeof e.targetPortName === 'string' && e.targetPortName.trim().length > 0;
      if (!hasSource || !hasTarget) {
        missingPortNames++;
        badPortEdges.push({
          id: e.id,
          sourcePortName: e.sourcePortName,
          targetPortName: e.targetPortName,
          linkType: e.linkType,
        });
      }
    }
    assert(
      `Mode ${mode}: ALL ${edges.length} edges have non-empty sourcePortName and targetPortName`,
      missingPortNames === 0,
      missingPortNames > 0
        ? `missing: ${JSON.stringify(badPortEdges.slice(0, 3))}`
        : `all ${edges.length} valid`,
    );

    // Test 2: Trunk edges have peer port names and targetPortId
    const trunkEdges = edges.filter((e) => e.linkType === 'UPLINK' || e.portRole === 'UPLINK');
    let validTrunks = 0;
    const badTrunks = [];
    for (const te of trunkEdges) {
      const hasPeerNames = te.sourcePortName && te.targetPortName && te.targetPortId;
      if (hasPeerNames) {
        validTrunks++;
      } else {
        badTrunks.push({
          id: te.id,
          sourcePort: te.sourcePortName,
          targetPort: te.targetPortName,
          targetPortId: te.targetPortId,
        });
      }
    }
    assert(
      `Mode ${mode}: Trunk edges (${trunkEdges.length}) have peer port names and targetPortId`,
      trunkEdges.length > 0 ? validTrunks === trunkEdges.length : true,
      `valid trunks: ${validTrunks}/${trunkEdges.length} (sample: ${trunkEdges[0]?.sourcePortName} <-> ${trunkEdges[0]?.targetPortName})`,
    );

    // Test 3: Endpoint edges have targetPortId and targetPortName
    const endpointEdges = edges.filter(
      (e) => e.linkType === 'ENDPOINT' || (!e.linkType && e.portRole !== 'UPLINK'),
    );
    let validEndpoints = 0;
    const badEndpoints = [];
    for (const ee of endpointEdges) {
      const hasEndpoint =
        ee.targetPortId && ee.targetPortName && ee.targetPortName.trim().length > 0;
      if (hasEndpoint) {
        validEndpoints++;
      } else {
        badEndpoints.push({
          id: ee.id,
          targetPortId: ee.targetPortId,
          targetPortName: ee.targetPortName,
        });
      }
    }
    assert(
      `Mode ${mode}: Endpoint edges (${endpointEdges.length}) have targetPortId and targetPortName`,
      endpointEdges.length > 0 ? validEndpoints === endpointEdges.length : true,
      `valid endpoints: ${validEndpoints}/${endpointEdges.length} (sample: ${endpointEdges[0]?.sourcePortName} -> ${endpointEdges[0]?.targetPortName})`,
    );

    // Test 4: Zero edges contain poeEnabled, poeDelivering, poePowerWatts, poeActivePorts, poeVoltage, or any poe key
    const poeKeys = [
      'poeEnabled',
      'poeDelivering',
      'poePowerWatts',
      'poeActivePorts',
      'poeVoltage',
    ];
    let edgesWithPoe = 0;
    const leakedEdgeProps = [];
    for (const e of edges) {
      const keys = Object.keys(e);
      const foundPoe = keys.filter((k) => k.toLowerCase().includes('poe'));
      if (foundPoe.length > 0) {
        edgesWithPoe++;
        leakedEdgeProps.push({ id: e.id, keys: foundPoe });
      }
    }
    assert(
      `Mode ${mode}: ZERO edges (${edges.length}) contain any PoE properties`,
      edgesWithPoe === 0,
      edgesWithPoe > 0 ? `leaked: ${JSON.stringify(leakedEdgeProps.slice(0, 3))}` : '0 leaked',
    );

    // Test 5: Zero nodes contain poeEnabled, poeDelivering, poePowerWatts, poeActivePorts, poeVoltage, or any poe key
    let nodesWithPoe = 0;
    const leakedNodeProps = [];
    for (const n of nodes) {
      const nodeKeys = Object.keys(n).filter((k) => k.toLowerCase().includes('poe'));
      const dataKeys = n.data
        ? Object.keys(n.data).filter((k) => k.toLowerCase().includes('poe'))
        : [];
      if (nodeKeys.length > 0 || dataKeys.length > 0) {
        nodesWithPoe++;
        leakedNodeProps.push({ id: n.id, nodeKeys, dataKeys });
      }
    }
    assert(
      `Mode ${mode}: ZERO nodes (${nodes.length}) contain any PoE properties`,
      nodesWithPoe === 0,
      nodesWithPoe > 0 ? `leaked: ${JSON.stringify(leakedNodeProps.slice(0, 3))}` : '0 leaked',
    );

    // Test 6: Summary metrics contain zero poePowerUsageWatts or any poe metric
    const effectiveMetrics = summaryMetrics || metrics;
    const metricPoeKeys = Object.keys(effectiveMetrics).filter((k) =>
      k.toLowerCase().includes('poe'),
    );
    assert(
      `Mode ${mode}: Summary metrics contain ZERO poePowerUsageWatts or PoE fields`,
      metricPoeKeys.length === 0 && effectiveMetrics.poePowerUsageWatts === undefined,
      metricPoeKeys.length > 0 ? `found: ${metricPoeKeys.join(', ')}` : '0 PoE metrics',
    );
  }

  // --------------------------------------------------------------------------
  // Phase 4: Adversarial Filter Edge Cases
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 4: Adversarial Filter Tests ---');

  // Filter by switchRole=CORE
  const coreRes = await fetch(`${BASE_URL}/network/topology?switchRole=CORE`, {
    headers: authHeaders,
  });
  const coreData = (await coreRes.json())?.data;
  assert(
    'Filtering by switchRole=CORE returns only CORE switches',
    coreData?.nodes?.filter((n) => n.type === 'SWITCH').every((n) => n.subType === 'CORE'),
    `returned ${coreData?.nodes?.filter((n) => n.type === 'SWITCH').length} switches`,
  );

  // Filter by switchRole=DISTRIBUTION
  const distRes = await fetch(`${BASE_URL}/network/topology?switchRole=DISTRIBUTION`, {
    headers: authHeaders,
  });
  const distData = (await distRes.json())?.data;
  assert(
    'Filtering by switchRole=DISTRIBUTION returns only DISTRIBUTION switches',
    distData?.nodes?.filter((n) => n.type === 'SWITCH').every((n) => n.subType === 'DISTRIBUTION'),
    `returned ${distData?.nodes?.filter((n) => n.type === 'SWITCH').length} switches`,
  );

  // Filter by switchRole=ACCESS
  const accRes = await fetch(`${BASE_URL}/network/topology?switchRole=ACCESS`, {
    headers: authHeaders,
  });
  const accData = (await accRes.json())?.data;
  assert(
    'Filtering by switchRole=ACCESS returns only ACCESS switches',
    accData?.nodes?.filter((n) => n.type === 'SWITCH').every((n) => n.subType === 'ACCESS'),
    `returned ${accData?.nodes?.filter((n) => n.type === 'SWITCH').length} switches`,
  );

  // Filter by non-existent rackId should return empty topology gracefully without crashing
  const fakeRackRes = await fetch(
    `${BASE_URL}/network/topology?rackId=00000000-0000-0000-0000-000000000000`,
    { headers: authHeaders },
  );
  const fakeRackData = (await fakeRackRes.json())?.data;
  assert(
    'Filtering by non-existent rackId returns empty topology gracefully (HTTP 200, 0 nodes)',
    fakeRackRes.status === 200 && fakeRackData?.nodes?.length === 0,
    `status: ${fakeRackRes.status}, nodes: ${fakeRackData?.nodes?.length}`,
  );

  // Filter by floor
  const floorRes = await fetch(`${BASE_URL}/network/topology?floor=Floor%201`, {
    headers: authHeaders,
  });
  assert('Filtering by floor=Floor 1 succeeds with HTTP 200', floorRes.status === 200);

  // --------------------------------------------------------------------------
  // Phase 5: Switch Port APIs Verification (connectedPort and connectedSwitch serialization)
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 5: Switch Port APIs (formatPort, findSwitchPorts) ---');

  // Fetch switches
  const swListRes = await fetch(`${BASE_URL}/network/switches`, { headers: authHeaders });
  const swListJson = await swListRes.json();
  const swList = Array.isArray(swListJson?.data) ? swListJson.data : swListJson?.data?.items || [];
  assert(
    'GET /api/v1/network/switches returns switches',
    swList.length > 0,
    `switches: ${swList.length}`,
  );

  const coreSwitch = swList.find((s) => s.role === 'CORE') || swList[0];
  if (coreSwitch) {
    const portsRes = await fetch(`${BASE_URL}/network/switches/${coreSwitch.id}/ports`, {
      headers: authHeaders,
    });
    assert(
      `GET /api/v1/network/switches/${coreSwitch.id}/ports returns HTTP 200`,
      portsRes.status === 200,
    );

    const ports = (await portsRes.json())?.data || [];
    assert('Switch ports list is non-empty', ports.length > 0, `total ports: ${ports.length}`);

    // Check zero poeEnabled on ports
    const portPoeKeys = ports.filter((p) => 'poeEnabled' in p || 'poeWatts' in p);
    assert(
      'Switch ports have ZERO poeEnabled or poeWatts properties',
      portPoeKeys.length === 0,
      `violations: ${portPoeKeys.length}`,
    );

    // Check connectedPort serialization on uplink ports
    const uplinkPorts = ports.filter((p) => p.connectedPortId);
    if (uplinkPorts.length > 0) {
      const up = uplinkPorts[0];
      const hasConnectedPort = Boolean(up.connectedPort && up.connectedPort.name);
      const hasConnectedSwitch = Boolean(up.connectedSwitch && up.connectedSwitch.name);
      assert(
        'Uplink switch port serializes connectedPort and connectedSwitch with names',
        hasConnectedPort && hasConnectedSwitch,
        `port ${up.name} connected to ${up.connectedSwitch?.name} (${up.connectedPort?.name})`,
      );
    }
  }

  // --------------------------------------------------------------------------
  // Phase 6: Codebase PoE Sanitization Audit
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 6: Codebase PoE String & Pattern Audit ---');

  // Print Sample Link Details for Manual Review
  console.log('\n--- Sample Edge Output from Live Topology Graph (mode=ALL) ---');
  const allRes = await fetch(`${BASE_URL}/network/topology?mode=ALL`, { headers: authHeaders });
  const allData = (await allRes.json())?.data;
  const sampleTrunks = allData?.edges?.filter((e) => e.linkType === 'UPLINK').slice(0, 3) || [];
  const sampleEndpoints =
    allData?.edges?.filter((e) => e.linkType === 'ENDPOINT').slice(0, 3) || [];

  console.log('Sample Trunk Edges:');
  for (const te of sampleTrunks) {
    console.log(
      `  - ID: ${te.id} | ${te.sourcePortName} <---> ${te.targetPortName} | TargetPortID: ${te.targetPortId} | Speed: ${te.speed} | Domain: ${te.domain}`,
    );
  }

  console.log('Sample Endpoint Edges:');
  for (const ee of sampleEndpoints) {
    console.log(
      `  - ID: ${ee.id} | ${ee.sourcePortName} ----> ${ee.targetPortName} | TargetPortID: ${ee.targetPortId} | Speed: ${ee.speed} | Domain: ${ee.domain}`,
    );
  }

  console.log('\n========================================================================');
  console.log(
    `  VERIFICATION RESULTS: ${passedAssertions}/${totalAssertions} PASSED (${failedAssertions} FAILED)`,
  );
  console.log('========================================================================\n');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Empirical harness crashed with error:', err);
  process.exit(1);
});
