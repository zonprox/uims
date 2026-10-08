import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdatePhysicalUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subcode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsUUID('4')
  costCenterId?: string;

  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

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
  @MaxLength(50)
  status?: string;
}

export { UpdatePhysicalUnitDto as UpdateAssetUnitDto };
