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

  @ApiPropertyOptional({
    description: 'Filter by Switch Role (e.g. CORE, DISTRIBUTION, ACCESS, TOR)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  switchRole?: string;

  @ApiPropertyOptional({ description: 'Filter by Floor (e.g. 1F, 2F, Server Room)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string;

  @ApiPropertyOptional({ description: 'Filter by Subsystem Domain' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  domain?: string;

  @ApiPropertyOptional({ description: 'Include summary metrics in response', default: true })
  @IsOptional()
  includeMetrics?: boolean;
}
