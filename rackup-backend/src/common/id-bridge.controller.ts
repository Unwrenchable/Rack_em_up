import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IdBridgeService } from './id-bridge.service';
import { IdBridgeKind } from './id-bridge.entity';

@Controller('id-bridge')
export class IdBridgeController {
  constructor(private readonly bridge: IdBridgeService) {}

  @Get()
  async list(@Query('kind') kind?: IdBridgeKind) {
    return this.bridge.list(kind);
  }

  @Get(':kind/v1/:v1Id')
  async resolveFromV1(@Param('kind') kind: IdBridgeKind, @Param('v1Id') v1Id: string) {
    const v2Id = await this.bridge.resolveV2(kind, v1Id);
    return { kind, v1Id, v2Id, resolved: v2Id ?? v1Id };
  }

  @Get(':kind/v2/:v2Id')
  async resolveFromV2(@Param('kind') kind: IdBridgeKind, @Param('v2Id') v2Id: string) {
    const v1Id = await this.bridge.resolveV1(kind, v2Id);
    return { kind, v2Id, v1Id, resolved: v1Id ?? v2Id };
  }

  @Post('link')
  @UseGuards(AuthGuard('jwt'))
  async link(
    @Body()
    body: {
      kind: IdBridgeKind;
      v1Id: string;
      v2Id: string;
      meta?: Record<string, unknown>;
    },
  ) {
    return this.bridge.link(body.kind, body.v1Id, body.v2Id, body.meta);
  }
}
