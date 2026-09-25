import { PartialType } from '@nestjs/swagger';
import { CreateSwitchDto } from './create-switch.dto';

export class UpdateSwitchDto extends PartialType(CreateSwitchDto) {}
