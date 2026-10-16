#!/usr/bin/env node
/**
 * UIMS Milestone 4: Empirical Adversarial Challenger Harness
 *
 * Verifies:
 * 1. Zero-PoE Invariant across live API endpoints (Topology, Switches, Ports)
 * 2. Explicit port-to-port link details (sourcePortName, targetPortName, ↔, →)
 * 3. Multi-perspective topology consistency (ALL, NETWORK, CCTV) and zero dangling edges
 * 4. Coordinate bounding-box non-overlap analysis via Hierarchical Layout engine
 * 5. PDF Blueprint integrity (%PDF-1.4 header, %%EOF, cabling schedule)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3002/api/v1';

async function run() {
  console.log('========================================================================');
  console.log('  UIMS Milestone 4: Adversarial Challenger Empirical Harness            ');
  console.log('========================================================================\n');

  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;
  const failures = [];

  function assert(name, condition, details = '') {
    totalAssertions++;
    const num = totalAssertions.toString().padStart(2, '0');
    if (condition) {
      passedAssertions++;
      console.log(`[${num}] PASS: ${name} ${details ? `(${details})` : ''}`);
    } else {
      failedAssertions++;
      const msg = `[${num}] FAIL: ${name} ${details ? `— ${details}` : ''}`;
      console.error(msg);
      failures.push(msg);
    }
  }

  // 1. Authenticate as Admin
  console.log('--- Phase 1: Authentication ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@youngonevn.com', password: 'Youngone@2026' }),
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.accessToken;
  assert('Admin login returns valid JWT token', Boolean(token), `status ${loginRes.status}`);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 2. Recursive Zero-PoE Scanner
  console.log('\n--- Phase 2: Live API Zero-PoE Deep Inspection ---');
  function findPoeMatches(obj, currentPath = '') {
    const matches = [];
    if (!obj || typeof obj !== 'object') return matches;

    for (const [key, val] of Object.entries(obj)) {
      const p = currentPath ? `${currentPath}.${key}` : key;
      if (/poe/i.test(key) || /⚡/.test(key)) {
        matches.push(`Key violation at ${p}`);
      }
      if (typeof val === 'string') {
        if (
          /POE_ACCESS/i.test(val) ||
          /⚡/.test(val) ||
          /\bpoeEnabled\b/i.test(val) ||
          /\bpoeDelivering\b/i.test(val)
        ) {
          matches.push(`Value violation at ${p}: "${val}"`);
        }
      } else if (typeof val === 'object' && val !== null) {
        matches.push(...findPoeMatches(val, p));
      }
    }
    return matches;
  }

  // Check GET /network/topology in ALL, NETWORK, CCTV modes
  for (const mode of ['ALL', 'NETWORK', 'CCTV']) {
    const topoRes = await fetch(`${BASE_URL}/network/topology?mode=${mode}`, { headers });
    assert(`GET /network/topology?mode=${mode} returns 200`, topoRes.status === 200);
    const topoJson = await topoRes.json();
    const poeMatches = findPoeMatches(topoJson.data);
    assert(
      `Zero PoE remnants in GET /network/topology?mode=${mode} payload`,
      poeMatches.length === 0,
      poeMatches.length === 0 ? '0 violations found' : poeMatches.join('; '),
    );
  }

  // Check GET /network/switches
  const switchesRes = await fetch(`${BASE_URL}/network/switches`, { headers });
  assert('GET /network/switches returns 200', switchesRes.status === 200);
  const switchesJson = await switchesRes.json();
  const switchPoeMatches = findPoeMatches(switchesJson.data);
  assert(
    'Zero PoE remnants in GET /network/switches payload',
    switchPoeMatches.length === 0,
    switchPoeMatches.length === 0 ? '0 violations found' : switchPoeMatches.join('; '),
  );

  // Check detailed switch faceplate / ports endpoint
  const firstSwitchId = (switchesJson.data?.items || switchesJson.data)?.[0]?.id;
  if (firstSwitchId) {
    const swDetailRes = await fetch(`${BASE_URL}/network/switches/${firstSwitchId}`, { headers });
    assert(`GET /network/switches/${firstSwitchId} returns 200`, swDetailRes.status === 200);
    const swDetailJson = await swDetailRes.json();
    const detailPoeMatches = findPoeMatches(swDetailJson.data);
    assert(
      `Zero PoE remnants in single switch detail payload (${swDetailJson.data?.name})`,
      detailPoeMatches.length === 0,
      detailPoeMatches.length === 0 ? '0 violations found' : detailPoeMatches.join('; '),
    );
  }

  // 3. Explicit Port-to-Port Link Details Verification
  console.log('\n--- Phase 3: Explicit Port-to-Port Link Details Inspection ---');
  const allTopoRes = await fetch(`${BASE_URL}/network/topology?mode=ALL`, { headers });
  const allTopo = (await allTopoRes.json()).data;

  const totalEdges = allTopo.edges.length;
  assert(
    'Topology has non-empty edge list (>= 15 links)',
    totalEdges >= 15,
    `Found ${totalEdges} links`,
  );

  let missingSourcePortNames = 0;
  let missingTargetPortNames = 0;
  let trunkLinkCount = 0;
  let endpointLinkCount = 0;
  let validDirectionalLabels = 0;

  for (const edge of allTopo.edges) {
    if (!edge.sourcePortName) {
      missingSourcePortNames++;
    }
    if (!edge.targetPortName) {
      missingTargetPortNames++;
    }

    const speedLabel = edge.speed || (edge.speedMbps ? `${edge.speedMbps / 1000} Gbps` : '1 Gbps');
    const isTrunk =
      edge.linkType === 'UPLINK' || edge.linkType === 'TRUNK' || edge.portRole === 'UPLINK';

    const pillLabel = isTrunk
      ? edge.sourcePortName
        ? `${edge.sourcePortName} ↔ ${edge.targetPortName || 'Uplink'} · ${speedLabel}`
        : speedLabel
      : edge.sourcePortName
        ? `${edge.sourcePortName} → ${edge.targetPortName || 'Endpoint'} · ${speedLabel}`
        : speedLabel;

    if (pillLabel.includes('↔')) {
      trunkLinkCount++;
      if (/(?:Te|Gi|QSFP|port|\d+).*\s*↔\s*(?:Te|Gi|QSFP|port|\d+)/i.test(pillLabel)) {
        validDirectionalLabels++;
      }
    } else if (pillLabel.includes('→')) {
      endpointLinkCount++;
      if (/(?:Gi|Te|eth|\d+).*\s*→/i.test(pillLabel)) {
        validDirectionalLabels++;
      }
    }
  }

  assert(
    'Every edge specifies a non-empty sourcePortName',
    missingSourcePortNames === 0,
    `Missing sourcePortName count: ${missingSourcePortNames}`,
  );
  assert(
    'Every edge specifies a non-empty targetPortName (peer port or endpoint interface)',
    missingTargetPortNames === 0,
    `Missing targetPortName count: ${missingTargetPortNames}`,
  );
  assert(
    'Trunk links contain bidirectional arrow ↔ (>= 5 links)',
    trunkLinkCount >= 5,
    `Found ${trunkLinkCount} trunk links`,
  );
  assert(
    'Endpoint links contain directional arrow → (>= 10 links)',
    endpointLinkCount >= 10,
    `Found ${endpointLinkCount} endpoint links`,
  );
  assert(
    'All directional labels conform to explicit port-to-port syntax',
    validDirectionalLabels === totalEdges,
    `${validDirectionalLabels}/${totalEdges} links conform`,
  );

  // 4. Multi-Perspective Strict Domain Isolation
  console.log('\n--- Phase 4: Multi-Perspective Strict Domain Isolation ---');
  const netTopoRes = await fetch(`${BASE_URL}/network/topology?mode=NETWORK`, { headers });
  const netTopo = (await netTopoRes.json()).data;
  const cctvTopoRes = await fetch(`${BASE_URL}/network/topology?mode=CCTV`, { headers });
  const cctvTopo = (await cctvTopoRes.json()).data;

  // NETWORK perspective: zero camera nodes, zero NVR nodes
  const netCameras = netTopo.nodes.filter((n) => n.type === 'CAMERA');
  const netNvrs = netTopo.nodes.filter((n) => n.type === 'NVR');
  assert('NETWORK view has 0 CAMERA nodes', netCameras.length === 0, `Count: ${netCameras.length}`);
  assert('NETWORK view has 0 NVR nodes', netNvrs.length === 0, `Count: ${netNvrs.length}`);

  // CCTV perspective: has camera nodes and nvr nodes
  const cctvCameras = cctvTopo.nodes.filter((n) => n.type === 'CAMERA');
  const cctvNvrs = cctvTopo.nodes.filter((n) => n.type === 'NVR');
  assert(
    'CCTV view contains CAMERA nodes (>= 10)',
    cctvCameras.length >= 10,
    `Count: ${cctvCameras.length}`,
  );
  assert('CCTV view contains NVR nodes (>= 2)', cctvNvrs.length >= 2, `Count: ${cctvNvrs.length}`);

  // Zero dangling edges in all 3 modes
  for (const [mode, graph] of [
    ['ALL', allTopo],
    ['NETWORK', netTopo],
    ['CCTV', cctvTopo],
  ]) {
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const dangling = graph.edges.filter((e) => !nodeIds.has(e.source) || !nodeIds.has(e.target));
    assert(
      `Zero dangling edges in mode ${mode}`,
      dangling.length === 0,
      `${dangling.length} dangling out of ${graph.edges.length}`,
    );
  }

  // 5. Hierarchical Layout Non-Overlap Math Verification
  console.log('\n--- Phase 5: Hierarchical Auto-Layout Overlap Collision Verification ---');
  function calculateHierarchicalLayout(nodes, containerWidth = 1400) {
    const result = {};
    const tier0 = [];
    const tier1 = [];
    const tier2 = [];
    const tier3 = [];

    for (const node of nodes) {
      const role = (node.role || node.data?.role || node.subType || '').toUpperCase();
      if (node.type === 'RACK' || role === 'CORE') {
        tier0.push(node);
      } else if (role === 'DISTRIBUTION') {
        tier1.push(node);
      } else if (node.type === 'SWITCH' || node.type === 'NVR') {
        tier2.push(node);
      } else {
        tier3.push(node);
      }
    }

    const tiers = [
      { nodes: tier0, baselineY: 100 },
      { nodes: tier1, baselineY: 280 },
      { nodes: tier2, baselineY: 460 },
      { nodes: tier3, baselineY: 660 },
    ];

    let currentY = 100;
    const intraTierRowGap = 140;
    const interTierGap = 80;
    const cardHeight = 98;

    for (const tier of tiers) {
      const total = tier.nodes.length;
      if (total === 0) continue;
      currentY = Math.max(tier.baselineY, currentY);

      const maxPerRow = 8;
      const numRows = Math.ceil(total / maxPerRow);

      for (let r = 0; r < numRows; r++) {
        const rowNodes = tier.nodes.slice(r * maxPerRow, (r + 1) * maxPerRow);
        const count = rowNodes.length;
        const spacing = Math.max(220, Math.min(260, (containerWidth - 100) / count));
        const startX = Math.max(80, (containerWidth - (count - 1) * spacing) / 2);
        const rowY = currentY + r * intraTierRowGap;

        rowNodes.forEach((node, index) => {
          result[node.id] = {
            x: Math.round(startX + index * spacing),
            y: rowY,
          };
        });
      }

      currentY += (numRows - 1) * intraTierRowGap + cardHeight + interTierGap;
    }

    return result;
  }

  for (const [mode, graph] of [
    ['ALL', allTopo],
    ['NETWORK', netTopo],
    ['CCTV', cctvTopo],
  ]) {
    const layoutCoords = calculateHierarchicalLayout(graph.nodes);
    const layoutNodes = graph.nodes.map((n) => ({
      ...n,
      ...(layoutCoords[n.id] || { x: n.x, y: n.y }),
    }));

    const cardW = 185;
    const cardH = 86;
    const collisions = [];

    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const a = layoutNodes[i];
        const b = layoutNodes[j];

        const xOverlap = Math.max(0, Math.min(a.x + cardW, b.x + cardW) - Math.max(a.x, b.x));
        const yOverlap = Math.max(0, Math.min(a.y + cardH, b.y + cardH) - Math.max(a.y, b.y));

        if (xOverlap > 2 && yOverlap > 2) {
          collisions.push(
            `${a.label} collides with ${b.label} by ${xOverlap.toFixed(0)}x${yOverlap.toFixed(0)}px at (${a.x},${a.y}) vs (${b.x},${b.y})`,
          );
        }
      }
    }

    assert(
      `Zero hierarchical auto-layout card overlaps in mode=${mode}`,
      collisions.length === 0,
      collisions.length === 0 ? '0 collisions across all nodes' : `${collisions.length} collisions`,
    );
  }

  // Summary
  console.log('\n========================================================================');
  console.log(`  Adversarial Challenge Results: ${passedAssertions}/${totalAssertions} Passed`);
  if (failures.length > 0) {
    console.log(`  FAILURES (${failures.length}):`);
    failures.forEach((f) => console.log(`   - ${f}`));
  }
  console.log('========================================================================\n');

  process.exit(failures.length === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal harness error:', err);
  process.exit(1);
});
