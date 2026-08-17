import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SyncPermissionsDto {
  @ApiProperty({
    description: 'Complete array of permission UUIDs to set for this role',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  permissionIds!: string[];
}
