import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PortAdminStatus, PortFormFactor, PortMode, PortOperStatus } from '@uims/shared-types';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSwitchPortDto {
  @ApiProperty({ description: 'Parent NetworkSwitch UUID' })
  @IsString()
  @IsNotEmpty()
  switchId!: string;

  @ApiProperty({ description: 'Port index number (1..52)', example: 1 })
  @IsInt()
  @Min(1)
  portNumber!: number;

  @ApiProperty({ description: 'Interface port name', example: 'Gi1/0/1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ enum: PortFormFactor, default: PortFormFactor.RJ45_1G })
  @IsOptional()
  @IsEnum(PortFormFactor)
  formFactor?: PortFormFactor;

  @ApiPropertyOptional({ description: 'PoE power sourcing equipment enabled', default: false })
  @IsOptional()
  @IsBoolean()
  poeEnabled?: boolean;

  @ApiPropertyOptional({ description: 'PoE active power output in Watts', example: 15.4 })
  @IsOptional()
  @IsNumber()
  poeWatts?: number | null;

  @ApiPropertyOptional({ enum: PortAdminStatus, default: PortAdminStatus.UP })
  @IsOptional()
  @IsEnum(PortAdminStatus)
  adminStatus?: PortAdminStatus;

  @ApiPropertyOptional({ enum: PortOperStatus, default: PortOperStatus.DOWN })
  @IsOptional()
  @IsEnum(PortOperStatus)
  operStatus?: PortOperStatus;

  @ApiPropertyOptional({ description: 'Negotiated or configured speed', example: '1 Gbps' })
  @IsOptional()
  @IsString()
  speed?: string | null;

  @ApiPropertyOptional({ description: 'Duplex mode', example: 'Full' })
  @IsOptional()
  @IsString()
  duplex?: string | null;

  @ApiPropertyOptional({ description: 'Native/Access VLAN UUID' })
  @IsOptional()
  @IsString()
  vlanId?: string | null;

  @ApiPropertyOptional({ enum: PortMode, default: PortMode.ACCESS })
  @IsOptional()
  @IsEnum(PortMode)
  mode?: PortMode;

  @ApiPropertyOptional({ description: '802.1Q tagged VLAN IDs array' })
  @IsOptional()
  taggedVlanIds?: number[] | string[] | null;

  @ApiPropertyOptional({ description: 'Bound IPAddress UUID' })
  @IsOptional()
  @IsString()
  ipAddressId?: string | null;

  @ApiPropertyOptional({ description: 'Connected endpoint Asset UUID' })
  @IsOptional()
  @IsString()
  connectedAssetId?: string | null;

  @ApiPropertyOptional({ description: 'Port interface description / label' })
  @IsOptional()
  @IsString()
  description?: string | null;
}
