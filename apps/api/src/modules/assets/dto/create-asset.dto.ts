import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  assetTag!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
