import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RackStatus } from '@uims/shared-types';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRackDto {
  @ApiProperty({
    description: 'Equipment rack descriptive name',
    example: 'Core Datacenter Rack 01',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Unique rack code', example: 'RACK-DC-01' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiPropertyOptional({ description: 'Associated Location/Room UUID' })
  @IsOptional()
  @IsString()
  locationId?: string | null;

  @ApiPropertyOptional({
    description: 'Total rack unit height (1..100 RU, standard 12, 24, 42, 48, 52)',
    default: 42,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  totalHeight?: number;

  @ApiPropertyOptional({ description: 'Rack depth in mm', example: 1070 })
  @IsOptional()
  @IsNumber()
  depth?: number | null;

  @ApiPropertyOptional({ description: 'Rack width in mm', example: 800 })
  @IsOptional()
  @IsNumber()
  width?: number | null;

  @ApiPropertyOptional({ description: 'Maximum power capacity in kW', example: 10.0 })
  @IsOptional()
  @IsNumber()
  maxPowerKw?: number | null;

  @ApiPropertyOptional({ description: 'Maximum weight capacity in kg', example: 1200 })
  @IsOptional()
  @IsNumber()
  maxWeightKg?: number | null;

  @ApiPropertyOptional({ enum: RackStatus, default: RackStatus.ACTIVE })
  @IsOptional()
  @IsEnum(RackStatus)
  status?: RackStatus;

  @ApiPropertyOptional({ description: 'Operational notes' })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
