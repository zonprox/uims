import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existing = await this.findByEmail(createUserDto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const { password: _password, ...userData } = createUserDto;
    const created = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
      },
    });
    const { passwordHash: _hash, ...safeUser } = created;
    return safeUser;
  }

  async findAll(query?: { page?: number; limit?: number }) {
    const pageSize = Math.min(100, Math.max(1, Number(query?.limit) || 50));
    const page = Math.max(1, Number(query?.page) || 1);
    const skip = (page - 1) * pageSize;

    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        roleName: true,
        status: true,
        avatar: true,
        phone: true,
        department: true,
        location: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      take: pageSize,
      skip,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        roleName: true,
        status: true,
        avatar: true,
        phone: true,
        department: true,
        location: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const data: import('@prisma/client').Prisma.UserUpdateInput = { ...updateUserDto };
    if (updateUserDto.password) {
      data.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      delete (data as { password?: string }).password;
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
    });
    const { passwordHash: _hash, ...safeUser } = updated;
    return safeUser;
  }

  async remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
