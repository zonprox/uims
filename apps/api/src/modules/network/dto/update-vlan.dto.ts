import { PartialType } from '@nestjs/swagger';
import { CreateVlanDto } from './create-vlan.dto';

export class UpdateVlanDto extends PartialType(CreateVlanDto) {}
