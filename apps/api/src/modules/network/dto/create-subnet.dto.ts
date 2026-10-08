import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsIP,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSubnetDto {
  @ApiProperty({ description: 'CIDR notation (e.g. 10.232.130.0/24)', example: '10.232.130.0/24' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/, {
    message: 'cidr must be a valid IPv4 CIDR notation',
  })
  cidr!: string;

  @ApiProperty({ description: 'Subnet display name', example: 'BSL Access Control Subnet' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'VLAN UUID' })
  @IsOptional()
  @IsUUID('4')
  vlanId?: string;

  @ApiPropertyOptional({ description: 'Default gateway IPv4 address', example: '10.232.130.254' })
  @IsOptional()
  @IsIP(4, { message: 'gateway must be a valid IPv4 address' })
  gateway?: string;

  @ApiPropertyOptional({ description: 'Calculated network address' })
  @IsOptional()
  @IsIP(4, { message: 'networkAddress must be a valid IPv4 address' })
  networkAddress?: string;

  @ApiPropertyOptional({ description: 'Calculated subnet mask' })
  @IsOptional()
  @IsIP(4, { message: 'netmask must be a valid IPv4 address' })
  netmask?: string;

  @ApiPropertyOptional({ description: 'Calculated broadcast address' })
  @IsOptional()
  @IsIP(4, { message: 'broadcastAddress must be a valid IPv4 address' })
  broadcastAddress?: string;

  @ApiPropertyOptional({ description: 'Calculated usable start IP' })
  @IsOptional()
  @IsIP(4, { message: 'startIp must be a valid IPv4 address' })
  startIp?: string;

  @ApiPropertyOptional({ description: 'Calculated usable end IP' })
  @IsOptional()
  @IsIP(4, { message: 'endIp must be a valid IPv4 address' })
  endIp?: string;

  @ApiPropertyOptional({ description: 'Total IPs in subnet' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalIps?: number;

  @ApiPropertyOptional({ description: 'Reserved IPs count' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reservedIps?: number;

  @ApiPropertyOptional({ description: 'Subnet description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
