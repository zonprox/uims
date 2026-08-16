import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    identifier: string,
    pass: string,
  ): Promise<Omit<import('@prisma/client').User, 'passwordHash'> | null> {
    const clean = identifier.trim().toLowerCase();
    const user = await this.usersService.findByIdentifier(clean);
    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (isMatch) {
      const { passwordHash: _passwordHash, ...result } = user;
      return result;
    }

    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const role = user.roleName || 'Employee';
    const payload = { email: user.email, sub: user.id, role, username: user.username };
    const token = this.jwtService.sign(payload);
    return {
      token,
      accessToken: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
        role,
      },
    };
  }

  async refresh(user: {
    id?: string;
    sub?: string;
    email: string;
    username?: string;
    role?: string;
    name?: string;
  }) {
    const role = user.role || 'Employee';
    const userId = user.id || user.sub;
    const payload = { email: user.email, sub: userId, role, username: user.username };
    const token = this.jwtService.sign(payload);
    return {
      token,
      accessToken: token,
      user: {
        ...user,
        role,
      },
    };
  }
}
