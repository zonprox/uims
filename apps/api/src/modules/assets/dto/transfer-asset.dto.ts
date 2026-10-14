import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TransferAssetDto as ITransferAssetDto } from '@uims/shared-types';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class TransferAssetDto implements ITransferAssetDto {
  @ApiProperty({
    description: 'Array of physical unit asset IDs to transfer between custodians',
    example: ['11111111-1111-4111-8111-111111111111'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  assetIds!: string[];

  @ApiProperty({
    description: 'Target DirectoryUser ID (new custodian B receiving the assets)',
    example: '22222222-2222-4222-8222-222222222222',
  })
  @IsUUID('4')
  @IsNotEmpty()
  toUserId!: string;

  @ApiPropertyOptional({
    description: 'Source DirectoryUser ID (previous custodian A releasing the assets, optional)',
    example: '11111111-2222-4222-8222-222222222222',
  })
  @IsOptional()
  @IsUUID('4')
  fromUserId?: string;

  @ApiPropertyOptional({
    description: 'Optional target Department ID for the new custodian',
    example: '33333333-3333-4333-8333-333333333333',
  })
  @IsOptional()
  @IsString()
  toDepartmentId?: string;

  @ApiPropertyOptional({
    description: 'Business reason or justification for the custody transfer',
    example: 'Departmental reassignment from HR to Engineering.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  transferReason?: string;

  @ApiPropertyOptional({
    description: 'General administrative notes or inspection details upon transfer',
    example: 'Equipment inspected and verified in working condition before transfer.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Condition notes synonym',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conditionNotes?: string;

  @ApiPropertyOptional({
    description:
      'File URL of signed transfer handover document (applies to both records if singular)',
    example: '/api/v1/assets/handover-documents/file/transfer-1718000000.pdf',
  })
  @IsOptional()
  @IsString()
  signedDocUrl?: string;

  @ApiPropertyOptional({
    description: 'File URL of signed return document for releasing Custodian A',
  })
  @IsOptional()
  @IsString()
  returnSignedDocUrl?: string;

  @ApiPropertyOptional({
    description: 'File URL of signed assignment document for receiving Custodian B',
  })
  @IsOptional()
  @IsString()
  assignmentSignedDocUrl?: string;
}
