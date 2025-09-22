import { Module } from '@nestjs/common';
import { WasteController } from './waste.controller';
import { WasteService } from './waste.service';

@Module({
  controllers: [WasteController],
  providers: [WasteService]
})
export class WasteModule {}
