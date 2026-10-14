import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ReturnAssetDto as IReturnAssetDto } from '@uims/shared-types';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReturnAssetDto implements IReturnAssetDto {
  @ApiPropertyOptional({
    description: 'Array of physical unit asset IDs to return (for batch return)',
    example: ['11111111-1111-4111-8111-111111111111'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assetIds!: string[];

  @ApiPropertyOptional({
    description: 'Target asset lifecycle status after return (AVAILABLE, MAINTENANCE, RETIRED)',
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetStatus!: 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED';

  @ApiPropertyOptional({
    description: 'Alternative status string property for backwards compatibility',
    example: 'AVAILABLE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @ApiPropertyOptional({
    description: 'Condition notes, inspection details, or comments upon return',
    example: 'Asset returned in excellent physical and functional condition.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conditionNotes?: string;

  @ApiPropertyOptional({
    description: 'Inspection notes synonym for conditionNotes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  inspectionNotes?: string;

  @ApiPropertyOptional({
    description: 'General administrative notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'File URL of the stored signed handover/return record document',
    example: '/api/v1/assets/handover-documents/file/return-1718000000.pdf',
  })
  @IsOptional()
  @IsString()
  signedDocUrl?: string;
}
