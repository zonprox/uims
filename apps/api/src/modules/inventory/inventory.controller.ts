import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { InventoryQueryDto } from '@uims/shared-types';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { RestockInventoryDto } from './dto/restock-inventory.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory statistics' })
  getStats() {
    return this.inventoryService.getStats();
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create inventory item' })
  create(@Body() body: CreateInventoryItemDto) {
    return this.inventoryService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventory items' })
  findAll(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by ID' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update inventory item' })
  update(@Param('id') id: string, @Body() body: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, body);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete inventory item' })
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }

  @Post(':id/restock')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Restock inventory item' })
  restock(@Param('id') id: string, @Body() body: RestockInventoryDto) {
    return this.inventoryService.restock(id, body.quantity || 10);
  }
}
