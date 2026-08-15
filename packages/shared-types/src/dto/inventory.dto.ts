export interface CreateInventoryItemDto {
  sku?: string;
  name: string;
  category?: string;
  quantity?: number | string;
  minThreshold?: number | string;
  unitCost?: number | string;
  location?: string;
  binNumber?: string;
  supplier?: string;
  notes?: string;
}

export interface UpdateInventoryItemDto extends Partial<CreateInventoryItemDto> {}

export interface InventoryQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  category?: string;
  stockStatus?: string;
}

export interface InventoryStatsDto {
  totalSkus: number;
  totalUnits: number;
  totalValuation: number;
  lowStockCount: number;
  outOfStockCount: number;
}
