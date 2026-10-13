import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { GenerateHandoverDocumentDto as IGenerateHandoverDocumentDto } from '@uims/shared-types';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class GenerateHandoverDocumentDto implements IGenerateHandoverDocumentDto {
  @ApiProperty({
    description:
      'Document record type: assignment (handover to employee) or return (return to storage)',
    enum: ['assignment', 'return'],
    example: 'assignment',
  })
  @IsIn(['assignment', 'return'], {
    message: 'type must be either "assignment" or "return"',
  })
  type!: 'assignment' | 'return';

  @ApiPropertyOptional({
    description: 'Array of asset UUIDs to include and populate in the document',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsOptional()
  @IsArray({ message: 'assetIds must be an array' })
  @IsUUID('4', { each: true, message: 'Each asset ID must be a valid UUID v4' })
  assetIds?: string[];

  @ApiPropertyOptional({
    description: 'Directory user ID for recipient or returning employee',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsUUID('4', { message: 'recipientId must be a valid UUID v4' })
  recipientId?: string;

  @ApiPropertyOptional({
    description: 'Physical inspection or return condition notes',
    example: 'Normal condition with power adapter and protective sleeve.',
  })
  @IsOptional()
  @IsString()
  conditionNotes?: string;
}
