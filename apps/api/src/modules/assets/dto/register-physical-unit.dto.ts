import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RegisterPhysicalUnitDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  subcode!: string;

  @IsUUID('4')
  @IsNotEmpty()
  parentId!: string;

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
}

export { RegisterPhysicalUnitDto as CreateAssetUnitDto };
