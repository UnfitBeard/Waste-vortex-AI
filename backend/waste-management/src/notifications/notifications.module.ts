import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';
import { ContaminationNotificationService } from './contamination-notification.service';

@Module({
  imports: [
    ConfigModule,
    MailModule,
  ],
  providers: [ContaminationNotificationService],
  exports: [ContaminationNotificationService],
})
export class NotificationsModule {}
