import { Body, Controller, Get, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ClientIP } from '../../common/decorators/client-ip.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

interface AuthRequest {
  user: {
    id: string;
    sub?: string;
    email: string;
    role?: string;
    name?: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'User login' })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @ClientIP() ip: string,
    @Headers('user-agent') userAgent = 'UIMS Browser Client',
  ) {
    return this.authService.login(loginDto, ip, userAgent);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  @Get('me')
  getProfile(@Request() req: AuthRequest) {
    return req.user;
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Refresh access token' })
  @Post('refresh')
  refresh(@Request() req: AuthRequest) {
    return this.authService.refresh(req.user);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'User logout' })
  @Post('logout')
  logout(@Request() req: AuthRequest) {
    const userId = req.user.id || req.user.sub || '';
    return this.authService.logout(userId);
  }
}
