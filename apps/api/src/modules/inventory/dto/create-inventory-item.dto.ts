import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  binNumber?: string;

  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
