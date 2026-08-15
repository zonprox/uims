import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  CreateCommentDto,
  CreateTicketDto,
  TicketQueryDto,
  UpdateTicketDto,
} from '@uims/shared-types';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get ticket queues and SLA performance' })
  getStats() {
    return this.ticketsService.getStats();
  }

  @Post()
  @ApiOperation({ summary: 'Open new support ticket' })
  create(@Body() body: CreateTicketDto) {
    return this.ticketsService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets' })
  findAll(@Query() query: TicketQueryDto) {
    return this.ticketsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by code or id' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket' })
  update(@Param('id') id: string, @Body() body: UpdateTicketDto) {
    return this.ticketsService.update(id, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.ticketsService.updateStatus(id, body.status);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add reply message to ticket thread' })
  addComment(@Param('id') id: string, @Body() body: CreateCommentDto) {
    return this.ticketsService.addComment(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete ticket' })
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}
