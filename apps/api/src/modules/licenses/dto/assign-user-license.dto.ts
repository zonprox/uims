import { ApiPropertyOptional } from '@nestjs/swagger';
import type { AssignUserLicenseDto as IAssignUserLicenseDto } from '@uims/shared-types';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignUserLicenseDto implements IAssignUserLicenseDto {
  @ApiPropertyOptional({
    description: 'Directory user UUID to allocate license seat to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID v4' })
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Employee name if assigning directly by name',
    example: 'Jane Doe',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Employee email address',
    example: 'jane.doe@youngonevn.com',
  })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(255)
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Department name',
    example: 'Information Technology',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  department?: string;
}
