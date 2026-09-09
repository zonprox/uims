import { PartialType } from '@nestjs/swagger';
import { CreateDirectoryUserDto } from './create-directory-user.dto';

export class UpdateDirectoryUserDto extends PartialType(CreateDirectoryUserDto) {}
