import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class RestockInventoryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  @IsNotEmpty()
  quantity!: number;
}
