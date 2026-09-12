import { ApiPropertyOptional } from '@nestjs/swagger';
import { IPStatus } from '@uims/shared-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateIPAddressDto {
  @ApiPropertyOptional({ description: 'IPv4 address', example: '10.232.130.15' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Legacy IPv4 address alias' })
  @IsOptional()
  @IsString()
  ip?: string;

  @ApiPropertyOptional({ description: 'Device Hostname', example: 'BSL-AC-01' })
  @IsOptional()
  @IsString()
  hostname?: string;

  @ApiPropertyOptional({ description: 'MAC address', example: '00:1A:2B:3C:4D:5E' })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional({ description: 'Legacy MAC alias' })
  @IsOptional()
  @IsString()
  mac?: string;

  @ApiPropertyOptional({ description: 'Hardware vendor name' })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiPropertyOptional({ description: 'Device type category', example: 'Access Control' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Hardware model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Physical section or zone' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Floor location' })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional({ description: 'Subnet UUID' })
  @IsOptional()
  @IsString()
  subnetId?: string;

  @ApiPropertyOptional({ description: 'VLAN UUID' })
  @IsOptional()
  @IsString()
  vlanId?: string;

  @ApiPropertyOptional({ description: 'Location UUID' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Linked Asset UUID' })
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiPropertyOptional({ description: 'Assigned Directory User UUID' })
  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @ApiPropertyOptional({ enum: IPStatus, default: IPStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(IPStatus)
  status?: IPStatus | string;

  @ApiPropertyOptional({ default: 'online' })
  @IsOptional()
  @IsString()
  pingStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  responseTimeMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  lastSeen?: string | Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  // Legacy compatibility fields
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
}

export type CreateIpDto = CreateIPAddressDto;
export const CreateIpDto = CreateIPAddressDto;
