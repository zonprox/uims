import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubnetDto {
  @ApiProperty({ description: 'CIDR notation (e.g. 10.232.130.0/24)', example: '10.232.130.0/24' })
  @IsString()
  @IsNotEmpty()
  cidr!: string;

  @ApiProperty({ description: 'Subnet display name', example: 'BSL Access Control Subnet' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'VLAN UUID' })
  @IsOptional()
  @IsString()
  vlanId?: string;

  @ApiPropertyOptional({ description: 'Location UUID' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Default gateway IPv4 address', example: '10.232.130.254' })
  @IsOptional()
  @IsString()
  gateway?: string;

  @ApiPropertyOptional({ description: 'Calculated network address' })
  @IsOptional()
  @IsString()
  networkAddress?: string;

  @ApiPropertyOptional({ description: 'Calculated subnet mask' })
  @IsOptional()
  @IsString()
  netmask?: string;

  @ApiPropertyOptional({ description: 'Calculated broadcast address' })
  @IsOptional()
  @IsString()
  broadcastAddress?: string;

  @ApiPropertyOptional({ description: 'Calculated usable start IP' })
  @IsOptional()
  @IsString()
  startIp?: string;

  @ApiPropertyOptional({ description: 'Calculated usable end IP' })
  @IsOptional()
  @IsString()
  endIp?: string;

  @ApiPropertyOptional({ description: 'Total IPs in subnet' })
  @IsOptional()
  totalIps?: number | string;

  @ApiPropertyOptional({ description: 'Reserved IPs count' })
  @IsOptional()
  reservedIps?: number;

  @ApiPropertyOptional({ description: 'Subnet description' })
  @IsOptional()
  @IsString()
  description?: string;

  // Legacy compatibility fields
  @IsOptional()
  @IsString()
  vlan?: string;

  @IsOptional()
  @IsString()
  vlanName?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
