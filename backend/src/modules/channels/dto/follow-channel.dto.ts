import { IsString, IsNotEmpty } from 'class-validator';

export class FollowChannelDto {
  @IsString()
  @IsNotEmpty()
  channelId: string;
}
