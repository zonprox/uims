import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { BatchImportDirectoryItemDto } from './batch-import-directory-item.dto';

export class BatchImportDirectoryDto {
  @ApiProperty({
    description: 'Array of batch employee records to upsert into corporate directory',
    type: [BatchImportDirectoryItemDto],
  })
  @IsArray({ message: 'users must be an array' })
  @ValidateNested({ each: true })
  @Type(() => BatchImportDirectoryItemDto)
  users!: BatchImportDirectoryItemDto[];
}
