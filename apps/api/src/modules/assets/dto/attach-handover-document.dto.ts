import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AttachHandoverDocumentDto {
  @ApiProperty({
    description: 'File URL of the stored signed handover document',
    example: '/api/v1/assets/handover-documents/file/handover-1718000000.pdf',
  })
  @IsString()
  @IsNotEmpty({ message: 'fileUrl is required' })
  fileUrl!: string;

  @ApiPropertyOptional({
    description:
      'Optional ID of the specific AssetHandoverRecord to resolve (essential when resolving specific Transfer records)',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsOptional()
  @IsUUID('4')
  recordId?: string;

  @ApiPropertyOptional({
    description: 'Optional verification or archival notes',
    example: 'Signed hardcopy archived in HR/IT cabinet.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
