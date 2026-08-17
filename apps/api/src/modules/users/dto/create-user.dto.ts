import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectorySource, UserStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiPropertyOptional({ example: 'john.doe' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '63020037' })
  @IsString()
  @IsOptional()
  employeeCode?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Asst. Officer' })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({ example: 'BSL Others' })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ example: 'BSL' })
  @IsString()
  @IsOptional()
  groupCompany?: string;

  @ApiPropertyOptional({ example: '1 BSL-1' })
  @IsString()
  @IsOptional()
  plant?: string;

  @ApiPropertyOptional({ example: 'Printing' })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiPropertyOptional({ example: 'Logo Embroidery' })
  @IsString()
  @IsOptional()
  subSection?: string;

  @ApiPropertyOptional({ example: 'STOTHPR102' })
  @IsString()
  @IsOptional()
  computerName?: string;

  @ApiPropertyOptional({ example: 'STOTHPR102-LAP' })
  @IsString()
  @IsOptional()
  computerName2?: string;

  @ApiPropertyOptional({ example: 'GR_BSLOTHPrinting' })
  @IsString()
  @IsOptional()
  adGroup?: string;

  @ApiPropertyOptional({ example: '888152675' })
  @IsString()
  @IsOptional()
  telephone?: string;

  @ApiPropertyOptional({ example: 'OU=Production,OU=BSL,DC=uims,DC=internal' })
  @IsString()
  @IsOptional()
  ouPath?: string;

  @ApiPropertyOptional({ example: 'Nguyen Doan Quang Huy' })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isClosed?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isLocked?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  accountExpiresAt?: string;

  @ApiPropertyOptional({ enum: DirectorySource, default: DirectorySource.LOCAL })
  @IsEnum(DirectorySource)
  @IsOptional()
  source?: DirectorySource;

  @ApiPropertyOptional({ example: 'kPm#*Ed8' })
  @IsString()
  @IsOptional()
  adInitialPassword?: string;

  @ApiPropertyOptional({ example: 'Admin@2026' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ example: 'role-uuid' })
  @IsString()
  @IsOptional()
  roleId?: string;

  @ApiPropertyOptional({ example: 'IT Admin' })
  @IsString()
  @IsOptional()
  roleName?: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({ example: '+1 (555) 123-4567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'Production' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 'NY HQ - Floor 4' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  positionId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  locationId?: string;
}
