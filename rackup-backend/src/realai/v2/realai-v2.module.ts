import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RealaiV2Controller } from './realai-v2.controller';
import { RealaiV2Service } from './realai-v2.service';

// Entities optional for Phase 1B–1D; placeholder for future persistence.
@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [RealaiV2Controller],
  providers: [RealaiV2Service],
  exports: [RealaiV2Service],
})
export class RealaiV2Module {}

