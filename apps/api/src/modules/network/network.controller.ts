import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AutoDetectQueryDto,
  CalculateSubnetQueryDto,
  CreateIPAddressDto,
  CreateRackDto,
  CreateSubnetDto,
  CreateSwitchDto,
  CreateSwitchPortDto,
  CreateVlanDto,
  IPAddressQueryDto,
  MacVendorQueryDto,
  RackQueryDto,
  SubnetQueryDto,
  SwitchPortQueryDto,
  SwitchQueryDto,
  UpdateIPAddressDto,
  UpdateRackDto,
  UpdateSubnetDto,
  UpdateSwitchDto,
  UpdateSwitchPortDto,
  UpdateVlanDto,
  VlanQueryDto,
} from './dto';
import { NetworkService } from './network.service';

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

  // ==========================================
  // RACK ENDPOINTS
  // ==========================================

  @Get('racks')
  @ApiOperation({ summary: 'Get all network racks with bounded pagination and filters' })
  findAllRacks(@Query() query: RackQueryDto) {
    return this.networkService.findAllRacks(query);
  }

  @Post('racks')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create a new network rack' })
  createRack(@Body() body: CreateRackDto) {
    return this.networkService.createRack(body);
  }

  @Get('racks/:id/elevation')
  @ApiOperation({ summary: 'Get 2D visual rack elevation slotting and telemetry' })
  getRackElevation(@Param('id') id: string) {
    return this.networkService.getRackElevation(id);
  }

  @Get('racks/:id')
  @ApiOperation({ summary: 'Get rack details by ID or rack code' })
  findRack(@Param('id') id: string) {
    return this.networkService.findRack(id);
  }

  @Patch('racks/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update rack properties' })
  updateRack(@Param('id') id: string, @Body() body: UpdateRackDto) {
    return this.networkService.updateRack(id, body);
  }

  @Delete('racks/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete a rack (unmounts mounted switches)' })
  deleteRack(@Param('id') id: string) {
    return this.networkService.deleteRack(id);
  }

  // ==========================================
  // SWITCH ENDPOINTS
  // ==========================================

  @Get('switches')
  @ApiOperation({ summary: 'Get all network switches with bounded pagination and filters' })
  findAllSwitches(@Query() query: SwitchQueryDto) {
    return this.networkService.findAllSwitches(query);
  }

  @Post('switches')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create a new network switch with auto-generated port matrix' })
  createSwitch(@Body() body: CreateSwitchDto) {
    return this.networkService.createSwitch(body);
  }

  @Get('switches/:id/ports')
  @ApiOperation({ summary: 'Get all ports for a network switch' })
  findSwitchPorts(@Param('id') id: string, @Query() query: SwitchPortQueryDto) {
    return this.networkService.findSwitchPorts(id, query);
  }

  @Post('switches/:id/ports')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Add a custom port to a network switch' })
  createPort(@Param('id') id: string, @Body() body: CreateSwitchPortDto) {
    return this.networkService.createPort(id, body);
  }

  @Get('switches/:id')
  @ApiOperation({ summary: 'Get switch details by ID or serial number' })
  findSwitch(@Param('id') id: string) {
    return this.networkService.findSwitch(id);
  }

  @Patch('switches/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update switch properties' })
  updateSwitch(@Param('id') id: string, @Body() body: UpdateSwitchDto) {
    return this.networkService.updateSwitch(id, body);
  }

  @Delete('switches/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete a switch (cascades to ports)' })
  deleteSwitch(@Param('id') id: string) {
    return this.networkService.deleteSwitch(id);
  }

  // ==========================================
  // PORT ENDPOINTS
  // ==========================================

  @Get('ports/:id')
  @ApiOperation({ summary: 'Get port details by ID' })
  findPort(@Param('id') id: string) {
    return this.networkService.findPort(id);
  }

  @Patch('ports/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update switch port configuration and operational status' })
  updatePort(@Param('id') id: string, @Body() body: UpdateSwitchPortDto) {
    return this.networkService.updatePort(id, body);
  }

  @Delete('ports/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete a switch port' })
  deletePort(@Param('id') id: string) {
    return this.networkService.deletePort(id);
  }
}
