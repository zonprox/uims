import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ description: 'Name of the role', example: 'Lead Cloud Architect' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the role responsibilities',
    example: 'Updated role description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of permission UUIDs to associate with the role',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissionIds?: string[];
}
