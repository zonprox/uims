import { ApiPropertyOptional } from '@nestjs/swagger';
import { IPStatus } from '@uims/shared-types';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsIP,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateIPAddressDto {
  @ApiPropertyOptional({ description: 'IPv4 address', example: '10.232.130.15' })
  @IsOptional()
  @IsIP(4, { message: 'address must be a valid IPv4 address' })
  address?: string;

  @ApiPropertyOptional({ description: 'MAC address', example: '00:1A:2B:3C:4D:5E' })
  @IsOptional()
  @Matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, {
    message: 'macAddress must be a valid MAC address',
  })
  macAddress?: string;

  @ApiPropertyOptional({ description: 'Hardware vendor name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vendor?: string;

  @ApiPropertyOptional({ description: 'Device type category', example: 'Access Control' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Hardware model' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Physical section or zone' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  section?: string;

  @ApiPropertyOptional({ description: 'Floor location' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  floor?: string;

  @ApiPropertyOptional({ description: 'Subnet UUID' })
  @IsOptional()
  @IsUUID('4')
  subnetId?: string;

  @ApiPropertyOptional({ description: 'VLAN UUID' })
  @IsOptional()
  @IsUUID('4')
  vlanId?: string;

  @ApiPropertyOptional({ description: 'Linked Asset UUID' })
  @IsOptional()
  @IsUUID('4')
  assetId?: string;

  @ApiPropertyOptional({ description: 'Assigned Directory User UUID' })
  @IsOptional()
  @IsUUID('4')
  assignedUserId?: string;

  @ApiPropertyOptional({ enum: IPStatus, default: IPStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(IPStatus)
  status?: IPStatus;

  @ApiPropertyOptional({ default: 'online' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  pingStatus?: string;

  @ApiPropertyOptional({ description: 'Ping response time in milliseconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60000)
  responseTimeMs?: number;

  @ApiPropertyOptional({ description: 'Last active observation timestamp' })
  @IsOptional()
  @IsISO8601()
  lastSeen?: string;

  @ApiPropertyOptional({ description: 'Network address notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
