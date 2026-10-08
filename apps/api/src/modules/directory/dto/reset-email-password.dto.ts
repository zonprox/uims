import { ApiPropertyOptional } from '@nestjs/swagger';
import type { ResetEmailPasswordDto as IResetEmailPasswordDto } from '@uims/shared-types';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetEmailPasswordDto implements IResetEmailPasswordDto {
  @ApiPropertyOptional({
    description:
      'New password for corporate email. If omitted or blank, a secure 24-character random password will be auto-generated.',
    example: 'SecureP@ssw0rd2026!',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword?: string;

  @ApiPropertyOptional({
    description: 'Legacy password property alias',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({
    description: 'Explicitly request generating a secure random password',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  generateRandom?: boolean;
}
