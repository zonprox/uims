import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseDto } from './dto/update-license.dto';

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  async create(createLicenseDto: CreateLicenseDto) {
    return this.prisma.license.create({ data: createLicenseDto as any });
  }

  async findAll() {
    return this.prisma.license.findMany();
  }

  async findOne(id: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) {
      throw new NotFoundException(`License with ID ${id} not found`);
    }
    return license;
  }

  async update(id: string, updateLicenseDto: UpdateLicenseDto) {
    return this.prisma.license.update({ where: { id }, data: updateLicenseDto as any });
  }

  async remove(id: string) {
    return this.prisma.license.delete({ where: { id } });
  }
}
