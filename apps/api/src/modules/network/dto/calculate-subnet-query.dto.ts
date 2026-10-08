import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CalculateSubnetQueryDto {
  @ApiProperty({
    description: 'IPv4 CIDR block (e.g. 10.232.130.0/24)',
    example: '10.232.130.0/24',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/, {
    message: 'cidr must be a valid IPv4 CIDR notation',
  })
  cidr!: string;
}
