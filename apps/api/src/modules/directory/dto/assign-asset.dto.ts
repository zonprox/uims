import { ApiProperty } from '@nestjs/swagger';
import type { AssignAssetDto as IAssignAssetDto } from '@uims/shared-types';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignAssetDto implements IAssignAssetDto {
  @ApiProperty({
    description: 'Hardware Asset UUID to assign to employee',
    example: 'd85f80b2-3f62-4318-80f0-32b0051e59c0',
  })
  @IsNotEmpty()
  @IsUUID()
  assetId!: string;
}
