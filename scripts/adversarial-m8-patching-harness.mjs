#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(path.resolve(__dirname, '../apps/api/package.json'));
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT || 5433),
  user: process.env.DATABASE_USER || 'uims',
  password: process.env.DATABASE_PASSWORD || 'uims_secret_2026',
  database: process.env.DATABASE_NAME || 'uims_db',
  max: 5,
  connectionTimeoutMillis: 5000,
});

const API_BASE = 'http://localhost:3002/api/v1';

async function main() {
  console.log('========================================================================');
  console.log('  UIMS Milestone 8: Adversarial Patching & Transaction Integrity Test   ');
  console.log('========================================================================\n');

  let token = null;

  // 1. Authenticate to API
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@youngonevn.com', password: 'Youngone@2026' }),
    });
    const loginJson = await loginRes.json();
    if (!loginJson.success || !loginJson.data?.accessToken) {
      throw new Error(`Failed to login: ${JSON.stringify(loginJson)}`);
    }
    token = loginJson.data.accessToken;
    console.log('✅ Authenticated successfully as Enterprise Admin.');
  } catch (err) {
    console.error('❌ Authentication failed:', err);
    process.exit(1);
  }

  const results = [];

  async function runSubtest(name, fn) {
    process.stdout.write(`Testing: ${name}... `);
    try {
      const outcome = await fn();
      console.log(`\x1b[32mPASS\x1b[0m ${outcome ? `(${outcome})` : ''}`);
      results.push({ name, pass: true, detail: outcome });
    } catch (err) {
      console.log(`\x1b[31mFAIL\x1b[0m: ${err.message}`);
      results.push({ name, pass: false, error: err.message, stack: err.stack });
    }
  }

  try {
    // Prepare test entities: Fetch two switches and their ports, an asset, and a VLAN
    const swRes = await pool.query(
      `SELECT id, name FROM "NetworkSwitch" ORDER BY name ASC LIMIT 3;`,
    );
    if (swRes.rows.length < 2) {
      throw new Error('Need at least 2 switches in DB for testing');
    }
    const sw1 = swRes.rows[0];
    const sw2 = swRes.rows[1];
    const sw3 = swRes.rows[2] || sw2;

    const ports1Res = await pool.query(
      `SELECT id, "portNumber", name, "switchId", "connectedPortId", "connectedAssetId", mode, "vlanId", "poeEnabled" 
       FROM "SwitchPort" WHERE "switchId" = $1::text ORDER BY "portNumber" ASC LIMIT 5;`,
      [sw1.id],
    );
    const ports2Res = await pool.query(
      `SELECT id, "portNumber", name, "switchId", "connectedPortId", "connectedAssetId", mode, "vlanId", "poeEnabled" 
       FROM "SwitchPort" WHERE "switchId" = $1::text ORDER BY "portNumber" ASC LIMIT 5;`,
      [sw2.id],
    );
    const ports3Res = await pool.query(
      `SELECT id, "portNumber", name, "switchId", "connectedPortId", "connectedAssetId", mode, "vlanId", "poeEnabled" 
       FROM "SwitchPort" WHERE "switchId" = $1::text ORDER BY "portNumber" DESC LIMIT 5;`,
      [sw3.id],
    );

    const assetRes = await pool.query(`SELECT id, "assetTag" FROM "Asset" LIMIT 1;`);
    const asset = assetRes.rows[0];

    const vlanRes = await pool.query(`SELECT id, "vlanNumber" FROM "VLAN" LIMIT 1;`);
    const vlan = vlanRes.rows[0];

    // Pick dedicated test ports to avoid disturbing existing seeded production uplinks
    const portA = ports1Res.rows[3] || ports1Res.rows[0];
    const portA_sameSw = ports1Res.rows[4] || ports1Res.rows[1];
    const portB = ports2Res.rows[3] || ports2Res.rows[0];
    const portC = ports3Res.rows[0];

    console.log(
      `Using test ports: PortA (${portA.id} on ${sw1.name}), PortA_same (${portA_sameSw.id}), PortB (${portB.id} on ${sw2.name}), PortC (${portC.id})`,
    );
    console.log(
      `Using test asset: ${asset?.assetTag} (${asset?.id}), test vlan: ${vlan?.vlanNumber} (${vlan?.id})\n`,
    );

    // =========================================================================
    // a. Self-loop payload (sourcePortId === targetPortId) throws BadRequestException (400)
    // =========================================================================
    await runSubtest('a. Self-loop payload (sourcePortId === targetPortId)', async () => {
      const res = await fetch(`${API_BASE}/network/topology/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourcePortId: portA.id,
          targetPortId: portA.id,
        }),
      });
      const data = await res.json();
      if (res.status !== 400) {
        throw new Error(`Expected HTTP 400, got ${res.status}: ${JSON.stringify(data)}`);
      }
      if (!data.message?.includes('self-loop')) {
        throw new Error(`Expected message mentioning self-loop, got: ${data.message}`);
      }
      return `HTTP 400 rejected with "${data.message}"`;
    });

    // =========================================================================
    // b. Same-switch trunk payload (sourcePort.switchId === targetPort.switchId) throws BadRequestException (400)
    // =========================================================================
    await runSubtest(
      'b. Same-switch trunk payload (sourcePort.switchId === targetPort.switchId)',
      async () => {
        const res = await fetch(`${API_BASE}/network/topology/links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sourcePortId: portA.id,
            targetPortId: portA_sameSw.id,
          }),
        });
        const data = await res.json();
        if (res.status !== 400) {
          throw new Error(`Expected HTTP 400, got ${res.status}: ${JSON.stringify(data)}`);
        }
        if (!data.message?.includes('same switch')) {
          throw new Error(`Expected message mentioning same switch, got: ${data.message}`);
        }
        return `HTTP 400 rejected with "${data.message}"`;
      },
    );

    // =========================================================================
    // c. Stale reverse link eviction: create deliberate reverse conflict (port C points to port A),
    //    then connect port A to port B. Confirm patch succeeds without P2002 and port C is cleanly evicted.
    // =========================================================================
    await runSubtest(
      'c. Stale reverse link eviction (port C -> port A, then connect port A -> port B)',
      async () => {
        // Step 1: Clean any existing forward and reverse links on portA, portB, portC
        await pool.query(
          `UPDATE "SwitchPort" SET "connectedPortId" = NULL, "connectedSwitchId" = NULL, "connectedAssetId" = NULL 
         WHERE id IN ($1::text, $2::text, $3::text) OR "connectedPortId" IN ($1::text, $2::text, $3::text)`,
          [portA.id, portB.id, portC.id],
        );

        // Step 2: Inject deliberate reverse conflict: Port C points to Port A
        await pool.query(
          `UPDATE "SwitchPort" SET "connectedPortId" = $1, "connectedSwitchId" = $2 WHERE id = $3`,
          [portA.id, sw1.id, portC.id],
        );

        // Verify deliberate conflict in DB
        const cCheck = await pool.query(
          `SELECT "connectedPortId" FROM "SwitchPort" WHERE id = $1`,
          [portC.id],
        );
        if (cCheck.rows[0].connectedPortId !== portA.id) {
          throw new Error('Failed to set up initial deliberate reverse conflict');
        }

        // Step 3: Now connect Port A to Port B via API
        const res = await fetch(`${API_BASE}/network/topology/links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sourcePortId: portA.id,
            targetPortId: portB.id,
            mode: 'TRUNK',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(`Link creation failed: HTTP ${res.status}: ${JSON.stringify(data)}`);
        }

        // Step 4: Verify in DB that Port C was cleanly evicted (connectedPortId is NULL)
        const cPost = await pool.query(`SELECT "connectedPortId" FROM "SwitchPort" WHERE id = $1`, [
          portC.id,
        ]);
        if (cPost.rows[0].connectedPortId !== null) {
          throw new Error(
            `Port C was NOT cleanly evicted! connectedPortId is still ${cPost.rows[0].connectedPortId}`,
          );
        }

        // Step 5: Verify Port A and Port B are mutually connected
        const aPost = await pool.query(`SELECT "connectedPortId" FROM "SwitchPort" WHERE id = $1`, [
          portA.id,
        ]);
        const bPost = await pool.query(`SELECT "connectedPortId" FROM "SwitchPort" WHERE id = $1`, [
          portB.id,
        ]);
        if (
          aPost.rows[0].connectedPortId !== portB.id ||
          bPost.rows[0].connectedPortId !== portA.id
        ) {
          throw new Error(
            `Ports A and B are not symmetrically linked: A=${aPost.rows[0].connectedPortId}, B=${bPost.rows[0].connectedPortId}`,
          );
        }

        return 'Clean eviction of Port C without P2002 error, Port A & B symmetrically linked';
      },
    );

    // =========================================================================
    // d. Endpoint asset collision: connect port A to asset X, then connect port B to asset X.
    //    Confirm port A is evicted and port B is connected to asset X.
    // =========================================================================
    await runSubtest(
      'd. Endpoint asset collision (port A -> asset X, then port B -> asset X)',
      async () => {
        // Step 1: Unpatch portA and portB
        await fetch(`${API_BASE}/network/topology/links/${portA.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetch(`${API_BASE}/network/topology/links/${portB.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        // Step 2: Connect Port A to Asset X
        const resA = await fetch(`${API_BASE}/network/topology/links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sourcePortId: portA.id,
            targetAssetId: asset.id,
          }),
        });
        const dataA = await resA.json();
        if (!resA.ok || !dataA.success) {
          throw new Error(
            `Connecting Port A to Asset failed: HTTP ${resA.status}: ${JSON.stringify(dataA)}`,
          );
        }

        // Verify Port A has connectedAssetId = asset.id
        const aCheck = await pool.query(
          `SELECT "connectedAssetId" FROM "SwitchPort" WHERE id = $1`,
          [portA.id],
        );
        if (aCheck.rows[0].connectedAssetId !== asset.id) {
          throw new Error(
            `Port A connectedAssetId is not asset.id: ${aCheck.rows[0].connectedAssetId}`,
          );
        }

        // Step 3: Connect Port B to the same Asset X
        const resB = await fetch(`${API_BASE}/network/topology/links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sourcePortId: portB.id,
            targetAssetId: asset.id,
          }),
        });
        const dataB = await resB.json();
        if (!resB.ok || !dataB.success) {
          throw new Error(
            `Connecting Port B to Asset failed: HTTP ${resB.status}: ${JSON.stringify(dataB)}`,
          );
        }

        // Step 4: Verify Port A was evicted (connectedAssetId is NULL) and Port B has asset.id
        const aFinal = await pool.query(
          `SELECT "connectedAssetId" FROM "SwitchPort" WHERE id = $1`,
          [portA.id],
        );
        const bFinal = await pool.query(
          `SELECT "connectedAssetId" FROM "SwitchPort" WHERE id = $1`,
          [portB.id],
        );

        if (aFinal.rows[0].connectedAssetId !== null) {
          throw new Error(
            `Port A was NOT evicted! connectedAssetId = ${aFinal.rows[0].connectedAssetId}`,
          );
        }
        if (bFinal.rows[0].connectedAssetId !== asset.id) {
          throw new Error(
            `Port B is NOT connected to asset! connectedAssetId = ${bFinal.rows[0].connectedAssetId}`,
          );
        }

        return 'Port A evicted cleanly, Port B now connected to Asset X';
      },
    );

    // =========================================================================
    // e. Unpatch symmetry: delete link on port A, confirm port B is also disconnected.
    // =========================================================================
    await runSubtest(
      'e. Unpatch symmetry (delete link on port A, confirm port B disconnected)',
      async () => {
        // Step 1: Connect port A and port B
        const linkRes = await fetch(`${API_BASE}/network/topology/links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sourcePortId: portA.id,
            targetPortId: portB.id,
          }),
        });
        const linkData = await linkRes.json();
        if (!linkRes.ok || !linkData.success) {
          throw new Error(`Failed to create link between A and B: ${JSON.stringify(linkData)}`);
        }

        // Step 2: Delete link on Port A
        const delRes = await fetch(`${API_BASE}/network/topology/links/${portA.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const delData = await delRes.json();
        if (!delRes.ok || !delData.success) {
          throw new Error(`Delete failed: HTTP ${delRes.status}: ${JSON.stringify(delData)}`);
        }

        // Step 3: Check DB for both Port A and Port B
        const aPost = await pool.query(
          `SELECT "connectedPortId", "operStatus" FROM "SwitchPort" WHERE id = $1`,
          [portA.id],
        );
        const bPost = await pool.query(
          `SELECT "connectedPortId", "operStatus" FROM "SwitchPort" WHERE id = $1`,
          [portB.id],
        );

        if (aPost.rows[0].connectedPortId !== null) {
          throw new Error(`Port A still has connectedPortId: ${aPost.rows[0].connectedPortId}`);
        }
        if (bPost.rows[0].connectedPortId !== null) {
          throw new Error(`Port B still has connectedPortId: ${bPost.rows[0].connectedPortId}`);
        }
        if (aPost.rows[0].operStatus !== 'DOWN' || bPost.rows[0].operStatus !== 'DOWN') {
          throw new Error(
            `Oper status not DOWN: Port A = ${aPost.rows[0].operStatus}, Port B = ${bPost.rows[0].operStatus}`,
          );
        }

        return 'Both Port A and Port B disconnected symmetrically, operStatus DOWN';
      },
    );

    // =========================================================================
    // f. resetPortConfig: true: confirm port mode is reset to ACCESS, vlan disconnected, poeEnabled: false
    // =========================================================================
    await runSubtest(
      'f. resetPortConfig: true resets mode to ACCESS, vlan disconnected, poeEnabled: false',
      async () => {
        // Step 0: Clean any existing forward and reverse links on portA, portB
        await pool.query(
          `UPDATE "SwitchPort" SET "connectedPortId" = NULL, "connectedSwitchId" = NULL 
         WHERE id IN ($1::text, $2::text) OR "connectedPortId" IN ($1::text, $2::text)`,
          [portA.id, portB.id],
        );

        // Step 1: Configure Port A with TRUNK mode, VLAN assigned, and PoE enabled
        await pool.query(
          `UPDATE "SwitchPort" SET mode = 'TRUNK', "vlanId" = $1::text, "poeEnabled" = TRUE, "connectedPortId" = $2::text WHERE id = $3::text`,
          [vlan.id, portB.id, portA.id],
        );
        await pool.query(
          `UPDATE "SwitchPort" SET mode = 'TRUNK', "vlanId" = $1::text, "poeEnabled" = TRUE, "connectedPortId" = $2::text WHERE id = $3::text`,
          [vlan.id, portA.id, portB.id],
        );

        // Verify non-default state
        const preCheck = await pool.query(
          `SELECT mode, "vlanId", "poeEnabled" FROM "SwitchPort" WHERE id = $1`,
          [portA.id],
        );
        if (
          preCheck.rows[0].mode !== 'TRUNK' ||
          preCheck.rows[0].vlanId !== vlan.id ||
          preCheck.rows[0].poeEnabled !== true
        ) {
          throw new Error(
            `Failed to initialize port config before unpatch: ${JSON.stringify(preCheck.rows[0])}`,
          );
        }

        // Step 2: Unpatch with resetPortConfig=true via query parameter
        const delRes = await fetch(
          `${API_BASE}/network/topology/links/${portA.id}?resetPortConfig=true`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const delData = await delRes.json();
        if (!delRes.ok || !delData.success) {
          throw new Error(`Delete failed: HTTP ${delRes.status}: ${JSON.stringify(delData)}`);
        }

        // Step 3: Check DB for Port A config
        const postCheck = await pool.query(
          `SELECT mode, "vlanId", "poeEnabled", "connectedPortId" FROM "SwitchPort" WHERE id = $1`,
          [portA.id],
        );
        const row = postCheck.rows[0];

        const failures = [];
        if (row.mode !== 'ACCESS') failures.push(`mode is "${row.mode}" (expected "ACCESS")`);
        if (row.vlanId !== null) failures.push(`vlanId is "${row.vlanId}" (expected null)`);
        if (row.poeEnabled !== false)
          failures.push(`poeEnabled is ${row.poeEnabled} (expected false)`);

        if (failures.length > 0) {
          throw new Error(`resetPortConfig: true was ignored! Failures: ${failures.join(', ')}`);
        }

        return `Mode reset to ACCESS, vlanId set to null, poeEnabled set to false`;
      },
    );

    // =========================================================================
    // g. Layout batch > 500 items rejected
    // =========================================================================
    await runSubtest('g1. Layout batch > 500 items rejected (501 items)', async () => {
      const positions501 = Array.from({ length: 501 }, (_, i) => ({
        nodeId: `node-test-${i}`,
        nodeType: 'SWITCH',
        x: i * 10,
        y: i * 10,
      }));

      const res = await fetch(`${API_BASE}/network/topology/layout`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          viewMode: 'ALL',
          positions: positions501,
        }),
      });

      const data = await res.json();
      if (res.status !== 400) {
        throw new Error(`Expected HTTP 400, got ${res.status}: ${JSON.stringify(data)}`);
      }
      return `HTTP 400 rejected successfully: ${JSON.stringify(data.message || data)}`;
    });

    await runSubtest('g2. Layout batch <= 500 items accepted (valid batch)', async () => {
      const positionsValid = [
        {
          nodeId: sw1.id,
          nodeType: 'SWITCH',
          x: 150,
          y: 250,
        },
      ];

      const res = await fetch(`${API_BASE}/network/topology/layout`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          viewMode: 'ALL',
          positions: positionsValid,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(`Valid layout update failed: HTTP ${res.status}: ${JSON.stringify(data)}`);
      }
      return `Updated ${data.updatedCount} node position(s) successfully`;
    });

    // =========================================================================
    // h. Verify audit log records in AuditLog table for CABLE_PATCH_CONNECTED and CABLE_PATCH_DISCONNECTED
    // =========================================================================
    await runSubtest(
      'h. Verify audit log records for CABLE_PATCH_CONNECTED and CABLE_PATCH_DISCONNECTED',
      async () => {
        // Connect
        await fetch(`${API_BASE}/network/topology/links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sourcePortId: portA.id,
            targetPortId: portB.id,
          }),
        });

        // Disconnect
        await fetch(`${API_BASE}/network/topology/links/${portA.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });

        // Query AuditLog table
        const connectLogs = await pool.query(
          `SELECT id, action, entity, "entityId", details, timestamp 
         FROM "AuditLog" 
         WHERE action = 'CABLE_PATCH_CONNECTED' AND "entityId" = $1
         ORDER BY timestamp DESC LIMIT 1;`,
          [portA.id],
        );

        const disconnectLogs = await pool.query(
          `SELECT id, action, entity, "entityId", details, timestamp 
         FROM "AuditLog" 
         WHERE action = 'CABLE_PATCH_DISCONNECTED' AND "entityId" = $1
         ORDER BY timestamp DESC LIMIT 1;`,
          [portA.id],
        );

        if (connectLogs.rows.length === 0) {
          throw new Error(`No CABLE_PATCH_CONNECTED audit log found for port ${portA.id}`);
        }
        if (disconnectLogs.rows.length === 0) {
          throw new Error(`No CABLE_PATCH_DISCONNECTED audit log found for port ${portA.id}`);
        }

        return `Found CABLE_PATCH_CONNECTED (${connectLogs.rows[0].id}) and CABLE_PATCH_DISCONNECTED (${disconnectLogs.rows[0].id})`;
      },
    );
  } finally {
    await pool.end();
  }

  console.log('\n========================================================================');
  console.log('                          TEST RUN SUMMARY                              ');
  console.log('========================================================================');
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  for (const r of results) {
    console.log(`- [${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
    if (!r.pass) {
      console.log(`    Error: ${r.error}`);
    }
  }

  if (failed > 0) {
    console.log('\nVerdict: REQUEST_CHANGES (Regressions or unimplemented features detected)');
    process.exit(1);
  } else {
    console.log('\nVerdict: APPROVE (All empirical tests passed)');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
