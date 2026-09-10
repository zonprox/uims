import { PartialType } from '@nestjs/swagger';
import { CreateSubnetDto } from './create-subnet.dto';

export class UpdateSubnetDto extends PartialType(CreateSubnetDto) {}
