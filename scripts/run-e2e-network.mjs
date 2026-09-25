#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('===============================================================');
console.log('UIMS NETWORK MODERNIZATION — E2E TEST RUNNER');
console.log('Target: apps/api/test/e2e/network-modernization.e2e-spec.ts');
console.log('Tiers: 1 (Features), 2 (Boundaries), 3 (Pairwise), 4 (Workloads)');
console.log('===============================================================\n');

const testFile = 'test/e2e/network-modernization.e2e-spec.ts';

const result = spawnSync('pnpm', ['--filter', '@uims/api', 'test', testFile], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test',
  },
});

if (result.status !== 0) {
  console.error('\n❌ Network Modernization E2E test suite failed.');
  process.exit(result.status ?? 1);
}

console.log(
  '\n✅ Network Modernization E2E test suite completed successfully with 100% pass rate.',
);
process.exit(0);
