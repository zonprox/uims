import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { BatchAssignAssetDto as IBatchAssignAssetDto } from '@uims/shared-types';
import { ArrayNotEmpty, IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

export class BatchAssignAssetDto implements IBatchAssignAssetDto {
  @ApiProperty({
    description: 'Array of asset unique identifiers to assign in bulk',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
  })
  @IsArray({ message: 'assetIds must be an array' })
  @ArrayNotEmpty({ message: 'assetIds array must not be empty' })
  @IsUUID('4', { each: true, message: 'Each asset ID must be a valid UUID v4' })
  assetIds!: string[];

  @ApiPropertyOptional({
    description: 'Directory user ID to assign assets to. Pass null or omit to unassign.',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsUUID('4')
  assignedToId?: string | null;

  @ApiPropertyOptional({
    description: 'Department ID to associate with the assigned assets',
    example: '123e4567-e89b-12d3-a456-426614174004',
  })
  @IsOptional()
  @ValidateIf((_obj, val) => val !== null && val !== undefined)
  @IsUUID('4')
  departmentId?: string | null;

  @ApiPropertyOptional({
    description:
      'Explicit lifecycle status for the assets (defaults to IN_USE if assigned, or AVAILABLE if unassigned)',
    example: 'IN_USE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}
