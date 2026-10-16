import { IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class CreateDeviceModelDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ValidateIf((o: CreateDeviceModelDto) => !o.assetCode)
  @IsString()
  @IsNotEmpty()
  modelCode!: string;

  @IsOptional()
  @IsString()
  assetCode?: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  manufacturer!: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  specifications?: Record<string, unknown> | string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minThreshold?: number;

  @IsOptional()
  @IsString()
  binNumber?: string;

  @IsOptional()
  @IsString()
  binLocation?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
