import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import {
  DepartmentController,
  OrganizationController,
  PositionController,
} from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  controllers: [
    OrganizationController,
    DepartmentController,
    PositionController,
    LocationController,
  ],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
