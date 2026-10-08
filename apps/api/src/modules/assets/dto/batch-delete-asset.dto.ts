import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import type { BatchDeleteAssetDto as IBatchDeleteAssetDto } from '@uims/shared-types';

export class BatchDeleteAssetDto implements IBatchDeleteAssetDto {
  @ApiProperty({
    description: 'Array of asset unique identifiers to delete in bulk',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
  })
  @IsArray({ message: 'ids must be an array' })
  @ArrayNotEmpty({ message: 'ids array must not be empty' })
  @IsUUID('4', { each: true, message: 'Each asset ID must be a valid UUID v4' })
  @IsNotEmpty({ each: true, message: 'Asset IDs must not be empty strings' })
  ids!: string[];
}
