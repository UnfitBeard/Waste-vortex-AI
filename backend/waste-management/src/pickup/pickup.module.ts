/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { PickupController } from './pickup.controller';
import { PickupService } from './pickup.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Pickup, PickupSchema } from './schema/pickup.schema';
import { UploadsModule } from 'src/uploads/uploads.module';
import { ContaminationClient } from './contamination.client';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Pickup.name, schema: PickupSchema }]),
    UploadsModule,
    ConfigModule,
    CloudinaryModule,
    MailModule,
    NotificationsModule,
  ],
  controllers: [PickupController],
  providers: [PickupService, ContaminationClient],
  exports: [ContaminationClient],
})
export class PickupModule {}
