import { PartialType } from '@nestjs/swagger';
import { CreateIPAddressDto } from './create-ip.dto';

export class UpdateIPAddressDto extends PartialType(CreateIPAddressDto) {}
