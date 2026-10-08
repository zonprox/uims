import { PartialType } from '@nestjs/swagger';
import type { UpdateDirectoryGroupDto as IUpdateDirectoryGroupDto } from '@uims/shared-types';
import { CreateDirectoryGroupDto } from './create-directory-group.dto';

export class UpdateDirectoryGroupDto
  extends PartialType(CreateDirectoryGroupDto)
  implements IUpdateDirectoryGroupDto {}
