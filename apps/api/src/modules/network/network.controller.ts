import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AutoDetectQueryDto,
  CalculateSubnetQueryDto,
  CreateIPAddressDto,
  CreateSubnetDto,
  CreateVlanDto,
  IPAddressQueryDto,
  MacVendorQueryDto,
  SubnetQueryDto,
  UpdateIPAddressDto,
  UpdateSubnetDto,
  UpdateVlanDto,
  VlanQueryDto,
} from './dto';
import { NetworkService } from './network.service';

interface RequestWithUser {
  user?: {
    id?: string;
    sub?: string;
  };
}

@ApiTags('network')
@ApiBearerAuth()
@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  // ==========================================
  // STATISTICS & AUTOMATION ENGINE ENDPOINTS
  // ==========================================

  @Get('stats')
  @ApiOperation({ summary: 'Get comprehensive network IPAM statistics' })
  getStats() {
    return this.networkService.getStats();
  }

  @Get('calculate-subnet')
  @ApiOperation({ summary: 'Calculate IP subnet specifications from CIDR' })
  calculateSubnet(@Query() query: CalculateSubnetQueryDto) {
    return this.networkService.calculateSubnet(query.cidr);
  }

  @Get('auto-detect')
  @ApiOperation({ summary: 'Auto-detect matching Subnet and VLAN from IP address' })
  autoDetect(@Query() query: AutoDetectQueryDto) {
    return this.networkService.autoDetect(query.ip);
  }

  @Get('mac-vendor')
  @ApiOperation({ summary: 'Auto MAC OUI vendor lookup' })
  lookupMacVendor(@Query() query: MacVendorQueryDto) {
    return this.networkService.lookupMacVendor(query.mac);
  }

  // ==========================================
  // VLAN ENDPOINTS
  // ==========================================

  @Get('vlans')
  @ApiOperation({ summary: 'Get all VLANs with bounded pagination and filtering' })
  findAllVlans(@Query() query: VlanQueryDto) {
    return this.networkService.findAllVlans(query);
  }

  @Post('vlans')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create a new VLAN' })
  createVlan(@Body() body: CreateVlanDto) {
    return this.networkService.createVlan(body);
  }

  @Get('vlans/:id')
  @ApiOperation({ summary: 'Get VLAN by ID or VLAN number' })
  findVlan(@Param('id') id: string) {
    return this.networkService.findVlan(id);
  }

  @Patch('vlans/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update VLAN details' })
  updateVlan(@Param('id') id: string, @Body() body: UpdateVlanDto) {
    return this.networkService.updateVlan(id, body);
  }

  @Delete('vlans/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete a VLAN' })
  deleteVlan(@Param('id') id: string) {
    return this.networkService.deleteVlan(id);
  }

  // ==========================================
  // SUBNET ENDPOINTS
  // ==========================================

  @Get('subnets')
  @ApiOperation({ summary: 'Get all subnets with utilization metrics' })
  findAllSubnets(@Query() query: SubnetQueryDto) {
    return this.networkService.findAllSubnets(query);
  }

  @Post('subnets')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create subnet with automated parameter calculation' })
  createSubnet(@Body() body: CreateSubnetDto) {
    return this.networkService.createSubnet(body);
  }

  @Get('subnets/:id/next-available-ip')
  @ApiOperation({ summary: 'Get lowest unallocated IP in subnet' })
  getNextAvailableIp(@Param('id') id: string) {
    return this.networkService.getNextAvailableIp(id);
  }

  @Get('subnets/:id')
  @ApiOperation({ summary: 'Get subnet by ID or CIDR' })
  findSubnet(@Param('id') id: string) {
    return this.networkService.findSubnet(id);
  }

  @Patch('subnets/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update subnet specifications' })
  updateSubnet(@Param('id') id: string, @Body() body: UpdateSubnetDto) {
    return this.networkService.updateSubnet(id, body);
  }

  @Delete('subnets/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete subnet' })
  deleteSubnet(@Param('id') id: string) {
    return this.networkService.deleteSubnet(id);
  }

  // ==========================================
  // IP ADDRESS ENDPOINTS
  // ==========================================

  @Get('ips')
  @ApiOperation({ summary: 'Get all allocated IP addresses with filters' })
  findAllIps(@Query() query: IPAddressQueryDto) {
    return this.networkService.findAllIps(query);
  }

  @Post('ips')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Allocate IP address with auto-detection & vendor lookup' })
  createIp(@Body() body: CreateIPAddressDto) {
    return this.networkService.createIp(body);
  }

  @Get('ips/:id')
  @ApiOperation({ summary: 'Get IP address by ID or IPv4' })
  findIp(@Param('id') id: string) {
    return this.networkService.findIp(id);
  }

  @Patch('ips/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update IP address allocation' })
  updateIp(@Param('id') id: string, @Body() body: UpdateIPAddressDto) {
    return this.networkService.updateIp(id, body);
  }

  @Delete('ips/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Deallocate IP address' })
  deleteIp(@Param('id') id: string) {
    return this.networkService.deleteIp(id);
  }

  @Post('ips/:id/reveal-credential')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Reveal decrypted administrative device credential' })
  revealCredential(@Param('id') id: string, @Request() req?: RequestWithUser) {
    const userId = req?.user?.id || req?.user?.sub;
    return this.networkService.revealCredential(id, userId);
  }
}
