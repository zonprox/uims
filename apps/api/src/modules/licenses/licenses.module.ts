import { Module } from '@nestjs/common';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';

@Module({
  providers: [LicensesService],
  controllers: [LicensesController],
})
export class LicensesModule {}
