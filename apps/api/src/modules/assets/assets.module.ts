import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  providers: [AssetsService],
  controllers: [AssetsController],
})
export class AssetsModule {}
