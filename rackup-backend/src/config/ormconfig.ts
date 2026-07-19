import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { MatchmakingRequest } from '../matchmaking/matchmaking.entity';
import { MoneyMatch } from '../money-matches/money-matches.entity';
import { League } from '../leagues/leagues.entity';
import { LeagueTeam } from '../leagues/league_teams.entity';
import { Tournament } from '../tournaments/tournaments.entity';
import { TournamentMatch } from '../tournaments/tournament_matches.entity';
import { MatchMemory } from '../memories/match-memory.entity';
import { Hall } from '../halls/hall.entity';
import { HallCheckin } from '../halls/hall-checkin.entity';
import { PoolMatch } from '../matches/pool-match.entity';
import { Friendship } from '../friends/friendship.entity';
import { ActionPost } from '../action-board/action-post.entity';
import { AppNotification } from '../notifications/notification.entity';
import { PlayerReport } from '../reports/report.entity';
import { TournamentRegistration } from '../tournaments/tournament_registrations.entity';

export const ormConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'rackup',
  entities: [
    User,
    MatchmakingRequest,
    MoneyMatch,
    League,
    LeagueTeam,
    Tournament,
    TournamentMatch,
    TournamentRegistration,
    MatchMemory,
    Hall,
    HallCheckin,
    PoolMatch,
    Friendship,
    ActionPost,
    AppNotification,
    PlayerReport,
  ],
  synchronize: true,
};
