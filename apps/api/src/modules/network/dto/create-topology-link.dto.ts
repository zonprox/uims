import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LinkMediumType, PortMode, PortRole } from '@uims/shared-types';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTopologyLinkDto {
  @ApiProperty({ description: 'Source SwitchPort ID' })
  @IsUUID()
  sourcePortId!: string;

  @ApiPropertyOptional({ description: 'Target SwitchPort ID (for inter-switch trunk uplink)' })
  @IsOptional()
  @IsUUID()
  targetPortId?: string;

  @ApiPropertyOptional({ description: 'Target Asset ID (for endpoint connection)' })
  @IsOptional()
  @IsUUID()
  targetAssetId?: string;

  @ApiPropertyOptional({ description: 'Target IP Address ID (for endpoint binding)' })
  @IsOptional()
  @IsUUID()
  targetIpAddressId?: string;

  @ApiPropertyOptional({ description: 'Link medium type', enum: LinkMediumType })
  @IsOptional()
  @IsEnum(LinkMediumType)
  medium?: LinkMediumType;

  @ApiPropertyOptional({ description: 'Port operational role', enum: PortRole })
  @IsOptional()
  @IsEnum(PortRole)
  portRole?: PortRole;

  @ApiPropertyOptional({ description: 'Port mode', enum: PortMode, default: PortMode.ACCESS })
  @IsOptional()
  @IsEnum(PortMode)
  mode?: PortMode;

  @ApiPropertyOptional({ description: 'VLAN ID' })
  @IsOptional()
  @IsUUID()
  vlanId?: string;

  @ApiPropertyOptional({ description: 'Array of tagged VLAN IDs or numbers for trunk' })
  @IsOptional()
  @IsArray()
  taggedVlanIds?: number[];

  @ApiPropertyOptional({ description: 'Link speed in Mbps', example: 10000 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  speedMbps?: number;

  @ApiPropertyOptional({ description: 'Link speed formatted string', example: '10 Gbps' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  speed?: string;

  @ApiPropertyOptional({ description: 'Enable PoE power delivery', default: false })
  @IsOptional()
  @IsBoolean()
  poeEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Alias for PoE delivery (from shared-validators)', default: false })
  @IsOptional()
  @IsBoolean()
  poeDelivering?: boolean;

  @ApiPropertyOptional({ description: 'Administrative patch cable label or description' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

