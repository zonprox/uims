import { describe, expect, it } from 'vitest';
import {
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

  describe('restockInventorySchema', () => {
    it('validates positive restock quantity', () => {
      expect(restockInventorySchema.safeParse({ quantity: 10 }).success).toBe(true);
    });

    it('rejects 0 or negative restock quantity', () => {
      expect(restockInventorySchema.safeParse({ quantity: 0 }).success).toBe(false);
      expect(restockInventorySchema.safeParse({ quantity: -5 }).success).toBe(false);
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
    it('validates query with category, location, organization, and bounds <= 100', () => {
      const query = {
        page: 1,
        pageSize: 25,
        limit: 50,
        search: 'patch cable',
        categoryId: validCategoryId,
        category: 'Networking',
        location: 'Server Room',
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
