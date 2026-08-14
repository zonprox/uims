import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private prisma: PrismaService) {}

  async create(createAssetDto: CreateAssetDto) {
    return this.prisma.asset.create({ data: createAssetDto as any });
  }

  async findAll() {
    return this.prisma.asset.findMany({ include: { category: true, assignedTo: true } });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(id: string, updateAssetDto: UpdateAssetDto) {
    return this.prisma.asset.update({ where: { id }, data: updateAssetDto as any });
  }

  async remove(id: string) {
    return this.prisma.asset.delete({ where: { id } });
  }
}
