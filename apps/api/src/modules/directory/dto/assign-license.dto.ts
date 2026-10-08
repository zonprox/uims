import { ApiProperty } from '@nestjs/swagger';
import type { AssignLicenseDto as IAssignLicenseDto } from '@uims/shared-types';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignLicenseDto implements IAssignLicenseDto {
  @ApiProperty({
    description: 'Software License UUID to allocate a seat from',
    example: 'e71f80b2-3f62-4318-80f0-32b0051e59d1',
  })
  @IsNotEmpty()
  @IsUUID()
  licenseId!: string;
}
