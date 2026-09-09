import { ApiProperty } from '@nestjs/swagger';
import type { BatchImportDirectoryUserItem } from '@uims/shared-types';
import { IsArray } from 'class-validator';

export class BatchImportDirectoryDto {
  @ApiProperty({
    description: 'Array of batch employee records to upsert into corporate directory',
    type: 'array',
  })
  @IsArray()
  users!: BatchImportDirectoryUserItem[];
}
