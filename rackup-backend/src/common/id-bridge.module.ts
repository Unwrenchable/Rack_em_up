import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdBridge } from './id-bridge.entity';
import { IdBridgeService } from './id-bridge.service';
import { IdBridgeController } from './id-bridge.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([IdBridge])],
  controllers: [IdBridgeController],
  providers: [IdBridgeService],
  exports: [IdBridgeService],
})
export class IdBridgeModule {}
