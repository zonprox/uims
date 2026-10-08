import { ApiProperty } from '@nestjs/swagger';
import { IsIP, IsNotEmpty } from 'class-validator';

export class AutoDetectQueryDto {
  @ApiProperty({ description: 'IPv4 address (e.g. 10.232.130.15)', example: '10.232.130.15' })
  @IsIP(4, { message: 'ip must be a valid IPv4 address' })
  @IsNotEmpty()
  ip!: string;
}
