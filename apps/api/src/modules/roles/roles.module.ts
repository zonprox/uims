import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
