import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @IsUUID('4')
  @IsNotEmpty()
  categoryId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  minThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000000000)
  unitCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  binNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
