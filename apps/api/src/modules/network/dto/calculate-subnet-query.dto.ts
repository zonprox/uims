import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CalculateSubnetQueryDto {
  @ApiProperty({
    description: 'IPv4 CIDR block (e.g. 10.232.130.0/24)',
    example: '10.232.130.0/24',
  })
  @IsString()
  @IsNotEmpty()
  cidr!: string;
}
