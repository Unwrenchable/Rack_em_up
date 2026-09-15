import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { PoolMatch } from '../matches/pool-match.entity';
import { PlayerExternalRating } from '../leagues/v2/entities/player-external-rating.entity';
import { ExternalRatingSource } from '../leagues/v2/entities/external-rating-source.entity';
import { PlayerIdentity } from './player-identity.entity';
import { FargoRateClient } from './fargo-rate.client';
import { ApaClient } from './apa.client';
import { IdentityResolverService } from './identity-resolver.service';
import { PlayerCardService } from './player-card.service';
import { RatingsController } from './ratings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PoolMatch,
      PlayerIdentity,
      PlayerExternalRating,
      ExternalRatingSource,
    ]),
  ],
  controllers: [RatingsController],
  providers: [FargoRateClient, ApaClient, IdentityResolverService, PlayerCardService],
  exports: [FargoRateClient, ApaClient, IdentityResolverService, PlayerCardService],
})
export class RatingsModule {}
