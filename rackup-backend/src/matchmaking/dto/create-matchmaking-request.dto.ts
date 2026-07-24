import { IsIn, IsNumber, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateMatchmakingRequestDto {
  @IsUUID()
  user_id!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lon!: number;

  @IsString()
  @IsIn(['8-ball', '9-ball', '10-ball', 'one-pocket'])
  game!: string;

  @IsString()
  @IsIn(['casual', 'small', 'big_money'])
  stakes!: string;

  @IsNumber()
  min_rating!: number;

  @IsNumber()
  max_rating!: number;
}
