import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { ScheduledAlertsWorker } from './scheduled-alerts.worker';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        return {
          secret,
          signOptions: { expiresIn: '1d' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, ScheduledAlertsWorker],
  exports: [NotificationsService, NotificationsGateway, ScheduledAlertsWorker],
})
export class NotificationsModule {}
