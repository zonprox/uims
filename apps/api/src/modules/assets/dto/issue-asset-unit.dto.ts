import { IsOptional, IsString } from 'class-validator';

export class IssueAssetUnitDto {
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
