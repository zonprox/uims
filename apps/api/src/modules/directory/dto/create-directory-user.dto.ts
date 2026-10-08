import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AccountStatus,
  type CreateDirectoryUserDto as ICreateDirectoryUserDto,
  DirectorySource,
  DomainJoinStatus,
} from '@uims/shared-types';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateDirectoryUserDto implements ICreateDirectoryUserDto {
  @ApiPropertyOptional({ description: 'Corporate Employee ID/Code', example: '63020037' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeCode?: string;

  @ApiProperty({ description: 'Corporate email address', example: 'alex.chen@youngonevn.com' })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ description: 'First name', example: 'Alex' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ description: 'Last name', example: 'Chen' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'Alex Chen' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Manager name', example: 'Phung Thi Nhu Y' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  managerName?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+84 28 3810 1234' })
  @IsOptional()
  @IsString()
  @Matches(/^[+0-9\s().-]{7,25}$/, { message: 'phone must be a valid telephone format' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatar?: string;

  @ApiPropertyOptional({ enum: AccountStatus, default: AccountStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @ApiPropertyOptional({ enum: DirectorySource, default: DirectorySource.LOCAL })
  @IsOptional()
  @IsEnum(DirectorySource)
  source?: DirectorySource;

  @ApiPropertyOptional({ description: 'Account Expiration Timestamp' })
  @IsOptional()
  @IsISO8601()
  accountExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Position UUID' })
  @IsOptional()
  @IsUUID('4')
  positionId?: string;

  @ApiPropertyOptional({ description: 'Organization UUID' })
  @IsOptional()
  @IsUUID('4')
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Active Directory Domain', example: 'corp.uims.internal' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  adDomain?: string;

  @ApiPropertyOptional({
    description: 'Active Directory Computer / Host Name',
    example: 'CORP-WS-01',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  computerName?: string;

  @ApiPropertyOptional({ description: 'Domain Joined Flag', example: true })
  @IsOptional()
  @IsBoolean()
  domainJoined?: boolean;

  @ApiPropertyOptional({ enum: DomainJoinStatus, default: DomainJoinStatus.JOINED })
  @IsOptional()
  @IsEnum(DomainJoinStatus)
  domainJoinStatus?: DomainJoinStatus;

  @ApiPropertyOptional({ description: 'Enterprise Email Password (encrypted at rest by server)' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  emailPassword?: string;
}
