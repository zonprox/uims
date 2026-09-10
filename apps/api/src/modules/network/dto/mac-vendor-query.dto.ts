import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class MacVendorQueryDto {
  @ApiProperty({
    description: 'MAC address (e.g. 44:19:B6:11:22:33)',
    example: '44:19:B6:11:22:33',
  })
  @IsString()
  @IsNotEmpty()
  mac!: string;
}
