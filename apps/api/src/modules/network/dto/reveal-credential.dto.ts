import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RevealCredentialDto {
  @ApiPropertyOptional({ description: 'Optional admin confirmation password or PIN' })
  @IsOptional()
  @IsString()
  password?: string;
}
