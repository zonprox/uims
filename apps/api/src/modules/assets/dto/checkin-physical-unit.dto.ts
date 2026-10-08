import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckinPhysicalUnitDto {
  @ApiPropertyOptional({
    description: 'Check-in return notes or condition summary',
    example: 'Returned in good operational condition',
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  notes?: string;
}
