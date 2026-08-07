import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import type { MatchTimelineDomain, MatchTimelineEventType } from '../match-timeline.types';

export class AppendTimelineEventDto {
  @IsUUID()
  matchId!: string;

  @IsOptional()
  @IsString()
  domain?: MatchTimelineDomain;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  hallId?: string;

  @IsOptional()
  @IsUUID()
  playerAId?: string;

  @IsOptional()
  @IsUUID()
  playerBId?: string;

  @IsOptional()
  @IsString()
  gameType?: string;

  @IsString()
  type!: MatchTimelineEventType;

  @IsOptional()
  @IsUUID()
  playerId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  rack?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  aScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bScore?: number;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  note?: string;
}

export class StartTimelineDto {
  @IsUUID()
  matchId!: string;

  @IsString()
  domain!: MatchTimelineDomain;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  hallId?: string;

  @IsOptional()
  @IsUUID()
  playerAId?: string;

  @IsOptional()
  @IsUUID()
  playerBId?: string;

  @IsOptional()
  @IsString()
  gameType?: string;
}
