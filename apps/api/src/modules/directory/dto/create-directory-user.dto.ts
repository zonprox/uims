import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  AccountStatus,
  CreateDirectoryUserDto as ICreateDirectoryUserDto,
  DirectorySource,
} from '@uims/shared-types';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDirectoryUserDto implements ICreateDirectoryUserDto {
  @ApiPropertyOptional({ description: 'Corporate Employee ID/Code', example: '63020037' })
  @IsOptional()
  @IsString()
  employeeCode?: string;

  @ApiProperty({ description: 'Corporate email address', example: 'alex.chen@youngonevn.com' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'First name', example: 'Alex' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Last name', example: 'Chen' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'Alex Chen' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Manager name', example: 'Phung Thi Nhu Y' })
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+84 28 3810 1234' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Active Directory Canonical OU Path',
    example: 'OU=Printing,OU=Production,DC=uims,DC=internal',
  })
  @IsOptional()
  @IsString()
  ouPath?: string;

  @ApiPropertyOptional({ description: 'Directory Account Status', example: 'ACTIVE' })
  @IsOptional()
  status?: AccountStatus;

  @ApiPropertyOptional({ description: 'Directory Source', example: 'LOCAL' })
  @IsOptional()
  source?: DirectorySource;

  @ApiPropertyOptional({ description: 'Account Expiration Timestamp' })
  @IsOptional()
  @IsString()
  accountExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Position UUID' })
  @IsOptional()
  @IsUUID()
  positionId?: string;

  @ApiPropertyOptional({ description: 'Organization UUID' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Location UUID' })
  @IsOptional()
  @IsUUID()
  locationId?: string;
}
