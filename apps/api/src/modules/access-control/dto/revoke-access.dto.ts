import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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

export class RevokeAccessDto {
  @ApiProperty({ description: 'List of DoorAccessAssignment UUIDs to revoke', type: [String] })
  @Transform(({ value }) => parseArrayField(value))
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  assignmentIds!: string[];

  @ApiProperty({ description: 'Name of revoking authority' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  approverName!: string;

  @ApiPropertyOptional({ description: 'Title of revoking authority' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  approverTitle?: string;

  @ApiPropertyOptional({ description: 'Revocation reference number' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiProperty({ description: 'Reason for access revocation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ description: 'Pre-uploaded revocation scan document UUID' })
  @IsUUID('4')
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
