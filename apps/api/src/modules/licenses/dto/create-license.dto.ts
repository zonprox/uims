import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  totalSeats?: number | string;

  @IsOptional()
  costPerSeat?: number | string;

  @IsOptional()
  expiryDate?: string | Date;

  @IsOptional()
  @IsString()
  licenseKey?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

