import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDirectoryGroupDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
