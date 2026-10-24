import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { NonADUserStatus } from '@uims/shared-types';

export class CreateNonADUserDto {
  @ApiProperty({ description: 'Full legal name of the external individual' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ description: 'Unique physical RFID/NFC badge number (e.g. EXT-B0892)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  badgeNumber!: string;

  @ApiProperty({ description: 'National identity card number or passport number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  identityNumber!: string;

  @ApiProperty({ description: 'External employer or contractor company name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  company!: string;

  @ApiPropertyOptional({ description: 'Direct contact phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Business email address' })
  @IsEmail()
  @IsOptional()
  @MaxLength(150)
  email?: string;

  @ApiPropertyOptional({ description: 'Personnel category (CONTRACTOR, VISITOR, VENDOR, AUDITOR)' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  userType?: string = 'CONTRACTOR';

  @ApiPropertyOptional({ enum: NonADUserStatus, default: NonADUserStatus.ACTIVE })
  @IsEnum(NonADUserStatus)
  @IsOptional()
  status?: NonADUserStatus = NonADUserStatus.ACTIVE;

  @ApiPropertyOptional({ description: 'Validity period start date' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Validity period end date' })
  @IsDateString()
  @IsOptional()
  validTo?: string;

  @ApiPropertyOptional({ description: 'Administrative notes or contract reference' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Arbitrary vendor/contract metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
