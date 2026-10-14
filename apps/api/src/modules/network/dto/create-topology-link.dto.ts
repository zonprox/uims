import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PortMode } from '@uims/shared-types';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Link speed', example: '10 Gbps' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  speed?: string;
}
