import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'NewSecretPass@2026' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}
