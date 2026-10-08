import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import type {
  BatchAssignLicensesToUserDto as IBatchAssignLicensesToUserDto,
  BatchAssignUserLicenseDto as IBatchAssignUserLicenseDto,
} from '@uims/shared-types';

export class BatchAssignUserLicenseDto implements IBatchAssignUserLicenseDto {
  @ApiProperty({
    description: 'Array of directory user IDs to allocate license seats to',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
  })
  @IsArray({ message: 'userIds must be an array' })
  @ArrayNotEmpty({ message: 'userIds array must not be empty' })
  @IsUUID('4', { each: true, message: 'Each user ID must be a valid UUID v4' })
  @IsNotEmpty({ each: true, message: 'User IDs must not be empty strings' })
  userIds!: string[];
}

export class BatchAssignLicensesToUserDto implements IBatchAssignLicensesToUserDto {
  @ApiProperty({
    description: 'Array of license IDs to assign to the user',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
  })
  @IsArray({ message: 'licenseIds must be an array' })
  @ArrayNotEmpty({ message: 'licenseIds array must not be empty' })
  @IsUUID('4', { each: true, message: 'Each license ID must be a valid UUID v4' })
  @IsNotEmpty({ each: true, message: 'License IDs must not be empty strings' })
  licenseIds!: string[];

  @ApiProperty({
    description: 'Directory user ID receiving the software licenses',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  @IsNotEmpty({ message: 'userId must not be empty' })
  userId!: string;
}
