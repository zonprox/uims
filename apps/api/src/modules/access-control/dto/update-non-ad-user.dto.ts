import { PartialType } from '@nestjs/swagger';
import { CreateNonADUserDto } from './create-non-ad-user.dto';

export class UpdateNonADUserDto extends PartialType(CreateNonADUserDto) {}
