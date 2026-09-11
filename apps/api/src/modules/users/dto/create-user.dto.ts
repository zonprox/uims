import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Admin@2026' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 'role-uuid' })
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  mustChangePassword?: boolean;
}
