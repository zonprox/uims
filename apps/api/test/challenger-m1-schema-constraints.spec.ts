import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('Challenger M1-1: Adversarial Schema Constraints & Hierarchy Verification Suite', () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;

  const TEST_PREFIX = `CHAL_M1_${Date.now()}`;

  beforeAll(async () => {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://uims:uims_secret_2026@localhost:5433/uims_db?schema=public';
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.asset.deleteMany({
        where: {
          OR: [
            { assetCode: { startsWith: TEST_PREFIX } },
            { subcode: { startsWith: TEST_PREFIX } },
            { name: { startsWith: TEST_PREFIX } },
          ],
        },
      });
      await prisma.costCenter.deleteMany({
        where: {
          code: { startsWith: TEST_PREFIX },
        },
      });
    } catch (error: unknown) {
      // Ignore cleanup error if already deleted
    }
    await prisma.$disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    // Ensure clean state for test run
    await prisma.asset.deleteMany({
      where: {
        OR: [
          { assetCode: { startsWith: TEST_PREFIX } },
          { subcode: { startsWith: TEST_PREFIX } },
          { name: { startsWith: TEST_PREFIX } },
        ],
      },
    });
    await prisma.costCenter.deleteMany({
      where: {
        code: { startsWith: TEST_PREFIX },
      },
    });
  });

  // =========================================================================
  // TASK 1.1: Unique Constraint on assetCode (Device Models)
  // =========================================================================
  describe('Task 1.1: Parent Model assetCode Uniqueness & Conflict Rejection', () => {
    it('should successfully insert a device model with unique assetCode', async () => {
      const assetCode = `${TEST_PREFIX}_MOD_DELL_5420`;
      const model = await prisma.asset.create({
        data: {
          assetCode,
          name: `${TEST_PREFIX} Dell Latitude 5420`,
          model: 'Latitude 5420',
          manufacturer: 'Dell',
          status: 'AVAILABLE',
        },
      });

      expect(model.id).toBeDefined();
      expect(model.assetCode).toBe(assetCode);
      expect(model.parentId).toBeNull();
      expect(model.subcode).toBeNull();
    });

    it('should reject inserting a second parent model with duplicate assetCode via P2002', async () => {
      const assetCode = `${TEST_PREFIX}_MOD_DELL_DUP`;
      await prisma.asset.create({
        data: {
          assetCode,
          name: `${TEST_PREFIX} Dell Model A`,
          status: 'AVAILABLE',
        },
      });

      let caughtError: unknown = null;
      try {
        await prisma.asset.create({
          data: {
            assetCode,
            name: `${TEST_PREFIX} Dell Model B Duplicate`,
            status: 'AVAILABLE',
          },
        });
      } catch (error: unknown) {
        caughtError = error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      const prismaError = caughtError as Prisma.PrismaClientKnownRequestError;
      expect(prismaError.code).toBe('P2002');
      expect(prismaError.message).toContain('Asset_assetCode_key');
    });
  });

  // =========================================================================
  // TASK 1.2: Unique Constraint on subcode (Physical Units)
  // =========================================================================
  describe('Task 1.2: Physical Unit subcode Uniqueness & Conflict Rejection', () => {
    it('should reject inserting a physical unit with duplicate subcode via P2002', async () => {
      const parentModel = await prisma.asset.create({
        data: {
          assetCode: `${TEST_PREFIX}_PARENT_FOR_UNITS`,
          name: `${TEST_PREFIX} Parent Model`,
          status: 'AVAILABLE',
        },
      });

      const duplicateSubcode = `${TEST_PREFIX}_AST_DELL_001`;

      // First unit insertion succeeds
      const unit1 = await prisma.asset.create({
        data: {
          parentId: parentModel.id,
          subcode: duplicateSubcode,
          name: `${TEST_PREFIX} Physical Unit 1`,
          status: 'AVAILABLE',
        },
      });
      expect(unit1.id).toBeDefined();

      // Second unit insertion with identical subcode must be rejected
      let caughtError: unknown = null;
      try {
        await prisma.asset.create({
          data: {
            parentId: parentModel.id,
            subcode: duplicateSubcode,
            name: `${TEST_PREFIX} Physical Unit 2 Duplicate`,
            status: 'AVAILABLE',
          },
        });
      } catch (error: unknown) {
        caughtError = error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      const prismaError = caughtError as Prisma.PrismaClientKnownRequestError;
      expect(prismaError.code).toBe('P2002');
      expect(prismaError.message).toContain('Asset_subcode_key');
    });
  });

  // =========================================================================
  // TASK 1.3: Null Conflicts Avoidance (subcode = null & assetCode = null)
  // =========================================================================
  describe('Task 1.3: Null Non-Collision for Models and Physical Units', () => {
    it('should allow multiple parent models with subcode = null without null collision', async () => {
      const parent1 = await prisma.asset.create({
        data: {
          assetCode: `${TEST_PREFIX}_PARENT_NULL_1`,
          subcode: null,
          name: `${TEST_PREFIX} Parent Model 1`,
          status: 'AVAILABLE',
        },
      });

      const parent2 = await prisma.asset.create({
        data: {
          assetCode: `${TEST_PREFIX}_PARENT_NULL_2`,
          subcode: null,
          name: `${TEST_PREFIX} Parent Model 2`,
          status: 'AVAILABLE',
        },
      });

      const parent3 = await prisma.asset.create({
        data: {
          assetCode: `${TEST_PREFIX}_PARENT_NULL_3`,
          subcode: null,
          name: `${TEST_PREFIX} Parent Model 3`,
          status: 'AVAILABLE',
        },
      });

      expect(parent1.subcode).toBeNull();
      expect(parent2.subcode).toBeNull();
      expect(parent3.subcode).toBeNull();
    });

    it('should allow multiple child physical units with assetCode = null without null collision', async () => {
      const parent = await prisma.asset.create({
        data: {
          assetCode: `${TEST_PREFIX}_PARENT_COMMON`,
          name: `${TEST_PREFIX} Parent Model Common`,
          status: 'AVAILABLE',
        },
      });

      const unit1 = await prisma.asset.create({
        data: {
          parentId: parent.id,
          assetCode: null,
          subcode: `${TEST_PREFIX}_SUB_1`,
          name: `${TEST_PREFIX} Unit 1`,
          status: 'AVAILABLE',
        },
      });

      const unit2 = await prisma.asset.create({
        data: {
          parentId: parent.id,
          assetCode: null,
          subcode: `${TEST_PREFIX}_SUB_2`,
          name: `${TEST_PREFIX} Unit 2`,
          status: 'AVAILABLE',
        },
      });

      const unit3 = await prisma.asset.create({
        data: {
          parentId: parent.id,
          assetCode: null,
          subcode: `${TEST_PREFIX}_SUB_3`,
          name: `${TEST_PREFIX} Unit 3`,
          status: 'AVAILABLE',
        },
      });

      expect(unit1.assetCode).toBeNull();
      expect(unit2.assetCode).toBeNull();
      expect(unit3.assetCode).toBeNull();
    });

    it('should allow multiple assets where BOTH assetCode and subcode are null', async () => {
      const draft1 = await prisma.asset.create({
        data: {
          assetCode: null,
          subcode: null,
          name: `${TEST_PREFIX} Draft Asset 1`,
          status: 'AVAILABLE',
        },
      });

      const draft2 = await prisma.asset.create({
        data: {
          assetCode: null,
          subcode: null,
          name: `${TEST_PREFIX} Draft Asset 2`,
          status: 'AVAILABLE',
        },
      });

      expect(draft1.id).toBeDefined();
      expect(draft2.id).toBeDefined();
      expect(draft1.id).not.toBe(draft2.id);
    });
  });

  // =========================================================================
  // TASK 1.4: Self-Referencing Relationship & Querying
  // =========================================================================
  describe('Task 1.4: Self-Referencing Hierarchy Querying via Prisma', () => {
    it('should support parent with multiple children and query children via relation', async () => {
      const parent = await prisma.asset.create({
        data: {
          assetCode: `${TEST_PREFIX}_MOD_MBP_14`,
          name: `${TEST_PREFIX} MacBook Pro 14 M3`,
          manufacturer: 'Apple',
          model: 'MacBook Pro 14',
          specifications: 'M3 Pro, 18GB RAM, 512GB SSD',
          unitCost: 1999.0,
          status: 'AVAILABLE',
        },
      });

      // Create 3 child units under this parent
      await prisma.asset.create({
        data: {
          parentId: parent.id,
          subcode: `${TEST_PREFIX}_AST_MBP_001`,
          name: `${TEST_PREFIX} MacBook Unit 1`,
          serialNumber: `${TEST_PREFIX}_SN_001`,
          status: 'AVAILABLE',
        },
      });

      await prisma.asset.create({
        data: {
          parentId: parent.id,
          subcode: `${TEST_PREFIX}_AST_MBP_002`,
          name: `${TEST_PREFIX} MacBook Unit 2`,
          serialNumber: `${TEST_PREFIX}_SN_002`,
          status: 'IN_USE',
        },
      });

      await prisma.asset.create({
        data: {
          parentId: parent.id,
          subcode: `${TEST_PREFIX}_AST_MBP_003`,
          name: `${TEST_PREFIX} MacBook Unit 3`,
          serialNumber: `${TEST_PREFIX}_SN_003`,
          status: 'MAINTENANCE',
        },
      });

      // Query parent including children relation
      const parentWithChildren = await prisma.asset.findUnique({
        where: { id: parent.id },
        include: {
          children: {
            orderBy: { subcode: 'asc' },
          },
        },
      });

      expect(parentWithChildren).not.toBeNull();
      expect(parentWithChildren?.children).toHaveLength(3);
      expect(parentWithChildren?.children[0].subcode).toBe(`${TEST_PREFIX}_AST_MBP_001`);
      expect(parentWithChildren?.children[0].status).toBe('AVAILABLE');
      expect(parentWithChildren?.children[1].subcode).toBe(`${TEST_PREFIX}_AST_MBP_002`);
      expect(parentWithChildren?.children[1].status).toBe('IN_USE');
      expect(parentWithChildren?.children[2].subcode).toBe(`${TEST_PREFIX}_AST_MBP_003`);
      expect(parentWithChildren?.children[2].status).toBe('MAINTENANCE');

      // Query child including parent relation
      const childWithParent = await prisma.asset.findUnique({
        where: { subcode: `${TEST_PREFIX}_AST_MBP_001` },
        include: { parent: true },
      });

      expect(childWithParent).not.toBeNull();
      expect(childWithParent?.parent).not.toBeNull();
      expect(childWithParent?.parent?.assetCode).toBe(`${TEST_PREFIX}_MOD_MBP_14`);
      expect(childWithParent?.parent?.unitCost).toBe(1999.0);
    });

    it('should reject creating a child unit with non-existent parentId via P2003 FK violation', async () => {
      let caughtError: unknown = null;
      try {
        await prisma.asset.create({
          data: {
            parentId: '00000000-0000-0000-0000-000000000000',
            subcode: `${TEST_PREFIX}_ORPHAN_FAIL`,
            name: `${TEST_PREFIX} Orphan Unit`,
            status: 'AVAILABLE',
          },
        });
      } catch (error: unknown) {
        caughtError = error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      const prismaError = caughtError as Prisma.PrismaClientKnownRequestError;
      expect(prismaError.code).toBe('P2003');
    });

    it('should cascade delete child units when parent model is deleted', async () => {
      const parent = await prisma.asset.create({
        data: {
          assetCode: `${TEST_PREFIX}_CASCADE_PARENT`,
          name: `${TEST_PREFIX} Cascade Parent`,
          status: 'AVAILABLE',
        },
      });

      const child1 = await prisma.asset.create({
        data: {
          parentId: parent.id,
          subcode: `${TEST_PREFIX}_CASCADE_CHILD_1`,
          name: `${TEST_PREFIX} Cascade Child 1`,
          status: 'AVAILABLE',
        },
      });

      const child2 = await prisma.asset.create({
        data: {
          parentId: parent.id,
          subcode: `${TEST_PREFIX}_CASCADE_CHILD_2`,
          name: `${TEST_PREFIX} Cascade Child 2`,
          status: 'AVAILABLE',
        },
      });

      // Delete parent
      await prisma.asset.delete({
        where: { id: parent.id },
      });

      // Verify children no longer exist
      const remainingChildren = await prisma.asset.findMany({
        where: {
          id: { in: [child1.id, child2.id] },
        },
      });

      expect(remainingChildren).toHaveLength(0);
    });
  });

  // =========================================================================
  // TASK 1.5: CostCenter Model, Constraints & SetNull Deletion
  // =========================================================================
  describe('Task 1.5: CostCenter Model Constraints & Asset Association', () => {
    it('should create CostCenter and reject duplicate code via P2002', async () => {
      const code = `${TEST_PREFIX}_IT_OPS`;
      const cc1 = await prisma.costCenter.create({
        data: {
          code,
          name: 'IT Operations',
          description: 'IT Operations Cost Center',
        },
      });
      expect(cc1.id).toBeDefined();

      let caughtError: unknown = null;
      try {
        await prisma.costCenter.create({
          data: {
            code,
            name: 'Duplicate IT Ops',
            description: 'Duplicate',
          },
        });
      } catch (error: unknown) {
        caughtError = error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      const prismaError = caughtError as Prisma.PrismaClientKnownRequestError;
      expect(prismaError.code).toBe('P2002');
      expect(prismaError.message).toContain('CostCenter_code_key');
    });

    it('should link Asset to CostCenter and set costCenterId to null on CostCenter deletion', async () => {
      const cc = await prisma.costCenter.create({
        data: {
          code: `${TEST_PREFIX}_FIN_ACC`,
          name: 'Finance & Accounting',
        },
      });

      const asset = await prisma.asset.create({
        data: {
          assetCode: `${TEST_PREFIX}_CC_LINKED_MODEL`,
          name: `${TEST_PREFIX} CC Linked Model`,
          costCenterId: cc.id,
          status: 'AVAILABLE',
        },
      });

      expect(asset.costCenterId).toBe(cc.id);

      // Delete the CostCenter
      await prisma.costCenter.delete({
        where: { id: cc.id },
      });

      // Fetch the asset again
      const updatedAsset = await prisma.asset.findUnique({
        where: { id: asset.id },
      });

      expect(updatedAsset).not.toBeNull();
      expect(updatedAsset?.costCenterId).toBeNull();
    });

    it('should reject linking Asset to a non-existent costCenterId via P2003 FK violation', async () => {
      let caughtError: unknown = null;
      try {
        await prisma.asset.create({
          data: {
            assetCode: `${TEST_PREFIX}_BAD_CC_ASSET`,
            name: `${TEST_PREFIX} Bad CC Asset`,
            costCenterId: '00000000-0000-0000-0000-000000000000',
            status: 'AVAILABLE',
          },
        });
      } catch (error: unknown) {
        caughtError = error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      const prismaError = caughtError as Prisma.PrismaClientKnownRequestError;
      expect(prismaError.code).toBe('P2003');
    });
  });

  // =========================================================================
  // TASK 1.6: Boundary & Adversarial Edge Cases
  // =========================================================================
  describe('Task 1.6: Boundary & Adversarial Edge Cases', () => {
    it('should reject duplicate empty string assetCode ("") because empty string is non-null', async () => {
      // In PostgreSQL, '' is not null, so two records with '' must collide
      await prisma.asset.create({
        data: {
          assetCode: `${TEST_PREFIX}_EMPTY`,
          name: `${TEST_PREFIX} Model Non-Empty`,
          status: 'AVAILABLE',
        },
      });

      // First empty string
      const first = await prisma.asset.create({
        data: {
          assetCode: '',
          name: `${TEST_PREFIX} First Empty String Code`,
          status: 'AVAILABLE',
        },
      });
      expect(first.assetCode).toBe('');

      // Second empty string must collide
      let caughtError: unknown = null;
      try {
        await prisma.asset.create({
          data: {
            assetCode: '',
            name: `${TEST_PREFIX} Second Empty String Code`,
            status: 'AVAILABLE',
          },
        });
      } catch (error: unknown) {
        caughtError = error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
      const prismaError = caughtError as Prisma.PrismaClientKnownRequestError;
      expect(prismaError.code).toBe('P2002');
    });

    it('should treat case-differing assetCodes as distinct under standard text btree collation', async () => {
      const codeUpper = `${TEST_PREFIX}_CASE_TEST`;
      const codeLower = `${TEST_PREFIX}_case_test`;

      const upper = await prisma.asset.create({
        data: {
          assetCode: codeUpper,
          name: `${TEST_PREFIX} Upper Case Model`,
          status: 'AVAILABLE',
        },
      });

      const lower = await prisma.asset.create({
        data: {
          assetCode: codeLower,
          name: `${TEST_PREFIX} Lower Case Model`,
          status: 'AVAILABLE',
        },
      });

      expect(upper.id).toBeDefined();
      expect(lower.id).toBeDefined();
      expect(upper.id).not.toBe(lower.id);
    });
  });
});
