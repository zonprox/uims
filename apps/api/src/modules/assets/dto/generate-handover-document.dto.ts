import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class GenerateHandoverDocumentDto {
  @ApiProperty({
    description:
      'Document record type: assignment (handover to employee), return (return to storage), or transfer (custody reassignment between employees)',
    enum: ['assignment', 'return', 'transfer'],
    example: 'assignment',
  })
  @IsIn(['assignment', 'return', 'transfer'], {
    message: 'type must be "assignment", "return", or "transfer"',
  })
  type!: 'assignment' | 'return' | 'transfer';

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
    description:
      'Directory user ID for recipient or returning employee (Transferee / Custodian B in Transfer)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsUUID('4', { message: 'recipientId must be a valid UUID v4' })
  recipientId?: string;

  @ApiPropertyOptional({
    description: 'Directory user ID for releasing employee (Transferor / Custodian A in Transfer)',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsUUID('4', { message: 'transferorId must be a valid UUID v4' })
  transferorId?: string;

  @ApiPropertyOptional({
    description: 'Physical inspection or return condition notes',
    example: 'Normal condition with power adapter and protective sleeve.',
  })
  @IsOptional()
  @IsString()
  conditionNotes?: string;
}
