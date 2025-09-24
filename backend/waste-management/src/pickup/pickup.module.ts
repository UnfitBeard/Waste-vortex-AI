/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Module } from '@nestjs/common';
import { PickupController } from './pickup.controller';
import { PickupService } from './pickup.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Pickup, PickupSchema } from './schema/pickup.schema';
import { UploadsModule } from 'src/uploads/uploads.module';
import { ContaminationClient } from './contamination.client';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Pickup.name, schema: PickupSchema }]),
    UploadsModule,
  ],
  controllers: [PickupController],
  providers: [PickupService, ContaminationClient],
})
export class PickupModule {}
