import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RegisterPhysicalUnitDto {
  @ApiPropertyOptional({
    description: 'Target DeviceModel ID (mandatory unless passed via URL parameter)',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsOptional()
  @IsString()
  deviceModelId?: string;

  @ApiPropertyOptional({
    description: 'Unique internal subcode for the unit',
    example: 'AST-DELL-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcode?: string;

  @ApiPropertyOptional({
    description: 'Unique asset tag/barcode for the unit',
    example: 'TAG-5420-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  assetTag?: string;

  @ApiPropertyOptional({
    description: 'Hardware manufacturer serial number (S/N)',
    example: '8F9X7Y2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({
    description: 'Cost center UUID',
  })
  @IsOptional()
  @IsUUID('4')
  costCenterId?: string;

  @ApiPropertyOptional({
    description: 'Department UUID',
  })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Purchase date in ISO 8601 format',
  })
  @IsOptional()
  @IsISO8601()
  purchaseDate?: string;

  @ApiPropertyOptional({
    description: 'Warranty expiry date in ISO 8601 format',
  })
  @IsOptional()
  @IsISO8601()
  warrantyExpiry?: string;

  @ApiPropertyOptional({
    description: 'Initial physical unit lifecycle status (defaults to AVAILABLE)',
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'General unit notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export { RegisterPhysicalUnitDto as CreateAssetUnitDto };
