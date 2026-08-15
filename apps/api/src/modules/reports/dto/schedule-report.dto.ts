import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ScheduleReportDto {
  @ApiProperty({ description: 'Type or title of report', example: 'IT Asset Lifecycle Report' })
  @IsString()
  @IsNotEmpty()
  reportType!: string;

  @ApiProperty({ description: 'Schedule frequency', example: 'Monthly' })
  @IsString()
  @IsNotEmpty()
  frequency!: string;

  @ApiPropertyOptional({ description: 'Export format (PDF, Excel, CSV)', example: 'PDF' })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiProperty({ description: 'Comma-separated recipient emails', example: 'admin@company.com' })
  @IsString()
  @IsNotEmpty()
  recipients!: string;
}
