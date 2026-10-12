import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReturnAssetDto {
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
    description: 'URL of the uploaded scanned signed handover/return record document',
    example: 'https://storage.example.com/handover-records/return-rec-123.pdf',
  })
  @IsOptional()
  @IsString()
  recordDocUrl?: string;
}
