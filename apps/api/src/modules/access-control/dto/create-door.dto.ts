import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { DoorSecurityLevel, DoorStatus } from '@uims/shared-types';

export class CreateDoorDto {
  @ApiProperty({ description: 'Unique physical door identifier code (e.g. DR-DC-01)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  doorCode!: string;

  @ApiProperty({ description: 'Descriptive human-readable door name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ description: 'Detailed description of the door and enclosed facility' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ description: 'Building name or facility code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  building!: string;

  @ApiProperty({ description: 'Floor number or level identifier' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  floor!: string;

  @ApiPropertyOptional({ description: 'Facility zone or wing (e.g. Server Vault, Core IT Zone)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  zone?: string;

  @ApiPropertyOptional({ description: 'Specific location description or coordinates' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ description: 'Owning organization UUID' })
  @IsUUID('4')
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ enum: DoorSecurityLevel, default: DoorSecurityLevel.STANDARD })
  @IsEnum(DoorSecurityLevel)
  @IsOptional()
  securityLevel?: DoorSecurityLevel = DoorSecurityLevel.STANDARD;

  @ApiPropertyOptional({ enum: DoorStatus, default: DoorStatus.ACTIVE })
  @IsEnum(DoorStatus)
  @IsOptional()
  status?: DoorStatus = DoorStatus.ACTIVE;

  @ApiPropertyOptional({ description: 'Controller model (e.g. HID Aero X1100)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  controllerModel?: string;

  @ApiPropertyOptional({ description: 'Controller network IP address' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  controllerIp?: string;

  @ApiPropertyOptional({ description: 'Card reader type or model' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  readerType?: string;

  @ApiPropertyOptional({ description: 'Physical reader hardware ID' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  readerId?: string;

  @ApiPropertyOptional({ description: 'Hardware installation timestamp' })
  @IsDateString()
  @IsOptional()
  installedAt?: string;

  @ApiPropertyOptional({ description: 'Administrative notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Arbitrary device and vendor metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
