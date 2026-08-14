import { Module } from '@nestjs/common';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';

@Module({
  providers: [LicensesService],
  controllers: [LicensesController]
})
export class LicensesModule {}
