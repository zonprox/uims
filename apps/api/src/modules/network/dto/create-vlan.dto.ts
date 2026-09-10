import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VlanStatus } from '@uims/shared-types';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateVlanDto {
  @ApiProperty({ description: 'VLAN ID number (1-4094)', example: 130 })
  @IsInt()
  @Min(1)
  @Max(4094)
  vlanNumber!: number;

  @ApiProperty({ description: 'VLAN descriptive name', example: 'Access Control' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'VLAN functional description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: VlanStatus, default: VlanStatus.ACTIVE })
  @IsOptional()
  @IsEnum(VlanStatus)
  status?: VlanStatus;

  @ApiPropertyOptional({ description: 'Associated Location/Site UUID' })
  @IsOptional()
  @IsString()
  locationId?: string;
}
