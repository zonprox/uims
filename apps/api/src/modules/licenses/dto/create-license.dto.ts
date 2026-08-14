import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateLicenseDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  type!: string;

  @IsNumber()
  totalSeats!: number;
}
