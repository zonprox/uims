import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ToggleStatusDto } from './dto/toggle-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get user metrics summary' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get('roles/list')
  @ApiOperation({ summary: 'Get all available RBAC roles' })
  getRoles() {
    return this.usersService.getRoles();
  }

  @Post()
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Create new user' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users with search and filter' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('department') department?: string,
  ) {
    return this.usersService.findAll({ page, limit, search, role, status, department });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/reset-password')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Reset user password' })
  resetPassword(@Param('id') id: string, @Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(id, body.password);
  }

  @Patch(':id/toggle-status')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Toggle user active status' })
  toggleStatus(@Param('id') id: string, @Body() body: ToggleStatusDto) {
    return this.usersService.toggleStatus(id, body.status);
  }

  @Delete(':id')
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
