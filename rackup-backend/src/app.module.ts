import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AuthV2Module } from './auth/v2/auth-v2.module';

import { ormConfig } from './config/ormconfig';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { UsersModule } from './users/users.module';
import { ChatGateway } from './websocket/chat.gateway';
import { MoneyMatchesModule } from './money-matches/money-matches.module';
import { LeaguesModule } from './leagues/leagues.module';
import { MemoriesModule } from './memories/memories.module';
import { HallsModule } from './halls/halls.module';
import { MatchesModule } from './matches/matches.module';
import { HealthModule } from './health/health.module';
import { FriendsModule } from './friends/friends.module';
import { ActionBoardModule } from './action-board/action-board.module';
import { TrainingModule } from './training/training.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { ShotsModule } from './shots/shots.module';
import { HallsV2Module } from './halls/v2/halls-v2.module';
import { TournamentsV2Module } from './tournaments/v2/tournaments-v2.module';
import { LeaguesV2Module } from './leagues/v2/leagues-v2.module';
import { RealaiV2Module } from './realai/v2/realai-v2.module';
import { MatchmakingV2Module } from './matchmaking/v2/matchmaking-v2.module';
import { ScorekeepingModule } from './scorekeeping/scorekeeping.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormConfig),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev_access_secret',
    }),
    ScorekeepingModule,
    AuthModule,
    AuthV2Module,

    UsersModule,
    MatchmakingModule,
    TournamentsModule,
    MoneyMatchesModule,
    LeaguesModule,
    MemoriesModule,
    HallsModule,
    MatchesModule,
    HealthModule,
    FriendsModule,
    ActionBoardModule,
    TrainingModule,
    NotificationsModule,
    ReportsModule,
    ShotsModule,
    HallsV2Module,
    TournamentsV2Module,
    LeaguesV2Module,
    RealaiV2Module,
    MatchmakingV2Module,
  ],

  providers: [
    ChatGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, RequestLoggingMiddleware).forRoutes('*');
  }
}
