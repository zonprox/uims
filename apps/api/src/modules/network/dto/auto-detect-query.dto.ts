import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AutoDetectQueryDto {
  @ApiProperty({ description: 'IPv4 address (e.g. 10.232.130.15)', example: '10.232.130.15' })
  @IsString()
  @IsNotEmpty()
  ip!: string;
}
