import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Unique name of the role', example: 'Cloud Infrastructure Lead' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the role responsibilities',
    example: 'Manages cloud infrastructure, network subnets, and host allocations',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Array of permission UUIDs to associate with the role',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @IsUUID('4', { each: true, message: 'Each permission ID must be a valid UUID v4' })
  @IsOptional()
  permissionIds?: string[];
}
