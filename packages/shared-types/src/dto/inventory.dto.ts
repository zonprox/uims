export interface CreateInventoryCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateInventoryCategoryDto extends Partial<CreateInventoryCategoryDto> {}

export interface InventoryQueryDto {
  page?: number;
  pageSize?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  category?: string;
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
