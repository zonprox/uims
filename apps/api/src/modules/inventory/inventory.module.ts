import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { VendorsController } from './vendors.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [InventoryController, VendorsController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
