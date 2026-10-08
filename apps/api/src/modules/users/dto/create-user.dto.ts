import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'john.doe' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @MaxLength(2048)
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567' })
  @IsString()
  @Matches(/^[+0-9\s().-]{7,25}$/, { message: 'phone must be a valid telephone format' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Youngone@2026' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 'role-uuid' })
  @IsUUID('4')
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
