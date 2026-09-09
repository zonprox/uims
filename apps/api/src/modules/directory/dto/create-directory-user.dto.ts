import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  AccountStatus,
  CreateDirectoryUserDto as ICreateDirectoryUserDto,
  DirectorySource,
} from '@uims/shared-types';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Corporate job title', example: 'Operations Specialist' })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Company name', example: 'BSL Others' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ description: 'Group company', example: 'BSL' })
  @IsOptional()
  @IsString()
  groupCompany?: string;

  @ApiPropertyOptional({ description: 'Plant name', example: 'Plant 1' })
  @IsOptional()
  @IsString()
  plant?: string;

  @ApiPropertyOptional({ description: 'Section', example: 'Printing' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ description: 'Sub-section', example: 'Heat Transfer' })
  @IsOptional()
  @IsString()
  subSection?: string;

  @ApiPropertyOptional({ description: 'Department', example: 'Production' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Location', example: 'BSL Others - Plant 1' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Manager name', example: 'Phung Thi Nhu Y' })
  @IsOptional()
  @IsString()
  managerName?: string;

  @ApiPropertyOptional({ description: 'Telephone extension', example: '888152675' })
  @IsOptional()
  @IsString()
  telephone?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+84 28 3810 1234' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Primary assigned workstation hostname',
    example: 'STOTHPR102',
  })
  @IsOptional()
  @IsString()
  computerName?: string;

  @ApiPropertyOptional({ description: 'Secondary assigned workstation hostname' })
  @IsOptional()
  @IsString()
  computerName2?: string;

  @ApiPropertyOptional({
    description: 'Active Directory Security Group',
    example: 'GR_BSLOTHPrinting',
  })
  @IsOptional()
  @IsString()
  adGroup?: string;

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

  @ApiPropertyOptional({ description: 'Account Closed Flag', example: false })
  @IsOptional()
  isClosed?: boolean;

  @ApiPropertyOptional({ description: 'Account Expiration Timestamp' })
  @IsOptional()
  @IsString()
  accountExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Position UUID' })
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional({ description: 'Organization UUID' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Location UUID' })
  @IsOptional()
  @IsString()
  locationId?: string;
}
