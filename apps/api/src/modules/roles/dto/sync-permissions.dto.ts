import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class SyncPermissionsDto {
  @ApiProperty({
    description: 'Complete array of permission UUIDs to set for this role',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each permission ID must be a valid UUID v4' })
  @IsNotEmpty()
  permissionIds!: string[];
}
