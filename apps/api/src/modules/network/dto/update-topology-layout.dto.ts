import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TopologyNodeType, TopologyViewMode } from '@uims/shared-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';


export class TopologyNodePositionItemDto {
  @ApiProperty({ description: 'Node ID (Rack ID, Switch ID, Asset ID)' })
  @IsString()
  @IsNotEmpty()
  nodeId!: string;

  @ApiPropertyOptional({
    description: 'Type of topology node',
    enum: TopologyNodeType,
    default: TopologyNodeType.SWITCH,
  })
  @IsOptional()
  @IsEnum(TopologyNodeType)
  nodeType?: TopologyNodeType;

  @ApiProperty({ description: 'Canvas X coordinate' })
  @IsNumber()
  x!: number;

  @ApiProperty({ description: 'Canvas Y coordinate' })
  @IsNumber()
  y!: number;

  @ApiPropertyOptional({ description: 'Pin node position on canvas', default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class UpdateTopologyLayoutDto {
  @ApiPropertyOptional({
    description: 'Topology view mode to save positions for',
    enum: TopologyViewMode,
    default: TopologyViewMode.ALL,
  })
  @IsOptional()
  @IsEnum(TopologyViewMode)
  viewMode?: TopologyViewMode;

  @ApiProperty({
    description: 'Array of node positions to persist (1 to 500 items)',
    type: [TopologyNodePositionItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => TopologyNodePositionItemDto)
  positions!: TopologyNodePositionItemDto[];

}
