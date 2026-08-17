import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CloneRoleDto {
  @ApiProperty({
    description: 'Unique name for the new cloned role',
    example: 'Junior Asset Technician',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  targetRoleName!: string;

  @ApiPropertyOptional({
    description: 'Description for the newly cloned role',
    example: 'Cloned from Technician with specialized permissions',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
