import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { IPAddressQueryDto } from '@uims/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateIPAddressDto } from './dto/create-ip.dto';
import { CreateSubnetDto } from './dto/create-subnet.dto';
import { UpdateIPAddressDto } from './dto/update-ip.dto';
import { NetworkService } from './network.service';

@ApiTags('network')
@ApiBearerAuth()
@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get network IPAM metrics' })
  getStats() {
    return this.networkService.getStats();
  }

  @Get('ips')
  @ApiOperation({ summary: 'Get all IP address allocations' })
  findAllIps(@Query() query: IPAddressQueryDto) {
    return this.networkService.findAllIps(query);
  }

  @Post('ips')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Allocate new static IP (Admin/Super Admin only)' })
  createIp(@Body() body: CreateIPAddressDto) {
    return this.networkService.createIp(body);
  }

  @Get('ips/:id')
  @ApiOperation({ summary: 'Get IP address by id' })
  findIp(@Param('id') id: string) {
    return this.networkService.findIp(id);
  }

  @Patch('ips/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update IP address (Admin/Super Admin only)' })
  updateIp(@Param('id') id: string, @Body() body: UpdateIPAddressDto) {
    return this.networkService.updateIp(id, body);
  }

  @Delete('ips/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Release IP address (Admin/Super Admin only)' })
  deleteIp(@Param('id') id: string) {
    return this.networkService.deleteIp(id);
  }

  @Post('ping')
  @ApiOperation({ summary: 'Execute ICMP Ping test' })
  pingIp(@Body() body: { ip: string }) {
    return this.networkService.pingIp(body.ip);
  }

  @Get('subnets')
  @ApiOperation({ summary: 'Get all configured subnets' })
  findAllSubnets() {
    return this.networkService.findAllSubnets();
  }

  @Post('subnets')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Provision new subnet (Admin/Super Admin only)' })
  createSubnet(@Body() body: CreateSubnetDto) {
    return this.networkService.createSubnet(body);
  }

  @Get('dns')
  @ApiOperation({ summary: 'Get internal DNS records' })
  getDnsRecords() {
    return this.networkService.getDnsRecords();
  }
}
