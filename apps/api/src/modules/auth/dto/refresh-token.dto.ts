import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Cryptographically signed refresh token',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  refreshToken?: string;
}
