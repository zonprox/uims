import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VlanStatus } from '@uims/shared-types';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateVlanDto {
  @ApiProperty({ description: 'VLAN ID number (1-4094)', example: 130 })
  @IsInt()
  @Min(1)
  @Max(4094)
  vlanNumber!: number;

  @ApiProperty({ description: 'VLAN descriptive name', example: 'Access Control' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'VLAN functional description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: VlanStatus, default: VlanStatus.ACTIVE })
  @IsOptional()
  @IsEnum(VlanStatus)
  status?: VlanStatus;
}
