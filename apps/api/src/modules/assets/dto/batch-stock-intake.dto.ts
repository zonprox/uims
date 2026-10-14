import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StockIntakeUnitDto {
  @ApiPropertyOptional({ description: 'Hardware manufacturer serial number' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Explicit unique asset tag' })
  @IsOptional()
  @IsString()
  assetTag?: string;

  @ApiPropertyOptional({ description: 'Explicit unique subcode' })
  @IsOptional()
  @IsString()
  subcode?: string;

  @ApiPropertyOptional({ description: 'Cost center UUID' })
  @IsOptional()
  @IsUUID('4')
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'Purchase date in ISO 8601 format' })
  @IsOptional()
  @IsISO8601()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Warranty expiry date in ISO 8601 format' })
  @IsOptional()
  @IsISO8601()
  warrantyExpiry?: string;

  @ApiPropertyOptional({ description: 'Per-unit notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Physical unit status (defaults to AVAILABLE)' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class BatchStockIntakeDto {
  @ApiPropertyOptional({ description: 'Target DeviceModel ID (required unless passed in URL)' })
  @IsOptional()
  @IsString()
  deviceModelId?: string;

  @ApiPropertyOptional({ description: 'Number of units to generate (1 to 500)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  count?: number;

  @ApiPropertyOptional({ description: 'Prefix for generated asset tags (e.g., AST-DELL)' })
  @IsOptional()
  @IsString()
  tagPrefix?: string;

  @ApiPropertyOptional({ description: 'Starting sequence number for asset tags' })
  @IsOptional()
  @IsInt()
  @Min(1)
  startSequence?: number;

  @ApiPropertyOptional({ description: 'Array of serial numbers matching unit count' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serialNumbers?: string[];

  @ApiPropertyOptional({ description: 'Explicit physical units array' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockIntakeUnitDto)
  units?: StockIntakeUnitDto[];

  @ApiPropertyOptional({ description: 'Purchase date in ISO 8601 format' })
  @IsOptional()
  @IsISO8601()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Warranty expiry date in ISO 8601 format' })
  @IsOptional()
  @IsISO8601()
  warrantyExpiry?: string;

  @ApiPropertyOptional({ description: 'Cost Center UUID' })
  @IsOptional()
  @IsUUID('4')
  costCenterId?: string;

  @ApiPropertyOptional({ description: 'Initial warehouse bin location' })
  @IsOptional()
  @IsString()
  initialBinLocation?: string;

  @ApiPropertyOptional({ description: 'General intake batch notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export { BatchStockIntakeDto as StockIntakeDto };
