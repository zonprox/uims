import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RackStatus } from '@uims/shared-types';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRackDto {
  @ApiProperty({
    description: 'Equipment rack descriptive name',
    example: 'Core Datacenter Rack 01',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Unique rack code', example: 'RACK-DC-01' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

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
  @MaxLength(1000)
  notes?: string | null;
}
