import { Module } from '@nestjs/common';
import { AccessControlController } from './access-control.controller';
import { AccessControlStorageService } from './access-control-storage.service';
import { AccessControlService } from './access-control.service';

@Module({
  controllers: [AccessControlController],
  providers: [AccessControlService, AccessControlStorageService],
  exports: [AccessControlService, AccessControlStorageService],
})
export class AccessControlModule {}
