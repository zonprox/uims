import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SwitchRole, SwitchStatus } from '@uims/shared-types';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateSwitchDto {
  @ApiProperty({ description: 'Switch device name / hostname', example: 'BSL-CORE-SW01' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Hardware model string', example: 'C9300-48P-A' })
  @IsString()
  @IsNotEmpty()
  model!: string;

  @ApiProperty({ description: 'Hardware vendor/make', example: 'Cisco Systems' })
  @IsString()
  @IsNotEmpty()
  vendor!: string;

  @ApiPropertyOptional({ description: 'Unique hardware serial number', example: 'FOC2488102' })
  @IsOptional()
  @IsString()
  serialNumber?: string | null;

  @ApiPropertyOptional({ description: 'Base MAC address', example: '70:69:79:2A:41:01' })
  @IsOptional()
  @IsString()
  macAddress?: string | null;

  @ApiPropertyOptional({ description: 'Linked management IPAddress UUID' })
  @IsOptional()
  @IsString()
  ipAddressId?: string | null;

  @ApiPropertyOptional({ description: 'Operating firmware/OS version', example: '17.3.3' })
  @IsOptional()
  @IsString()
  firmwareVersion?: string | null;

  @ApiPropertyOptional({ enum: SwitchRole, default: SwitchRole.ACCESS })
  @IsOptional()
  @IsEnum(SwitchRole)
  role?: SwitchRole;

  @ApiPropertyOptional({ enum: SwitchStatus, default: SwitchStatus.ONLINE })
  @IsOptional()
  @IsEnum(SwitchStatus)
  status?: SwitchStatus;

  @ApiPropertyOptional({ description: 'Total base ports (e.g. 24 or 48)', default: 24 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(52)
  totalPorts?: number;

  @ApiPropertyOptional({ description: 'Mounted NetworkRack UUID' })
  @IsOptional()
  @IsString()
  rackId?: string | null;

  @ApiPropertyOptional({ description: 'Mounted RU slot starting position (1..100)', example: 39 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  rackPosition?: number | null;

  @ApiPropertyOptional({ description: 'Occupied rack unit height (1..100 RU)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  rackHeight?: number;

  @ApiPropertyOptional({ description: 'Linked hardware Asset UUID' })
  @IsOptional()
  @IsString()
  assetId?: string | null;

  @ApiPropertyOptional({ description: 'Physical Location UUID' })
  @IsOptional()
  @IsString()
  locationId?: string | null;

  @ApiPropertyOptional({ description: 'Estimated power draw in Watts', example: 350 })
  @IsOptional()
  @IsNumber()
  powerDrawWatts?: number | null;

  @ApiPropertyOptional({ description: 'Physical weight in kg', example: 8.5 })
  @IsOptional()
  @IsNumber()
  weightKg?: number | null;

  @ApiPropertyOptional({ description: 'Operational notes' })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Auto-generate 24/48 ports + 4 SFP uplinks', default: true })
  @IsOptional()
  @IsBoolean()
  autoGeneratePorts?: boolean;
}
