import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectorySource, UserStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'john.doe' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Lead Cloud Architect' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ enum: DirectorySource, default: DirectorySource.LOCAL })
  @IsEnum(DirectorySource)
  @IsOptional()
  source?: DirectorySource;

  @ApiPropertyOptional({ example: 'Ad#JohnDoe2026!' })
  @IsString()
  @IsOptional()
  adInitialPassword?: string;

  @ApiPropertyOptional({ example: 'Admin@2026' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 'role-uuid' })
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ example: 'IT Admin' })
  @IsString()
  @IsOptional()
  roleName?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Engineering' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 'NY HQ - Floor 4' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  positionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  locationId?: string;
}
