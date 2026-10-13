import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ReturnAssetDto as IReturnAssetDto } from '@uims/shared-types';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReturnAssetDto implements IReturnAssetDto {
  @ApiPropertyOptional({
    description: 'Target asset lifecycle status after return (defaults to In Storage)',
    example: 'In Storage',
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
    description: 'File URL of the stored signed handover/return record document',
    example: '/api/v1/assets/handover-documents/file/return-1718000000.pdf',
  })
  @IsOptional()
  @IsString()
  signedDocUrl?: string;
}
