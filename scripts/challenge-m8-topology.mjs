#!/usr/bin/env node
/**
 * UIMS Milestone 8: Empirical Topology Graph Engine & Perspective Filtering Challenger
 *
 * Exercises and verifies live API responses from `GET /api/v1/network/topology`
 * and interactive patching/layout endpoints against running database and backend.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.API_URL || 'http://localhost:3002/api/v1';

async function main() {
  console.log('========================================================================');
  console.log('  UIMS Milestone 8: Empirical Challenge Harness for Live Topology Graph ');
  console.log('========================================================================\n');

  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;

  function assert(name, condition, details = '') {
    totalAssertions++;
    process.stdout.write(`[${totalAssertions.toString().padStart(2, '0')}] ${name}... `);
    if (condition) {
      passedAssertions++;
      console.log(`PASS ${details ? `(${details})` : ''}`);
    } else {
      failedAssertions++;
      console.log(`FAIL ${details ? `— ${details}` : ''}`);
    }
  }

  // --------------------------------------------------------------------------
  // Phase 1: Authentication & Unauthorized Guard Verification
  // --------------------------------------------------------------------------
  console.log('--- Phase 1: Security & Auth Guards ---');
  const unauthRes = await fetch(`${BASE_URL}/network/topology`);
  assert(
    'Topology endpoint rejects unauthenticated requests with HTTP 401',
    unauthRes.status === 401,
    `status: ${unauthRes.status}`,
  );

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
  // Phase 2: Mode = ALL Topology Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 2: Mode = ALL Perspective Verification ---');
  const allRes = await fetch(`${BASE_URL}/network/topology?mode=ALL`, { headers: authHeaders });
  assert('GET /network/topology?mode=ALL returns HTTP 200', allRes.status === 200);

  const allJson = await allRes.json();
  const allData = allJson.data;

  // 2a. All 5 Canonical Racks
  const canonicalRackCodes = ['RCK-MDF-01', 'RCK-MDF-02', 'RCK-IDF-F1', 'RCK-IDF-F2', 'RCK-IDF-WH'];
  const presentRacks = allData.nodes.filter((n) => n.type === 'RACK');
  const matchedRacks = canonicalRackCodes.filter((code) =>
    presentRacks.some((r) => r.label === code || r.data?.rackCode === code),
  );
  assert(
    'All 5 canonical racks present in mode=ALL nodes',
    matchedRacks.length === canonicalRackCodes.length,
    `Found ${matchedRacks.length}/5: ${matchedRacks.join(', ')} (Total racks in nodes: ${presentRacks.length})`,
  );

  // 2b. All 10 Canonical Switches
  const canonicalSwitchNames = [
    'SW-CORE-01',
    'SW-CORE-02',
    'SW-DIST-01',
    'SW-DIST-02',
    'SW-ACC-F1-01',
    'SW-ACC-F2-01',
    'SW-ACC-WH-01',
    'SW-ACC-WH-02',
    'SW-CCTV-01',
    'SW-CCTV-02',
  ];
  const presentSwitches = allData.nodes.filter((n) => n.type === 'SWITCH');
  const matchedSwitches = canonicalSwitchNames.filter((name) =>
    presentSwitches.some((s) => s.label === name),
  );
  assert(
    'All 10 canonical switches present in mode=ALL nodes',
    matchedSwitches.length === canonicalSwitchNames.length,
    `Found ${matchedSwitches.length}/10: ${matchedSwitches.join(', ')} (Total switches in nodes: ${presentSwitches.length})`,
  );

  // 2c. Canonical Trunk Links (Uplinks)
  const trunkEdges = allData.edges.filter(
    (e) => e.linkType === 'UPLINK' || e.portRole === 'UPLINK',
  );
  assert(
    'Canonical inter-switch trunk links present (>= 12 links)',
    trunkEdges.length >= 12,
    `Found ${trunkEdges.length} inter-switch trunk edges`,
  );

  // 2d. Canonical Endpoints (Servers, APs, NVRs, Cameras)
  const endpointsInAll = allData.nodes.filter((n) =>
    ['SERVER', 'ACCESS_POINT', 'AP', 'CAMERA', 'NVR', 'ASSET'].includes(n.type),
  );
  const serverCount = allData.nodes.filter((n) => n.type === 'SERVER').length;
  const apCount = allData.nodes.filter((n) => n.type === 'ACCESS_POINT' || n.type === 'AP').length;
  const nvrCount = allData.nodes.filter((n) => n.type === 'NVR').length;
  const cameraCount = allData.nodes.filter((n) => n.type === 'CAMERA').length;

  assert(
    'Endpoints present across servers, APs, NVRs, cameras in mode=ALL',
    serverCount >= 4 && apCount >= 6 && nvrCount >= 2 && cameraCount >= 15,
    `Servers: ${serverCount}, APs: ${apCount}, NVRs: ${nvrCount}, Cameras: ${cameraCount} (Total: ${endpointsInAll.length})`,
  );

  // 2e. Zero Dangling Edges in mode=ALL
  const allNodeIds = new Set(allData.nodes.map((n) => n.id));
  const danglingInAll = allData.edges.filter((e) => {
    const src = e.sourceNodeId || e.source;
    const tgt = e.targetNodeId || e.target;
    return !allNodeIds.has(src) || !allNodeIds.has(tgt);
  });
  assert(
    'Zero dangling edges in mode=ALL (all edge sources and targets exist in nodes)',
    danglingInAll.length === 0,
    `Found ${danglingInAll.length} dangling edges out of ${allData.edges.length}`,
  );

  // --------------------------------------------------------------------------
  // Phase 3: Mode = NETWORK Perspective Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 3: Mode = NETWORK Perspective Verification ---');
  const netRes = await fetch(`${BASE_URL}/network/topology?mode=NETWORK`, { headers: authHeaders });
  assert('GET /network/topology?mode=NETWORK returns HTTP 200', netRes.status === 200);

  const netJson = await netRes.json();
  const netData = netJson.data;

  // 3a. 100% Exclusion of Cameras and NVRs
  const netCameras = netData.nodes.filter((n) => n.type === 'CAMERA');
  const netNvrs = netData.nodes.filter((n) => n.type === 'NVR');
  assert(
    'Cameras are 100% excluded in mode=NETWORK',
    netCameras.length === 0,
    `Camera count: ${netCameras.length}`,
  );
  assert(
    'NVRs are 100% excluded in mode=NETWORK',
    netNvrs.length === 0,
    `NVR count: ${netNvrs.length}`,
  );

  // 3b. Endpoints Contain Only Servers and APs
  const netEndpoints = netData.nodes.filter((n) =>
    ['SERVER', 'ACCESS_POINT', 'AP', 'CAMERA', 'NVR', 'ASSET'].includes(n.type),
  );
  const netInvalidEndpoints = netEndpoints.filter(
    (n) => n.type !== 'SERVER' && n.type !== 'ACCESS_POINT' && n.type !== 'AP',
  );
  assert(
    'Endpoints contain only Servers and Access Points in mode=NETWORK',
    netEndpoints.length > 0 && netInvalidEndpoints.length === 0,
    `Total endpoints: ${netEndpoints.length} (Servers: ${netData.nodes.filter((n) => n.type === 'SERVER').length}, APs: ${netData.nodes.filter((n) => n.type === 'ACCESS_POINT').length})`,
  );

  // 3c. Zero Dangling Edges in mode=NETWORK
  const netNodeIds = new Set(netData.nodes.map((n) => n.id));
  const danglingInNet = netData.edges.filter((e) => {
    const src = e.sourceNodeId || e.source;
    const tgt = e.targetNodeId || e.target;
    return !netNodeIds.has(src) || !netNodeIds.has(tgt);
  });
  assert(
    'Zero dangling edges in mode=NETWORK',
    danglingInNet.length === 0,
    `Found ${danglingInNet.length} dangling edges out of ${netData.edges.length}`,
  );

  // --------------------------------------------------------------------------
  // Phase 4: Mode = CCTV Perspective Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 4: Mode = CCTV Perspective Verification ---');
  const cctvRes = await fetch(`${BASE_URL}/network/topology?mode=CCTV`, { headers: authHeaders });
  assert('GET /network/topology?mode=CCTV returns HTTP 200', cctvRes.status === 200);

  const cctvJson = await cctvRes.json();
  const cctvData = cctvJson.data;

  // 4a. 100% Exclusion of Servers and APs
  const cctvServers = cctvData.nodes.filter((n) => n.type === 'SERVER');
  const cctvAps = cctvData.nodes.filter((n) => n.type === 'ACCESS_POINT' || n.type === 'AP');
  assert(
    'Servers are 100% excluded in mode=CCTV',
    cctvServers.length === 0,
    `Server count: ${cctvServers.length}`,
  );
  assert(
    'Access Points are 100% excluded in mode=CCTV',
    cctvAps.length === 0,
    `AP count: ${cctvAps.length}`,
  );

  // 4b. CCTV Cameras and NVRs Present
  const cctvCameras = cctvData.nodes.filter((n) => n.type === 'CAMERA');
  const cctvNvrs = cctvData.nodes.filter((n) => n.type === 'NVR');
  assert(
    'CCTV Cameras are present in mode=CCTV (>= 15)',
    cctvCameras.length >= 15,
    `Camera count: ${cctvCameras.length}`,
  );
  assert(
    'Recording NVRs are present in mode=CCTV (>= 2)',
    cctvNvrs.length >= 2,
    `NVR count: ${cctvNvrs.length}`,
  );

  // 4c. Upstream Trunk Switches Connected to CCTV Switches are Present
  const cctvSwitches = cctvData.nodes.filter((n) => n.type === 'SWITCH');
  const hasUpstreamDistribution = cctvSwitches.some(
    (s) =>
      s.label === 'SW-DIST-02' || s.subType === 'DISTRIBUTION' || s.data?.role === 'DISTRIBUTION',
  );
  assert(
    'Upstream trunk switch feeding CCTV (SW-DIST-02) is present in mode=CCTV',
    hasUpstreamDistribution,
    `Switches present: ${cctvSwitches.map((s) => s.label).join(', ')}`,
  );

  // 4d. Zero Dangling Edges in mode=CCTV
  const cctvNodeIds = new Set(cctvData.nodes.map((n) => n.id));
  const danglingInCctv = cctvData.edges.filter((e) => {
    const src = e.sourceNodeId || e.source;
    const tgt = e.targetNodeId || e.target;
    return !cctvNodeIds.has(src) || !cctvNodeIds.has(tgt);
  });
  assert(
    'Zero dangling edges in mode=CCTV',
    danglingInCctv.length === 0,
    `Found ${danglingInCctv.length} dangling edges out of ${cctvData.edges.length}`,
  );

  // --------------------------------------------------------------------------
  // Phase 5: Finite Coordinates & Position Structure Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 5: Coordinate Structure & Finite Geometry ---');
  for (const [modeName, data] of [
    ['ALL', allData],
    ['NETWORK', netData],
    ['CCTV', cctvData],
  ]) {
    let nonFinite = 0;
    let missingPos = 0;
    let mismatchPos = 0;

    for (const node of data.nodes) {
      if (
        typeof node.x !== 'number' ||
        !Number.isFinite(node.x) ||
        typeof node.y !== 'number' ||
        !Number.isFinite(node.y)
      ) {
        nonFinite++;
      }
      if (!node.position || typeof node.position !== 'object') {
        missingPos++;
      } else {
        if (
          typeof node.position.x !== 'number' ||
          !Number.isFinite(node.position.x) ||
          typeof node.position.y !== 'number' ||
          !Number.isFinite(node.position.y)
        ) {
          nonFinite++;
        }
        if (node.position.x !== node.x || node.position.y !== node.y) {
          mismatchPos++;
        }
      }
    }

    assert(
      `Mode=${modeName}: Every node has finite coordinates (x, y) and structured position`,
      nonFinite === 0 && missingPos === 0 && mismatchPos === 0,
      `Audited ${data.nodes.length} nodes (nonFinite: ${nonFinite}, missingPos: ${missingPos}, mismatchPos: ${mismatchPos})`,
    );
  }

  // --------------------------------------------------------------------------
  // Phase 6: Telemetry & Summary Metrics Accuracy Verification
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 6: Telemetry & Summary Metrics Integrity ---');
  for (const [modeName, data] of [
    ['ALL', allData],
    ['NETWORK', netData],
    ['CCTV', cctvData],
  ]) {
    const { nodes, edges, summaryMetrics, metrics } = data;

    const actual = {
      totalNodes: nodes.length,
      totalSwitches: nodes.filter((n) => n.type === 'SWITCH').length,
      totalRacks: nodes.filter((n) => n.type === 'RACK').length,
      totalCameras: nodes.filter((n) => n.type === 'CAMERA').length,
      totalNvrs: nodes.filter((n) => n.type === 'NVR').length,
      totalServers: nodes.filter((n) => n.type === 'SERVER').length,
      totalAccessPoints: nodes.filter((n) => n.type === 'ACCESS_POINT' || n.type === 'AP').length,
      totalEdges: edges.length,
      activeLinks: edges.filter((e) => e.status === 'ACTIVE').length,
      degradedLinks: edges.filter((e) => e.status === 'CONNECTED_NO_SIGNAL').length,
      downLinks: edges.filter((e) => e.status === 'DOWN').length,
    };

    let metricErrors = 0;
    for (const [k, v] of Object.entries(actual)) {
      if (summaryMetrics[k] !== v) {
        metricErrors++;
        console.error(`Mode=${modeName} ${k} mismatch: expected ${v}, got ${summaryMetrics[k]}`);
      }
    }

    assert(
      `Mode=${modeName}: summaryMetrics strictly matches actual node and edge counts`,
      metricErrors === 0,
      `All 11 metrics strictly synchronized`,
    );

    assert(
      `Mode=${modeName}: metrics alias strictly equals summaryMetrics`,
      JSON.stringify(metrics) === JSON.stringify(summaryMetrics),
    );
  }

  // --------------------------------------------------------------------------
  // Phase 7: Adversarial Edge Cases & Guard Defenses
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 7: Adversarial Input & Guard Defenses ---');

  // 7a. Fallback on invalid view mode
  const invalidModeRes = await fetch(`${BASE_URL}/network/topology?mode=INVALID_PERSPECTIVE`, {
    headers: authHeaders,
  });
  assert(
    'Invalid mode parameter defaults safely without server crash (HTTP 200 or 400)',
    invalidModeRes.status === 200 || invalidModeRes.status === 400,
    `status: ${invalidModeRes.status}`,
  );

  // 7b. Self-loop link rejection
  const testSwitch = presentSwitches[0];
  const portRes = await fetch(`${BASE_URL}/network/switches/${testSwitch.id}`, {
    headers: authHeaders,
  });
  const portData = await portRes.json();
  const samplePort = portData?.data?.ports?.[0];

  if (samplePort) {
    const selfLoopRes = await fetch(`${BASE_URL}/network/topology/links`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        sourcePortId: samplePort.id,
        targetPortId: samplePort.id,
      }),
    });
    assert(
      'Self-loop link request (sourcePortId === targetPortId) rejected with HTTP 400',
      selfLoopRes.status === 400,
      `status: ${selfLoopRes.status}`,
    );
  }

  // 7c. Layout persistence batch bounded check
  const layoutRes = await fetch(`${BASE_URL}/network/topology/layout`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      viewMode: 'ALL',
      positions: [
        {
          nodeId: testSwitch.id,
          nodeType: 'SWITCH',
          x: 200,
          y: 250,
          isPinned: true,
        },
      ],
    }),
  });
  assert(
    'PATCH /network/topology/layout succeeds for valid coordinates',
    layoutRes.status === 200,
    `status: ${layoutRes.status}`,
  );

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(
    `  EMPIRICAL CHALLENGE SUMMARY: ${passedAssertions}/${totalAssertions} Assertions Passed`,
  );
  console.log(`  Failures: ${failedAssertions}`);
  console.log('========================================================================\n');

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during challenge harness execution:', err);
  process.exit(1);
});
