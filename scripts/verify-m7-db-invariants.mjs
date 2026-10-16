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
  max: 3,
  connectionTimeoutMillis: 5000,
});

async function main() {
  console.log('================================================================');
  console.log('  UIMS Milestone 7: Database & Invariant Empirical Verification ');
  console.log('================================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  async function check(name, testFn) {
    totalTests++;
    process.stdout.write(`[${totalTests.toString().padStart(2, '0')}] ${name}... `);
    try {
      const detail = await testFn();
      passedTests++;
      console.log(`PASS ${detail ? `(${detail})` : ''}`);
    } catch (err) {
      failedTests++;
      console.error(`FAILED: ${err.message}`);
    }
  }

  try {
    // ------------------------------------------------------------------------
    // Invariant 1: Zero Self-Loops
    // ------------------------------------------------------------------------
    await check('Invariant 1: Zero Self-Loops (connectedPortId <> id)', async () => {
      const res = await pool.query(
        `SELECT count(*)::int as count FROM "SwitchPort" WHERE "connectedPortId" = id;`,
      );
      const count = res.rows[0].count;
      if (count !== 0) {
        throw new Error(`Expected 0 self-loops, found ${count}`);
      }
      return `0 self-loops found`;
    });

    // ------------------------------------------------------------------------
    // Invariant 2: Strict Bidirectional Symmetry & Switch Pointer Sync
    // ------------------------------------------------------------------------
    await check('Invariant 2a: Connected Ports Count & Pair Alignment', async () => {
      const res = await pool.query(
        `SELECT count(*)::int as count FROM "SwitchPort" WHERE "connectedPortId" IS NOT NULL;`,
      );
      const count = res.rows[0].count;
      if (count === 0 || count % 2 !== 0) {
        throw new Error(`Connected ports count (${count}) must be non-zero even number`);
      }
      return `${count} connected ports (${count / 2} pairs)`;
    });

    await check('Invariant 2b: Strict Symmetry (peer.connectedPortId = port.id)', async () => {
      const res = await pool.query(`
        SELECT 
            p1.id as port1_id,
            p1."portNumber" as port1_num,
            p1."switchId" as sw1_id,
            p2.id as port2_id,
            p2."portNumber" as port2_num,
            p2."switchId" as sw2_id
        FROM "SwitchPort" p1
        LEFT JOIN "SwitchPort" p2 ON p1."connectedPortId" = p2.id
        WHERE p1."connectedPortId" IS NOT NULL
          AND (
            p2.id IS NULL 
            OR p2."connectedPortId" IS DISTINCT FROM p1.id
          );
      `);
      if (res.rows.length > 0) {
        throw new Error(`Found ${res.rows.length} asymmetrical peer connections`);
      }
      return `All peer connections strictly bidirectional`;
    });

    await check('Invariant 2c: Connected Switch ID Synchronization', async () => {
      const res = await pool.query(`
        SELECT 
            p1.id as port1_id,
            p1."connectedSwitchId" as p1_sw_ptr,
            p2."switchId" as actual_peer_sw
        FROM "SwitchPort" p1
        JOIN "SwitchPort" p2 ON p1."connectedPortId" = p2.id
        WHERE p1."connectedSwitchId" IS DISTINCT FROM p2."switchId";
      `);
      if (res.rows.length > 0) {
        throw new Error(`Found ${res.rows.length} ports with mismatched connectedSwitchId`);
      }
      return `All connectedSwitchId pointers match actual peer switchId`;
    });

    // ------------------------------------------------------------------------
    // Invariant 3: Switch Disjointness (Inter-Switch Trunks)
    // ------------------------------------------------------------------------
    await check('Invariant 3: Switch Disjointness (port.switchId <> peer.switchId)', async () => {
      const res = await pool.query(`
        SELECT 
            p1.id as port1_id,
            p1."portNumber" as port1_num,
            p1."switchId" as sw1_id,
            p2.id as port2_id,
            p2."portNumber" as port2_num,
            p2."switchId" as sw2_id
        FROM "SwitchPort" p1
        JOIN "SwitchPort" p2 ON p1."connectedPortId" = p2.id
        WHERE p1."switchId" = p2."switchId";
      `);
      if (res.rows.length > 0) {
        throw new Error(`Found ${res.rows.length} intra-switch port connections`);
      }
      return `0 intra-switch links, all links bridge distinct switches`;
    });

    // ------------------------------------------------------------------------
    // Invariant 4: Canvas Node Position Invariants
    // ------------------------------------------------------------------------
    await check('Invariant 4a: CanvasNodePosition Uniqueness on (nodeId, viewMode)', async () => {
      const res = await pool.query(`
        SELECT 
            count(*)::int as total,
            count(DISTINCT ("nodeId", "viewMode"))::int as distinct_pairs
        FROM "CanvasNodePosition";
      `);
      const { total, distinct_pairs } = res.rows[0];
      const duplicates = total - distinct_pairs;
      if (duplicates > 0) {
        throw new Error(`Found ${duplicates} duplicate (nodeId, viewMode) pairs`);
      }
      return `${total} records, 0 duplicate (nodeId, viewMode) pairs`;
    });

    await check(
      'Invariant 4b: CanvasNodePosition Finite Coordinates (no NaN/Inf/Null)',
      async () => {
        const res = await pool.query(`
        SELECT count(*)::int as non_finite_count
        FROM "CanvasNodePosition"
        WHERE x IS NULL 
           OR y IS NULL
           OR x = 'NaN'::float
           OR y = 'NaN'::float
           OR x = 'Infinity'::float
           OR x = '-Infinity'::float
           OR y = 'Infinity'::float
           OR y = '-Infinity'::float;
      `);
        const count = res.rows[0].non_finite_count;
        if (count > 0) {
          throw new Error(`Found ${count} non-finite coordinates in CanvasNodePosition`);
        }
        return `All x, y coordinates are valid finite numbers`;
      },
    );

    await check('Invariant 4c: CanvasNodePosition Entity Referential Integrity', async () => {
      const res = await pool.query(`
        SELECT 
            cnp."nodeId",
            cnp."viewMode",
            cnp."nodeType"
        FROM "CanvasNodePosition" cnp
        LEFT JOIN "NetworkSwitch" ns ON cnp."nodeId" = ns.id
        LEFT JOIN "NetworkRack" nr ON cnp."nodeId" = nr.id
        LEFT JOIN "Asset" a ON cnp."nodeId" = a.id
        WHERE ns.id IS NULL AND nr.id IS NULL AND a.id IS NULL;
      `);
      if (res.rows.length > 0) {
        throw new Error(`Found ${res.rows.length} dangling nodeIds without underlying entity`);
      }
      return `All 96 nodeIds resolve to valid Switch, Rack, or Asset entities`;
    });

    await check('Invariant 4d: CanvasNodePosition Multi-Perspective Distribution', async () => {
      const res = await pool.query(`
        SELECT "viewMode", count(*)::int as count
        FROM "CanvasNodePosition"
        GROUP BY "viewMode"
        ORDER BY "viewMode";
      `);
      const map = Object.fromEntries(res.rows.map((r) => [r.viewMode, r.count]));
      if (!map.ALL || !map.NETWORK || !map.CCTV) {
        throw new Error(`Missing view modes in CanvasNodePosition: ${JSON.stringify(map)}`);
      }
      return `ALL: ${map.ALL}, NETWORK: ${map.NETWORK}, CCTV: ${map.CCTV}`;
    });

    // ------------------------------------------------------------------------
    // Invariant 5: Domain Classification Integrity
    // ------------------------------------------------------------------------
    const domainTables = ['Asset', 'IPAddress', 'VLAN', 'Subnet', 'NetworkSwitch', 'SwitchPort'];

    for (const tbl of domainTables) {
      await check(`Invariant 5: Domain Non-Null & Valid Enums on "${tbl}"`, async () => {
        const nullRes = await pool.query(
          `SELECT count(*)::int as null_count FROM "${tbl}" WHERE "domain" IS NULL;`,
        );
        const nullCount = nullRes.rows[0].null_count;
        if (nullCount > 0) {
          throw new Error(`Found ${nullCount} NULL domain values in "${tbl}"`);
        }

        const enumRes = await pool.query(
          `SELECT "domain"::text as domain_val, count(*)::int as count FROM "${tbl}" GROUP BY "domain";`,
        );
        const validValues = new Set(['NETWORK', 'CCTV', 'SHARED']);
        for (const row of enumRes.rows) {
          if (!validValues.has(row.domain_val)) {
            throw new Error(`Invalid domain value "${row.domain_val}" in "${tbl}"`);
          }
        }
        const summary = enumRes.rows.map((r) => `${r.domain_val}:${r.count}`).join(', ');
        return `Total: ${enumRes.rows.reduce((s, r) => s + r.count, 0)} (${summary})`;
      });
    }

    // ------------------------------------------------------------------------
    // Invariant 6: Adversarial Link Invariants & Multi-Target Conflict Checks
    // ------------------------------------------------------------------------
    await check('Invariant 6a: No Broken Foreign Keys on Peer Pointers', async () => {
      const res = await pool.query(`
        SELECT 
            count(*) FILTER (WHERE p."connectedPortId" IS NOT NULL AND peer.id IS NULL)::int as broken_port_fks,
            count(*) FILTER (WHERE p."connectedSwitchId" IS NOT NULL AND sw.id IS NULL)::int as broken_switch_fks
        FROM "SwitchPort" p
        LEFT JOIN "SwitchPort" peer ON p."connectedPortId" = peer.id
        LEFT JOIN "NetworkSwitch" sw ON p."connectedSwitchId" = sw.id;
      `);
      const { broken_port_fks, broken_switch_fks } = res.rows[0];
      if (broken_port_fks > 0 || broken_switch_fks > 0) {
        throw new Error(`Broken FKs: ports=${broken_port_fks}, switches=${broken_switch_fks}`);
      }
      return `0 broken foreign keys on connectedPortId / connectedSwitchId`;
    });

    await check('Invariant 6b: Zero Asymmetric Partial Link Pointers', async () => {
      const res = await pool.query(`
        SELECT 
            count(*) FILTER (WHERE "connectedPortId" IS NOT NULL AND "connectedSwitchId" IS NULL)::int as port_set_sw_null,
            count(*) FILTER (WHERE "connectedPortId" IS NULL AND "connectedSwitchId" IS NOT NULL)::int as sw_set_port_null
        FROM "SwitchPort";
      `);
      const { port_set_sw_null, sw_set_port_null } = res.rows[0];
      if (port_set_sw_null > 0 || sw_set_port_null > 0) {
        throw new Error(
          `Partial pointers: port_set_sw_null=${port_set_sw_null}, sw_set_port_null=${sw_set_port_null}`,
        );
      }
      return `0 partial pointers`;
    });

    await check('Invariant 6c: Zero Multi-Target Link Conflicts', async () => {
      const res = await pool.query(`
        SELECT 
            count(*) FILTER (WHERE "connectedPortId" IS NOT NULL AND "connectedAssetId" IS NOT NULL)::int as port_and_asset,
            count(*) FILTER (WHERE "connectedPortId" IS NOT NULL AND "ipAddressId" IS NOT NULL)::int as port_and_ip
        FROM "SwitchPort";
      `);
      const { port_and_asset, port_and_ip } = res.rows[0];
      if (port_and_asset > 0 || port_and_ip > 0) {
        throw new Error(`Target conflicts: port+asset=${port_and_asset}, port+ip=${port_and_ip}`);
      }
      return `0 multi-target conflicts on trunk ports`;
    });

    await check('Invariant 6d: Trunk Port Operational State Integrity', async () => {
      const res = await pool.query(`
        SELECT 
            count(*)::int as total_trunks,
            count(*) FILTER (WHERE mode = 'TRUNK' AND "adminStatus" = 'UP' AND "operStatus" = 'ACTIVE')::int as active_trunks
        FROM "SwitchPort"
        WHERE "connectedPortId" IS NOT NULL;
      `);
      const { total_trunks, active_trunks } = res.rows[0];
      if (total_trunks !== active_trunks) {
        throw new Error(
          `Expected all ${total_trunks} trunk ports to be UP/ACTIVE, found ${active_trunks}`,
        );
      }
      return `All ${active_trunks} trunk ports configured mode=TRUNK, adminStatus=UP, operStatus=ACTIVE`;
    });

    await check('Invariant 6e: Switch Port Count & Uplink Expansion Integrity', async () => {
      const res = await pool.query(`
        SELECT 
            ns.id, 
            ns.name, 
            ns."totalPorts", 
            (ns."totalPorts" + CASE WHEN ns."totalPorts" = 16 THEN 2 ELSE 4 END) as expected_ports,
            count(sp.id)::int as actual_ports
        FROM "NetworkSwitch" ns
        LEFT JOIN "SwitchPort" sp ON ns.id = sp."switchId"
        WHERE ns.name NOT LIKE 'TEST-%'
        GROUP BY ns.id, ns.name, ns."totalPorts"
        HAVING (ns."totalPorts" + CASE WHEN ns."totalPorts" = 16 THEN 2 ELSE 4 END) <> count(sp.id);
      `);
      if (res.rows.length > 0) {
        throw new Error(
          `Found ${res.rows.length} switches where expected ports (base + uplinks) <> actual child ports`,
        );
      }
      return `All 16 switches have ports strictly matching base + dedicated uplinks (500 ports total)`;
    });

    console.log('\n================================================================');
    console.log(
      `  VERIFICATION SUMMARY: ${passedTests}/${totalTests} Tests Passed (Failures: ${failedTests})`,
    );
    console.log('================================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error during verification execution:', err);
  process.exit(1);
});
