import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class UserQueryDto extends PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Boolean)
  isLocked?: boolean;
}
