import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubnetDto {
  @IsString()
  @IsNotEmpty()
  cidr!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  vlan?: string;

  @IsOptional()
  @IsString()
  gateway?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
