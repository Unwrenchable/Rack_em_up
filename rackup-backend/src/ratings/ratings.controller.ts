import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlayerCardService } from './player-card.service';
import { IdentityResolverService } from './identity-resolver.service';
import {
  FargoSearchDto,
  ManualLeagueImportDto,
  ResolveIdentityDto,
  ShadowRecomputeDto,
} from './dto/ratings.dto';

/**
 * Console / coach ratings surface.
 * Read-only Fargo; no match submission / LMS.
 */
@Controller('ratings')
@UseGuards(AuthGuard('jwt'))
export class RatingsController {
  constructor(
    private readonly cards: PlayerCardService,
    private readonly resolver: IdentityResolverService,
  ) {}

  @Post('fargo/search')
  async fargoSearch(@Body() dto: FargoSearchDto) {
    const results = await this.cards.searchFargo(dto.q);
    return {
      q: dto.q,
      results,
      official: true as const,
      source: 'fargorate_public_api',
      note: 'Read-only FargoRate lookup. RackUp does not submit matches or claim LMS partnership.',
    };
  }

  @Post('shadow/recompute')
  async recomputeShadow(@Req() req: { user: { id: string } }, @Body() dto: ShadowRecomputeDto) {
    const card = await this.cards.recomputeShadow(dto, req.user.id);
    return {
      card,
      note: 'RackUpRate shadow stored on player_identities only — users.rating (ROC Glicko-2) was not written.',
    };
  }

  @Post('identity/resolve')
  async resolve(@Body() dto: ResolveIdentityDto) {
    const result = await this.resolver.resolve(dto);
    const card = result.identity.userId
      ? await this.cards.getCardForUser(result.identity.userId, {
          refreshFargo: dto.refreshFargo,
        })
      : await this.cards.getCardByUnifiedId(result.identity.id);
    return {
      unified_id: result.identity.id,
      method: result.method,
      created: result.created,
      ambiguous: result.ambiguous ?? [],
      notes: result.notes,
      card,
    };
  }

  @Post('import/manual')
  async manualImport(@Body() dto: ManualLeagueImportDto) {
    return {
      card: await this.cards.manualImport(dto),
      note: 'Manual TAP/BCA/APA field import. Scrape is off unless TAP_SCRAPE_ENABLED/BCA_SCRAPE_ENABLED (still unimplemented).',
    };
  }

  @Get('player-card/:unifiedId')
  async byUnified(
    @Param('unifiedId', ParseUUIDPipe) unifiedId: string,
    @Query('refreshFargo') refreshFargo?: string,
  ) {
    if (refreshFargo === '1' || refreshFargo === 'true') {
      const identity = await this.resolver.findByUnifiedId(unifiedId);
      if (identity?.userId) {
        return this.cards.getCardForUser(identity.userId, { refreshFargo: true });
      }
    }
    return this.cards.getCardByUnifiedId(unifiedId);
  }
}
