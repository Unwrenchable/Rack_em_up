import { IsUUID } from 'class-validator';

export class RequestFriendDto {
  @IsUUID()
  addresseeId!: string;
}

export class BlockUserDto {
  @IsUUID()
  userId!: string;
}
