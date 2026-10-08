import { describe, expect, it } from 'vitest';
import {
  adjustInventorySchema,
  createInventoryCategorySchema,
  createInventoryItemSchema,
  inventoryQuerySchema,
  restockInventorySchema,
  updateInventoryCategorySchema,
  updateInventoryItemSchema,
} from './inventory.validator';

describe('inventory.validator', () => {
  const validCategoryId = '123e4567-e89b-12d3-a456-426614174000';

  describe('createInventoryItemSchema', () => {
    it('validates a valid inventory item', () => {
      const input = {
        name: 'Cat6 Ethernet Cable 1m',
        sku: 'CAB-CAT6-1M',
        categoryId: validCategoryId,
        quantity: 100,
        minThreshold: 20,
        unitCost: 2.5,
        binNumber: 'A1-04',
        supplier: 'Monoprice',
      };
      const result = createInventoryItemSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('confirms complete Physical Location purge: zero location fields on inventory schemas', () => {
      expect('locationId' in createInventoryItemSchema.shape).toBe(false);
      expect('location' in createInventoryItemSchema.shape).toBe(false);
      expect('locationId' in inventoryQuerySchema.shape).toBe(false);
      expect('location' in inventoryQuerySchema.shape).toBe(false);
    });

    it('validates SKU regex constraints', () => {
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          sku: 'CAB-CAT6-1M',
        }).success,
      ).toBe(true);
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          sku: 'SKU_01.A',
        }).success,
      ).toBe(true);

      // Rejects spaces or special chars
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          sku: 'SKU with spaces',
        }).success,
      ).toBe(false);
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          sku: 'SKU#01',
        }).success,
      ).toBe(false);
    });

    it('validates quantity and minThreshold bounds and coercion', () => {
      const res = createInventoryItemSchema.safeParse({
        name: 'Item',
        categoryId: validCategoryId,
        quantity: '50',
        minThreshold: '10',
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.quantity).toBe(50);
        expect(res.data.minThreshold).toBe(10);
      }

      // Rejects negative numbers or floats
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          quantity: -1,
        }).success,
      ).toBe(false);
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          quantity: 10.5,
        }).success,
      ).toBe(false);
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          quantity: 1_000_001,
        }).success,
      ).toBe(false);
    });

    it('validates unitCost currency bounds', () => {
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          unitCost: 2.5,
        }).success,
      ).toBe(true);
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          unitCost: -1,
        }).success,
      ).toBe(false);
      expect(
        createInventoryItemSchema.safeParse({
          name: 'Item',
          categoryId: validCategoryId,
          unitCost: 2.555,
        }).success,
      ).toBe(false);
    });

    it('applies default values for quantity, minThreshold, and unitCost', () => {
      const input = {
        name: 'Cable Ties 100pk',
        categoryId: validCategoryId,
      };
      const result = createInventoryItemSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(0);
        expect(result.data.minThreshold).toBe(5);
        expect(result.data.unitCost).toBe(0);
      }
    });

    it('rejects missing or empty item name', () => {
      expect(
        createInventoryItemSchema.safeParse({
          name: '',
          categoryId: validCategoryId,
        }).success,
      ).toBe(false);

      expect(
        createInventoryItemSchema.safeParse({
          categoryId: validCategoryId,
        }).success,
      ).toBe(false);
    });

    it('rejects invalid categoryId format', () => {
      expect(
        createInventoryItemSchema.safeParse({
          name: 'USB-C Cable',
          categoryId: 'not-a-uuid',
        }).success,
      ).toBe(false);
    });

    it('validates partial update with updateInventoryItemSchema', () => {
      const result = updateInventoryItemSchema.safeParse({
        quantity: 50,
        notes: 'Restocked by IT staff',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('restockInventorySchema & adjustInventorySchema', () => {
    it('validates positive restock quantity within bounds <= 100,000', () => {
      expect(restockInventorySchema.safeParse({ quantity: 10 }).success).toBe(true);
      expect(restockInventorySchema.safeParse({ quantity: '500' }).success).toBe(true);
    });

    it('rejects 0, negative, float, or >100,000 restock quantity', () => {
      expect(restockInventorySchema.safeParse({ quantity: 0 }).success).toBe(false);
      expect(restockInventorySchema.safeParse({ quantity: -5 }).success).toBe(false);
      expect(restockInventorySchema.safeParse({ quantity: 10.5 }).success).toBe(false);
      expect(restockInventorySchema.safeParse({ quantity: 100_001 }).success).toBe(false);
    });

    it('validates adjustInventorySchema', () => {
      expect(
        adjustInventorySchema.safeParse({
          quantity: 15,
          reason: 'Physical inventory cycle count',
        }).success,
      ).toBe(true);

      // Rejects missing reason
      expect(
        adjustInventorySchema.safeParse({
          quantity: 15,
          reason: '',
        }).success,
      ).toBe(false);

      // Rejects negative quantity
      expect(
        adjustInventorySchema.safeParse({
          quantity: -1,
          reason: 'Damaged stock',
        }).success,
      ).toBe(false);
    });
  });

  describe('category schemas', () => {
    it('validates category creation and update', () => {
      expect(
        createInventoryCategorySchema.safeParse({
          name: 'Networking Supplies',
          description: 'Cables and keystones',
        }).success,
      ).toBe(true);

      expect(
        updateInventoryCategorySchema.safeParse({
          description: 'Updated description',
        }).success,
      ).toBe(true);

      expect(createInventoryCategorySchema.safeParse({ name: '' }).success).toBe(false);
    });
  });

  describe('inventoryQuerySchema', () => {
    it('validates query with category, organization, and bounds <= 100 (without location)', () => {
      const query = {
        page: 1,
        pageSize: 25,
        limit: 50,
        search: 'patch cable',
        categoryId: validCategoryId,
        category: 'Networking',
        organizationId: validCategoryId,
        organization: 'Global Corp',
        stockStatus: 'low_stock',
      };
      const result = inventoryQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('rejects query limits exceeding 100', () => {
      expect(inventoryQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
      expect(inventoryQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
    });
  });
});
