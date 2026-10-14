import { ApiPropertyOptional } from '@nestjs/swagger';
import { TopologyViewMode } from '@uims/shared-types';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class TopologyQueryDto {
  @ApiPropertyOptional({
    description: 'Topology view perspective mode',
    enum: TopologyViewMode,
    default: TopologyViewMode.ALL,
  })
  @IsOptional()
  @IsEnum(TopologyViewMode)
  mode?: TopologyViewMode;

  @ApiPropertyOptional({ description: 'Filter by Rack ID' })
  @IsOptional()
  @IsUUID()
  rackId?: string;

  @ApiPropertyOptional({ description: 'Filter by VLAN ID' })
  @IsOptional()
  @IsUUID()
  vlanId?: string;

  @ApiPropertyOptional({ description: 'Filter by Subnet ID' })
  @IsOptional()
  @IsUUID()
  subnetId?: string;

  @ApiPropertyOptional({ description: 'Filter by Switch Status' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
