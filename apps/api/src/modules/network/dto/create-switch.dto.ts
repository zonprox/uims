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
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isEvenNumber', async: false })
export class IsEvenNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    return typeof value === 'number' && Number.isInteger(value) && value % 2 === 0;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Total ports must be an even number';
  }
}

export class CreateSwitchDto {
  @ApiProperty({ description: 'Switch device name', example: 'BSL-CORE-SW01' })
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

  @ApiPropertyOptional({
    description: 'Total base RJ45 access ports (strictly even, 2 to 48)',
    default: 24,
    example: 24,
  })
  @IsOptional()
  @IsInt()
  @Min(2, { message: 'Total ports must be at least 2' })
  @Max(48, { message: 'Total ports cannot exceed 48' })
  @Validate(IsEvenNumberConstraint, { message: 'Total ports must be an even number' })
  totalPorts?: number;

  @ApiPropertyOptional({
    description: 'Dedicated RJ45 uplink ports (0 to 8)',
    default: 2,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Uplink ports cannot be negative' })
  @Max(8, { message: 'Uplink ports cannot exceed 8' })
  uplinkPorts?: number;

  @ApiPropertyOptional({
    description: 'Dedicated optical SFP/SFP+ fiber ports (0 to 8)',
    default: 2,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Fiber ports cannot be negative' })
  @Max(8, { message: 'Fiber ports cannot exceed 8' })
  fiberPorts?: number;

  @ApiPropertyOptional({
    description: 'Configured speed for RJ45 uplinks (1 Gbps, 2.5 Gbps, 10 Gbps)',
    example: '1 Gbps',
  })
  @IsOptional()
  @IsString()
  uplinkSpeed?: string;

  @ApiPropertyOptional({
    description: 'Configured speed for optical fiber ports (1 Gbps, 10 Gbps)',
    example: '10 Gbps',
  })
  @IsOptional()
  @IsString()
  fiberSpeed?: string;

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
