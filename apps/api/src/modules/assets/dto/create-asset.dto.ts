import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  assetCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  assetTag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsUUID('4')
  parentId?: string | null;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsUUID('4')
  costCenterId?: string | null;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsString()
  @MaxLength(2000)
  specifications?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsString()
  @MaxLength(100)
  serialNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @IsISO8601()
  purchaseDate?: string;

  @IsOptional()
  @IsISO8601()
  warrantyExpiry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @IsOptional()
  @IsUUID('4')
  assignedToId?: string;
}
