import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class MacVendorQueryDto {
  @ApiProperty({
    description: 'MAC address (e.g. 44:19:B6:11:22:33)',
    example: '44:19:B6:11:22:33',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, {
    message: 'mac must be a valid MAC address',
  })
  mac!: string;
}
