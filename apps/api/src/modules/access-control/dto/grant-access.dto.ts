import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AccessSubjectType, AccessValidityType } from '@uims/shared-types';

function parseArrayField(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return value;
}

export class GrantAccessDto {
  @ApiProperty({ description: 'List of target door UUIDs', type: [String] })
  @Transform(({ value }) => parseArrayField(value))
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  doorIds!: string[];

  @ApiProperty({ enum: AccessSubjectType })
  @IsEnum(AccessSubjectType)
  subjectType!: AccessSubjectType;

  @ApiProperty({ description: 'DirectoryUser or NonADUser UUIDs', type: [String] })
  @Transform(({ value }) => parseArrayField(value))
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  subjectIds!: string[];

  @ApiPropertyOptional({ enum: AccessValidityType, default: AccessValidityType.PERMANENT })
  @IsEnum(AccessValidityType)
  @IsOptional()
  accessType?: AccessValidityType = AccessValidityType.PERMANENT;

  @ApiPropertyOptional({ description: 'Validity start timestamp' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Validity expiration timestamp (required if TIME_BOUND)' })
  @IsDateString()
  @IsOptional()
  validTo?: string;

  @ApiProperty({ description: 'Name of approving authority' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  approverName!: string;

  @ApiPropertyOptional({ description: 'Title or role of approving authority' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  approverTitle?: string;

  @ApiPropertyOptional({ description: 'Formal request reference number (e.g. DAR-2026-10-0042)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiProperty({ description: 'Business justification for door access' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ description: 'Pre-uploaded approval scan document UUID' })
  @IsUUID('4')
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({ description: 'Additional administrative notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
