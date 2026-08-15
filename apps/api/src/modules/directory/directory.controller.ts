import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DirectoryUserQueryDto } from '@uims/shared-types';
import { CreateDirectoryGroupDto } from './dto/create-directory-group.dto';
import { CreateDirectoryUserDto } from './dto/create-directory-user.dto';
import { UpdateDirectoryUserDto } from './dto/update-directory-user.dto';
import { DirectoryService } from './directory.service';


@ApiTags('directory')
@Controller('directory')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get directory metrics' })
  getStats() {
    return this.directoryService.getStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Get directory users' })
  findAllUsers(@Query() query: DirectoryUserQueryDto) {
    return this.directoryService.findAllUsers(query);
  }

  @Post('users')
  @ApiOperation({ summary: 'Create directory user' })
  createUser(@Body() body: CreateDirectoryUserDto) {
    return this.directoryService.createUser(body);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get directory user by id' })
  findUser(@Param('id') id: string) {
    return this.directoryService.findUser(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update directory user' })
  updateUser(@Param('id') id: string, @Body() body: UpdateDirectoryUserDto) {
    return this.directoryService.updateUser(id, body);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete directory user' })
  deleteUser(@Param('id') id: string) {
    return this.directoryService.deleteUser(id);
  }

  @Get('groups')
  @ApiOperation({ summary: 'Get distribution groups' })
  findAllGroups() {
    return this.directoryService.findAllGroups();
  }

  @Post('groups')
  @ApiOperation({ summary: 'Create distribution group' })
  createGroup(@Body() body: CreateDirectoryGroupDto) {
    return this.directoryService.createGroup(body);
  }
}
