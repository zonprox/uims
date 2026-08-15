import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDirectoryUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  jobTitle?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  accountStatus?: string;

  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @IsOptional()
  @IsString()
  managerEmail?: string;

  // Initial Passwords
  @IsOptional()
  @IsString()
  adInitialPassword?: string;

  @IsOptional()
  @IsString()
  mailInitialPassword?: string;

  // Domain Controller Mailbox Configuration
  @IsOptional()
  @IsBoolean()
  hasMailbox?: boolean;

  @IsOptional()
  @IsString()
  mailboxType?: string;

  @IsOptional()
  @IsNumber()
  quotaTotal?: number;

  @IsOptional()
  @IsNumber()
  quotaUsed?: number;

  @IsOptional()
  @IsString()
  mailStatus?: string;

  @IsOptional()
  @IsString()
  forwardingAddress?: string;

  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @IsOptional()
  @IsArray()
  aliases?: string[];
}
