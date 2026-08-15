import { Module } from '@nestjs/common';
import {
  DepartmentController,
  OrganizationController,
  PositionController,
} from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  controllers: [OrganizationController, DepartmentController, PositionController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
