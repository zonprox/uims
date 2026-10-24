import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DoorDocumentType } from '@uims/shared-types';

export class UploadDocumentDto {
  @ApiProperty({
    enum: DoorDocumentType,
    description: 'Type of approval document: GRANT or REVOCATION',
  })
  @IsEnum(DoorDocumentType)
  documentType!: DoorDocumentType;

  @ApiProperty({ description: 'Full name of approving authority' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  approverName!: string;

  @ApiPropertyOptional({ description: 'Title or role of approving authority' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  approverTitle?: string;

  @ApiPropertyOptional({ description: 'Document reference number (e.g. DAR-2026-10-001)' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiProperty({ description: 'Operational reason or authorization justification' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ description: 'Additional administrative notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
