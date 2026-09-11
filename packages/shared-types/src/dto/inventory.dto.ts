export interface CreateInventoryCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateInventoryCategoryDto extends Partial<CreateInventoryCategoryDto> {}

export interface CreateInventoryItemDto {
  sku?: string;
  name: string;
  categoryId: string;
  category?: string;
  quantity?: number | string;
  minThreshold?: number | string;
  unitCost?: number | string;
  locationId?: string;
  location?: string;
  binNumber?: string;
  supplier?: string;
  notes?: string;
}

export interface UpdateInventoryItemDto extends Partial<CreateInventoryItemDto> {}

export interface RestockInventoryDto {
  quantity: number;
}

export interface InventoryQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  category?: string;
  locationId?: string;
  location?: string;
  organizationId?: string;
  organization?: string;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | string;
}

export interface InventoryStatsDto {
  totalSkus: number;
  totalUnits: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
}
