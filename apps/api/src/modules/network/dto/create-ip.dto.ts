import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateIPAddressDto {
  @IsOptional()
  @IsString()
  ip?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @IsNotEmpty()
  hostname!: string;

  @IsOptional()
  @IsString()
  mac?: string;

  @IsOptional()
  @IsString()
  macAddress?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsString()
  subnet?: string;

  @IsOptional()
  @IsString()
  subnetName?: string;

  @IsOptional()
  @IsString()
  vlan?: string;

  @IsOptional()
  @IsString()
  vlanName?: string;

  @IsOptional()
  @IsString()
  deviceType?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
