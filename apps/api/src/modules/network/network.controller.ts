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
  @ApiOperation({ summary: 'Get network statistics' })
  getStats() {
    return this.networkService.getStats();
  }

  @Get('ips')
  @ApiOperation({ summary: 'Get all IP addresses' })
  findAllIps(@Query() query: IPAddressQueryDto) {
    return this.networkService.findAllIps(query);
  }

  @Post('ips')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Allocate IP address' })
  createIp(@Body() body: CreateIPAddressDto) {
    return this.networkService.createIp(body);
  }

  @Get('ips/:id')
  @ApiOperation({ summary: 'Get IP address by ID' })
  findIp(@Param('id') id: string) {
    return this.networkService.findIp(id);
  }

  @Patch('ips/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update IP address' })
  updateIp(@Param('id') id: string, @Body() body: UpdateIPAddressDto) {
    return this.networkService.updateIp(id, body);
  }

  @Delete('ips/:id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete IP address' })
  deleteIp(@Param('id') id: string) {
    return this.networkService.deleteIp(id);
  }

  @Post('ping')
  @ApiOperation({ summary: 'Ping IP address' })
  pingIp(@Body() body: { ip: string }) {
    return this.networkService.pingIp(body.ip);
  }

  @Get('subnets')
  @ApiOperation({ summary: 'Get all subnets' })
  findAllSubnets() {
    return this.networkService.findAllSubnets();
  }

  @Post('subnets')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create subnet' })
  createSubnet(@Body() body: CreateSubnetDto) {
    return this.networkService.createSubnet(body);
  }

  @Get('dns')
  @ApiOperation({ summary: 'Get DNS records' })
  getDnsRecords() {
    return this.networkService.getDnsRecords();
  }
}
