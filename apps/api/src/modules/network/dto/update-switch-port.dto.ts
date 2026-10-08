import { ApiPropertyOptional } from '@nestjs/swagger';
import { PortAdminStatus, PortFormFactor, PortMode, PortOperStatus } from '@uims/shared-types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateSwitchPortDto {
  @ApiPropertyOptional({ description: 'Interface port name', example: 'Gi1/0/1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: PortFormFactor })
  @IsOptional()
  @IsEnum(PortFormFactor)
  formFactor?: PortFormFactor;

  @ApiPropertyOptional({ description: 'PoE power sourcing equipment enabled' })
  @IsOptional()
  @IsBoolean()
  poeEnabled?: boolean;

  @ApiPropertyOptional({ description: 'PoE active power output in Watts' })
  @IsOptional()
  @IsNumber()
  poeWatts?: number | null;

  @ApiPropertyOptional({ enum: PortAdminStatus })
  @IsOptional()
  @IsEnum(PortAdminStatus)
  adminStatus?: PortAdminStatus;

  @ApiPropertyOptional({ enum: PortOperStatus })
  @IsOptional()
  @IsEnum(PortOperStatus)
  operStatus?: PortOperStatus;

  @ApiPropertyOptional({ description: 'Negotiated or configured speed', example: '1 Gbps' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  speed?: string | null;

  @ApiPropertyOptional({ description: 'Duplex mode', example: 'Full' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  duplex?: string | null;

  @ApiPropertyOptional({ description: 'Native/Access VLAN UUID' })
  @IsOptional()
  @IsUUID('4')
  vlanId?: string | null;

  @ApiPropertyOptional({ enum: PortMode })
  @IsOptional()
  @IsEnum(PortMode)
  mode?: PortMode;

  @ApiPropertyOptional({ description: '802.1Q tagged VLAN IDs array' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(4094, { each: true })
  taggedVlanIds?: number[] | null;

  @ApiPropertyOptional({ description: 'Bound IPAddress UUID' })
  @IsOptional()
  @IsUUID('4')
  ipAddressId?: string | null;

  @ApiPropertyOptional({ description: 'Connected endpoint Asset UUID' })
  @IsOptional()
  @IsUUID('4')
  connectedAssetId?: string | null;

  @ApiPropertyOptional({ description: 'Port interface description / label' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
