import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { RecyclingChainModule } from './recycling-chain/recycling-chain.module';
import { WasteModule } from './waste/waste.module';

@Module({
  imports: [AnalyticsModule, AuthModule, UsersModule, DeliveriesModule, RecyclingChainModule, WasteModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
