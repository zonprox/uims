import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AllocateAssetDto as IAllocateAssetDto } from '@uims/shared-types';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AllocateAssetDto implements IAllocateAssetDto {
  @ApiProperty({
    description: 'Array of physical unit asset IDs to allocate to the recipient',
    example: ['11111111-1111-4111-8111-111111111111'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  assetIds!: string[];

  @ApiProperty({
    description: 'Target DirectoryUser ID (custodian receiving the assets)',
    example: '22222222-2222-4222-8222-222222222222',
  })
  @IsUUID('4')
  @IsNotEmpty()
  assignedToId!: string;

  @ApiPropertyOptional({
    description: 'Optional department ID override for asset allocation',
    example: '33333333-3333-4333-8333-333333333333',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Optional cost center ID override for asset allocation',
    example: '44444444-4444-4444-8444-444444444444',
  })
  @IsOptional()
  @IsUUID('4')
  costCenterId?: string;

  @ApiPropertyOptional({
    description: 'Condition notes, physical state, or accessories included at allocation',
    example: 'Issued with 65W USB-C charger and laptop sleeve. Pristine condition.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conditionNotes?: string;

  @ApiPropertyOptional({
    description: 'General administrative notes',
    example: 'Standard onboarding equipment issuance.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'File URL of signed handover document if uploaded immediately during allocation',
    example: '/api/v1/assets/handover-documents/file/handover-1718000000.pdf',
  })
  @IsOptional()
  @IsString()
  signedDocUrl?: string;
}
