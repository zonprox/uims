import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';

@Module({
  imports: [NotificationsModule],
  providers: [LicensesService],
  controllers: [LicensesController],
  exports: [LicensesService],
})
export class LicensesModule {}
