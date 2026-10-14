import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Data Transfer Object for unpatching (disconnecting) a SwitchPort connection.
 * Used as query parameters on DELETE /api/v1/network/topology/links/:portId.
 */
export class UnpatchTopologyLinkDto {
  @ApiPropertyOptional({
    description: 'Administrative reason for unpatching the cable link',
    example: 'Scheduled switch maintenance and cable recabling',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiPropertyOptional({
    description:
      'Reset port configuration to default (mode=ACCESS, vlanId=null, taggedVlanIds=null, poeEnabled=false)',
    example: true,
    default: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  resetPortConfig?: boolean;
}
