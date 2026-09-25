import * as path from 'node:path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAssetDto } from '../apps/api/src/modules/assets/dto/create-asset.dto';
import { createAssetSchema } from '../packages/shared-validators/src/asset.validator';
import { IT_ASSET_CATEGORY_IDS } from '../packages/shared-types/src/entities/asset';

interface TestResult {
  name: string;
  passed: boolean;
  details?: unknown;
}

const results: TestResult[] = [];

function recordTest(name: string, condition: boolean, details?: unknown) {
  results.push({ name, passed: condition, details });
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
  } else {
    console.error(`  ❌ FAIL: ${name}`, details);
  }
}

async function main() {
  console.log('===============================================================');
  console.log('STARTING EMPIRICAL VERIFICATION: MILESTONE M1 (CHALLENGER 1)');
  console.log('===============================================================\n');

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: Direct Database Queries via PrismaClient
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- PART 1: Database Seeder Integrity & Taxonomy Verification ---');
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1.1 Category Count: Exactly 11 IT categories
    const allCategories = await prisma.assetCategory.findMany({
      orderBy: { id: 'asc' },
    });
    console.log(`Total Asset Categories Found: ${allCategories.length}`);
    const expectedIds = Object.values(IT_ASSET_CATEGORY_IDS).sort();
    const actualIds = allCategories.map((c) => c.id).sort();

    recordTest('Category count must be exactly 11 IT categories', allCategories.length === 11, {
      count: allCategories.length,
      ids: actualIds,
    });

    recordTest(
      'All 11 category IDs must match authoritative IT_ASSET_CATEGORY_IDS',
      JSON.stringify(actualIds) === JSON.stringify(expectedIds),
      { expected: expectedIds, actual: actualIds },
    );

    // 1.2 Verify NO garment/textile categories exist
    const legacyCategoryIds = ['cat-sewing', 'cat-cutting', 'cat-printing', 'cat-qa'];
    const garmentCategories = await prisma.assetCategory.findMany({
      where: {
        OR: [
          { id: { in: legacyCategoryIds } },
          { name: { contains: 'sewing', mode: 'insensitive' } },
          { name: { contains: 'cutting', mode: 'insensitive' } },
          { name: { contains: 'garment', mode: 'insensitive' } },
          { name: { contains: 'textile', mode: 'insensitive' } },
        ],
      },
    });

    recordTest(
      'Verify NO garment/textile categories exist (cat-sewing, cat-cutting, cat-printing, cat-qa must return 0)',
      garmentCategories.length === 0,
      garmentCategories,
    );

    // 1.3 Verify NO sewing/cutter assets exist (AST-SEW-*, AST-CUT-*)
    const legacyAssets = await prisma.asset.findMany({
      where: {
        OR: [
          { assetTag: { startsWith: 'AST-SEW' } },
          { assetTag: { startsWith: 'AST-CUT' } },
          { name: { contains: 'Sewing', mode: 'insensitive' } },
          { name: { contains: 'Cutter', mode: 'insensitive' } },
        ],
      },
    });

    recordTest(
      'Verify NO sewing/cutter assets exist (AST-SEW-*, AST-CUT-* must return 0)',
      legacyAssets.length === 0,
      legacyAssets.map((a) => a.assetTag),
    );

    // 1.4 Verify AST-1001 exists and is assigned to userTri
    const ast1001 = await prisma.asset.findUnique({
      where: { assetTag: 'AST-1001' },
      include: {
        assignedTo: true,
        category: true,
      },
    });

    const ast1001AssignedEmail = ast1001?.assignedTo?.email;
    const isAssignedToUserTri =
      ast1001AssignedEmail === 'tri.doan@youngonevn.com' ||
      ast1001?.assignedTo?.displayName?.toLowerCase().includes('tri');

    recordTest('AST-1001 asset exists in database', ast1001 !== null, ast1001?.assetTag);
    recordTest(
      'AST-1001 is assigned to userTri (tri.doan@youngonevn.com)',
      Boolean(isAssignedToUserTri),
      {
        assignedToId: ast1001?.assignedToId,
        email: ast1001AssignedEmail,
        displayName: ast1001?.assignedTo?.displayName,
      },
    );
    recordTest(
      'AST-1001 has valid name (MacBook Pro 16 M3 Pro)',
      Boolean(ast1001?.name?.includes('MacBook Pro')),
      ast1001?.name,
    );

    // 1.5 Verify all 11 categories have at least one assigned asset
    console.log('\nVerifying assets across all 11 categories:');
    for (const catId of expectedIds) {
      const assetsInCat = await prisma.asset.findMany({
        where: { categoryId: catId },
      });

      recordTest(
        `Category [${catId}] has >= 1 asset (found ${assetsInCat.length})`,
        assetsInCat.length >= 1,
        { catId, count: assetsInCat.length },
      );
    }

    console.log('\n---------------------------------------------------------------');
  } finally {
    await prisma.$disconnect();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: Stress Test API DTO & Validator
  // ───────────────────────────────────────────────────────────────────────────
  console.log('--- PART 2: Stress Testing CreateAssetDto & createAssetSchema ---');

  interface TestCase {
    name: string;
    payload: Record<string, unknown>;
    shouldPass: boolean;
  }

  const testCases: TestCase[] = [
    {
      name: 'TC-1: Slug category ID (categoryId: "cat-laptop") with notes',
      payload: {
        name: 'MacBook Air M2',
        categoryId: 'cat-laptop',
        notes: 'Apple M2, 16GB RAM, 512GB SSD, macOS Sequoia',
      },
      shouldPass: true,
    },
    {
      name: 'TC-2: UUID category ID (categoryId: "123e4567-e89b-12d3-a456-426614174000")',
      payload: {
        name: 'Dell Latitude 5440',
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        notes: 'Core i5, 16GB RAM, 256GB SSD, Windows 11',
      },
      shouldPass: true,
    },
    {
      name: 'TC-3: Hardware notes with technical details (port count, speed, PoE budget)',
      payload: {
        name: 'Cisco Catalyst 9300',
        categoryId: 'cat-switch',
        notes: 'Port count: 48, speed: 1 Gbps, PoE budget: 370W',
      },
      shouldPass: true,
    },
    {
      name: 'TC-4: Empty notes ("")',
      payload: {
        name: 'Unspecified Hardware Item',
        categoryId: 'cat-peripheral',
        notes: '',
      },
      shouldPass: true,
    },
    {
      name: 'TC-5: Omitted notes (undefined)',
      payload: {
        name: 'Basic Peripheral',
        categoryId: 'cat-peripheral',
      },
      shouldPass: true,
    },
    {
      name: 'TC-6: Slug category ID with multi-line deployment notes',
      payload: {
        name: 'Dell Monitor 27',
        categoryId: 'cat-monitor',
        notes: 'Line 1: High-res display\nLine 2: Connected via Thunderbolt',
      },
      shouldPass: true,
    },
    {
      name: 'TC-7: UUID category ID with standard notes',
      payload: {
        name: 'Custom Server',
        categoryId: 'b3f5e921-6e87-4389-9a7c-17e94e509123',
        notes: 'Rack 02 Host 01 dedicated virtualization hypervisor',
      },
      shouldPass: true,
    },
    {
      name: 'TC-8: Hardware notes with special symbols and URLs',
      payload: {
        name: 'Enterprise Router Appliance',
        categoryId: 'cat-router',
        notes: 'Firmware v4.2.1-patch3; mgmt: https://10.0.0.1:8443; SLA 99.99%',
      },
      shouldPass: true,
    },
    {
      name: 'TC-9 [Adversarial Negative]: Empty asset name (should fail)',
      payload: {
        name: '',
        categoryId: 'cat-laptop',
        notes: 'Valid notes',
      },
      shouldPass: false,
    },
    {
      name: 'TC-10 [Adversarial Negative]: Non-string asset name (number instead of string, should fail)',
      payload: {
        name: 12345,
        categoryId: 'cat-laptop',
      },
      shouldPass: false,
    },
    {
      name: 'TC-11 [Adversarial Negative]: Non-string notes (number instead of string, should fail)',
      payload: {
        name: 'Faulty Asset',
        categoryId: 'cat-laptop',
        notes: 12345,
      },
      shouldPass: false,
    },
    {
      name: 'TC-12 [Adversarial Negative]: Non-string notes (boolean instead of string, should fail)',
      payload: {
        name: 'Faulty Asset 2',
        categoryId: 'cat-laptop',
        notes: true,
      },
      shouldPass: false,
    },
  ];

  for (const tc of testCases) {
    // 2.1 Test createAssetSchema (Zod)
    const zodResult = createAssetSchema.safeParse(tc.payload);
    const zodPassed = tc.shouldPass ? zodResult.success : !zodResult.success;
    recordTest(
      `[Zod: createAssetSchema] ${tc.name}`,
      zodPassed,
      zodResult.success ? zodResult.data : zodResult.error.issues,
    );

    // 2.2 Test CreateAssetDto (class-validator)
    const dtoInstance = plainToInstance(CreateAssetDto, tc.payload);
    const errors = await validate(dtoInstance);
    const cvSuccess = errors.length === 0;
    const cvPassed = tc.shouldPass ? cvSuccess : !cvSuccess;
    recordTest(
      `[ClassValidator: CreateAssetDto] ${tc.name}`,
      cvPassed,
      cvSuccess
        ? dtoInstance
        : errors.map((e) => ({ property: e.property, constraints: e.constraints })),
    );
  }

  // 2.3 Verify zero specs property preservation
  const strippedZod = createAssetSchema.parse({
    name: 'Clean Asset',
    categoryId: 'cat-laptop',
    specs: { cpu: 'i7' },
  });
  recordTest(
    'createAssetSchema strips obsolete specs field',
    !('specs' in (strippedZod as Record<string, unknown>)),
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SUMMARY AND VERDICT
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log('VERIFICATION SUMMARY');
  console.log('===============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Checks: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.error('\nVERDICT: REJECT ❌');
    process.exit(1);
  } else {
    console.log('\nVERDICT: APPROVE ✅');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
