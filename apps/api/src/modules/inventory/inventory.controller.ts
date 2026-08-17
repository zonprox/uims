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
  @ApiOperation({ summary: 'Get inventory stock metrics' })
  getStats() {
    return this.inventoryService.getStats();
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Add new inventory SKU (Admin/Super Admin only)' })
  create(@Body() body: CreateInventoryItemDto) {
    return this.inventoryService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all inventory items' })
  findAll(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item by id' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Update inventory item (Admin/Super Admin only)' })
  update(@Param('id') id: string, @Body() body: UpdateInventoryItemDto) {
    return this.inventoryService.update(id, body);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete inventory item (Admin/Super Admin only)' })
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }

  @Post(':id/restock')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Restock inventory SKU quantity (Admin/Super Admin only)' })
  restock(@Param('id') id: string, @Body() body: RestockInventoryDto) {
    return this.inventoryService.restock(id, body.quantity || 10);
  }
}
