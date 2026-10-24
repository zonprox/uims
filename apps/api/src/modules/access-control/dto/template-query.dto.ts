import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccessSubjectType, AccessValidityType } from '@uims/shared-types';

function parseArrayField(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [String(value)];
}

export class TemplateQueryDto {
  @ApiPropertyOptional({ enum: AccessSubjectType })
  @IsEnum(AccessSubjectType)
  @IsOptional()
  subjectType?: AccessSubjectType;

  @ApiPropertyOptional({ description: 'Target subject UUID (DirectoryUser or NonADUser)' })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Comma-separated door UUIDs or array', type: [String] })
  @Transform(({ value }) => parseArrayField(value))
  @IsOptional()
  doorIds?: string[];

  @ApiPropertyOptional({ description: 'Access request justification reason' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ enum: AccessValidityType })
  @IsEnum(AccessValidityType)
  @IsOptional()
  accessType?: AccessValidityType;

  @ApiPropertyOptional({ description: 'Validity start date' })
  @IsString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Validity expiration date' })
  @IsString()
  @IsOptional()
  validTo?: string;
}
